import { TestBed } from '@angular/core/testing';
import {
  OggMetadataService,
  OGG_HEADER_READ_BYTES,
  OPUS_OUTPUT_SAMPLE_RATE_HZ,
  type OggMetadataResult,
} from './ogg-metadata.service';
import { asciiBytes, bytesOf, concatBytes } from './testing/audio-fixtures';

function le16(value: number): Uint8Array {
  return bytesOf(value & 0xff, (value >> 8) & 0xff);
}

function le32Local(value: number): Uint8Array {
  return bytesOf(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
}

interface OpusHeadOptions {
  readonly version?: number;
  readonly channels?: number;
  readonly preSkip?: number;
  readonly inputSampleRateHz?: number;
  readonly outputGain?: number;
  readonly mappingFamily?: number;
}

function opusHeadBytes(options: OpusHeadOptions = {}): Uint8Array {
  return concatBytes(
    asciiBytes('OpusHead'),
    le16(options.version ?? 1),
    bytesOf(options.channels ?? 1),
    le16(options.preSkip ?? 0),
    le32Local(options.inputSampleRateHz ?? 48000),
    le16(options.outputGain ?? 0),
    bytesOf(options.mappingFamily ?? 0),
  );
}

interface OggPageOptions {
  readonly headerType?: number;
  readonly segmentLengths?: readonly number[];
  readonly body?: Uint8Array;
  readonly oggVersion?: number;
}

function oggPageBytes(options: OggPageOptions = {}): Uint8Array {
  const body = options.body ?? new Uint8Array(0);
  const segmentLengths = options.segmentLengths ?? [body.length];
  const segmentTable = Uint8Array.from(segmentLengths);
  return concatBytes(
    asciiBytes('OggS'),
    bytesOf(options.oggVersion ?? 0),
    bytesOf(options.headerType ?? 0x02),
    new Uint8Array(8),
    bytesOf(0x11, 0x22, 0x33, 0x44),
    new Uint8Array(4),
    new Uint8Array(4),
    bytesOf(segmentTable.length),
    segmentTable,
    body,
  );
}

function opusOggBytes(options: OpusHeadOptions & OggPageOptions = {}): Uint8Array {
  const { version, channels, preSkip, inputSampleRateHz, outputGain, mappingFamily, ...page } =
    options;
  return oggPageBytes({
    ...page,
    body:
      page.body ??
      opusHeadBytes({ version, channels, preSkip, inputSampleRateHz, outputGain, mappingFamily }),
  });
}

function vorbisOggBytes(): Uint8Array {
  const body = concatBytes(bytesOf(0x01), asciiBytes('vorbis'), new Uint8Array(16));
  return oggPageBytes({ body, segmentLengths: [body.length] });
}

function audioFile(bytes: Uint8Array, name = 'ornek.ogg', type = 'audio/ogg'): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe('OggMetadataService', () => {
  let service: OggMetadataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OggMetadataService);
  });

  it('reads a valid OGG/Opus header with mono channels and 48 kHz output rate', async () => {
    const file = audioFile(opusOggBytes({ channels: 1, inputSampleRateHz: 48000 }));

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.codec).toBe('opus');
      expect(result.metadata.channels).toBe(1);
      expect(result.metadata.outputSampleRateHz).toBe(OPUS_OUTPUT_SAMPLE_RATE_HZ);
      expect(result.metadata.outputSampleRateHz).toBe(48000);
      expect(result.metadata.inputSampleRateHz).toBe(48000);
      expect(result.metadata.durationSeconds).toBeNull();
      expect(result.metadata.mappingFamily).toBe(0);
      expect(result.metadata.preSkipSamples).toBe(0);
    }
  });

  it('reads stereo channel count from OpusHead', async () => {
    const file = audioFile(opusOggBytes({ channels: 2 }));

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.channels).toBe(2);
    }
  });

  it('does not confuse OpusHead input sample rate with 48 kHz output rate', async () => {
    // Girdi 16 kHz; çıkış yine 48 kHz olmalı (RFC 7845).
    const file = audioFile(opusOggBytes({ channels: 1, inputSampleRateHz: 16000 }));

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.inputSampleRateHz).toBe(16000);
      expect(result.metadata.outputSampleRateHz).toBe(48000);
      expect(result.metadata.outputSampleRateHz).not.toBe(result.metadata.inputSampleRateHz);
    }
  });

  it('rejects a missing file', async () => {
    for (const input of [null, undefined, {} as File]) {
      const result = await service.read(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('invalid-file');
        expect(result.reason).toBe('missing-file');
      }
    }
  });

  it('rejects a 0-byte file without reading', async () => {
    let sliceCalls = 0;
    const watched = {
      name: 'bos.ogg',
      type: 'audio/ogg',
      size: 0,
      slice: (...args: Parameters<File['slice']>) => {
        sliceCalls += 1;
        return new File([], 'bos.ogg').slice(...args);
      },
    } as unknown as File;

    const result = await service.read(watched);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('empty-file');
    }
    expect(sliceCalls).toBe(0);
  });

  it('rejects a file shorter than an Ogg page header', async () => {
    const result = await service.read(audioFile(bytesOf(0x4f, 0x67, 0x67, 0x53, 0x00)));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid-file');
      expect(result.reason).toBe('truncated-header');
    }
  });

  it('rejects a non-OggS signature', async () => {
    const result = await service.read(audioFile(asciiBytes('RIFF....WAVE-not-ogg-at-all-here')));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('not-ogg');
      expect(result.message).toContain('OGG');
    }
  });

  it('rejects a truncated OggS header (segment table cut off)', async () => {
    // OggS + version + type + granule… ama segment tablosu yok (27. bayt eksik).
    const partial = concatBytes(
      asciiBytes('OggS'),
      bytesOf(0x00),
      bytesOf(0x02),
      new Uint8Array(8),
      bytesOf(0x11, 0x22, 0x33, 0x44),
      new Uint8Array(4),
      new Uint8Array(4),
    );
    expect(partial.length).toBe(26);

    const result = await service.read(audioFile(partial));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('truncated-header');
    }
  });

  it('rejects an Ogg page with unsupported version', async () => {
    const result = await service.read(audioFile(opusOggBytes({ oggVersion: 1 })));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('bad-page');
    }
  });

  it('rejects segment lengths that claim a body larger than the file', async () => {
    // Segment tablosu 200 bayt body iddia ediyor; dosya body içermiyor.
    const headerOnly = oggPageBytes({ segmentLengths: [200], body: new Uint8Array(0) });
    const file = audioFile(headerOnly);

    const result = await service.read(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('bad-page');
      expect(result.message).toContain('bozuk');
    }
  });

  it('rejects a page with no body when OpusHead is required', async () => {
    const emptyBodyPage = oggPageBytes({ segmentLengths: [0], body: new Uint8Array(0) });
    const result = await service.read(audioFile(emptyBodyPage));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('missing-opus-head');
    }
  });

  it('rejects OGG/Vorbis as unsupported non-Opus codec', async () => {
    const result = await service.read(audioFile(vorbisOggBytes(), 'vorbis.ogg'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('unsupported-codec');
      expect(result.reason).toBe('not-opus');
      expect(result.message).toContain('Opus');
    }
  });

  it('rejects an OGG page whose body is not OpusHead', async () => {
    const body = asciiBytes('NotAnOpusPacketPayload!!');
    const result = await service.read(
      audioFile(oggPageBytes({ body, segmentLengths: [body.length] })),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('missing-opus-head');
    }
  });

  it('rejects OpusHead truncated before channel count', async () => {
    // "OpusHead" + yalnız 2 bayt version; channels yok.
    const shortBody = concatBytes(asciiBytes('OpusHead'), le16(1));
    const result = await service.read(
      audioFile(oggPageBytes({ body: shortBody, segmentLengths: [shortBody.length] })),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('truncated-header');
    }
  });

  it('rejects OpusHead with zero channels', async () => {
    const result = await service.read(audioFile(opusOggBytes({ channels: 0 })));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('bad-opus-head');
      expect(result.message).toContain('OpusHead');
    }
  });

  it('rejects OpusHead with a non-zero major version byte', async () => {
    // version high byte != 0 → bilinmeyen/desteklenmeyen major sürüm.
    const result = await service.read(audioFile(opusOggBytes({ version: 0x0201 })));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('bad-opus-head');
    }
  });

  it('rejects an empty file and a corrupt tiny blob without crashing', async () => {
    const empty = await service.read(new File([], 'bos.ogg', { type: 'audio/ogg' }));
    expect(empty.ok).toBe(false);
    if (!empty.ok) {
      expect(empty.reason).toBe('empty-file');
    }

    const corrupt = await service.read(
      audioFile(bytesOf(0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07), 'cop.ogg'),
    );
    expect(corrupt.ok).toBe(false);
    if (!corrupt.ok) {
      expect(corrupt.code).toBe('invalid-file');
    }
  });

  it('reports an unreadable file instead of crashing', async () => {
    const broken = {
      name: 'kirik.ogg',
      type: 'audio/ogg',
      size: 100,
      slice: () => {
        throw new Error('okunamıyor');
      },
    } as unknown as File;

    const result = await service.read(broken);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unreadable');
    }
  });

  it('reads at most one bounded header slice of OGG_HEADER_READ_BYTES', async () => {
    // Büyük body'li dosya: tamamı asla okunmamalı.
    const bigBody = new Uint8Array(200_000);
    bigBody.set(opusHeadBytes({ channels: 2 }), 0);
    const file = audioFile(
      oggPageBytes({
        body: bigBody,
        segmentLengths: [255, 255, 255, 255, 255, 255, 255, 255, 255, 255],
      }),
      'buyuk.ogg',
    );
    expect(file.size).toBeGreaterThan(OGG_HEADER_READ_BYTES);

    const calls: (readonly [number, number | undefined])[] = [];
    const watched = {
      name: file.name,
      type: file.type,
      size: file.size,
      slice: (start?: number, end?: number) => {
        calls.push([start ?? 0, end]);
        return file.slice(start, end);
      },
    } as unknown as File;

    const result = await service.read(watched);

    expect(calls).toEqual([[0, OGG_HEADER_READ_BYTES]]);
    // Segment tablosu dosyanın tamamını iddia ettiği için bad-page veya
    // sınırlı okumada OpusHead başı görülebilir; kritik olan bütçe aşılmaz.
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
    }
  });

  it('never claims a duration from a header-only read', async () => {
    const result = await service.read(audioFile(opusOggBytes({ channels: 2 })));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
    }
  });

  it('does not send file bytes over the network (fetch/XHR/beacon/WebSocket)', async () => {
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
      const file = audioFile(opusOggBytes({ channels: 2 }));
      const result: OggMetadataResult = await service.read(file);
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
});
