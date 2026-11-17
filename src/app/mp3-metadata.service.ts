import { Injectable } from '@angular/core';
import {
  MEDIA_METADATA_TIMEOUT_MS,
  RECOMMENDED_MAX_DURATION_SECONDS,
  probeDurationSeconds,
  revokeQuietly,
} from './media-duration-probe';

/** HTMLAudioElement metadata yüklemesi için üst sınır (ms); aşarsa süre null sayılır. */
export const MP3_METADATA_TIMEOUT_MS = MEDIA_METADATA_TIMEOUT_MS;

/** docs/02: 20 dakika öneri eşiği; doğrulanmış cihaz sınırı değildir. */
export const MP3_RECOMMENDED_MAX_DURATION_SECONDS = RECOMMENDED_MAX_DURATION_SECONDS;

export type Mp3MetadataErrorCode = 'invalid-file' | 'unsupported-codec';

export interface Mp3Metadata {
  readonly codec: 'mp3';
  /**
   * HTMLAudioElement'ten güvenle okunan süre.
   * Yüklenemez, zaman aşımına uğrar veya NaN/Infinity/negatif ise null.
   * VBR için dosya boyutu/bitrate'ten tahmin ÜRETİLMEZ.
   */
  readonly durationSeconds: number | null;
}

export interface Mp3MetadataSuccess {
  readonly ok: true;
  readonly metadata: Mp3Metadata;
  /** Güvenilir süre biliniyor ve MP3_RECOMMENDED_MAX_DURATION_SECONDS'u aşıyorsa true. */
  readonly exceedsRecommendedDuration: boolean;
}

export interface Mp3MetadataFailure {
  readonly ok: false;
  readonly code: Mp3MetadataErrorCode;
  readonly reason: string;
  readonly message: string;
}

export type Mp3MetadataResult = Mp3MetadataSuccess | Mp3MetadataFailure;

const MSG_MISSING = 'Dosya bulunamadı. Tekrar seçmeyi deneyin.';
const MSG_EMPTY = 'Dosya boş görünüyor. Başka bir kayıt seçmeyi deneyin.';
const MSG_UNREADABLE = 'Dosya okunamadı. Tekrar seçmeyi deneyin.';

function failure(code: Mp3MetadataErrorCode, reason: string, message: string): Mp3MetadataFailure {
  return { ok: false, code, reason, message };
}

/**
 * SHHH-014 — MP3 süre metadata (servis katmanı; UI entegrasyonu yok).
 * SHHH-013'ten geçmiş dosya için yalnız yerel Blob URL + HTMLAudioElement
 * `loadedmetadata` denenir. canPlayType decode kanıtı sayılmaz ve kullanılmaz.
 * Ağ çağrısı yoktur; her yolda medya kaynağı ve Blob URL temizlenir.
 * VBR'de dosya boyutu/bitrate ile sahte kesin süre hesaplanmaz.
 */
@Injectable({ providedIn: 'root' })
export class Mp3MetadataService {
  async read(file: File | null | undefined): Promise<Mp3MetadataResult> {
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
      const durationSeconds = await probeDurationSeconds(url, MP3_METADATA_TIMEOUT_MS);
      return {
        ok: true,
        metadata: {
          codec: 'mp3',
          durationSeconds,
        },
        exceedsRecommendedDuration:
          durationSeconds !== null && durationSeconds > MP3_RECOMMENDED_MAX_DURATION_SECONDS,
      };
    } finally {
      revokeQuietly(url);
    }
  }
}
