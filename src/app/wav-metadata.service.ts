import { Injectable } from '@angular/core';

/** WAV metadata okuması için başlık bütçesi; tam dosya hiçbir koşulda belleğe alınmaz. */
export const WAV_HEADER_READ_BYTES = 512;

export type WavMetadataErrorCode = 'invalid-file' | 'unsupported-codec';

export interface WavMetadata {
  readonly sampleRateHz: number;
  readonly channels: number;
  readonly bitsPerSample: number;
  readonly byteRate: number;
  /** data chunk boyutu başlık bütçesinde bulunamazsa null (belirsiz süre). */
  readonly durationSeconds: number | null;
}

export interface WavMetadataSuccess {
  readonly ok: true;
  readonly metadata: WavMetadata;
}

export interface WavMetadataFailure {
  readonly ok: false;
  readonly code: WavMetadataErrorCode;
  readonly reason: string;
  readonly message: string;
}

export type WavMetadataResult = WavMetadataSuccess | WavMetadataFailure;

const MSG_MISSING = 'Dosya bulunamadı. Tekrar seçmeyi deneyin.';
const MSG_EMPTY = 'Dosya boş görünüyor. Başka bir kayıt seçmeyi deneyin.';
const MSG_UNREADABLE = 'Dosya okunamadı. Tekrar seçmeyi deneyin.';
const MSG_NOT_WAVE = 'Bu dosya geçerli bir WAV başlığı içermiyor.';
const MSG_TRUNCATED = 'Dosyanın başlığı eksik veya yarıda kesilmiş görünüyor.';
const MSG_NO_FMT = 'WAV başlığında fmt chunk bulunamadı.';
const MSG_BAD_FMT = 'WAV fmt chunk geçersiz; örnekleme hızı veya kanal sayısı okunamıyor.';
const MSG_NON_PCM = 'Yalnız PCM WAV destekleniyor. Dosyayı PCM olarak dışa aktarıp tekrar deneyin.';
const MSG_BAD_DURATION = 'Ses süresi hesaplanamıyor; metadata geçersiz görünüyor.';

const PCM_FORMAT = 1;

function failure(code: WavMetadataErrorCode, reason: string, message: string): WavMetadataFailure {
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

interface FmtFields {
  readonly audioFormat: number;
  readonly channels: number;
  readonly sampleRateHz: number;
  readonly byteRate: number;
  readonly bitsPerSample: number;
}

interface ParsedHeader {
  readonly fmt: FmtFields | null;
  readonly dataSize: number | null;
}

function parseChunks(bytes: Uint8Array, fileSize: number, riffSize: number): ParsedHeader {
  const riffEnd = Math.min(fileSize, riffSize + 8);
  let offset = 12;
  let fmt: FmtFields | null = null;
  let dataSize: number | null = null;

  while (offset + 8 <= bytes.length && offset + 8 <= riffEnd) {
    const id = asciiAt(bytes, offset, 4);
    const chunkSize = le32(bytes, offset + 4);
    const dataStart = offset + 8;
    const paddedSize = chunkSize + (chunkSize % 2);
    const nextOffset = dataStart + paddedSize;

    if (dataStart + chunkSize > fileSize) {
      break;
    }

    if (id === 'fmt ' && chunkSize >= 16 && dataStart + 16 <= bytes.length) {
      fmt = {
        audioFormat: le16(bytes, dataStart),
        channels: le16(bytes, dataStart + 2),
        sampleRateHz: le32(bytes, dataStart + 4),
        byteRate: le32(bytes, dataStart + 8),
        bitsPerSample: le16(bytes, dataStart + 14),
      };
    }

    if (id === 'data') {
      dataSize = chunkSize;
      break;
    }

    if (nextOffset <= offset) {
      break;
    }
    offset = nextOffset;
  }

  return { fmt, dataSize };
}

function isUsableDuration(durationSeconds: number): boolean {
  return Number.isFinite(durationSeconds) && durationSeconds >= 0;
}

/**
 * SHHH-014 — WAV/PCM metadata.
 * Sıra: dosya varlığı → 0 bayt → yalnız WAV_HEADER_READ_BYTES başlık (File.slice)
 * → RIFF/WAVE + chunk yürüyüşü → fmt doğrulaması → data boyutundan süre.
 * Tam dosya hiçbir koşulda okunmaz; data chunk yükü asla tahsis edilmez.
 */
@Injectable({ providedIn: 'root' })
export class WavMetadataService {
  async read(file: File | null | undefined): Promise<WavMetadataResult> {
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
    if (file.size < 12) {
      return failure('invalid-file', 'truncated-header', MSG_TRUNCATED);
    }

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.slice(0, WAV_HEADER_READ_BYTES).arrayBuffer());
    } catch {
      return failure('invalid-file', 'unreadable', MSG_UNREADABLE);
    }
    if (bytes.length < 12) {
      return failure('invalid-file', 'truncated-header', MSG_TRUNCATED);
    }
    if (asciiAt(bytes, 0, 4) !== 'RIFF' || asciiAt(bytes, 8, 4) !== 'WAVE') {
      return failure('invalid-file', 'not-wave', MSG_NOT_WAVE);
    }

    const riffSize = le32(bytes, 4);
    if (riffSize < 4 || riffSize + 8 > file.size) {
      return failure('invalid-file', 'truncated-header', MSG_TRUNCATED);
    }

    const { fmt, dataSize } = parseChunks(bytes, file.size, riffSize);
    if (fmt === null) {
      return failure('invalid-file', 'missing-fmt', MSG_NO_FMT);
    }
    if (fmt.audioFormat !== PCM_FORMAT) {
      return failure('unsupported-codec', 'non-pcm', MSG_NON_PCM);
    }
    if (
      fmt.channels < 1 ||
      fmt.sampleRateHz < 1 ||
      fmt.byteRate < 1 ||
      fmt.bitsPerSample < 8 ||
      fmt.bitsPerSample % 8 !== 0
    ) {
      return failure('invalid-file', 'bad-fmt', MSG_BAD_FMT);
    }

    let durationSeconds: number | null = null;
    if (dataSize !== null) {
      const bytesPerFrame = fmt.channels * (fmt.bitsPerSample / 8);
      const duration = dataSize / (fmt.sampleRateHz * bytesPerFrame);
      if (!isUsableDuration(duration)) {
        return failure('invalid-file', 'bad-duration', MSG_BAD_DURATION);
      }
      durationSeconds = duration;
    }

    return {
      ok: true,
      metadata: {
        sampleRateHz: fmt.sampleRateHz,
        channels: fmt.channels,
        bitsPerSample: fmt.bitsPerSample,
        byteRate: fmt.byteRate,
        durationSeconds,
      },
    };
  }
}
