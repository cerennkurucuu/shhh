import { TestBed } from '@angular/core/testing';
import {
  AudioDecodeService,
  estimateDecodedPcmBytes,
  MAX_DECODED_PCM_BYTES,
} from './audio-decode.service';
import { audioFile, wavBytes } from './testing/audio-fixtures';

/**
 * Bu spec jsdom ortamında MOCK AudioContext ile çalışır (jsdom'de gerçek
 * WebAudio decode API'si yoktur). Testler servis sözleşmesini doğrular:
 * gerçek Chromium + gerçek oynatılabilir WAV ile decode ölçümü AYRI olarak
 * raporlanır; burada başarısız/özel durumlar gerçek kodek başarısı olarak
 * sunulmaz.
 */

type DecodeMode = 'resolve' | 'reject' | 'sync-throw' | 'pending';

class MockAudioBuffer {
  readonly duration: number;

  constructor(
    readonly sampleRate: number,
    readonly numberOfChannels: number,
    readonly length: number,
    readonly channelData: Float32Array[],
  ) {
    this.duration = length / sampleRate;
  }

  getChannelData(index: number): Float32Array {
    return this.channelData[index];
  }
}

class MockAudioContext {
  static instances: MockAudioContext[] = [];
  static mode: DecodeMode = 'resolve';
  static nextBuffer: MockAudioBuffer | null = null;
  static closePromise: Promise<void> | null = null;

  closeCalls = 0;
  decodeCalls = 0;
  readonly pendingResolvers: ((buffer: MockAudioBuffer) => void)[] = [];

  constructor() {
    MockAudioContext.instances.push(this);
  }

  decodeAudioData(): Promise<MockAudioBuffer> {
    this.decodeCalls += 1;
    if (MockAudioContext.mode === 'sync-throw') {
      throw new Error('sync decode failure');
    }
    if (MockAudioContext.mode === 'reject') {
      return Promise.reject(new Error('decode failed'));
    }
    if (MockAudioContext.mode === 'pending') {
      return new Promise<MockAudioBuffer>((resolve) => {
        this.pendingResolvers.push(resolve);
      });
    }
    const buffer = MockAudioContext.nextBuffer;
    if (buffer === null) {
      return Promise.reject(new Error('buffer not configured'));
    }
    return Promise.resolve(buffer);
  }

  close(): Promise<void> {
    this.closeCalls += 1;
    return MockAudioContext.closePromise ?? Promise.resolve();
  }
}

function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Gerçek başlıklı, oynatılabilir stereo WAV (PCM16, 44100 Hz, 2 kare). */
function stereoWavBytes(): Uint8Array {
  const bytes = new Uint8Array(44 + 8);
  const view = new DataView(bytes.buffer);
  const writeAscii = (offset: number, text: string): void => {
    for (let i = 0; i < text.length; i++) {
      bytes[offset + i] = text.charCodeAt(i);
    }
  };
  writeAscii(0, 'RIFF');
  view.setUint32(4, 36 + 8, true);
  writeAscii(8, 'WAVE');
  writeAscii(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 2, true);
  view.setUint32(24, 44100, true);
  view.setUint32(28, 44100 * 4, true);
  view.setUint16(32, 4, true);
  view.setUint16(34, 16, true);
  writeAscii(36, 'data');
  view.setUint32(40, 8, true);
  return bytes;
}

function monoBuffer(): MockAudioBuffer {
  return new MockAudioBuffer(8000, 1, 4, [Float32Array.from([0, 0.5, -0.5, 1])]);
}

function stereoBuffer(): MockAudioBuffer {
  return new MockAudioBuffer(44100, 2, 6, [
    Float32Array.from([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]),
    Float32Array.from([-0.1, -0.2, -0.3, -0.4, -0.5, -0.6]),
  ]);
}

function networkCallsDuring(fn: () => Promise<unknown>): Promise<number> {
  let calls = 0;
  const originalFetch = globalThis.fetch;
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  globalThis.fetch = ((...args: unknown[]) => {
    calls += 1;
    return originalFetch(...(args as Parameters<typeof originalFetch>));
  }) as typeof fetch;
  XMLHttpRequest.prototype.open = function open(this: XMLHttpRequest, ...args: unknown[]) {
    calls += 1;
    return originalXhrOpen.apply(this, args as Parameters<typeof originalXhrOpen>);
  };
  return fn().then(
    (value) => {
      globalThis.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXhrOpen;
      void value;
      return calls;
    },
    (error) => {
      globalThis.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalXhrOpen;
      throw error;
    },
  );
}

describe('AudioDecodeService (mock AudioContext — jsdom)', () => {
  let service: AudioDecodeService;
  const originalAudioContext = (globalThis as { AudioContext?: unknown }).AudioContext;

  beforeEach(() => {
    MockAudioContext.instances = [];
    MockAudioContext.mode = 'resolve';
    MockAudioContext.nextBuffer = null;
    MockAudioContext.closePromise = null;
    (globalThis as { AudioContext?: unknown }).AudioContext = MockAudioContext;
    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioDecodeService);
  });

  afterEach(() => {
    (globalThis as { AudioContext?: unknown }).AudioContext = originalAudioContext;
  });

  it('decodes a valid mono WAV into one Float32 channel without copying', async () => {
    const buffer = monoBuffer();
    MockAudioContext.nextBuffer = buffer;
    const result = await service.decode(audioFile(wavBytes(), 'kayit.wav', 'audio/wav'));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const audio = result.audio;
    expect(audio.numberOfChannels).toBe(1);
    expect(audio.channels).toHaveLength(1);
    expect(audio.channels[0]).toBeInstanceOf(Float32Array);
    expect(Array.from(audio.channels[0])).toEqual([0, 0.5, -0.5, 1]);
    // Gereksiz kanal kopyası yok: decoder'ın verdiği dizi aynen saklandı.
    expect(audio.channels[0]).toBe(buffer.getChannelData(0));
  });

  it('decodes a valid stereo WAV into two Float32 channels without copying', async () => {
    const buffer = stereoBuffer();
    MockAudioContext.nextBuffer = buffer;
    const result = await service.decode(audioFile(stereoWavBytes(), 'stereo.wav', 'audio/wav'));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.audio.numberOfChannels).toBe(2);
    expect(result.audio.channels).toHaveLength(2);
    expect(result.audio.channels[0]).toBe(buffer.getChannelData(0));
    expect(result.audio.channels[1]).toBe(buffer.getChannelData(1));
    expect(result.audio.channels[1][0]).toBeCloseTo(-0.1, 6);
  });

  it('passes through the real sampleRate and numberOfChannels from the decoder', async () => {
    MockAudioContext.nextBuffer = new MockAudioBuffer(44100, 2, 10, [
      new Float32Array(10),
      new Float32Array(10),
    ]);
    const result = await service.decode(audioFile(wavBytes(), 'hiz.wav', 'audio/wav'));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.audio.sampleRate).toBe(44100);
    expect(result.audio.numberOfChannels).toBe(2);
    expect(result.audio.channels).toHaveLength(2);
  });

  it('keeps AudioBuffer length, duration and sampleRate consistent', async () => {
    MockAudioContext.nextBuffer = stereoBuffer();
    const result = await service.decode(audioFile(wavBytes(), 'sure.wav', 'audio/wav'));
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.audio.length).toBe(6);
    expect(result.audio.duration).toBeCloseTo(6 / 44100, 9);
    expect(result.audio.duration).toBeGreaterThan(0);
    expect(result.audio.duration).toBeCloseTo(result.audio.length / result.audio.sampleRate, 9);
  });

  it('returns decode-failed for a corrupt or undecodable file', async () => {
    MockAudioContext.mode = 'reject';
    const result = await service.decode(audioFile(wavBytes(), 'bozuk.wav', 'audio/wav'));
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe('decode-failed');
    expect(MockAudioContext.instances).toHaveLength(1);
    expect(MockAudioContext.instances[0].closeCalls).toBe(1);
  });

  it('returns empty-file for a zero-byte file without creating a context', async () => {
    const result = await service.decode(audioFile(new Uint8Array(0), 'bos.wav', 'audio/wav'));
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe('empty-file');
    expect(MockAudioContext.instances).toHaveLength(0);
  });

  it('handles a synchronous decodeAudioData throw as decode-failed', async () => {
    MockAudioContext.mode = 'sync-throw';
    const result = await service.decode(audioFile(wavBytes(), 'senkron.wav', 'audio/wav'));
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe('decode-failed');
    expect(MockAudioContext.instances[0].closeCalls).toBe(1);
  });

  it('returns aborted before decode when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const result = await service.decode(audioFile(wavBytes(), 'iptal.wav', 'audio/wav'), {
      signal: controller.signal,
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe('aborted');
    expect(MockAudioContext.instances).toHaveLength(0);
  });

  it('aborts during a pending decode and ignores the late result', async () => {
    MockAudioContext.mode = 'pending';
    const controller = new AbortController();
    const pending = service.decode(audioFile(wavBytes(), 'gec.wav', 'audio/wav'), {
      signal: controller.signal,
    });
    await flush();
    expect(MockAudioContext.instances).toHaveLength(1);
    expect(MockAudioContext.instances[0].decodeCalls).toBe(1);

    controller.abort();
    const result = await pending;
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe('aborted');
    expect(MockAudioContext.instances[0].closeCalls).toBe(1);

    // Geç gelen decode sonucu: promise zaten settled; sonuç sayılmaz.
    MockAudioContext.nextBuffer = monoBuffer();
    MockAudioContext.instances[0].pendingResolvers[0](MockAudioContext.nextBuffer);
    await flush();
    expect(await pending).toEqual(result);
  });

  it('closes AudioContext on success, failure and abort paths', async () => {
    MockAudioContext.mode = 'resolve';
    MockAudioContext.nextBuffer = monoBuffer();
    await service.decode(audioFile(wavBytes(), 'basari.wav', 'audio/wav'));

    MockAudioContext.mode = 'reject';
    await service.decode(audioFile(wavBytes(), 'hata.wav', 'audio/wav'));

    MockAudioContext.mode = 'pending';
    const controller = new AbortController();
    const pending = service.decode(audioFile(wavBytes(), 'yol.wav', 'audio/wav'), {
      signal: controller.signal,
    });
    await flush();
    controller.abort();
    await pending;

    expect(MockAudioContext.instances).toHaveLength(3);
    for (const context of MockAudioContext.instances) {
      expect(context.closeCalls).toBe(1);
    }
  });

  it('creates a fresh context per call and closes each one (no leak)', async () => {
    MockAudioContext.mode = 'resolve';
    MockAudioContext.nextBuffer = monoBuffer();
    for (let i = 0; i < 5; i++) {
      const result = await service.decode(audioFile(wavBytes(), `kayit-${i}.wav`, 'audio/wav'));
      expect(result.ok).toBe(true);
    }
    expect(MockAudioContext.instances).toHaveLength(5);
    for (const context of MockAudioContext.instances) {
      expect(context.decodeCalls).toBe(1);
      expect(context.closeCalls).toBe(1);
    }
  });

  it('waits for AudioContext.close() before resolving a successful decode', async () => {
    MockAudioContext.nextBuffer = monoBuffer();
    let finishClose!: () => void;
    MockAudioContext.closePromise = new Promise<void>((resolve) => {
      finishClose = resolve;
    });
    let settled = false;

    const pending = service
      .decode(audioFile(wavBytes(), 'close-await.wav', 'audio/wav'))
      .finally(() => {
        settled = true;
      });
    await flush();

    expect(MockAudioContext.instances[0].closeCalls).toBe(1);
    expect(settled).toBe(false);
    finishClose();
    await expect(pending).resolves.toMatchObject({ ok: true });
    expect(settled).toBe(true);
  });

  it('performs no network requests during decode', async () => {
    MockAudioContext.nextBuffer = monoBuffer();
    const calls = await networkCallsDuring(() =>
      service.decode(audioFile(wavBytes(), 'ag.wav', 'audio/wav')),
    );
    expect(calls).toBe(0);
  });

  it('returns unsupported when AudioContext is unavailable', async () => {
    (globalThis as { AudioContext?: unknown }).AudioContext = undefined;
    const result = await service.decode(audioFile(wavBytes(), 'destek.wav', 'audio/wav'));
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe('unsupported');
    expect(MockAudioContext.instances).toHaveLength(0);
  });

  it('refuses before decode when the hinted PCM estimate exceeds the cap', async () => {
    const result = await service.decode(audioFile(wavBytes(), 'buyuk.wav', 'audio/wav'), {
      hints: { durationSeconds: 600, sampleRate: 192000, numberOfChannels: 8 },
    });
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe('memory-limit');
    // Context açılmadan reddedildi.
    expect(MockAudioContext.instances).toHaveLength(0);
  });

  it('refuses after decode when the actual PCM size exceeds the cap', async () => {
    // Tam 600 sn'de 115.200.000 kare × 2 kanal × 4 B = 921,6 MB; gerçek tahsis YOK.
    MockAudioContext.nextBuffer = new MockAudioBuffer(192000, 2, 115_200_000, []);
    const result = await service.decode(audioFile(wavBytes(), 'dev.wav', 'audio/wav'));
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe('memory-limit');
    expect(MockAudioContext.instances[0].closeCalls).toBe(1);
  });

  it('returns missing-file for null or invalid input', async () => {
    const nullResult = await service.decode(null);
    const undefinedResult = await service.decode(undefined);
    const invalidResult = await service.decode({} as File);
    for (const result of [nullResult, undefinedResult, invalidResult]) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('missing-file');
      }
    }
    expect(MockAudioContext.instances).toHaveLength(0);
  });

  it('returns read-failed when the file cannot be read', async () => {
    const badFile = {
      size: 4,
      arrayBuffer: () => Promise.reject(new Error('io error')),
    } as unknown as File;
    const result = await service.decode(badFile);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.code).toBe('read-failed');
    expect(MockAudioContext.instances).toHaveLength(0);
  });
});

describe('estimateDecodedPcmBytes', () => {
  it('returns null when duration is unknown or invalid (no false certainty)', () => {
    expect(estimateDecodedPcmBytes(undefined)).toBeNull();
    expect(estimateDecodedPcmBytes(null)).toBeNull();
    expect(estimateDecodedPcmBytes({})).toBeNull();
    expect(estimateDecodedPcmBytes({ durationSeconds: 0 })).toBeNull();
    expect(estimateDecodedPcmBytes({ durationSeconds: Number.NaN })).toBeNull();
    expect(estimateDecodedPcmBytes({ durationSeconds: -5 })).toBeNull();
    expect(estimateDecodedPcmBytes({ durationSeconds: Number.POSITIVE_INFINITY })).toBeNull();
  });

  it('computes exact bytes with known metadata and documented assumptions otherwise', () => {
    expect(
      estimateDecodedPcmBytes({ durationSeconds: 1, sampleRate: 8000, numberOfChannels: 1 }),
    ).toBe(8000 * 4);
    // Hız bilinmiyorsa 48000, kanal bilinmiyorsa 2 varsayımı.
    expect(estimateDecodedPcmBytes({ durationSeconds: 1 })).toBe(48000 * 2 * 4);
    expect(estimateDecodedPcmBytes({ durationSeconds: 2, sampleRate: 16000 })).toBe(
      2 * 16000 * 2 * 4,
    );
    // Geçersiz hız/kanal değeri varsayıma düşer (sahte kesinlik yok).
    expect(
      estimateDecodedPcmBytes({ durationSeconds: 1, sampleRate: 0, numberOfChannels: -1 }),
    ).toBe(48000 * 2 * 4);
    // Ürün tavanı hâlâ uygulanabilir: 512 MiB sınırının üstünde tahmin.
    expect(MAX_DECODED_PCM_BYTES).toBe(512 * 1024 * 1024);
  });
});
