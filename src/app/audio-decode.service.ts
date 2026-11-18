/**
 * SHHH-015 Parça 3 — WebAudio ses çözme katmanı.
 *
 * Yalnız `AudioContext.decodeAudioData` ile dosyayı Float32 PCM'e çözer;
 * resampling, mono birleştirme, UI, Worker veya Whisper bu katmanda YOKTUR.
 *
 * Bu işlem GERÇEK streaming DEĞİLDİR: `decodeAudioData` sıkıştırılmış dosyanın
 * tamamının ArrayBuffer olarak okunmasını ve tarayıcının tüm PCM'i çözüp
 * belleğe almasını gerektirir. Dosya parçalara ayrılıp bağımsız decode edilemez
 * (parça sınırında bozulma olur). Bellek tahmini aşağıdadır:
 *
 * - Çözülmüş PCM ≈ süre × örnekHızı × kanal × 4 bayt (Float32).
 * - Meta veri (süre/kanal/hız) güvenilirse decode ÖNCESİ tahmin edilir ve
 *   `MAX_DECODED_PCM_BYTES` aşılırsa hiç decode açılmadan reddedilir.
 * - Meta veri yoksa tahmin ÜRETİLMEZ (sahte kesinlik yok); kesin kontrol
 *   decode sonrası yapılır (gerçek length × numberOfChannels × 4).
 * - Ürün kararları (50 MB dosya / 10 dakika — SHHH-015 Parça 4) bu katmanda
 *   DEĞİŞTİRİLMEZ; bellek tavanı ayrı bir güvenlik ağıdır ve raporda açıkça
 *   bildirilir.
 *
 * İptal: AbortSignal desteklenir; decode öncesi/sonrası ve yarış sırasında
 * kontrol edilir. Ancak `decodeAudioData` tarayıcıda fiziksel olarak anında
 * durdurulamaz — iptal yalnızca sonucu geçersiz sayar ve AudioContext'i
 * kapatır; tarayıcı arka planda decode'a devam edebilir.
 *
 * Kaynak temizliği: AudioContext başarı, hata ve iptal yollarında kapatılır.
 * Dosya adı/icerigi loglanmaz; ağ isteği yapılmaz.
 *
 * Kanal kopyaları: `getChannelData` sonucu doğrudan saklanır; ikinci bir
 * kopya oluşturulmaz.
 */
import { Injectable } from '@angular/core';

/** Bilinmeyen örnekleme hızı için üst-sınır varsayımı (tüketici sesi, Hz). */
export const ASSUMED_UNKNOWN_SAMPLE_RATE_HZ = 48000;

/** Bilinmeyen kanal sayısı için varsayım (üst sınır varsayımı). */
export const ASSUMED_UNKNOWN_CHANNELS = 2;

/**
 * Çözülmüş PCM bellek tavanı (bayt).
 * 10 dk × 48 kHz × 2 kanal × 4 B = 230,4 MB ürün senaryosunu kapsar;
 * decode tavanı toplam pipeline garantisi DEĞİLDİR (bkz. audio-pipeline.service.ts).
 */
export const MAX_DECODED_PCM_BYTES = 512 * 1024 * 1024;
export const MAX_AUDIO_DURATION_SECONDS = 600;

/** Decode öncesi bellek tahmini için isteğe bağlı, doğrulanabilir meta veri. */
export interface AudioDecodeHints {
  readonly durationSeconds?: number | null;
  readonly sampleRate?: number | null;
  readonly numberOfChannels?: number | null;
}

/** Çözülmüş ses: gerçek AudioBuffer alanları + kopyasız kanal örnekleri. */
export interface DecodedAudio {
  /** Tarayıcının bildirdiği gerçek örnekleme hızı (Hz). */
  readonly sampleRate: number;
  /** Gerçek kanal sayısı. */
  readonly numberOfChannels: number;
  /** Kanal başına örnek (kare) sayısı. */
  readonly length: number;
  /** Süre (saniye); AudioBuffer.duration alanından aynen alınır. */
  readonly duration: number;
  /** Kanal başına Float32 örnekler; AudioBuffer'dan doğrudan, kopyasız. */
  readonly channels: readonly Float32Array[];
}

export type AudioDecodeErrorCode =
  | 'missing-file'
  | 'empty-file'
  | 'unsupported'
  | 'memory-limit'
  | 'duration-limit'
  | 'read-failed'
  | 'decode-failed'
  | 'aborted';

export interface AudioDecodeSuccess {
  readonly ok: true;
  readonly audio: DecodedAudio;
}

export interface AudioDecodeFailure {
  readonly ok: false;
  readonly code: AudioDecodeErrorCode;
  readonly message: string;
}

export type AudioDecodeResult = AudioDecodeSuccess | AudioDecodeFailure;

export interface AudioDecodeOptions {
  /** İptal bayrağı; sonuç geçersiz sayılır, context kapatılır. */
  readonly signal?: AbortSignal;
  /** Güvenilir meta veri varsa decode öncesi bellek tahmini için. */
  readonly hints?: AudioDecodeHints;
}

function isValidPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1;
}

/**
 * Tahmini çözülmüş PCM bayt sayısı.
 * - Süre bilinmiyorsa (finite ve >0 değil) → null (sahte kesinlik üretilmez).
 * - Hız bilinmiyorsa 48000, kanal bilinmiyorsa 2 varsayılır (üst sınır).
 */
export function estimateDecodedPcmBytes(hints: AudioDecodeHints | null | undefined): number | null {
  const duration = hints?.durationSeconds;
  if (typeof duration !== 'number' || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }
  const sampleRate = isValidPositive(hints?.sampleRate)
    ? hints.sampleRate
    : ASSUMED_UNKNOWN_SAMPLE_RATE_HZ;
  const numberOfChannels = isValidPositive(hints?.numberOfChannels)
    ? hints.numberOfChannels
    : ASSUMED_UNKNOWN_CHANNELS;
  return duration * sampleRate * numberOfChannels * 4;
}

function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function failure(code: AudioDecodeErrorCode, message: string): AudioDecodeFailure {
  return { ok: false, code, message };
}

type AudioContextConstructor = new () => AudioContext;

function resolveAudioContextConstructor(): AudioContextConstructor | null {
  const scope = globalThis as {
    AudioContext?: AudioContextConstructor;
    webkitAudioContext?: AudioContextConstructor;
  };
  const ctor = scope.AudioContext ?? scope.webkitAudioContext;
  return typeof ctor === 'function' ? ctor : null;
}

function closeQuietly(context: AudioContext): Promise<void> {
  try {
    return context.close().catch(() => undefined);
  } catch {
    // Kapatma hatası decode sonucunu bozmamalı.
  }
  return Promise.resolve();
}

/**
 * decodeAudioData promise'ini AbortSignal ile yarıştırır.
 * İptalde yarış hemen reddedilir; decode promise'i sonradan settle olsa bile
 * sonuç kullanılmaz (eller zaten bağlandığı için yakalamama olmaz).
 */
function raceDecodeWithAbort<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (signal === undefined) {
    return promise;
  }
  if (signal.aborted) {
    return Promise.reject(new Error('aborted'));
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(new Error('aborted'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

/**
 * SHHH-015 Parça 3 — WebAudio ile ses çözme servisi.
 * Ağ isteği yapmaz, dosya içeriğini loglamaz.
 */
@Injectable({ providedIn: 'root' })
export class AudioDecodeService {
  async decode(
    file: File | null | undefined,
    options?: AudioDecodeOptions,
  ): Promise<AudioDecodeResult> {
    const signal = options?.signal;

    if (
      file === null ||
      file === undefined ||
      typeof file.size !== 'number' ||
      typeof file.arrayBuffer !== 'function'
    ) {
      return failure('missing-file', 'Dosya bulunamadı. Geçerli bir ses dosyası seçin.');
    }
    if (file.size === 0) {
      return failure('empty-file', 'Dosya boş. Geçerli bir ses dosyası seçin.');
    }
    if (signal?.aborted) {
      return failure('aborted', 'Ses çözümleme iptal edildi.');
    }

    // Güvenilir meta veri varsa decode ÖNCESİ bellek tahmini (context açılmadan).
    const estimate = estimateDecodedPcmBytes(options?.hints);
    if (
      options?.hints?.durationSeconds != null &&
      options.hints.durationSeconds > MAX_AUDIO_DURATION_SECONDS
    ) {
      return failure('duration-limit', 'Ses 10 dakika sınırını aşıyor.');
    }
    if (estimate !== null && estimate > MAX_DECODED_PCM_BYTES) {
      return failure(
        'memory-limit',
        `Tahmini ses verisi belleği aşıyor (≈ ${formatMegabytes(estimate)} > 512 MB). Daha kısa bir dosya seçin.`,
      );
    }

    // Gerçek streaming değildir: dosyanın tamamı tek ArrayBuffer olarak okunur.
    let arrayBuffer: ArrayBuffer;
    try {
      arrayBuffer = await file.arrayBuffer();
    } catch {
      return failure('read-failed', 'Dosya okunamadı. Tekrar seçmeyi deneyin.');
    }
    if (signal?.aborted) {
      return failure('aborted', 'Ses çözümleme iptal edildi.');
    }

    const AudioContextCtor = resolveAudioContextConstructor();
    if (AudioContextCtor === null) {
      return failure('unsupported', 'Tarayıcı ses çözümlemesi (WebAudio) desteklemiyor.');
    }

    let context: AudioContext;
    try {
      context = new AudioContextCtor();
    } catch {
      return failure('unsupported', 'Tarayıcı ses çözümlemesi (WebAudio) desteklemiyor.');
    }

    try {
      const decodePromise = context.decodeAudioData(arrayBuffer);
      const audioBuffer = await raceDecodeWithAbort(decodePromise, signal);
      if (signal?.aborted) {
        return failure('aborted', 'Ses çözümleme iptal edildi.');
      }

      // Gerçek süre örnek sayısı / örnekleme hızından türetilir; metadata alanıyla da çapraz kontrol edilir.
      if (
        !Number.isFinite(audioBuffer.sampleRate) ||
        audioBuffer.sampleRate <= 0 ||
        !Number.isSafeInteger(audioBuffer.length) ||
        audioBuffer.length <= 0 ||
        !Number.isSafeInteger(audioBuffer.numberOfChannels) ||
        audioBuffer.numberOfChannels <= 0 ||
        !Number.isFinite(audioBuffer.duration) ||
        audioBuffer.duration <= 0
      ) {
        return failure('decode-failed', 'Gerçek ses süresi doğrulanamadı.');
      }
      const actualDuration = audioBuffer.length / audioBuffer.sampleRate;
      if (
        actualDuration > MAX_AUDIO_DURATION_SECONDS ||
        audioBuffer.duration > MAX_AUDIO_DURATION_SECONDS
      ) {
        return failure('duration-limit', 'Ses 10 dakika sınırını aşıyor.');
      }

      // Kesin bellek kontrolü: decode sonrası gerçek boyut.
      const pcmBytes = audioBuffer.length * audioBuffer.numberOfChannels * 4;
      if (pcmBytes > MAX_DECODED_PCM_BYTES) {
        return failure(
          'memory-limit',
          `Çözülmüş ses verisi belleği aşıyor (${formatMegabytes(pcmBytes)} > 512 MB). Daha kısa bir dosya seçin.`,
        );
      }

      // Gereksiz kanal kopyası YOK: getChannelData sonucu doğrudan saklanır.
      const channels: Float32Array[] = [];
      for (let i = 0; i < audioBuffer.numberOfChannels; i++) {
        channels.push(audioBuffer.getChannelData(i));
      }

      return {
        ok: true,
        audio: {
          sampleRate: audioBuffer.sampleRate,
          numberOfChannels: audioBuffer.numberOfChannels,
          length: audioBuffer.length,
          duration: actualDuration,
          channels,
        },
      };
    } catch {
      if (signal?.aborted) {
        return failure('aborted', 'Ses çözümleme iptal edildi.');
      }
      return failure(
        'decode-failed',
        'Ses dosyası çözülemedi. Bozuk veya desteklenmeyen bir format olabilir.',
      );
    } finally {
      // Başarı, hata ve iptal yollarında context kapatılır.
      await closeQuietly(context);
    }
  }
}
