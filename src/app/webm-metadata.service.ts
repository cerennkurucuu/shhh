import { Injectable } from '@angular/core';
import {
  MEDIA_METADATA_TIMEOUT_MS,
  RECOMMENDED_MAX_DURATION_SECONDS,
  normalizeDuration,
  probeDurationSeconds,
  revokeQuietly,
} from './media-duration-probe';

export const WEBM_METADATA_TIMEOUT_MS = MEDIA_METADATA_TIMEOUT_MS;
export const WEBM_RECOMMENDED_MAX_DURATION_SECONDS = RECOMMENDED_MAX_DURATION_SECONDS;

export type WebmMetadataErrorCode = 'invalid-file' | 'unsupported-codec';

export interface WebmMetadata {
  /**
   * WebM bir container'dır; içindeki codec her zaman Opus değildir.
   * Codec güvenilir biçimde tespit edilmediği için null (bilinmiyor).
   * Uzantı/EBML DocType'tan "Opus" iddiası ÜRETİLMEZ.
   */
  readonly codec: string | null;
  /**
   * HTMLAudioElement'ten güvenle okunan süre.
   * Yüklenemez, zaman aşımına uğrar veya NaN/Infinity/negatif/sıfır ise null.
   * loadedmetadata tam decode veya ses izi varlığı kanıtı değildir.
   */
  readonly durationSeconds: number | null;
}

export interface WebmMetadataSuccess {
  readonly ok: true;
  readonly metadata: WebmMetadata;
  /** Güvenilir süre biliniyor ve WEBM_RECOMMENDED_MAX_DURATION_SECONDS'u aşıyorsa true. */
  readonly exceedsRecommendedDuration: boolean;
}

export interface WebmMetadataFailure {
  readonly ok: false;
  readonly code: WebmMetadataErrorCode;
  readonly reason: string;
  readonly message: string;
}

export type WebmMetadataResult = WebmMetadataSuccess | WebmMetadataFailure;

const MSG_MISSING = 'Dosya bulunamadı. Tekrar seçmeyi deneyin.';
const MSG_EMPTY = 'Dosya boş görünüyor. Başka bir kayıt seçmeyi deneyin.';
const MSG_UNREADABLE = 'Dosya okunamadı. Tekrar seçmeyi deneyin.';

function failure(
  code: WebmMetadataErrorCode,
  reason: string,
  message: string,
): WebmMetadataFailure {
  return { ok: false, code, reason, message };
}

/**
 * WebM için güvenilir süre: null/NaN/Infinity/negatif VE sıfır reddedilir.
 * (Ortak normalizeDuration sıfırı tutar; burada daha sıkı.)
 */
function usableDuration(value: number): number | null {
  const normalized = normalizeDuration(value);
  if (normalized === null || normalized === 0) {
    return null;
  }
  return normalized;
}

/**
 * SHHH-014 — WebM süre metadata (servis katmanı; UI entegrasyonu yok).
 * SHHH-013'ten geçmiş dosya için yalnız yerel Blob URL + HTMLAudioElement
 * `loadedmetadata` denenir. Codec container'dan tahmin edilmez → null.
 * Ağ çağrısı yoktur; dosya ArrayBuffer'a alınmaz; her yolda kaynak temizlenir.
 * loadedmetadata tam decode veya ses izi varlığı kanıtı sayılmaz.
 */
@Injectable({ providedIn: 'root' })
export class WebmMetadataService {
  async read(file: File | null | undefined): Promise<WebmMetadataResult> {
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
      const durationSeconds = await this.probeUsableDuration(url);
      return {
        ok: true,
        metadata: {
          codec: null,
          durationSeconds,
        },
        exceedsRecommendedDuration:
          durationSeconds !== null && durationSeconds > WEBM_RECOMMENDED_MAX_DURATION_SECONDS,
      };
    } finally {
      revokeQuietly(url);
    }
  }

  private async probeUsableDuration(url: string): Promise<number | null> {
    const raw = await probeDurationSeconds(url, WEBM_METADATA_TIMEOUT_MS);
    if (raw === null) {
      return null;
    }
    return usableDuration(raw);
  }
}
