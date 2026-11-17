import { Injectable } from '@angular/core';

export type AudioErrorCode = 'invalid-file' | 'unsupported-codec';

export type ContainerId = 'ogg' | 'wav' | 'mp3' | 'mp4' | 'webm' | 'flac';

export interface ValidationSuccess {
  readonly ok: true;
  readonly container: ContainerId;
  readonly warning: string | null;
}

export interface ValidationFailure {
  readonly ok: false;
  readonly code: AudioErrorCode;
  readonly reason: string;
  readonly message: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * v1 ön limiti: 50 MB = 50 × 1.000.000 bayt = 50.000.000 bayt (ondalık megabayt; kibibyte/MiB DEĞİL).
 * Bu sınır cihaz performansıyla kesinleştirilmedi (docs/02 ön limiti, SHHH-006 D-2: nihai eşik T18 ölçümüne tabidir).
 */
export const MAX_FILE_SIZE_BYTES = 50_000_000;

/** Tek seferde okunan en büyük başlık bütçesi (SHHH-005 §8.2). Tam dosya hiçbir koşulda belleğe alınmaz. */
export const HEADER_READ_BYTES = 512;

const MSG_MISSING = 'Dosya bulunamadı. Tekrar seçmeyi deneyin.';
const MSG_EMPTY = 'Dosya boş görünüyor. Başka bir kayıt seçmeyi deneyin.';
const MSG_SIZE = 'Dosya 50 MB sınırını aşıyor. Daha kısa/küçük bir kayıt paylaşın.';
const MSG_UNREADABLE = 'Dosya okunamadı. Tekrar seçmeyi deneyin.';
const MSG_UNKNOWN =
  'Bu dosyanın ses verisi olduğu anlaşılamadı. Dosya bozuk olabilir ya da ses formatı değil.';
const MSG_TRUNCATED = 'Dosyanın başlığı eksik veya yarıda kesilmiş görünüyor.';
const MSG_BROKEN = 'Dosya başlığı bozuk görünüyor; bu bir ses dosyası olmayabilir.';
const MSG_AMR =
  'AMR biçimi tarayıcıda desteklenmiyor. Dosyayı MP3 veya M4A olarak dışa aktarıp tekrar deneyin.';
const MSG_ADTS = 'ADTS/AAC (.aac) bu sürümde desteklenmiyor. M4A biçiminde deneyin.';

type Detection =
  | { readonly kind: 'ok'; readonly container: ContainerId }
  | { readonly kind: 'invalid'; readonly reason: string }
  | { readonly kind: 'unsupported'; readonly reason: string; readonly message: string };

const TRUNCATED_REASONS = new Set([
  'truncated-ogg',
  'truncated-wav',
  'truncated-flac',
  'truncated-ebml',
  'truncated-mp4',
  'truncated-id3',
  'truncated-mp3',
  'truncated-adts',
]);

function invalidMessage(reason: string): string {
  if (reason === 'unknown-signature') {
    return MSG_UNKNOWN;
  }
  if (TRUNCATED_REASONS.has(reason)) {
    return MSG_TRUNCATED;
  }
  return MSG_BROKEN;
}

function failure(code: AudioErrorCode, reason: string, message: string): ValidationFailure {
  return { ok: false, code, reason, message };
}

function startsWith(bytes: Uint8Array, ...prefix: number[]): boolean {
  if (bytes.length < prefix.length) {
    return false;
  }
  for (let i = 0; i < prefix.length; i++) {
    if (bytes[i] !== prefix[i]) {
      return false;
    }
  }
  return true;
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

function containsAscii(bytes: Uint8Array, text: string): boolean {
  for (let i = 0; i + text.length <= bytes.length; i++) {
    let found = true;
    for (let j = 0; j < text.length; j++) {
      if (bytes[i + j] !== text.charCodeAt(j)) {
        found = false;
        break;
      }
    }
    if (found) {
      return true;
    }
  }
  return false;
}

function hasValidMp3HeaderFields(bytes: Uint8Array, offset: number): boolean {
  if (offset + 3 >= bytes.length) {
    return false;
  }
  const b1 = bytes[offset + 1];
  const b2 = bytes[offset + 2];
  const versionBits = (b1 & 0x18) >> 3;
  const layerBits = (b1 & 0x06) >> 1;
  if (versionBits === 1 || layerBits === 0) {
    return false;
  }
  const bitrateIndex = b2 >> 4;
  if (bitrateIndex === 0 || bitrateIndex === 0x0f) {
    return false;
  }
  const sampleRateIndex = (b2 >> 2) & 0x03;
  return sampleRateIndex !== 3;
}

function detectOgg(bytes: Uint8Array, fileSize: number): Detection {
  if (bytes.length < 5 || fileSize < 5) {
    return { kind: 'invalid', reason: 'truncated-ogg' };
  }
  if (bytes[4] !== 0) {
    return { kind: 'invalid', reason: 'ogg-bad-version' };
  }
  if (bytes.length < 27) {
    return { kind: 'invalid', reason: 'truncated-ogg' };
  }
  const headerEnd = 27 + bytes[26];
  if (fileSize < headerEnd) {
    return { kind: 'invalid', reason: 'truncated-ogg' };
  }
  return { kind: 'ok', container: 'ogg' };
}

function detectWav(bytes: Uint8Array, fileSize: number): Detection {
  if (bytes.length < 12) {
    return { kind: 'invalid', reason: 'truncated-wav' };
  }
  if (asciiAt(bytes, 8, 4) !== 'WAVE') {
    return { kind: 'invalid', reason: 'wav-not-wave' };
  }
  const riffSize = (bytes[4] | (bytes[5] << 8) | (bytes[6] << 16) | (bytes[7] << 24)) >>> 0;
  if (riffSize + 8 > fileSize) {
    return { kind: 'invalid', reason: 'truncated-wav' };
  }
  if (!containsAscii(bytes, 'fmt ')) {
    return { kind: 'invalid', reason: 'wav-no-fmt' };
  }
  return { kind: 'ok', container: 'wav' };
}

function detectFlac(bytes: Uint8Array, fileSize: number): Detection {
  if (bytes.length < 8) {
    return { kind: 'invalid', reason: 'truncated-flac' };
  }
  if ((bytes[4] & 0x7f) !== 0) {
    return { kind: 'invalid', reason: 'flac-missing-streaminfo' };
  }
  const blockLength = (bytes[5] << 16) | (bytes[6] << 8) | bytes[7];
  if (blockLength !== 34) {
    return { kind: 'invalid', reason: 'flac-bad-streaminfo' };
  }
  if (fileSize < 8 + 34) {
    return { kind: 'invalid', reason: 'truncated-flac' };
  }
  return { kind: 'ok', container: 'flac' };
}

function detectEbml(bytes: Uint8Array, fileSize: number): Detection {
  if (fileSize < 16 || bytes.length < 16) {
    return { kind: 'invalid', reason: 'truncated-ebml' };
  }
  if (!containsAscii(bytes, 'webm') && !containsAscii(bytes, 'matroska')) {
    return { kind: 'invalid', reason: 'ebml-missing-doctype' };
  }
  return { kind: 'ok', container: 'webm' };
}

function detectMp4(bytes: Uint8Array, fileSize: number): Detection {
  if (bytes.length < 8) {
    return { kind: 'invalid', reason: 'truncated-mp4' };
  }
  const boxSize = ((bytes[0] << 24) | (bytes[1] << 16) | (bytes[2] << 8) | bytes[3]) >>> 0;
  if (boxSize === 1) {
    // 64-bit largesize: yalnızca başlığın başı yeterli
    return bytes.length >= 16 && fileSize >= 16
      ? { kind: 'ok', container: 'mp4' }
      : { kind: 'invalid', reason: 'truncated-mp4' };
  }
  if (boxSize < 16) {
    return { kind: 'invalid', reason: 'mp4-ftyp-too-small' };
  }
  if (boxSize > fileSize) {
    return { kind: 'invalid', reason: 'truncated-mp4' };
  }
  return { kind: 'ok', container: 'mp4' };
}

function detectAdts(bytes: Uint8Array, fileSize: number): Detection {
  if (bytes.length < 7) {
    return { kind: 'invalid', reason: 'truncated-adts' };
  }
  const profile = bytes[2] >> 6;
  const sampleRateIndex = (bytes[2] >> 2) & 0x0f;
  if (profile === 3 || sampleRateIndex > 12) {
    return { kind: 'invalid', reason: 'adts-bad-header' };
  }
  const frameLength = ((bytes[3] & 0x03) << 11) | (bytes[4] << 3) | ((bytes[5] & 0xe0) >> 5);
  if (frameLength < 7) {
    return { kind: 'invalid', reason: 'adts-bad-header' };
  }
  if (frameLength > fileSize) {
    return { kind: 'invalid', reason: 'truncated-adts' };
  }
  return { kind: 'unsupported', reason: 'adts', message: MSG_ADTS };
}

function detectMp3WithId3(bytes: Uint8Array, fileSize: number): Detection {
  if (bytes.length < 10) {
    return { kind: 'invalid', reason: 'truncated-id3' };
  }
  const majorVersion = bytes[3];
  if (majorVersion < 2 || majorVersion > 4) {
    return { kind: 'invalid', reason: 'id3-unsupported-version' };
  }
  const flags = bytes[5];
  if (
    (bytes[6] & 0x80) !== 0 ||
    (bytes[7] & 0x80) !== 0 ||
    (bytes[8] & 0x80) !== 0 ||
    (bytes[9] & 0x80) !== 0
  ) {
    return { kind: 'invalid', reason: 'id3-bad-size-encoding' };
  }
  const tagSize =
    ((bytes[6] & 0x7f) << 21) |
    ((bytes[7] & 0x7f) << 14) |
    ((bytes[8] & 0x7f) << 7) |
    (bytes[9] & 0x7f);
  const footerSize = (flags & 0x10) !== 0 ? 10 : 0;
  const tagEnd = 10 + tagSize + footerSize;
  // Saldırgan kontrolündeki etiket boyutu asla tahsis edilmez; yalnızca dosya boyutuyla karşılaştırılır.
  if (tagEnd > fileSize) {
    return { kind: 'invalid', reason: 'truncated-id3' };
  }
  if (tagEnd === fileSize) {
    return { kind: 'invalid', reason: 'mp3-no-frames' };
  }
  if (tagEnd + 4 <= bytes.length) {
    if (bytes[tagEnd] !== 0xff || (bytes[tagEnd + 1] & 0xe0) !== 0xe0) {
      return { kind: 'invalid', reason: 'mp3-bad-frame-header' };
    }
    if (!hasValidMp3HeaderFields(bytes, tagEnd)) {
      return { kind: 'invalid', reason: 'mp3-bad-frame-header' };
    }
  }
  // Etiket 512 baytlık bütçenin dışındaysa kare doğrulaması SHHH-014'e (decode) bırakılır.
  return { kind: 'ok', container: 'mp3' };
}

function detectContainer(bytes: Uint8Array, fileSize: number): Detection {
  if (startsWith(bytes, 0x4f, 0x67, 0x67, 0x53)) {
    return detectOgg(bytes, fileSize);
  }
  if (startsWith(bytes, 0x52, 0x49, 0x46, 0x46)) {
    return detectWav(bytes, fileSize);
  }
  if (startsWith(bytes, 0x66, 0x4c, 0x61, 0x43)) {
    return detectFlac(bytes, fileSize);
  }
  if (startsWith(bytes, 0x1a, 0x45, 0xdf, 0xa3)) {
    return detectEbml(bytes, fileSize);
  }
  if (bytes.length >= 8 && asciiAt(bytes, 4, 4) === 'ftyp') {
    return detectMp4(bytes, fileSize);
  }
  if (startsWith(bytes, 0x23, 0x21, 0x41, 0x4d, 0x52)) {
    return { kind: 'unsupported', reason: 'amr', message: MSG_AMR };
  }
  if (startsWith(bytes, 0x49, 0x44, 0x33)) {
    return detectMp3WithId3(bytes, fileSize);
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xf6) === 0xf0) {
    return detectAdts(bytes, fileSize);
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    if (!hasValidMp3HeaderFields(bytes, 0)) {
      return { kind: 'invalid', reason: 'mp3-bad-frame-header' };
    }
    return { kind: 'ok', container: 'mp3' };
  }
  return { kind: 'invalid', reason: 'unknown-signature' };
}

type Claim = ContainerId | 'adts' | 'amr';

const EXTENSION_CLAIMS: Readonly<Record<string, Claim>> = {
  '.wav': 'wav',
  '.mp3': 'mp3',
  '.ogg': 'ogg',
  '.oga': 'ogg',
  '.opus': 'ogg',
  '.m4a': 'mp4',
  '.m4b': 'mp4',
  '.mp4': 'mp4',
  '.3gp': 'mp4',
  '.webm': 'webm',
  '.flac': 'flac',
  '.aac': 'adts',
  '.amr': 'amr',
};

const MIME_CLAIMS: Readonly<Record<string, Claim>> = {
  'audio/ogg': 'ogg',
  'audio/opus': 'ogg',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'mp4',
  'audio/x-m4a': 'mp4',
  'video/mp4': 'mp4',
  'audio/webm': 'webm',
  'video/webm': 'webm',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/aac': 'adts',
  'audio/amr': 'amr',
};

function claimFromExtension(name: string): Claim | null {
  const lower = name.toLocaleLowerCase('tr-TR');
  const dot = lower.lastIndexOf('.');
  if (dot < 0) {
    return null;
  }
  return EXTENSION_CLAIMS[lower.slice(dot)] ?? null;
}

function claimFromMime(type: string): Claim | null {
  const base = type.split(';')[0].trim().toLocaleLowerCase('en-US');
  return MIME_CLAIMS[base] ?? null;
}

function mismatchWarning(file: File, detected: ContainerId): string | null {
  const claims: (Claim | null)[] = [claimFromExtension(file.name), claimFromMime(file.type)];
  const conflict = claims.some((claim) => claim !== null && claim !== detected);
  if (!conflict) {
    return null;
  }
  return `Dosya adı veya türü gerçek formatla uyuşmuyor; tespit edilen biçim (${detected.toLocaleUpperCase('tr-TR')}) esas alındı.`;
}

/**
 * SHHH-013 — güvenli ön doğrulama.
 * Sıra: dosya varlığı → 0 bayt → 50 MB ön limit (hiç okumadan) → yalnız 512 bayt başlık
 * (File.slice) → magic-byte + yapısal başlık kontrolleri → uzantı/MIME çelişkisi (yalnız uyarı).
 * Yalnız "ön doğrulamadan geçti" sonucu verilir; codec/süre/tam dosya doğrulaması SHHH-014'tedir.
 */
@Injectable({ providedIn: 'root' })
export class AudioFileValidationService {
  async validate(file: File | null | undefined): Promise<ValidationResult> {
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
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return failure('invalid-file', 'size-limit', MSG_SIZE);
    }

    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(await file.slice(0, HEADER_READ_BYTES).arrayBuffer());
    } catch {
      return failure('invalid-file', 'unreadable', MSG_UNREADABLE);
    }
    if (bytes.length === 0) {
      return failure('invalid-file', 'empty-file', MSG_EMPTY);
    }

    const detection = detectContainer(bytes, file.size);
    if (detection.kind === 'invalid') {
      return failure('invalid-file', detection.reason, invalidMessage(detection.reason));
    }
    if (detection.kind === 'unsupported') {
      return failure('unsupported-codec', detection.reason, detection.message);
    }
    return {
      ok: true,
      container: detection.container,
      warning: mismatchWarning(file, detection.container),
    };
  }
}
