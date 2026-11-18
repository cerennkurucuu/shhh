import { TestBed } from '@angular/core/testing';
import {
  WebmAudioTrackService,
  WEBM_AUDIO_TRACK_MAX_READ_BYTES,
  WEBM_AUDIO_TRACK_MAX_TRACKS_BYTES,
} from './webm-audio-track.service';
import { asciiBytes, concatBytes } from './testing/audio-fixtures';

/**
 * Sentetik EBML fixture'ları — yalnız yapı/yürüyüş testi girdisidir.
 * Bunlar gerçek oynatılabilir WebM kanıtı DEĞİLDİR; codec/süre iddiası üretilmez.
 */

const EBML_HEADER_ID = Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3]);
const SEGMENT_ID = Uint8Array.from([0x18, 0x53, 0x80, 0x67]);
const TRACKS_ID = Uint8Array.from([0x16, 0x54, 0xae, 0x6b]);
const TRACK_ENTRY_ID = Uint8Array.from([0xae]);
const TRACK_TYPE_ID = Uint8Array.from([0x83]);
const TRACK_NUMBER_ID = Uint8Array.from([0xd7]);
const CLUSTER_ID = Uint8Array.from([0x1f, 0x43, 0xb6, 0x75]);
const VOID_ID = Uint8Array.from([0xec]);
const INFO_ID = Uint8Array.from([0x15, 0x49, 0xa9, 0x66]);

/** Minimal EBML size vint kodlayıcı (bilinmeyen boyut hariç). */
function encodeSize(value: number): Uint8Array {
  let length = 1;
  while (length < 8 && value > Math.pow(2, 7 * length) - 2) {
    length += 1;
  }
  const bytes = new Uint8Array(length);
  let rest = value;
  for (let i = length - 1; i >= 1; i--) {
    bytes[i] = rest & 0xff;
    rest = Math.floor(rest / 256);
  }
  const marker = 0x100 >> length;
  bytes[0] = marker | rest;
  return bytes;
}

function element(id: Uint8Array, payload: Uint8Array): Uint8Array {
  return concatBytes(id, encodeSize(payload.length), payload);
}

function uintPayload(value: number): Uint8Array {
  if (value === 0) {
    return Uint8Array.from([0]);
  }
  const parts: number[] = [];
  let rest = value;
  while (rest > 0) {
    parts.unshift(rest & 0xff);
    rest = Math.floor(rest / 256);
  }
  return Uint8Array.from(parts);
}

function ebmlHeaderBytes(): Uint8Array {
  const doctype = concatBytes(Uint8Array.from([0x42, 0x82]), encodeSize(4), asciiBytes('webm'));
  return element(EBML_HEADER_ID, doctype);
}

function segmentBytes(...children: Uint8Array[]): Uint8Array {
  return element(SEGMENT_ID, concatBytes(...children));
}

function unknownSizeSegmentBytes(...children: Uint8Array[]): Uint8Array {
  const unknownVint = Uint8Array.from([0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);
  return concatBytes(SEGMENT_ID, unknownVint, concatBytes(...children));
}

function tracksBytes(...children: Uint8Array[]): Uint8Array {
  return element(TRACKS_ID, concatBytes(...children));
}

function trackEntryBytes(trackType: number | null): Uint8Array {
  const parts: Uint8Array[] = [element(TRACK_NUMBER_ID, Uint8Array.from([1]))];
  if (trackType !== null) {
    parts.push(element(TRACK_TYPE_ID, uintPayload(trackType)));
  }
  return element(TRACK_ENTRY_ID, concatBytes(...parts));
}

function infoBytes(): Uint8Array {
  return element(INFO_ID, new Uint8Array(0));
}

function clusterBytes(payloadSize: number): Uint8Array {
  return element(CLUSTER_ID, new Uint8Array(payloadSize));
}

function fileFrom(bytes: Uint8Array, name = 'sample.webm'): File {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new File([copy.buffer], name, { type: 'video/webm' });
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

describe('WebmAudioTrackService', () => {
  let service: WebmAudioTrackService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WebmAudioTrackService);
  });

  it('returns true for an audio-only WebM (TrackType=2)', async () => {
    const file = fileFrom(
      concatBytes(ebmlHeaderBytes(), segmentBytes(tracksBytes(trackEntryBytes(2)))),
      'audio-only.webm',
    );
    expect(await service.hasAudioTrack(file)).toBe(true);
  });

  it('returns false for a video-only WebM (TrackType=1)', async () => {
    const file = fileFrom(
      concatBytes(ebmlHeaderBytes(), segmentBytes(tracksBytes(trackEntryBytes(1)))),
      'video-only.webm',
    );
    expect(await service.hasAudioTrack(file)).toBe(false);
  });

  it('returns true for an audio+video WebM in either track order', async () => {
    const audioThenVideo = fileFrom(
      concatBytes(
        ebmlHeaderBytes(),
        segmentBytes(tracksBytes(trackEntryBytes(2), trackEntryBytes(1))),
      ),
      'av-1.webm',
    );
    const videoThenAudio = fileFrom(
      concatBytes(
        ebmlHeaderBytes(),
        segmentBytes(tracksBytes(trackEntryBytes(1), trackEntryBytes(2))),
      ),
      'av-2.webm',
    );
    expect(await service.hasAudioTrack(audioThenVideo)).toBe(true);
    expect(await service.hasAudioTrack(videoThenAudio)).toBe(true);
  });

  it('returns null when Tracks is missing from the Segment', async () => {
    const file = fileFrom(
      concatBytes(ebmlHeaderBytes(), segmentBytes(infoBytes())),
      'no-tracks.webm',
    );
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('returns null when the file has no Segment at all', async () => {
    const file = fileFrom(ebmlHeaderBytes(), 'header-only.webm');
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('returns null for truncated or broken EBML structures', async () => {
    // Segment dosyadan kesilmiş (boyut dosyayı aşıyor).
    const cutFile = concatBytes(
      ebmlHeaderBytes(),
      SEGMENT_ID,
      encodeSize(4096),
      Uint8Array.from([0x16, 0x54]),
    );
    expect(await service.hasAudioTrack(fileFrom(cutFile, 'cut.webm'))).toBeNull();

    // TrackEntry, Tracks payload'ını aşıyor (içerik kesilmiş).
    const overflowingEntry = concatBytes(
      TRACK_ENTRY_ID,
      encodeSize(100),
      Uint8Array.from([0x83, 0x02]),
    );
    const overflowFile = concatBytes(
      ebmlHeaderBytes(),
      segmentBytes(tracksBytes(overflowingEntry)),
    );
    expect(await service.hasAudioTrack(fileFrom(overflowFile, 'overflow.webm'))).toBeNull();

    // İlk ID byte'ı 0 → geçersiz vint.
    expect(
      await service.hasAudioTrack(fileFrom(Uint8Array.from([0x00, 0x45, 0xdf, 0xa3, 0x80]))),
    ).toBeNull();

    // 5 baytlık ID → desteklenmeyen yapı.
    expect(
      await service.hasAudioTrack(fileFrom(Uint8Array.from([0x08, 0x01, 0x02, 0x03, 0x04, 0x80]))),
    ).toBeNull();

    // Size byte'ı 0 → geçersiz vint.
    expect(
      await service.hasAudioTrack(fileFrom(concatBytes(EBML_HEADER_ID, Uint8Array.from([0x00])))),
    ).toBeNull();

    // Dosya ortasında yarım ID vint'i.
    const halfVint = concatBytes(ebmlHeaderBytes(), SEGMENT_ID.slice(0, 2));
    expect(await service.hasAudioTrack(fileFrom(halfVint, 'half-id.webm'))).toBeNull();
  });

  it('returns null when the TrackEntry is missing its mandatory TrackType', async () => {
    const file = fileFrom(
      concatBytes(ebmlHeaderBytes(), segmentBytes(tracksBytes(trackEntryBytes(null)))),
      'no-tracktype.webm',
    );
    expect(await service.hasAudioTrack(file)).toBeNull();
  });

  it('supports an unknown-size Segment', async () => {
    const audio = fileFrom(
      concatBytes(ebmlHeaderBytes(), unknownSizeSegmentBytes(tracksBytes(trackEntryBytes(2)))),
      'unknown-size-audio.webm',
    );
    const video = fileFrom(
      concatBytes(ebmlHeaderBytes(), unknownSizeSegmentBytes(tracksBytes(trackEntryBytes(1)))),
      'unknown-size-video.webm',
    );
    expect(await service.hasAudioTrack(audio)).toBe(true);
    expect(await service.hasAudioTrack(video)).toBe(false);
  });

  it('handles multiple TrackEntries (video + control + audio)', async () => {
    const file = fileFrom(
      concatBytes(
        ebmlHeaderBytes(),
        segmentBytes(tracksBytes(trackEntryBytes(1), trackEntryBytes(17), trackEntryBytes(2))),
      ),
      'multi-track.webm',
    );
    expect(await service.hasAudioTrack(file)).toBe(true);

    const videoOnly = fileFrom(
      concatBytes(
        ebmlHeaderBytes(),
        segmentBytes(tracksBytes(trackEntryBytes(1), trackEntryBytes(17))),
      ),
      'multi-video.webm',
    );
    expect(await service.hasAudioTrack(videoOnly)).toBe(false);
  });

  it('skips a large Cluster without reading its payload', async () => {
    const payloadSize = 64 * 1024;
    const ebml = ebmlHeaderBytes();
    const tracks = tracksBytes(trackEntryBytes(2));
    const cluster = clusterBytes(payloadSize);
    const segmentPayloadLength = cluster.length + tracks.length;
    const segmentHeaderLength = SEGMENT_ID.length + encodeSize(segmentPayloadLength).length;
    const clusterPayloadStart =
      ebml.length + segmentHeaderLength + CLUSTER_ID.length + encodeSize(payloadSize).length;
    const clusterPayloadEnd = clusterPayloadStart + payloadSize;
    const file = fileFrom(
      concatBytes(ebml, SEGMENT_ID, encodeSize(segmentPayloadLength), cluster, tracks),
      'cluster-first.webm',
    );

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
    const readClusterPayload = sliceCalls.some(
      ([s, e]) => s < clusterPayloadEnd && e > clusterPayloadStart,
    );
    expect(readClusterPayload).toBe(false);
  });

  it('returns null when the Tracks payload exceeds the read budget', async () => {
    const padding = element(VOID_ID, new Uint8Array(WEBM_AUDIO_TRACK_MAX_TRACKS_BYTES + 1));
    const file = fileFrom(
      concatBytes(ebmlHeaderBytes(), segmentBytes(tracksBytes(padding, trackEntryBytes(2)))),
      'huge-tracks.webm',
    );

    let bytesSliced = 0;
    const originalSlice = File.prototype.slice;
    File.prototype.slice = function patched(
      this: File,
      start?: number | null,
      end?: number | null,
      contentType?: string,
    ) {
      bytesSliced += (end ?? this.size) - (start ?? 0);
      return originalSlice.call(this, start ?? undefined, end ?? undefined, contentType);
    };
    try {
      expect(await service.hasAudioTrack(file)).toBeNull();
    } finally {
      File.prototype.slice = originalSlice;
    }
    // Bütçe aşımında payload asla okunmaz; yalnız küçük başlık okumaları.
    expect(bytesSliced).toBeLessThan(1024);
    expect(bytesSliced).toBeLessThan(WEBM_AUDIO_TRACK_MAX_READ_BYTES);
  });

  it('reads a large-but-allowed Tracks payload under the budget', async () => {
    const padding = element(VOID_ID, new Uint8Array(64 * 1024));
    const file = fileFrom(
      concatBytes(ebmlHeaderBytes(), segmentBytes(tracksBytes(padding, trackEntryBytes(2)))),
      'medium-tracks.webm',
    );
    expect(await service.hasAudioTrack(file)).toBe(true);
  });

  it('returns null for missing, empty, tiny or garbage input', async () => {
    expect(await service.hasAudioTrack(null)).toBeNull();
    expect(await service.hasAudioTrack(undefined)).toBeNull();
    expect(await service.hasAudioTrack(new File([], 'empty.webm'))).toBeNull();
    expect(await service.hasAudioTrack(new File([Uint8Array.from([1])], 'tiny.webm'))).toBeNull();
    expect(
      await service.hasAudioTrack(fileFrom(asciiBytes('not a webm file at all'), 'garbage.webm')),
    ).toBeNull();
  });

  it('does not perform network calls while inspecting', async () => {
    const file = fileFrom(
      concatBytes(ebmlHeaderBytes(), segmentBytes(tracksBytes(trackEntryBytes(2)))),
      'offline.webm',
    );
    const calls = await networkCallsDuring(() => service.hasAudioTrack(file));
    expect(calls).toBe(0);
  });

  it('treats synthetic structures as structure-only, not playable media proof', async () => {
    const file = fileFrom(
      concatBytes(ebmlHeaderBytes(), segmentBytes(tracksBytes(trackEntryBytes(2)))),
      'synthetic.webm',
    );
    expect(await service.hasAudioTrack(file)).toBe(true);
    expect(file.size).toBeLessThan(512);
  });
});
