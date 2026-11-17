import { Injectable } from '@angular/core';
import {
  MEDIA_METADATA_TIMEOUT_MS,
  RECOMMENDED_MAX_DURATION_SECONDS,
  probeDurationSeconds,
  revokeQuietly,
} from './media-duration-probe';

export const M4A_METADATA_TIMEOUT_MS = MEDIA_METADATA_TIMEOUT_MS;
export const M4A_RECOMMENDED_MAX_DURATION_SECONDS = RECOMMENDED_MAX_DURATION_SECONDS;

export type M4aMetadataErrorCode = 'invalid-file' | 'unsupported-codec';

export interface M4aMetadata {
  /**
   * M4A/MP4 bir container'dır; içindeki codec her zaman AAC değildir.
   * Codec güvenilir biçimde tespit edilmediği için null (bilinmiyor).
   * Uzantı/ftyp'ten "AAC" iddiası ÜRETİLMEZ.
   */
  readonly codec: string | null;
  /**
   * HTMLAudioElement'ten güvenle okunan süre.
   * Yüklenemez, zaman aşımına uğrar veya NaN/Infinity/negatif ise null.
   */
  readonly durationSeconds: number | null;
}

export interface M4aMetadataSuccess {
  readonly ok: true;
  readonly metadata: M4aMetadata;
  /** Güvenilir süre biliniyor ve M4A_RECOMMENDED_MAX_DURATION_SECONDS'u aşıyorsa true. */
  readonly exceedsRecommendedDuration: boolean;
}

export interface M4aMetadataFailure {
  readonly ok: false;
  readonly code: M4aMetadataErrorCode;
  readonly reason: string;
  readonly message: string;
}

export type M4aMetadataResult = M4aMetadataSuccess | M4aMetadataFailure;

const MSG_MISSING = 'Dosya bulunamadı. Tekrar seçmeyi deneyin.';
const MSG_EMPTY = 'Dosya boş görünüyor. Başka bir kayıt seçmeyi deneyin.';
const MSG_UNREADABLE = 'Dosya okunamadı. Tekrar seçmeyi deneyin.';

function failure(code: M4aMetadataErrorCode, reason: string, message: string): M4aMetadataFailure {
  return { ok: false, code, reason, message };
}

/**
 * SHHH-014 — M4A/MP4 süre metadata (servis katmanı; UI entegrasyonu yok).
 * SHHH-013'ten geçmiş dosya için yalnız yerel Blob URL + HTMLAudioElement
 * `loadedmetadata` denenir. Codec container'dan tahmin edilmez → null.
 * Ağ çağrısı yoktur; her yolda medya kaynağı ve Blob URL temizlenir.
 */
@Injectable({ providedIn: 'root' })
export class M4aMetadataService {
  async read(file: File | null | undefined): Promise<M4aMetadataResult> {
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

    let url: string;
    try {
      url = URL.createObjectURL(file);
    } catch {
      return failure('invalid-file', 'unreadable', MSG_UNREADABLE);
    }

    try {
      const durationSeconds = await probeDurationSeconds(url, M4A_METADATA_TIMEOUT_MS);
      return {
        ok: true,
        metadata: {
          codec: null,
          durationSeconds,
        },
        exceedsRecommendedDuration:
          durationSeconds !== null && durationSeconds > M4A_RECOMMENDED_MAX_DURATION_SECONDS,
      };
    } finally {
      revokeQuietly(url);
    }
  }
}
