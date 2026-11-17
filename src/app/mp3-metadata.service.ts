import { Injectable } from '@angular/core';

/** HTMLAudioElement metadata yüklemesi için üst sınır (ms); aşarsa süre null sayılır. */
export const MP3_METADATA_TIMEOUT_MS = 5_000;

/** docs/02: 20 dakika öneri eşiği; doğrulanmış cihaz sınırı değildir. */
export const MP3_RECOMMENDED_MAX_DURATION_SECONDS = 20 * 60;

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

/** Yalnız sonlu ve negatif olmayan süreler kabul edilir; Infinity/NaN/reddedilir. */
function normalizeDuration(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
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
      const durationSeconds = await this.probeDurationSeconds(url);
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

  private async probeDurationSeconds(url: string): Promise<number | null> {
    if (typeof Audio === 'undefined') {
      return null;
    }

    const audio = new Audio();
    try {
      return await new Promise<number | null>((resolve) => {
        let settled = false;
        const finish = (value: number | null): void => {
          if (settled) {
            return;
          }
          settled = true;
          clearTimeout(timer);
          audio.removeEventListener('loadedmetadata', onLoadedMetadata);
          audio.removeEventListener('error', onError);
          resolve(value);
        };
        const onLoadedMetadata = (): void => {
          finish(normalizeDuration(audio.duration));
        };
        const onError = (): void => {
          finish(null);
        };
        const timer = setTimeout(() => finish(null), MP3_METADATA_TIMEOUT_MS);

        audio.addEventListener('loadedmetadata', onLoadedMetadata);
        audio.addEventListener('error', onError);

        try {
          audio.preload = 'metadata';
          audio.src = url;
          audio.load();
        } catch {
          finish(null);
        }
      });
    } finally {
      releaseAudio(audio);
    }
  }
}

function releaseAudio(audio: HTMLAudioElement): void {
  try {
    audio.removeAttribute('src');
    audio.load();
  } catch {
    // Temizleme hatası okuma sonucunu bozmamalı.
  }
}

function revokeQuietly(url: string): void {
  try {
    URL.revokeObjectURL(url);
  } catch {
    // revoke hatası okuma sonucunu bozmamalı.
  }
}
