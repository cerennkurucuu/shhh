import { Injectable } from '@angular/core';

/** OGG metadata okuması için başlık bütçesi; tam dosya hiçbir koşulda belleğe alınmaz. */
export const OGG_HEADER_READ_BYTES = 512;

/** RFC 7845: Opus her zaman 48 kHz'te decode edilir; OpusHead input rate yalnız bilgilendiricidir. */
export const OPUS_OUTPUT_SAMPLE_RATE_HZ = 48000;

export type OggMetadataErrorCode = 'invalid-file' | 'unsupported-codec';

export interface OggOpusMetadata {
  readonly codec: 'opus';
  readonly channels: number;
  /** Opus çıkış örnekleme hızı (her zaman 48 kHz). */
  readonly outputSampleRateHz: number;
  /** OpusHead içindeki bilgilendirici girdi örnekleme hızı; çıkış hızı değildir. */
  readonly inputSampleRateHz: number;
  readonly preSkipSamples: number;
  readonly mappingFamily: number;
  /**
   * Sınırlı başlık okumasıyla güvenle hesaplanamaz → null.
   * Tahmin üretilmez; tam süre için son sayfa granule gerekir (kapsam dışı).
   */
  readonly durationSeconds: number | null;
}

export interface OggMetadataSuccess {
  readonly ok: true;
  readonly metadata: OggOpusMetadata;
}

export interface OggMetadataFailure {
  readonly ok: false;
  readonly code: OggMetadataErrorCode;
  readonly reason: string;
  readonly message: string;
}

export type OggMetadataResult = OggMetadataSuccess | OggMetadataFailure;

const MSG_MISSING = 'Dosya bulunamadı. Tekrar seçmeyi deneyin.';
const MSG_EMPTY = 'Dosya boş görünüyor. Başka bir kayıt seçmeyi deneyin.';
const MSG_UNREADABLE = 'Dosya okunamadı. Tekrar seçmeyi deneyin.';
const MSG_NOT_OGG = 'Bu dosya geçerli bir OGG başlığı içermiyor.';
const MSG_TRUNCATED = 'Dosyanın başlığı eksik veya yarıda kesilmiş görünüyor.';
const MSG_BAD_PAGE = 'OGG sayfa yapısı bozuk görünüyor.';
const MSG_NO_OPUS_HEAD = 'OGG dosyasında OpusHead paketi bulunamadı.';
const MSG_NOT_OPUS = 'Bu OGG dosyası Opus sesi değil. Desteklenmeyen OGG kodeği olabilir.';
const MSG_BAD_OPUS_HEAD = 'OpusHead paketi geçersiz; kanal veya örneklem bilgisi okunamıyor.';

const OGG_MIN_BYTES = 27;
const OPUS_HEAD_BYTES = 19;

function failure(code: OggMetadataErrorCode, reason: string, message: string): OggMetadataFailure {
  return { ok: false, code, reason, message };
}

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  if (offset < 0 || offset + length > bytes.length) {
    return '';
  }
  let out = '';
  for (let i = 0; i < length; i++) {
    out += String.fromCharCode(bytes[offset + i]);
  }
  return out;
}

function le16(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function le32(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

interface OggPageHeader {
  readonly headerType: number;
  readonly segmentCount: number;
  readonly headerSize: number;
  readonly bodySize: number;
}

function parsePageHeader(bytes: Uint8Array, fileSize: number): OggPageHeader | OggMetadataFailure {
  if (bytes.length < OGG_MIN_BYTES || fileSize < OGG_MIN_BYTES) {
    return failure('invalid-file', 'truncated-header', MSG_TRUNCATED);
  }
  if (asciiAt(bytes, 0, 4) !== 'OggS') {
    return failure('invalid-file', 'not-ogg', MSG_NOT_OGG);
  }
  if (bytes[4] !== 0) {
    return failure('invalid-file', 'bad-page', MSG_BAD_PAGE);
  }

  const segmentCount = bytes[26];
  const headerSize = 27 + segmentCount;
  if (bytes.length < headerSize || fileSize < headerSize) {
    return failure('invalid-file', 'truncated-header', MSG_TRUNCATED);
  }

  let bodySize = 0;
  for (let i = 0; i < segmentCount; i++) {
    bodySize += bytes[27 + i];
  }
  if (headerSize + bodySize > fileSize) {
    return failure('invalid-file', 'bad-page', MSG_BAD_PAGE);
  }

  return { headerType: bytes[5], segmentCount, headerSize, bodySize };
}

function looksLikeVorbis(bytes: Uint8Array, bodyStart: number): boolean {
  if (bodyStart >= bytes.length || bytes[bodyStart] !== 0x01) {
    return false;
  }
  return asciiAt(bytes, bodyStart + 1, 6) === 'vorbis';
}

/**
 * SHHH-014 — OGG/Opus metadata.
 * Sıra: dosya varlığı → 0 bayt → yalnız OGG_HEADER_READ_BYTES başlık (File.slice)
 * → OggS sayfa yapısı + segment tablosu → ilk pakette OpusHead → kanal/input rate.
 * Çıkış örnekleme hızı her zaman 48 kHz; duration başlık okumasıyla güvenle
 * hesaplanamayacağı için null döndürülür. Tam dosya asla belleğe alınmaz.
 */
@Injectable({ providedIn: 'root' })
export class OggMetadataService {
  async read(file: File | null | undefined): Promise<OggMetadataResult> {
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
    if (file.size < OGG_MIN_BYTES) {
      return failure('invalid-file', 'truncated-header', MSG_TRUNCATED);
    }

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.slice(0, OGG_HEADER_READ_BYTES).arrayBuffer());
    } catch {
      return failure('invalid-file', 'unreadable', MSG_UNREADABLE);
    }
    if (bytes.length < OGG_MIN_BYTES) {
      return failure('invalid-file', 'truncated-header', MSG_TRUNCATED);
    }

    const page = parsePageHeader(bytes, file.size);
    if ('ok' in page) {
      return page;
    }

    const bodyStart = page.headerSize;
    const bodyEnd = bodyStart + page.bodySize;
    const readableEnd = Math.min(bytes.length, bodyEnd);

    if (bodyStart >= readableEnd) {
      return failure('invalid-file', 'missing-opus-head', MSG_NO_OPUS_HEAD);
    }

    if (looksLikeVorbis(bytes, bodyStart)) {
      return failure('unsupported-codec', 'not-opus', MSG_NOT_OPUS);
    }

    if (asciiAt(bytes, bodyStart, 8) !== 'OpusHead') {
      return failure('invalid-file', 'missing-opus-head', MSG_NO_OPUS_HEAD);
    }

    if (readableEnd < bodyStart + OPUS_HEAD_BYTES) {
      return failure('invalid-file', 'truncated-header', MSG_TRUNCATED);
    }

    const version = le16(bytes, bodyStart + 8);
    if (version >>> 8 !== 0) {
      return failure('invalid-file', 'bad-opus-head', MSG_BAD_OPUS_HEAD);
    }

    const channels = bytes[bodyStart + 10];
    if (channels < 1) {
      return failure('invalid-file', 'bad-opus-head', MSG_BAD_OPUS_HEAD);
    }

    const preSkipSamples = le16(bytes, bodyStart + 11);
    const inputSampleRateHz = le32(bytes, bodyStart + 13);
    const mappingFamily = bytes[bodyStart + 18];

    return {
      ok: true,
      metadata: {
        codec: 'opus',
        channels,
        outputSampleRateHz: OPUS_OUTPUT_SAMPLE_RATE_HZ,
        inputSampleRateHz,
        preSkipSamples,
        mappingFamily,
        durationSeconds: null,
      },
    };
  }
}
