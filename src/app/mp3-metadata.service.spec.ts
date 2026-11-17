import { TestBed } from '@angular/core/testing';
import {
  Mp3MetadataService,
  MP3_METADATA_TIMEOUT_MS,
  MP3_RECOMMENDED_MAX_DURATION_SECONDS,
  type Mp3MetadataResult,
} from './mp3-metadata.service';
import { asciiBytes, concatBytes } from './testing/audio-fixtures';

interface FakeAudioBehavior {
  readonly duration: number;
  readonly fire: 'loadedmetadata' | 'error' | 'never';
}

let nextBehavior: FakeAudioBehavior = {
  duration: 3.5,
  fire: 'loadedmetadata',
};

interface FakeAudioInstanceLog {
  durationReported: number;
  src: string;
  srcAssignments: number;
  loadCalls: number;
  removeAttributeCalls: number;
  listeners: Map<string, Set<() => void>>;
  canPlayTypeCalls: number;
}

const audioLogs: FakeAudioInstanceLog[] = [];

function configureNextAudio(options: {
  duration?: number;
  fire?: FakeAudioBehavior['fire'];
}): void {
  nextBehavior = {
    duration: options.duration ?? NaN,
    fire: options.fire ?? 'loadedmetadata',
  };
}

class FakeAudio {
  duration = Number.NaN;
  preload = '';
  private srcValue = '';
  private readonly log: FakeAudioInstanceLog;

  constructor() {
    this.log = {
      durationReported: Number.NaN,
      src: '',
      srcAssignments: 0,
      loadCalls: 0,
      removeAttributeCalls: 0,
      listeners: new Map(),
      canPlayTypeCalls: 0,
    };
    audioLogs.push(this.log);
    this.durationReported = nextBehavior.duration;
    this.fireMode = nextBehavior.fire;
  }

  private readonly durationReported: number;
  private readonly fireMode: FakeAudioBehavior['fire'];

  get src(): string {
    return this.srcValue;
  }

  set src(value: string) {
    this.srcValue = value;
    this.log.src = value;
    this.log.srcAssignments += 1;
    if (this.fireMode === 'loadedmetadata') {
      this.duration = this.durationReported;
      queueMicrotask(() => this.dispatch('loadedmetadata'));
    } else if (this.fireMode === 'error') {
      queueMicrotask(() => this.dispatch('error'));
    }
  }

  addEventListener(type: string, listener: () => void): void {
    if (!this.log.listeners.has(type)) {
      this.log.listeners.set(type, new Set());
    }
    this.log.listeners.get(type)?.add(listener);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.log.listeners.get(type)?.delete(listener);
  }

  removeAttribute(name: string): void {
    if (name === 'src') {
      this.srcValue = '';
      this.log.removeAttributeCalls += 1;
    }
  }

  load(): void {
    this.log.loadCalls += 1;
  }

  canPlayType(): string {
    this.log.canPlayTypeCalls += 1;
    return '';
  }

  private dispatch(type: string): void {
    for (const listener of [...(this.log.listeners.get(type) ?? [])]) {
      listener();
    }
  }
}

function audioFile(bytes: Uint8Array, name = 'ornek.mp3', type = 'audio/mpeg'): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

/**
 * SHHH-013'ten geçen sentetik başlık (ID3 + tek MPEG kare senkronu).
 * Tamamen oynatılabilir MP3 olarak KABUL EDİLMEZ.
 */
function syntheticMp3HeaderBytes(): Uint8Array {
  const id3 = concatBytes(
    asciiBytes('ID3'),
    asciiBytes('\x03\x00'),
    asciiBytes('\x00'),
    asciiBytes('\x00\x00\x00\x00'),
  );
  const frame = concatBytes(asciiBytes('\xff\xfb\x90\x64'), new Uint8Array(60));
  return concatBytes(id3, frame);
}

/**
 * Çok kareli sentetik MPEG yığını (yapısal başlık).
 * Decode edilebilirlik ortama bağlıdır; oynatılabilirlik iddiası yoktur.
 */
function multiFrameMp3Bytes(frameCount = 80): Uint8Array {
  const frameHeader = Uint8Array.from([0xff, 0xfb, 0x20, 0xc4]);
  const frameSize = 104;
  const frame = new Uint8Array(frameSize);
  frame.set(frameHeader, 0);
  const out = new Uint8Array(frameCount * frameSize);
  for (let i = 0; i < frameCount; i++) {
    out.set(frame, i * frameSize);
  }
  return out;
}

const OriginalAudio = globalThis.Audio;
const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, 'createObjectURL');
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, 'revokeObjectURL');

function installFakes(): void {
  audioLogs.length = 0;
  configureNextAudio({ duration: 3.5, fire: 'loadedmetadata' });
  globalThis.Audio = FakeAudio as unknown as typeof Audio;
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(() => 'blob:mp3-test-url'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: vi.fn(),
  });
}

function uninstallFakes(): void {
  globalThis.Audio = OriginalAudio;
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

function onlyLog(): FakeAudioInstanceLog {
  const log = audioLogs[audioLogs.length - 1];
  if (!log) {
    throw new Error('FakeAudio log yok');
  }
  return log;
}

describe('Mp3MetadataService', () => {
  let service: Mp3MetadataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Mp3MetadataService);
    installFakes();
  });

  afterEach(() => {
    uninstallFakes();
    vi.useRealTimers();
  });

  it('returns a finite duration from HTMLAudioElement metadata', async () => {
    configureNextAudio({ duration: 3.5, fire: 'loadedmetadata' });

    const result = await service.read(audioFile(syntheticMp3HeaderBytes()));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.codec).toBe('mp3');
      expect(result.metadata.durationSeconds).toBe(3.5);
      expect(result.exceedsRecommendedDuration).toBe(false);
    }
    expect(onlyLog().srcAssignments).toBe(1);
    expect(onlyLog().loadCalls).toBeGreaterThanOrEqual(1);
  });

  it('reports a reliable duration over 20 minutes as a separate flag', async () => {
    const over = MP3_RECOMMENDED_MAX_DURATION_SECONDS + 1;
    configureNextAudio({ duration: over, fire: 'loadedmetadata' });

    const result = await service.read(audioFile(syntheticMp3HeaderBytes(), 'uzun.mp3'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBe(over);
      expect(result.exceedsRecommendedDuration).toBe(true);
    }
  });

  it('does not flag a duration exactly at the 20-minute recommendation', async () => {
    configureNextAudio({
      duration: MP3_RECOMMENDED_MAX_DURATION_SECONDS,
      fire: 'loadedmetadata',
    });

    const result = await service.read(audioFile(syntheticMp3HeaderBytes()));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBe(MP3_RECOMMENDED_MAX_DURATION_SECONDS);
      expect(result.exceedsRecommendedDuration).toBe(false);
    }
  });

  it('returns null duration for Infinity (no fake VBR estimate)', async () => {
    configureNextAudio({ duration: Number.POSITIVE_INFINITY, fire: 'loadedmetadata' });

    const result = await service.read(audioFile(syntheticMp3HeaderBytes(), 'vbr-inf.mp3'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
      expect(result.exceedsRecommendedDuration).toBe(false);
    }
  });

  it('returns null duration for NaN duration', async () => {
    configureNextAudio({ duration: Number.NaN, fire: 'loadedmetadata' });

    const result = await service.read(audioFile(syntheticMp3HeaderBytes()));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
    }
  });

  it('returns null duration for negative duration', async () => {
    configureNextAudio({ duration: -2.5, fire: 'loadedmetadata' });

    const result = await service.read(audioFile(syntheticMp3HeaderBytes()));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
    }
  });

  it('returns null duration when metadata times out and still cleans resources', async () => {
    configureNextAudio({ fire: 'never' });
    vi.useFakeTimers();

    const promise = service.read(audioFile(syntheticMp3HeaderBytes(), 'timeout.mp3'));
    await vi.advanceTimersByTimeAsync(MP3_METADATA_TIMEOUT_MS + 10);
    const result = await promise;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
      expect(result.exceedsRecommendedDuration).toBe(false);
    }
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mp3-test-url');
    expect(onlyLog().removeAttributeCalls).toBeGreaterThanOrEqual(1);
    expect(onlyLog().loadCalls).toBeGreaterThanOrEqual(2);
  });

  it('returns null duration on media error and still cleans resources', async () => {
    configureNextAudio({ fire: 'error' });

    const result = await service.read(audioFile(syntheticMp3HeaderBytes(), 'bozuk.mp3'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
    }
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mp3-test-url');
    expect(onlyLog().removeAttributeCalls).toBeGreaterThanOrEqual(1);
  });

  it('rejects a missing file without creating a Blob URL', async () => {
    for (const input of [null, undefined, {} as File]) {
      const result = await service.read(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('invalid-file');
        expect(result.reason).toBe('missing-file');
      }
    }
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('rejects a 0-byte file without creating a Blob URL', async () => {
    const result = await service.read(new File([], 'bos.mp3', { type: 'audio/mpeg' }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('empty-file');
    }
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('creates a local Blob URL and always revokes it on success', async () => {
    configureNextAudio({ duration: 1.25, fire: 'loadedmetadata' });
    const file = audioFile(syntheticMp3HeaderBytes());

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mp3-test-url');
    expect(onlyLog().srcAssignments).toBe(1);
    expect(onlyLog().removeAttributeCalls).toBeGreaterThanOrEqual(1);
  });

  it('keeps rapid consecutive reads independent and cleans each Blob URL', async () => {
    const fileA = audioFile(syntheticMp3HeaderBytes(), 'a.mp3');
    const fileB = audioFile(syntheticMp3HeaderBytes(), 'b.mp3');

    configureNextAudio({ duration: 2.5, fire: 'loadedmetadata' });
    const first = service.read(fileA);
    configureNextAudio({ duration: Number.NaN, fire: 'loadedmetadata' });
    const second = service.read(fileB);

    const [resultA, resultB] = await Promise.all([first, second]);

    expect(resultA.ok).toBe(true);
    expect(resultB.ok).toBe(true);
    if (resultA.ok && resultB.ok) {
      expect(resultA.metadata.durationSeconds).toBe(2.5);
      expect(resultB.metadata.durationSeconds).toBeNull();
    }
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2);
    expect(audioLogs).toHaveLength(2);
    for (const log of audioLogs) {
      expect(log.removeAttributeCalls).toBeGreaterThanOrEqual(1);
    }
  });

  it('does not send file bytes over the network (fetch/XHR/beacon/WebSocket)', async () => {
    configureNextAudio({ duration: 4, fire: 'loadedmetadata' });

    const fetchSpy = vi.fn();
    const openSpy = vi.fn();
    const beaconSpy = vi.fn();
    const wsSpy = vi.fn();

    const originalFetch = globalThis.fetch;
    const originalOpen = XMLHttpRequest.prototype.open;
    const originalBeacon = navigator.sendBeacon?.bind(navigator);
    const OriginalWebSocket = globalThis.WebSocket;

    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    XMLHttpRequest.prototype.open = openSpy as unknown as typeof XMLHttpRequest.prototype.open;
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: beaconSpy,
    });
    globalThis.WebSocket = wsSpy as unknown as typeof WebSocket;

    try {
      const result: Mp3MetadataResult = await service.read(
        audioFile(syntheticMp3HeaderBytes(), 'ag-yok.mp3'),
      );
      expect(result.ok).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
      XMLHttpRequest.prototype.open = originalOpen;
      if (originalBeacon) {
        Object.defineProperty(navigator, 'sendBeacon', {
          configurable: true,
          value: originalBeacon,
        });
      }
      globalThis.WebSocket = OriginalWebSocket;
    }

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(openSpy).not.toHaveBeenCalled();
    expect(beaconSpy).not.toHaveBeenCalled();
    expect(wsSpy).not.toHaveBeenCalled();
  });

  it('does not call canPlayType as a decode proof', async () => {
    configureNextAudio({ duration: 2, fire: 'loadedmetadata' });

    const result = await service.read(audioFile(syntheticMp3HeaderBytes()));

    expect(result.ok).toBe(true);
    expect(onlyLog().canPlayTypeCalls).toBe(0);
  });

  it('does not derive duration from file size when media reports nothing', async () => {
    configureNextAudio({ fire: 'never' });
    vi.useFakeTimers();

    const big = new Uint8Array(64_000);
    big.set(syntheticMp3HeaderBytes().subarray(0, Math.min(70, big.length)), 0);
    const promise = service.read(audioFile(big, 'buyuk-vbr.mp3'));
    await vi.advanceTimersByTimeAsync(MP3_METADATA_TIMEOUT_MS + 10);
    const result = await promise;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
    }
  });
});

describe('Mp3MetadataService — gerçek MP3 dosyası (mock dışı rapor)', () => {
  let service: Mp3MetadataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Mp3MetadataService);
    installFakes();
  });

  afterEach(() => {
    uninstallFakes();
    vi.useRealTimers();
  });

  it('reads multi-frame MP3 bytes through Blob URL without bitrate guessing', async () => {
    const bytes = multiFrameMp3Bytes(80);
    expect(bytes.length).toBeGreaterThan(8000);

    configureNextAudio({ duration: 1.86, fire: 'loadedmetadata' });
    const result = await service.read(audioFile(bytes, 'cok-kareli.mp3'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.codec).toBe('mp3');
      expect(result.metadata.durationSeconds).toBe(1.86);
    }
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });

  it('returns null duration (no estimate) when the environment cannot produce metadata', async () => {
    configureNextAudio({ fire: 'never' });
    vi.useFakeTimers();

    const promise = service.read(audioFile(multiFrameMp3Bytes(80), 'decode-yok.mp3'));
    await vi.advanceTimersByTimeAsync(MP3_METADATA_TIMEOUT_MS + 10);
    const result = await promise;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
      expect(result.exceedsRecommendedDuration).toBe(false);
    }
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
