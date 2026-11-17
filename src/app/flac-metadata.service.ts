import { Injectable } from '@angular/core';

/** FLAC başlık bütçesi: 'fLaC' (4) + blok başlığı (4) + STREAMINFO (34) = 42 bayt. */
export const FLAC_HEADER_READ_BYTES = 42;

/** docs/02: 20 dakika öneri eşiği; doğrulanmış cihaz sınırı değildir. */
export const FLAC_RECOMMENDED_MAX_DURATION_SECONDS = 20 * 60;

export type FlacMetadataErrorCode = 'invalid-file' | 'unsupported-codec';

export interface FlacMetadata {
  readonly sampleRateHz: number;
  readonly channels: number;
  readonly bitsPerSample: number;
  /** totalSamples / sampleRate; totalSamples 0 ise null (bilinmiyor). */
  readonly durationSeconds: number | null;
}

export interface FlacMetadataSuccess {
  readonly ok: true;
  readonly metadata: FlacMetadata;
  /** Güvenilir süre biliniyor ve FLAC_RECOMMENDED_MAX_DURATION_SECONDS'u aşıyorsa true. */
  readonly exceedsRecommendedDuration: boolean;
}

export interface FlacMetadataFailure {
  readonly ok: false;
  readonly code: FlacMetadataErrorCode;
  readonly reason: string;
  readonly message: string;
}

export type FlacMetadataResult = FlacMetadataSuccess | FlacMetadataFailure;

const MSG_MISSING = 'Dosya bulunamadı. Tekrar seçmeyi deneyin.';
const MSG_EMPTY = 'Dosya boş görünüyor. Başka bir kayıt seçmeyi deneyin.';
const MSG_UNREADABLE = 'Dosya okunamadı. Tekrar seçmeyi deneyin.';
const MSG_TRUNCATED = 'FLAC başlığı eksik veya yarıda kesilmiş görünüyor.';
const MSG_NOT_FLAC = 'Bu dosya geçerli bir FLAC başlığı içermiyor.';
const MSG_BAD_STREAMINFO = 'FLAC STREAMINFO bloğu geçersiz veya eksik görünüyor.';
const MSG_BAD_FIELDS = 'FLAC örnekleme hızı, kanal veya bit derinliği alanları geçersiz görünüyor.';
const MSG_BAD_DURATION = 'Ses süresi hesaplanamıyor; metadata geçersiz görünüyor.';

/** FLAC spec: pratik azami örnekleme hızı (20-bit alan daha büyük olsa da). */
const MAX_SAMPLE_RATE_HZ = 655_350;
const MIN_BITS_PER_SAMPLE = 4;
const MAX_BITS_PER_SAMPLE = 32;

function failure(
  code: FlacMetadataErrorCode,
  reason: string,
  message: string,
): FlacMetadataFailure {
  return { ok: false, code, reason, message };
}

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  if (offset + length > bytes.length) {
    return '';
  }
  let out = '';
  for (let i = 0; i < length; i++) {
    out += String.fromCharCode(bytes[offset + i]);
  }
  return out;
}

interface StreamInfoFields {
  readonly sampleRateHz: number;
  readonly channels: number;
  readonly bitsPerSample: number;
  readonly totalSamples: number;
}

/**
 * STREAMINFO (34 bayt) bit yerleşimi:
 * 16 min block | 16 max block | 24 min frame | 24 max frame |
 * 20 sampleRate | 3 channels-1 | 5 bits-1 | 36 totalSamples | 128 MD5
 *
 * 36 bit totalSamples BigInt ile güvenle okunur; Number'a yalnız
 * Number.MAX_SAFE_INTEGER altında dönüştürülür.
 */
function parseStreamInfo(si: Uint8Array): StreamInfoFields | null {
  if (si.length < 34) {
    return null;
  }
  // offset 10: 20-bit rate (yüksek) + 3-bit ch + 5-bit bps + 4-bit total yüksek
  const sampleRateHz = ((si[10] << 12) | (si[11] << 4) | (si[12] >> 4)) >>> 0;
  const channels = ((si[12] >> 1) & 0x07) + 1;
  const bitsPerSample = (((si[12] & 0x01) << 4) | (si[13] >> 4)) + 1;

  const totalHigh = BigInt(si[13] & 0x0f);
  const totalSamplesBig =
    (totalHigh << 32n) |
    (BigInt(si[14]) << 24n) |
    (BigInt(si[15]) << 16n) |
    (BigInt(si[16]) << 8n) |
    BigInt(si[17]);

  if (totalSamplesBig > BigInt(Number.MAX_SAFE_INTEGER)) {
    // Güvenilir Number aralığı dışındaki toplam örnek: süre null; alanlar yine de geçerli olabilir.
    return {
      sampleRateHz,
      channels,
      bitsPerSample,
      totalSamples: -1,
    };
  }

  return {
    sampleRateHz,
    channels,
    bitsPerSample,
    totalSamples: Number(totalSamplesBig),
  };
}

function isUsableDuration(durationSeconds: number): boolean {
  return Number.isFinite(durationSeconds) && durationSeconds > 0;
}

/**
 * SHHH-014 — FLAC STREAMINFO metadata (servis katmanı; UI entegrasyonu yok).
 * Sıra: dosya varlığı → 0 bayt → yalnız FLAC_HEADER_READ_BYTES başlık (File.slice)
 * → 'fLaC' + STREAMINFO blok başlığı → alan doğrulaması → totalSamples/rate süre.
 * Tam dosya okunmaz; ağ çağrısı yoktur. STREAMINFO okunması dosyanın tamamının
 * sağlam olduğunu veya sesin çözülebileceğini KANITLAMAZ.
 */
@Injectable({ providedIn: 'root' })
export class FlacMetadataService {
  async read(file: File | null | undefined): Promise<FlacMetadataResult> {
    if (
      file === null ||
      file === undefined ||
      typeof file.size !== 'number' ||
      typeof file.slice !== 'function'
    ) {
      return failure('invalid-file', 'missing-file', MSG_MISSING);
    }
    if (file.size === 0) {
      return failure('invalid-file', 'empty-file', MSG_EMPTY);
    }
    if (file.size < FLAC_HEADER_READ_BYTES) {
      return failure('invalid-file', 'truncated-header', MSG_TRUNCATED);
    }

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.slice(0, FLAC_HEADER_READ_BYTES).arrayBuffer());
    } catch {
      return failure('invalid-file', 'unreadable', MSG_UNREADABLE);
    }
    if (bytes.length < FLAC_HEADER_READ_BYTES) {
      return failure('invalid-file', 'truncated-header', MSG_TRUNCATED);
    }
    if (asciiAt(bytes, 0, 4) !== 'fLaC') {
      return failure('invalid-file', 'not-flac', MSG_NOT_FLAC);
    }

    const isLast = (bytes[4] & 0x80) !== 0;
    const blockType = bytes[4] & 0x7f;
    const blockLength = ((bytes[5] << 16) | (bytes[6] << 8) | bytes[7]) >>> 0;
    if (blockType !== 0 || blockLength !== 34) {
      return failure('invalid-file', 'bad-streaminfo', MSG_BAD_STREAMINFO);
    }
    // İlk blok STREAMINFO olmalı; isLast olsa da bu okuma yalnız STREAMINFO'dur.
    void isLast;

    const streamInfo = bytes.subarray(8, 8 + 34);
    const fields = parseStreamInfo(streamInfo);
    if (fields === null) {
      return failure('invalid-file', 'bad-streaminfo', MSG_BAD_STREAMINFO);
    }

    const { sampleRateHz, channels, bitsPerSample, totalSamples } = fields;
    if (
      !Number.isFinite(sampleRateHz) ||
      sampleRateHz < 1 ||
      sampleRateHz > MAX_SAMPLE_RATE_HZ ||
      channels < 1 ||
      channels > 8 ||
      bitsPerSample < MIN_BITS_PER_SAMPLE ||
      bitsPerSample > MAX_BITS_PER_SAMPLE
    ) {
      return failure('invalid-file', 'bad-fields', MSG_BAD_FIELDS);
    }

    let durationSeconds: number | null = null;
    if (totalSamples > 0) {
      const duration = totalSamples / sampleRateHz;
      if (!isUsableDuration(duration)) {
        return failure('invalid-file', 'bad-duration', MSG_BAD_DURATION);
      }
      durationSeconds = duration;
    } else if (totalSamples < 0) {
      // Number güvenliği dışında: süre bilinmiyor; alanlar geçerli.
      durationSeconds = null;
    }
    // totalSamples === 0 → süre bilinmiyor (null).

    return {
      ok: true,
      metadata: {
        sampleRateHz,
        channels,
        bitsPerSample,
        durationSeconds,
      },
      exceedsRecommendedDuration:
        durationSeconds !== null && durationSeconds > FLAC_RECOMMENDED_MAX_DURATION_SECONDS,
    };
  }
}
