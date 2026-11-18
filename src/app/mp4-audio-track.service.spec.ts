import { TestBed } from '@angular/core/testing';
import { Mp4AudioTrackService, MP4_AUDIO_TRACK_MAX_READ_BYTES } from './mp4-audio-track.service';
import { asciiBytes, concatBytes } from './testing/audio-fixtures';

/** Geçerli ISO-BMFF big-endian 32-bit. */
function be32(value: number): Uint8Array {
  return Uint8Array.from([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]);
}

function box(type: string, ...payloads: Uint8Array[]): Uint8Array {
  const payload = concatBytes(...payloads);
  return concatBytes(be32(8 + payload.length), asciiBytes(type), payload);
}

function fullBox(type: string, ...payloads: Uint8Array[]): Uint8Array {
  return box(type, Uint8Array.from([0, 0, 0, 0]), ...payloads);
}

/** hdlr: version/flags + pre_defined + handler_type (+ israf name). */
function hdlrBox(handlerType: string, name = 'x'): Uint8Array {
  return fullBox(
    'hdlr',
    be32(0),
    asciiBytes(handlerType),
    be32(0),
    be32(0),
    be32(0),
    asciiBytes(name),
    Uint8Array.from([0]),
  );
}

function mdiaBox(handlerType: string): Uint8Array {
  return box('mdia', hdlrBox(handlerType), fullBox('minf'));
}

function trakBox(handlerType: string): Uint8Array {
  return box('trak', mdiaBox(handlerType));
}

function ftypBox(): Uint8Array {
  return box('ftyp', asciiBytes('M4A '), be32(0), asciiBytes('M4A '), asciiBytes('mp42'));
}

function moovBox(...traks: Uint8Array[]): Uint8Array {
  return box('moov', ...traks);
}

function mdatBox(payloadSize: number): Uint8Array {
  return concatBytes(be32(8 + payloadSize), asciiBytes('mdat'), new Uint8Array(payloadSize));
}

function fileFrom(bytes: Uint8Array, name = 'sample.mp4'): File {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new File([copy.buffer], name, { type: 'video/mp4' });
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

describe('Mp4AudioTrackService', () => {
  let service: Mp4AudioTrackService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Mp4AudioTrackService);
  });

  it('returns null for missing, empty, or too-small input', async () => {
    expect(await service.hasAudioTrack(null)).toBeNull();
    expect(await service.hasAudioTrack(undefined)).toBeNull();
    expect(await service.hasAudioTrack(new File([], 'empty.mp4'))).toBeNull();
    expect(await service.hasAudioTrack(new File([new Uint8Array(8)], 'tiny.mp4'))).toBeNull();
  });

  it('returns true when only an audio (soun) track exists', async () => {
    const file = fileFrom(concatBytes(ftypBox(), moovBox(trakBox('soun'))));
    expect(await service.hasAudioTrack(file)).toBe(true);
  });

  it('returns false when only a video (vide) track exists', async () => {
    const file = fileFrom(concatBytes(ftypBox(), moovBox(trakBox('vide'))));
    expect(await service.hasAudioTrack(file)).toBe(false);
  });

  it('returns true when both audio and video tracks exist', async () => {
    const file = fileFrom(concatBytes(ftypBox(), moovBox(trakBox('vide'), trakBox('soun'))));
    expect(await service.hasAudioTrack(file)).toBe(true);
  });

  it('returns true when audio track follows video track', async () => {
    const file = fileFrom(concatBytes(ftypBox(), moovBox(trakBox('soun'), trakBox('vide'))));
    expect(await service.hasAudioTrack(file)).toBe(true);
  });

  it('finds moov at the end of the file after a large mdat without reading mdat payload', async () => {
    const mdat = mdatBox(64 * 1024);
    const file = fileFrom(concatBytes(ftypBox(), mdat, moovBox(trakBox('soun'))));
    const sliceCalls: [number, number][] = [];
    const originalSlice = File.prototype.slice;
    File.prototype.slice = function patched(
      this: File,
      start?: number | null,
      end?: number | null,
      contentType?: string,
    ) {
      const s = start ?? 0;
      const e = end ?? this.size;
      sliceCalls.push([s, e]);
      return originalSlice.call(this, start ?? undefined, end ?? undefined, contentType);
    };
    try {
      expect(await service.hasAudioTrack(file)).toBe(true);
    } finally {
      File.prototype.slice = originalSlice;
    }
    // mdat içeriği (payload) asla okunmamalı — yalnız box başlıkları + moov.
    const mdatPayloadStart = ftypBox().length + 8;
    const mdatPayloadEnd = mdatPayloadStart + 64 * 1024;
    const readMdatPayload = sliceCalls.some(
      ([s, e]) =>
        s < mdatPayloadEnd &&
        e > mdatPayloadStart &&
        !(e <= mdatPayloadStart || s >= mdatPayloadEnd),
    );
    expect(readMdatPayload).toBe(false);
  });

  it('returns null when moov is missing entirely', async () => {
    const file = fileFrom(concatBytes(ftypBox(), mdatBox(32)));
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('returns null when trak is truncated', async () => {
    const trak = trakBox('soun');
    const truncated = trak.subarray(0, trak.length - 4);
    const file = fileFrom(concatBytes(ftypBox(), box('moov', truncated)));
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('returns null when mdia is truncated', async () => {
    const mdia = mdiaBox('soun');
    const truncated = mdia.subarray(0, mdia.length - 3);
    const file = fileFrom(concatBytes(ftypBox(), box('moov', box('trak', truncated))));
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('returns null when hdlr payload is truncated before handler_type', async () => {
    // hdlr başlığı + yalnız version/flags (4 bayt) — handler_type yok
    const shortHdlr = concatBytes(be32(12), asciiBytes('hdlr'), Uint8Array.from([0, 0, 0, 0]));
    const mdia = box('mdia', shortHdlr);
    const file = fileFrom(concatBytes(ftypBox(), box('moov', box('trak', mdia))));
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('returns null when a top-level box claims a size larger than the file', async () => {
    const bad = concatBytes(be32(0xfffffff0), asciiBytes('mdat'), new Uint8Array(8));
    const file = fileFrom(concatBytes(ftypBox(), bad));
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('returns null when a top-level box size is smaller than the header', async () => {
    const bad = concatBytes(be32(4), asciiBytes('free'));
    const file = fileFrom(concatBytes(ftypBox(), bad));
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('returns null on hostile zero-size infinite-loop style headers that do not advance', async () => {
    // size=0 means "to EOF" — first box consumes whole file as free-like type,
    // then loop ends; no moov → null (not false).
    const file = fileFrom(concatBytes(be32(0), asciiBytes('free'), new Uint8Array(32)));
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('returns null when nested moov box size overflows its parent buffer', async () => {
    // moov header claims full size but inner trak size exceeds moov payload.
    const innerTrak = concatBytes(be32(1000), asciiBytes('trak'), new Uint8Array(4));
    const moovPayload = innerTrak;
    const moov = concatBytes(be32(8 + moovPayload.length), asciiBytes('moov'), moovPayload);
    const file = fileFrom(concatBytes(ftypBox(), moov));
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('returns null when total read budget would be exceeded', async () => {
    // moov payload'ı MAX_MOOV_BYTES (128 KiB) üzeri → kesin okuma yok → null.
    const paddingSize = 128 * 1024;
    const freePayload = new Uint8Array(paddingSize);
    const freeBox = concatBytes(be32(8 + paddingSize), asciiBytes('free'), freePayload);
    const moov = box('moov', trakBox('soun'), freeBox);
    expect(moov.length - 8).toBeGreaterThan(128 * 1024);
    const file = fileFrom(concatBytes(ftypBox(), moov));
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('returns null when moov payload exceeds the moov read cap', async () => {
    const padding = new Uint8Array(MP4_AUDIO_TRACK_MAX_READ_BYTES);
    const moov = box(
      'moov',
      trakBox('soun'),
      concatBytes(be32(8 + padding.length), asciiBytes('free'), padding),
    );
    expect(moov.length - 8).toBeGreaterThan(128 * 1024);
    const file = fileFrom(concatBytes(ftypBox(), moov));
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('does not perform network calls while inspecting', async () => {
    const file = fileFrom(concatBytes(ftypBox(), moovBox(trakBox('soun'))));
    const calls = await networkCallsDuring(() => service.hasAudioTrack(file));
    expect(calls).toBe(0);
  });

  it('treats synthetic structures as structure-only, not playable media proof', async () => {
    // Bu fixture oynatılabilir medya DEĞİLDİR; yalnız box yürüyüşü doğrulanır.
    const file = fileFrom(concatBytes(ftypBox(), moovBox(trakBox('soun'))), 'synthetic.m4a');
    expect(await service.hasAudioTrack(file)).toBe(true);
    expect(file.size).toBeLessThan(512);
  });

  it('returns false for a complete video-only moov even when mdat is present', async () => {
    const file = fileFrom(concatBytes(ftypBox(), moovBox(trakBox('vide')), mdatBox(16)));
    expect(await service.hasAudioTrack(file)).toBe(false);
  });

  it('returns null when hdlr is missing inside mdia', async () => {
    const mdia = box('mdia', fullBox('minf'));
    const file = fileFrom(concatBytes(ftypBox(), box('moov', box('trak', mdia))));
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('returns null when mdia is missing inside trak', async () => {
    const trak = box('trak', fullBox('tkhd'));
    const file = fileFrom(concatBytes(ftypBox(), box('moov', trak)));
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('returns false when moov has no trak children (structure fully inspected)', async () => {
    // Boş moov: eksiksiz yürüyüş, trak yok → "ses izi yok" (false).
    const file = fileFrom(concatBytes(ftypBox(), box('moov')));
    expect(await service.hasAudioTrack(file)).toBe(false);
  });

  it('skips non-moov top-level boxes by size without reading their payloads', async () => {
    const wide = concatBytes(be32(8 + 4096), asciiBytes('free'), new Uint8Array(4096));
    const file = fileFrom(concatBytes(ftypBox(), wide, moovBox(trakBox('soun'))));
    const sliceCalls: [number, number][] = [];
    const originalSlice = File.prototype.slice;
    File.prototype.slice = function patched(
      this: File,
      start?: number | null,
      end?: number | null,
      contentType?: string,
    ) {
      sliceCalls.push([start ?? 0, end ?? this.size]);
      return originalSlice.call(this, start ?? undefined, end ?? undefined, contentType);
    };
    try {
      expect(await service.hasAudioTrack(file)).toBe(true);
    } finally {
      File.prototype.slice = originalSlice;
    }
    const freeStart = ftypBox().length + 8;
    const freeEnd = freeStart + 4096;
    const readFreePayload = sliceCalls.some(([s, e]) => s < freeEnd && e > freeStart);
    expect(readFreePayload).toBe(false);
  });

  it('supports largesize (size==1) moov headers', async () => {
    const trak = trakBox('soun');
    const payload = trak;
    const header = concatBytes(be32(1), asciiBytes('moov'), be32(0), be32(16 + payload.length));
    const file = fileFrom(concatBytes(ftypBox(), header, payload));
    expect(await service.hasAudioTrack(file)).toBe(true);
  });

  it('returns null when largesize is not a safe integer', async () => {
    const header = concatBytes(be32(1), asciiBytes('moov'), be32(0xffffffff), be32(0xffffffff));
    const file = fileFrom(concatBytes(ftypBox(), header, new Uint8Array(16)));
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('returns null when file ends mid top-level header', async () => {
    const partial = concatBytes(ftypBox(), be32(32), asciiBytes('mo')); // yarım tip
    expect(await service.hasAudioTrack(fileFrom(partial))).toBeNull();
  });

  it('does not claim audio when handler is neither soun nor complete unknown non-sound with valid hdlr', async () => {
    // Geçerli hdlr 'meta' → ses yok ama yapı tam → false
    const file = fileFrom(concatBytes(ftypBox(), moovBox(trakBox('meta'))));
    expect(await service.hasAudioTrack(file)).toBe(false);
  });
});
