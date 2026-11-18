import { inject, Injectable } from '@angular/core';
import {
  AudioDecodeService,
  MAX_AUDIO_DURATION_SECONDS,
  type AudioDecodeHints,
} from './audio-decode.service';
import { MAX_FILE_SIZE_BYTES } from './audio-file-validation.service';
import { probeDurationSeconds, revokeQuietly } from './media-duration-probe';
import { downmixToMono } from './pcm-mono';
import { resampleTo16kHz, TARGET_SAMPLE_RATE_HZ } from './pcm-resampler';

/** Working-set ceiling for file bytes, decoded PCM, mono PCM and resampled PCM. */
export const MAX_PIPELINE_MEMORY_BYTES = 512 * 1024 * 1024;
const DECODER_WORKING_RESERVE_BYTES = 64 * 1024 * 1024;

export interface AudioPipelineOptions {
  readonly signal?: AbortSignal;
  readonly hints?: AudioDecodeHints;
}

export interface PreparedAudio {
  readonly sampleRate: typeof TARGET_SAMPLE_RATE_HZ;
  readonly numberOfChannels: 1;
  readonly durationSeconds: number;
  readonly pcm: Float32Array;
}

export type AudioPipelineResult =
  | { readonly ok: true; readonly audio: PreparedAudio }
  | {
      readonly ok: false;
      readonly code:
        | 'missing-file'
        | 'size-limit'
        | 'memory-limit'
        | 'duration-limit'
        | 'aborted'
        | 'unsupported'
        | 'empty-file'
        | 'read-failed'
        | 'decode-failed';
      readonly message: string;
    };

function workingSetBytes(
  fileBytes: number,
  samples: number,
  channels: number,
  sampleRate: number,
): number {
  const decodedBytes = samples * channels * Float32Array.BYTES_PER_ELEMENT;
  const monoBytes = samples * Float32Array.BYTES_PER_ELEMENT;
  const outputSamples = Math.ceil((samples * TARGET_SAMPLE_RATE_HZ) / sampleRate);
  const outputBytes = outputSamples * Float32Array.BYTES_PER_ELEMENT;
  // Count a second compressed-file copy plus a fixed reserve for decoder scratch.
  // Browser-internal decoder allocations remain implementation-dependent.
  return fileBytes * 2 + decodedBytes + monoBytes + outputBytes + DECODER_WORKING_RESERVE_BYTES;
}

async function probeLocalDuration(file: File): Promise<number | null> {
  if (typeof URL.createObjectURL !== 'function' || !(file instanceof Blob)) {
    return null;
  }
  let url: string;
  try {
    url = URL.createObjectURL(file);
  } catch {
    return null;
  }
  try {
    return await probeDurationSeconds(url);
  } finally {
    revokeQuietly(url);
  }
}

@Injectable({ providedIn: 'root' })
export class AudioPipelineService {
  private readonly decoder = inject(AudioDecodeService);

  async prepare(
    file: File | null | undefined,
    options?: AudioPipelineOptions,
  ): Promise<AudioPipelineResult> {
    if (file == null || typeof file.size !== 'number') {
      return { ok: false, code: 'missing-file', message: 'Dosya bulunamadı.' };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return { ok: false, code: 'size-limit', message: 'Dosya 50 MB sınırını aşıyor.' };
    }
    if (options?.signal?.aborted) {
      return { ok: false, code: 'aborted', message: 'Ses işleme iptal edildi.' };
    }

    const hintedDuration = options?.hints?.durationSeconds;
    const durationKnown =
      typeof hintedDuration === 'number' && Number.isFinite(hintedDuration) && hintedDuration > 0;
    if (
      !durationKnown &&
      (!Number.isFinite(options?.hints?.sampleRate) ||
        (options?.hints?.sampleRate ?? 0) <= 0 ||
        !Number.isSafeInteger(options?.hints?.numberOfChannels) ||
        (options?.hints?.numberOfChannels ?? 0) <= 0)
    ) {
      return {
        ok: false,
        code: 'memory-limit',
        message: 'Ses süresi doğrulanamadı; bellek güvenliği için dönüştürme başlatılmadı.',
      };
    }
    if (durationKnown && hintedDuration > MAX_AUDIO_DURATION_SECONDS) {
      return { ok: false, code: 'duration-limit', message: 'Ses 10 dakika sınırını aşıyor.' };
    }

    const sampleRate = options?.hints?.sampleRate;
    const channels = options?.hints?.numberOfChannels;
    if (
      typeof sampleRate !== 'number' ||
      !Number.isFinite(sampleRate) ||
      sampleRate <= 0 ||
      typeof channels !== 'number' ||
      !Number.isSafeInteger(channels) ||
      channels <= 0
    ) {
      return {
        ok: false,
        code: 'memory-limit',
        message:
          'Örnekleme hızı ve kanal sayısı doğrulanamadı; bellek güvenliği için dönüşüm başlatılmadı.',
      };
    }
    const estimateRate = sampleRate;
    const estimateChannels = channels;
    let resolvedDuration = durationKnown ? hintedDuration : null;
    if (resolvedDuration === null) {
      // For formats such as OGG/Opus, use the existing local Blob metadata probe if the browser can read it.
      // The result is only a preflight hint; AudioDecodeService still verifies the actual decoded duration.
      resolvedDuration = await probeLocalDuration(file);
      if (options?.signal?.aborted) {
        return { ok: false, code: 'aborted', message: 'Ses işleme iptal edildi.' };
      }
    }
    if (resolvedDuration !== null && resolvedDuration > MAX_AUDIO_DURATION_SECONDS) {
      return { ok: false, code: 'duration-limit', message: 'Ses 10 dakika sınırını aşıyor.' };
    }
    // If local metadata remains unavailable, use the maximum allowed duration as an upper-bound estimate.
    const durationBound = resolvedDuration ?? MAX_AUDIO_DURATION_SECONDS;
    const estimatedSamples = Math.ceil(durationBound * estimateRate);
    if (
      workingSetBytes(file.size, estimatedSamples, estimateChannels, estimateRate) >
      MAX_PIPELINE_MEMORY_BYTES
    ) {
      return {
        ok: false,
        code: 'memory-limit',
        message: 'Ses bu cihaz için güvenli bellek sınırını aşıyor.',
      };
    }

    const decoderHints: AudioDecodeHints = {
      durationSeconds: durationBound,
      sampleRate,
      numberOfChannels: channels,
    };
    const decoded = await this.decoder.decode(file, {
      signal: options?.signal,
      hints: decoderHints,
    });
    if (!decoded.ok) {
      return decoded;
    }
    const source = decoded.audio;
    if (source.duration > MAX_AUDIO_DURATION_SECONDS) {
      return { ok: false, code: 'duration-limit', message: 'Ses 10 dakika sınırını aşıyor.' };
    }
    if (
      !Number.isFinite(source.sampleRate) ||
      source.sampleRate <= 0 ||
      !Number.isSafeInteger(source.length) ||
      source.length < 0 ||
      !Number.isSafeInteger(source.numberOfChannels) ||
      source.numberOfChannels < 1 ||
      !Number.isFinite(source.duration) ||
      source.duration <= 0 ||
      source.channels.length !== source.numberOfChannels ||
      source.channels.some((channel) => channel.length !== source.length)
    ) {
      return { ok: false, code: 'decode-failed', message: 'Çözülen ses belleği doğrulanamadı.' };
    }
    if (
      workingSetBytes(file.size, source.length, source.numberOfChannels, source.sampleRate) >
      MAX_PIPELINE_MEMORY_BYTES
    ) {
      return {
        ok: false,
        code: 'memory-limit',
        message: 'Çözülen ses dönüşüm için güvenli bellek sınırını aşıyor.',
      };
    }
    if (options?.signal?.aborted) {
      return { ok: false, code: 'aborted', message: 'Ses işleme iptal edildi.' };
    }

    try {
      const mono = downmixToMono(source.channels);
      if (options?.signal?.aborted) {
        return { ok: false, code: 'aborted', message: 'Ses işleme iptal edildi.' };
      }
      const pcm = resampleTo16kHz(mono, source.sampleRate);
      if (options?.signal?.aborted) {
        return { ok: false, code: 'aborted', message: 'Ses işleme iptal edildi.' };
      }
      return {
        ok: true,
        audio: {
          sampleRate: TARGET_SAMPLE_RATE_HZ,
          numberOfChannels: 1,
          durationSeconds: source.duration,
          pcm,
        },
      };
    } catch (error) {
      if (error instanceof RangeError) {
        return {
          ok: false,
          code: 'memory-limit',
          message: 'Ses PCM tamponu için güvenli bellek ayrılamadı.',
        };
      }
      return { ok: false, code: 'decode-failed', message: 'Ses PCM biçimine dönüştürülemedi.' };
    }
  }
}
