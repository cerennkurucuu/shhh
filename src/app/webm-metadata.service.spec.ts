import { TestBed } from '@angular/core/testing';
import {
  WebmMetadataService,
  WEBM_METADATA_TIMEOUT_MS,
  WEBM_RECOMMENDED_MAX_DURATION_SECONDS,
  type WebmMetadataResult,
} from './webm-metadata.service';
import { webmHeaderBytes } from './testing/audio-fixtures';

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
  private readonly durationReported: number;
  private readonly fireMode: FakeAudioBehavior['fire'];

  constructor() {
    this.log = {
      durationReported: Number.NaN,
      src: '',
      srcAssignments: 0,
      loadCalls: 0,
      removeAttributeCalls: 0,
      listeners: new Map(),
    };
    audioLogs.push(this.log);
    this.durationReported = nextBehavior.duration;
    this.fireMode = nextBehavior.fire;
  }

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

  private dispatch(type: string): void {
    for (const listener of [...(this.log.listeners.get(type) ?? [])]) {
      listener();
    }
  }
}

function webmFile(bytes: Uint8Array, name = 'ornek.webm', type = 'audio/webm'): File {
  return new File([new Uint8Array(bytes)], name, { type });
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
    value: vi.fn(() => 'blob:webm-test-url'),
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

describe('WebmMetadataService', () => {
  let service: WebmMetadataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WebmMetadataService);
    installFakes();
  });

  afterEach(() => {
    uninstallFakes();
    vi.useRealTimers();
  });

  it('returns a finite duration from HTMLAudioElement metadata', async () => {
    configureNextAudio({ duration: 12.75, fire: 'loadedmetadata' });

    const result = await service.read(webmFile(webmHeaderBytes()));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBe(12.75);
      expect(result.exceedsRecommendedDuration).toBe(false);
    }
    expect(onlyLog().srcAssignments).toBe(1);
    expect(onlyLog().loadCalls).toBeGreaterThanOrEqual(1);
  });

  it('reports codec as null (unknown) — never assumes Opus from container', async () => {
    configureNextAudio({ duration: 5, fire: 'loadedmetadata' });

    const result = await service.read(webmFile(webmHeaderBytes(), 'sarki.webm', 'audio/webm'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.codec).toBeNull();
      expect(result.metadata.codec).not.toBe('opus');
      expect(result.metadata.codec).not.toBe('Opus');
    }
  });

  it('returns null duration when metadata is unavailable (no estimate)', async () => {
    configureNextAudio({ fire: 'never' });
    vi.useFakeTimers();

    const promise = service.read(webmFile(webmHeaderBytes(), 'belirsiz.webm'));
    await vi.advanceTimersByTimeAsync(WEBM_METADATA_TIMEOUT_MS + 10);
    const result = await promise;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
      expect(result.exceedsRecommendedDuration).toBe(false);
      expect(result.metadata.codec).toBeNull();
    }
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:webm-test-url');
    expect(onlyLog().removeAttributeCalls).toBeGreaterThanOrEqual(1);
    expect(onlyLog().loadCalls).toBeGreaterThanOrEqual(2);
  });

  it('returns null duration on media error and still cleans resources', async () => {
    configureNextAudio({ fire: 'error' });

    const result = await service.read(webmFile(webmHeaderBytes(), 'bozuk.webm'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
    }
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:webm-test-url');
    expect(onlyLog().removeAttributeCalls).toBeGreaterThanOrEqual(1);
  });

  it('rejects NaN duration from the media element', async () => {
    configureNextAudio({ duration: Number.NaN, fire: 'loadedmetadata' });

    const result = await service.read(webmFile(webmHeaderBytes()));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
    }
  });

  it('rejects Infinity duration from the media element', async () => {
    configureNextAudio({ duration: Number.POSITIVE_INFINITY, fire: 'loadedmetadata' });

    const result = await service.read(webmFile(webmHeaderBytes()));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
      expect(result.exceedsRecommendedDuration).toBe(false);
    }
  });

  it('rejects negative duration from the media element', async () => {
    configureNextAudio({ duration: -3, fire: 'loadedmetadata' });

    const result = await service.read(webmFile(webmHeaderBytes()));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
    }
  });

  it('rejects zero duration as unreliable (not a definite value)', async () => {
    configureNextAudio({ duration: 0, fire: 'loadedmetadata' });

    const result = await service.read(webmFile(webmHeaderBytes()));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
      expect(result.exceedsRecommendedDuration).toBe(false);
    }
  });

  it('reports a reliable duration over 20 minutes as a separate flag', async () => {
    const over = WEBM_RECOMMENDED_MAX_DURATION_SECONDS + 1;
    configureNextAudio({ duration: over, fire: 'loadedmetadata' });

    const result = await service.read(webmFile(webmHeaderBytes(), 'uzun.webm'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBe(over);
      expect(result.exceedsRecommendedDuration).toBe(true);
    }
  });

  it('does not flag a duration exactly at the 20-minute recommendation', async () => {
    configureNextAudio({
      duration: WEBM_RECOMMENDED_MAX_DURATION_SECONDS,
      fire: 'loadedmetadata',
    });

    const result = await service.read(webmFile(webmHeaderBytes()));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBe(1200);
      expect(result.exceedsRecommendedDuration).toBe(false);
    }
    expect(WEBM_RECOMMENDED_MAX_DURATION_SECONDS).toBe(1200);
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
    const result = await service.read(new File([], 'bos.webm', { type: 'audio/webm' }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('empty-file');
    }
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it('creates a local Blob URL and always revokes it on success', async () => {
    configureNextAudio({ duration: 1.5, fire: 'loadedmetadata' });
    const file = webmFile(webmHeaderBytes());

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:webm-test-url');
    expect(onlyLog().removeAttributeCalls).toBeGreaterThanOrEqual(1);
  });

  it('keeps rapid consecutive reads independent and cleans each Blob URL', async () => {
    configureNextAudio({ duration: 2.5, fire: 'loadedmetadata' });
    const first = service.read(webmFile(webmHeaderBytes(), 'a.webm'));
    configureNextAudio({ duration: Number.NaN, fire: 'loadedmetadata' });
    const second = service.read(webmFile(webmHeaderBytes(), 'b.webm'));

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
      const result: WebmMetadataResult = await service.read(
        webmFile(webmHeaderBytes(), 'ag-yok.webm'),
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

  it('does not call canPlayType as a decode or audio-track proof', async () => {
    configureNextAudio({ duration: 2, fire: 'loadedmetadata' });
    const canPlaySpy = vi.fn(() => '');
    const proto = FakeAudio.prototype as unknown as { canPlayType?: () => string };
    proto.canPlayType = canPlaySpy;

    try {
      const result = await service.read(webmFile(webmHeaderBytes()));
      expect(result.ok).toBe(true);
      expect(canPlaySpy).not.toHaveBeenCalled();
    } finally {
      delete proto.canPlayType;
    }
  });

  it('does not invent a definite duration when audio track is unknown (loadedmetadata ≠ track proof)', async () => {
    // Süre null ise kesinlik üretilmez; codec de null kalır.
    configureNextAudio({ fire: 'never' });
    vi.useFakeTimers();

    const promise = service.read(webmFile(webmHeaderBytes(), 'tracksiz.webm'));
    await vi.advanceTimersByTimeAsync(WEBM_METADATA_TIMEOUT_MS + 10);
    const result = await promise;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
      expect(result.metadata.codec).toBeNull();
      expect(result.exceedsRecommendedDuration).toBe(false);
    }
  });
});

describe('WebmMetadataService — gerçek medya dosyası (mock dışı rapor)', () => {
  let service: WebmMetadataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WebmMetadataService);
    installFakes();
  });

  afterEach(() => {
    uninstallFakes();
    vi.useRealTimers();
  });

  it('reads an EBML/WebM header file object through Blob URL without inventing codec or duration', async () => {
    // Sentetik EBML başlığı oynatılabilir WebM olarak İDDİA EDİLMEZ.
    const bytes = webmHeaderBytes();
    configureNextAudio({ fire: 'never' });
    vi.useFakeTimers();

    const promise = service.read(webmFile(bytes, 'ebml-yalniz.webm'));
    await vi.advanceTimersByTimeAsync(WEBM_METADATA_TIMEOUT_MS + 10);
    const result = await promise;

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.codec).toBeNull();
      expect(result.metadata.durationSeconds).toBeNull();
      expect(result.exceedsRecommendedDuration).toBe(false);
    }
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
  });
});
