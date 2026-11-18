import { TestBed } from '@angular/core/testing';
import { AudioDecodeService, type AudioDecodeResult } from './audio-decode.service';
import { AudioPipelineService, MAX_PIPELINE_MEMORY_BYTES } from './audio-pipeline.service';

function file(size = 12): File {
  return { size } as File;
}

class FakeMetadataAudio {
  duration = 30;
  preload = '';
  src = '';
  private readonly listeners = new Map<string, EventListener>();

  addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, listener);
  }

  removeEventListener(type: string): void {
    this.listeners.delete(type);
  }

  removeAttribute(name: string): void {
    if (name === 'src') this.src = '';
  }

  load(): void {
    if (this.src) {
      queueMicrotask(() => this.listeners.get('loadedmetadata')?.(new Event('loadedmetadata')));
    }
  }
}

function decodedAudio(
  sampleRate = 44100,
  channels: Float32Array[] = [Float32Array.from([1, 0, -1]), Float32Array.from([-1, 0, 1])],
  duration = channels[0].length / sampleRate,
): AudioDecodeResult {
  return {
    ok: true,
    audio: {
      sampleRate,
      numberOfChannels: channels.length,
      length: channels[0].length,
      duration,
      channels,
    },
  };
}

describe('AudioPipelineService', () => {
  let service: AudioPipelineService;
  let decode: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    decode = vi.fn().mockResolvedValue(decodedAudio());
    TestBed.configureTestingModule({
      providers: [{ provide: AudioDecodeService, useValue: { decode } }],
    });
    service = TestBed.inject(AudioPipelineService);
  });

  it('decodes then downmixes and resamples to 16 kHz mono Float32 PCM', async () => {
    const result = await service.prepare(file(), {
      hints: { durationSeconds: 1, sampleRate: 44100, numberOfChannels: 2 },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.audio.sampleRate).toBe(16000);
    expect(result.audio.numberOfChannels).toBe(1);
    expect(result.audio.pcm).toBeInstanceOf(Float32Array);
    expect(result.audio.pcm.length).toBe(2);
    expect(Array.from(result.audio.pcm)).toEqual([0, 0]);
    expect(decode).toHaveBeenCalledOnce();
  });

  it('accepts exactly 600 seconds and passes actual-rate metadata to the decoder', async () => {
    const result = await service.prepare(file(), {
      hints: { durationSeconds: 600, sampleRate: 48000, numberOfChannels: 1 },
    });
    expect(result.ok).toBe(true);
    expect(decode).toHaveBeenCalledOnce();
  });

  it('rejects 601-second metadata before decoding', async () => {
    const result = await service.prepare(file(), { hints: { durationSeconds: 601 } });
    expect(result).toMatchObject({ ok: false, code: 'duration-limit' });
    expect(decode).not.toHaveBeenCalled();
  });

  it('returns memory-limit when duration or PCM dimensions cannot be safely budgeted', async () => {
    const result = await service.prepare(file(), { hints: { durationSeconds: null } });
    expect(result).toMatchObject({ ok: false, code: 'memory-limit' });
    const knownDurationWithoutDimensions = await service.prepare(file(), {
      hints: { durationSeconds: 1 },
    });
    expect(knownDurationWithoutDimensions).toMatchObject({ ok: false, code: 'memory-limit' });
    expect(decode).not.toHaveBeenCalled();
  });

  it('bounds unknown duration at 600 seconds and requires the decoded duration to pass', async () => {
    const result = await service.prepare(file(), {
      hints: { durationSeconds: null, sampleRate: 44100, numberOfChannels: 2 },
    });
    expect(result.ok).toBe(true);
    expect(decode).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        hints: { durationSeconds: 600, sampleRate: 44100, numberOfChannels: 2 },
      }),
    );
  });

  it('uses local browser metadata to avoid rejecting a short OGG/Opus with unknown header duration', async () => {
    const originalAudio = globalThis.Audio;
    const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
    const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');
    globalThis.Audio = FakeMetadataAudio as unknown as typeof Audio;
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(() => 'blob:ogg-test'),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });

    try {
      const oggFile = new File([new Uint8Array(1024)], 'whatsapp.ogg', { type: 'audio/ogg' });
      const result = await service.prepare(oggFile, {
        hints: { durationSeconds: null, sampleRate: 48000, numberOfChannels: 2 },
      });
      expect(result.ok).toBe(true);
      expect(decode).toHaveBeenCalledWith(
        oggFile,
        expect.objectContaining({
          hints: { durationSeconds: 30, sampleRate: 48000, numberOfChannels: 2 },
        }),
      );
      expect(URL.createObjectURL).toHaveBeenCalledWith(oggFile);
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:ogg-test');

      decode.mockResolvedValue({ ok: false, code: 'decode-failed', message: 'decoder failed' });
      const failed = await service.prepare(oggFile, {
        hints: { durationSeconds: null, sampleRate: 48000, numberOfChannels: 2 },
      });
      expect(failed).toMatchObject({ ok: false, code: 'decode-failed' });
      expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
      expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    } finally {
      globalThis.Audio = originalAudio;
      if (originalCreateObjectURL) {
        Object.defineProperty(URL, 'createObjectURL', originalCreateObjectURL);
      } else {
        Reflect.deleteProperty(URL, 'createObjectURL');
      }
      if (originalRevokeObjectURL) {
        Object.defineProperty(URL, 'revokeObjectURL', originalRevokeObjectURL);
      } else {
        Reflect.deleteProperty(URL, 'revokeObjectURL');
      }
    }
  });

  it('rejects unknown-metadata audio when the decoder reports an actual duration over 600 seconds', async () => {
    decode.mockResolvedValue(decodedAudio(16000, [new Float32Array(0)], 601));
    const result = await service.prepare(file(), {
      hints: { durationSeconds: null, sampleRate: 16000, numberOfChannels: 1 },
    });
    expect(result).toMatchObject({ ok: false, code: 'duration-limit' });
  });

  it('rechecks decoded duration and rejects a file whose metadata understated it', async () => {
    decode.mockResolvedValue(decodedAudio(16000, [new Float32Array(0)], 601));
    const result = await service.prepare(file(), {
      hints: { durationSeconds: 600, sampleRate: 16000, numberOfChannels: 1 },
    });
    expect(result).toMatchObject({ ok: false, code: 'duration-limit' });
  });

  it('rejects unsafe estimated working set before asking the decoder to allocate PCM', async () => {
    const result = await service.prepare(file(), {
      hints: { durationSeconds: 600, sampleRate: 192000, numberOfChannels: 8 },
    });
    expect(result).toMatchObject({ ok: false, code: 'memory-limit' });
    expect(MAX_PIPELINE_MEMORY_BYTES).toBe(512 * 1024 * 1024);
    expect(decode).not.toHaveBeenCalled();
  });

  it('rejects an over-budget actual working set before mono/resample allocations', async () => {
    const length = 19_200_000;
    const virtualChannel = { length } as Float32Array;
    decode.mockResolvedValue({
      ok: true,
      audio: {
        sampleRate: 192000,
        numberOfChannels: 8,
        length,
        duration: 100,
        channels: Array.from({ length: 8 }, () => virtualChannel),
      },
    });
    const result = await service.prepare(file(), {
      hints: { durationSeconds: 100, sampleRate: 192000, numberOfChannels: 8 },
    });
    expect(result).toMatchObject({ ok: false, code: 'memory-limit' });
  });

  it('preserves abort and decoder errors', async () => {
    const controller = new AbortController();
    controller.abort();
    const aborted = await service.prepare(file(), {
      signal: controller.signal,
      hints: { durationSeconds: 1, sampleRate: 48000, numberOfChannels: 1 },
    });
    expect(aborted).toMatchObject({ ok: false, code: 'aborted' });
    expect(decode).not.toHaveBeenCalled();

    decode.mockResolvedValue({ ok: false, code: 'decode-failed', message: 'failed' });
    const failed = await service.prepare(file(), {
      hints: { durationSeconds: 1, sampleRate: 48000, numberOfChannels: 1 },
    });
    expect(failed).toMatchObject({ ok: false, code: 'decode-failed' });
  });
});
