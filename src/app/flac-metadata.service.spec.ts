import { TestBed } from '@angular/core/testing';
import {
  FlacMetadataService,
  FLAC_HEADER_READ_BYTES,
  FLAC_RECOMMENDED_MAX_DURATION_SECONDS,
  type FlacMetadataResult,
} from './flac-metadata.service';

function ascii(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    out[i] = text.charCodeAt(i);
  }
  return out;
}

interface FlacOptions {
  readonly sampleRateHz?: number;
  readonly channels?: number;
  readonly bitsPerSample?: number;
  readonly totalSamples?: number | bigint;
  readonly badSignature?: boolean;
  readonly blockType?: number;
  readonly blockLength?: number;
  readonly truncateTo?: number;
  readonly omitStreamInfo?: boolean;
}

/**
 * 'fLaC' + STREAMINFO (34 bayt) sentetik başlık.
 * Bit yerleşimi: 20 rate | 3 ch-1 | 5 bps-1 | 36 totalSamples.
 */
function buildFlac(options: FlacOptions = {}): Uint8Array {
  const sampleRateHz = options.sampleRateHz ?? 44100;
  const channels = options.channels ?? 1;
  const bitsPerSample = options.bitsPerSample ?? 16;
  const totalSamples =
    typeof options.totalSamples === 'bigint'
      ? options.totalSamples
      : BigInt(options.totalSamples ?? 88_200);

  if (options.omitStreamInfo) {
    const out = new Uint8Array(4);
    out.set(ascii(options.badSignature ? 'XXXX' : 'fLaC'), 0);
    return out;
  }

  const out = new Uint8Array(FLAC_HEADER_READ_BYTES);
  out.set(ascii(options.badSignature ? 'XXXX' : 'fLaC'), 0);
  const blockType = options.blockType ?? 0x80; // last + STREAMINFO
  out[4] = blockType;
  const blockLength = options.blockLength ?? 34;
  out[5] = (blockLength >> 16) & 0xff;
  out[6] = (blockLength >> 8) & 0xff;
  out[7] = blockLength & 0xff;

  // STREAMINFO @8
  const si = 8;
  // min/max block size (16+16) — bu testlerde önemli değil
  out[si] = 0x0f;
  out[si + 1] = 0xa8;
  out[si + 2] = 0x0f;
  out[si + 3] = 0xa8;
  // min/max frame size (24+24) = 0
  // packed @ si+10:
  const rate = sampleRateHz & 0xfffff; // 20 bit
  const chCode = (channels - 1) & 0x07;
  const bpsCode = (bitsPerSample - 1) & 0x1f;
  const total = totalSamples & 0xfffffffffn; // 36 bit

  out[si + 10] = (rate >> 12) & 0xff;
  out[si + 11] = (rate >> 4) & 0xff;
  out[si + 12] = ((rate & 0x0f) << 4) | ((chCode & 0x07) << 1) | ((bpsCode >> 4) & 0x01);
  out[si + 13] = ((bpsCode & 0x0f) << 4) | Number((total >> 32n) & 0x0fn);
  out[si + 14] = Number((total >> 24n) & 0xffn);
  out[si + 15] = Number((total >> 16n) & 0xffn);
  out[si + 16] = Number((total >> 8n) & 0xffn);
  out[si + 17] = Number(total & 0xffn);
  // MD5 @ si+18: sıfır

  if (options.truncateTo !== undefined) {
    return out.subarray(0, options.truncateTo);
  }
  return out;
}

function flacFile(bytes: Uint8Array, name = 'kayit.flac'): File {
  return new File([new Uint8Array(bytes)], name, { type: 'audio/flac' });
}

describe('FlacMetadataService', () => {
  let service: FlacMetadataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FlacMetadataService);
  });

  it('reads a valid mono FLAC (44.1 kHz, 16-bit) and computes duration', async () => {
    // 88200 / 44100 = 2 saniye
    const file = flacFile(buildFlac({ sampleRateHz: 44100, channels: 1, totalSamples: 88_200 }));

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.sampleRateHz).toBe(44100);
      expect(result.metadata.channels).toBe(1);
      expect(result.metadata.bitsPerSample).toBe(16);
      expect(result.metadata.durationSeconds).toBeCloseTo(2, 10);
      expect(result.exceedsRecommendedDuration).toBe(false);
    }
  });

  it('reads a valid stereo FLAC (48 kHz, 24-bit) and computes duration', async () => {
    // 96000 / 48000 = 2 saniye
    const file = flacFile(
      buildFlac({ sampleRateHz: 48000, channels: 2, bitsPerSample: 24, totalSamples: 96_000 }),
    );

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.sampleRateHz).toBe(48000);
      expect(result.metadata.channels).toBe(2);
      expect(result.metadata.bitsPerSample).toBe(24);
      expect(result.metadata.durationSeconds).toBeCloseTo(2, 10);
    }
  });

  it('supports 8 channels and various sample rates', async () => {
    const cases = [
      { sampleRateHz: 8000, channels: 1, bitsPerSample: 8, totalSamples: 8_000 },
      { sampleRateHz: 96000, channels: 8, bitsPerSample: 32, totalSamples: 96_000 },
      { sampleRateHz: 655350, channels: 2, bitsPerSample: 16, totalSamples: 655_350 },
    ];
    for (const c of cases) {
      const file = flacFile(buildFlac(c));
      const result = await service.read(file);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.metadata.sampleRateHz).toBe(c.sampleRateHz);
        expect(result.metadata.channels).toBe(c.channels);
        expect(result.metadata.bitsPerSample).toBe(c.bitsPerSample);
        expect(result.metadata.durationSeconds).toBeCloseTo(1, 10);
      }
    }
  });

  it('reports duration null when total samples is 0', async () => {
    const file = flacFile(buildFlac({ totalSamples: 0 }));

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
      expect(result.metadata.sampleRateHz).toBe(44100);
      expect(result.exceedsRecommendedDuration).toBe(false);
    }
  });

  it('accepts exactly 20 minutes (boundary is not exceeded)', async () => {
    // 1200 * 44100 = 52_920_000
    const file = flacFile(buildFlac({ sampleRateHz: 44100, totalSamples: 52_920_000 }));

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBe(1200);
      expect(result.exceedsRecommendedDuration).toBe(false);
      expect(FLAC_RECOMMENDED_MAX_DURATION_SECONDS).toBe(1200);
    }
  });

  it('flags a reliable duration over 20 minutes', async () => {
    // 1201 * 44100 = 52_964_100
    const file = flacFile(buildFlac({ sampleRateHz: 44100, totalSamples: 52_964_100 }));

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBe(1201);
      expect(result.exceedsRecommendedDuration).toBe(true);
    }
  });

  it('handles a large 36-bit total sample count safely', async () => {
    // 2^35 örnek @ 44100 ≈ 784_934 saniye (~9 gün) — BigInt okuma
    const total = 1n << 35n;
    const file = flacFile(buildFlac({ sampleRateHz: 44100, totalSamples: total }));

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const expected = Number(total) / 44100;
      expect(result.metadata.durationSeconds).toBeCloseTo(expected, 6);
      expect(result.exceedsRecommendedDuration).toBe(true);
      expect(Number.isFinite(result.metadata.durationSeconds)).toBe(true);
    }
  });

  it('rejects a wrong signature', async () => {
    const file = flacFile(buildFlac({ badSignature: true }));

    const result = await service.read(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid-file');
      expect(result.reason).toBe('not-flac');
    }
  });

  it('rejects a truncated header', async () => {
    const file = flacFile(buildFlac({ truncateTo: 20 }));

    const result = await service.read(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('truncated-header');
    }
  });

  it('rejects a file smaller than the header budget', async () => {
    const file = new File([new Uint8Array(10)], 'kucuk.flac', { type: 'audio/flac' });

    const result = await service.read(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('truncated-header');
    }
  });

  it('rejects a missing or non-STREAMINFO block', async () => {
    for (const blockType of [0x81, 0x82, 0x00 | 0x80]) {
      // 0x80|0 = STREAMINFO last; 0x81 = padding; 0x00 = STREAMINFO not-last (geçerli tip, uzunluk 34)
      const file = flacFile(buildFlac({ blockType }));
      const result = await service.read(file);
      // blockType 0x00 (STREAMINFO, not last) hâlâ type 0 → geçerli olabilir
      if ((blockType & 0x7f) === 0) {
        expect(result.ok).toBe(true);
      } else {
        expect(result.ok).toBe(false);
        if (!result.ok) {
          expect(result.reason).toBe('bad-streaminfo');
        }
      }
    }
  });

  it('rejects a wrong STREAMINFO block length', async () => {
    const file = flacFile(buildFlac({ blockLength: 33 }));

    const result = await service.read(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('bad-streaminfo');
      expect(result.message).toContain('STREAMINFO');
    }
  });

  it('rejects a missing STREAMINFO block entirely', async () => {
    const file = flacFile(buildFlac({ omitStreamInfo: true }));

    const result = await service.read(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('truncated-header');
    }
  });

  it('rejects an invalid sample rate (0)', async () => {
    const file = flacFile(buildFlac({ sampleRateHz: 0 }));

    const result = await service.read(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('bad-fields');
    }
  });

  it('rejects an invalid sample rate above the FLAC limit', async () => {
    const file = flacFile(buildFlac({ sampleRateHz: 655_351 }));

    const result = await service.read(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('bad-fields');
    }
  });

  it('rejects invalid bits per sample below 4', async () => {
    const file = flacFile(buildFlac({ bitsPerSample: 3 }));

    const result = await service.read(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('bad-fields');
    }
  });

  it('never produces NaN, Infinity or negative duration', async () => {
    const cases: FlacOptions[] = [
      { totalSamples: 0 },
      { sampleRateHz: 8000, totalSamples: 1 },
      { sampleRateHz: 655350, totalSamples: 1 },
      { sampleRateHz: 44100, totalSamples: 0n },
    ];
    for (const options of cases) {
      const result = await service.read(flacFile(buildFlac(options)));
      expect(result.ok).toBe(true);
      if (result.ok) {
        const d = result.metadata.durationSeconds;
        if (d !== null) {
          expect(Number.isFinite(d)).toBe(true);
          expect(d).toBeGreaterThan(0);
        }
        expect(result.exceedsRecommendedDuration).toBe(
          d !== null && d > FLAC_RECOMMENDED_MAX_DURATION_SECONDS,
        );
      }
    }
  });

  it('rejects a missing file without reading', async () => {
    for (const input of [null, undefined, {} as File]) {
      const result = await service.read(input);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('missing-file');
      }
    }
  });

  it('rejects a 0-byte file', async () => {
    const result = await service.read(new File([], 'bos.flac', { type: 'audio/flac' }));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('empty-file');
    }
  });

  it('reads only the header budget (never the whole file)', async () => {
    const bytes = buildFlac({ totalSamples: 44_100 });
    // Sahte büyük dosya: başlık + padding
    const padded = new Uint8Array(1024 * 1024);
    padded.set(bytes, 0);
    const file = flacFile(padded);

    let sliceEnd = -1;
    const originalSlice = file.slice.bind(file);
    const sliceSpy = vi.spyOn(file, 'slice').mockImplementation((start, end) => {
      sliceEnd = end ?? -1;
      return originalSlice(start, end);
    });

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    expect(sliceSpy).toHaveBeenCalled();
    expect(sliceEnd).toBe(FLAC_HEADER_READ_BYTES);
    expect(FLAC_HEADER_READ_BYTES).toBe(42);
    sliceSpy.mockRestore();
  });

  it('does not send the file over the network (fetch/XHR/beacon/WebSocket)', async () => {
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
      const result: FlacMetadataResult = await service.read(
        flacFile(buildFlac({ totalSamples: 44_100 }), 'ag-yok.flac'),
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

  it('treats synthetic STREAMINFO as header metadata only (not playable proof)', async () => {
    // Sentetik başlık gerçek oynatılabilir FLAC KANITI DEĞİLDİR.
    const file = flacFile(buildFlac({ totalSamples: 44_100 }));
    const result = await service.read(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      // Yalnız alanlar okundu; decode/sağlamlık iddiası yok.
      expect(result.metadata.durationSeconds).toBeCloseTo(1, 10);
      expect(result.metadata.channels).toBe(1);
    }
    // Gerçek oynatılabilirlik bu servis tarafından doğrulanmaz.
    expect(true).toBe(true);
  });
});
