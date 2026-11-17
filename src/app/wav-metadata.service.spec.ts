import { TestBed } from '@angular/core/testing';
import { WavMetadataService, WAV_HEADER_READ_BYTES } from './wav-metadata.service';

function le16(value: number): Uint8Array {
  return Uint8Array.from([value & 0xff, (value >> 8) & 0xff]);
}

function le32(value: number): Uint8Array {
  return Uint8Array.from([
    value & 0xff,
    (value >> 8) & 0xff,
    (value >> 16) & 0xff,
    (value >> 24) & 0xff,
  ]);
}

function ascii(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    out[i] = text.charCodeAt(i);
  }
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

interface WavOptions {
  readonly audioFormat?: number;
  readonly channels?: number;
  readonly sampleRateHz?: number;
  readonly bitsPerSample?: number;
  readonly dataSize?: number;
  readonly includeData?: boolean;
  readonly includeFmt?: boolean;
  readonly wordTag?: string;
}

function buildWav(options: WavOptions = {}): Uint8Array {
  const audioFormat = options.audioFormat ?? 1;
  const channels = options.channels ?? 1;
  const sampleRateHz = options.sampleRateHz ?? 8000;
  const bitsPerSample = options.bitsPerSample ?? 16;
  const dataSize = options.dataSize ?? 16;
  const includeData = options.includeData ?? true;
  const includeFmt = options.includeFmt ?? true;
  const byteRate = sampleRateHz * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);

  const bodyParts: Uint8Array[] = [ascii(options.wordTag ?? 'WAVE')];
  if (includeFmt) {
    bodyParts.push(
      ascii('fmt '),
      le32(16),
      le16(audioFormat),
      le16(channels),
      le32(sampleRateHz),
      le32(byteRate),
      le16(blockAlign),
      le16(bitsPerSample),
    );
  }
  if (includeData) {
    bodyParts.push(ascii('data'), le32(dataSize), new Uint8Array(dataSize));
  }
  const body = concat(...bodyParts);
  return concat(ascii('RIFF'), le32(body.length), body);
}

function wavFile(bytes: Uint8Array, name = 'kayit.wav'): File {
  return new File([new Uint8Array(bytes)], name, { type: 'audio/wav' });
}

describe('WavMetadataService', () => {
  let service: WavMetadataService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WavMetadataService);
  });

  it('reads sample rate, channels and duration from a valid PCM WAV header', async () => {
    // 8000 Hz mono 16-bit → 16000 byte/s; 32000 bayt veri → 2 saniye
    const file = wavFile(buildWav({ sampleRateHz: 8000, channels: 1, dataSize: 32000 }));

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.sampleRateHz).toBe(8000);
      expect(result.metadata.channels).toBe(1);
      expect(result.metadata.bitsPerSample).toBe(16);
      expect(result.metadata.byteRate).toBe(16000);
      expect(result.metadata.durationSeconds).toBeCloseTo(2, 10);
    }
  });

  it('computes duration for stereo 44.1 kHz 16-bit PCM', async () => {
    // byteRate = 44100 * 2 * 2 = 176400; 176400 bayt → 1 saniye
    const file = wavFile(
      buildWav({ sampleRateHz: 44100, channels: 2, bitsPerSample: 16, dataSize: 176400 }),
    );

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.sampleRateHz).toBe(44100);
      expect(result.metadata.channels).toBe(2);
      expect(result.metadata.durationSeconds).toBeCloseTo(1, 10);
    }
  });

  it('reports duration null when the data chunk is outside the header budget', async () => {
    // LIST chunk, header bütçesinin dışında data'yı iter; data id'si okunamaz.
    const listSize = 4096;
    const fmt = concat(
      ascii('fmt '),
      le32(16),
      le16(1),
      le16(1),
      le32(8000),
      le32(16000),
      le16(2),
      le16(16),
    );
    const list = concat(ascii('LIST'), le32(listSize), new Uint8Array(listSize));
    const data = concat(ascii('data'), le32(16), new Uint8Array(16));
    const body = concat(ascii('WAVE'), fmt, list, data);
    const file = wavFile(concat(ascii('RIFF'), le32(body.length), body));

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.sampleRateHz).toBe(8000);
      expect(result.metadata.channels).toBe(1);
      expect(result.metadata.durationSeconds).toBeNull();
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
      name: 'bos.wav',
      type: 'audio/wav',
      size: 0,
      slice: (...args: Parameters<File['slice']>) => {
        sliceCalls += 1;
        return new File([], 'bos.wav').slice(...args);
      },
    } as unknown as File;

    const result = await service.read(watched);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('empty-file');
    }
    expect(sliceCalls).toBe(0);
  });

  it('rejects a file shorter than a RIFF header without a multi-kilobyte read', async () => {
    const result = await service.read(wavFile(Uint8Array.from([0x52, 0x49, 0x46, 0x46])));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid-file');
      expect(result.reason).toBe('truncated-header');
    }
  });

  it('rejects a non-WAVE RIFF file', async () => {
    const result = await service.read(wavFile(buildWav({ wordTag: 'AVI ' })));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('not-wave');
      expect(result.message).toContain('WAV');
    }
  });

  it('rejects a WAV without a fmt chunk', async () => {
    const result = await service.read(wavFile(buildWav({ includeFmt: false })));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('missing-fmt');
    }
  });

  it('returns duration null when the WAV has no data chunk', async () => {
    const result = await service.read(wavFile(buildWav({ includeData: false })));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeNull();
      expect(result.metadata.sampleRateHz).toBe(8000);
    }
  });

  it('rejects non-PCM audio format as unsupported-codec', async () => {
    const result = await service.read(wavFile(buildWav({ audioFormat: 3 })));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('unsupported-codec');
      expect(result.reason).toBe('non-pcm');
      expect(result.message).toContain('PCM');
    }
  });

  it('rejects zero channels', async () => {
    const result = await service.read(wavFile(buildWav({ channels: 0, includeData: false })));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('bad-fmt');
    }
  });

  it('rejects zero sample rate', async () => {
    const result = await service.read(wavFile(buildWav({ sampleRateHz: 0, includeData: false })));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('bad-fmt');
    }
  });

  it('rejects bits per sample that is not a positive multiple of 8', async () => {
    const result = await service.read(wavFile(buildWav({ bitsPerSample: 12, includeData: false })));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('bad-fmt');
    }
  });

  it('rejects a RIFF size that claims more bytes than the file has', async () => {
    const bytes = buildWav();
    // RIFF size alanını dosyadan büyük göster (little-endian offset 4)
    const inflated = new Uint8Array(bytes);
    inflated[4] = 0xff;
    inflated[5] = 0xff;
    inflated[6] = 0x7f;
    inflated[7] = 0x00;

    const result = await service.read(wavFile(inflated));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('truncated-header');
    }
  });

  it('reports an unreadable file instead of crashing', async () => {
    const broken = {
      name: 'kirik.wav',
      type: 'audio/wav',
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

  it('reads at most one bounded header slice and never the whole file', async () => {
    // 1 MB'lik data chunk'lı dosya: tamamı asla okunmamalı.
    const file = wavFile(buildWav({ dataSize: 1_000_000 }));
    expect(file.size).toBeGreaterThan(WAV_HEADER_READ_BYTES);

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

    expect(result.ok).toBe(true);
    expect(calls).toEqual([[0, WAV_HEADER_READ_BYTES]]);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBeCloseTo(1_000_000 / 16000, 10);
    }
  });

  it('never returns NaN or Infinity duration for extreme but structurally valid headers', async () => {
    const file = wavFile(buildWav({ sampleRateHz: 1, channels: 1, bitsPerSample: 8, dataSize: 0 }));

    const result = await service.read(file);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.metadata.durationSeconds).toBe(0);
      expect(Number.isFinite(result.metadata.durationSeconds)).toBe(true);
    }
  });
});
