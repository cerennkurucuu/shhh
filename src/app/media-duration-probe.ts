/** HTMLAudioElement metadata yüklemesi için ortak üst sınır (ms). */
export const MEDIA_METADATA_TIMEOUT_MS = 5_000;

/** docs/02: 20 dakika öneri eşiği; doğrulanmış cihaz sınırı değildir. */
export const RECOMMENDED_MAX_DURATION_SECONDS = 20 * 60;

/** Yalnız sonlu ve negatif olmayan süreler kabul edilir; Infinity/NaN/reddedilir. */
export function normalizeDuration(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return value;
}

/**
 * Yerel Blob URL üzerinden HTMLAudioElement `loadedmetadata` dener.
 * canPlayType kullanılmaz; ağ çağrısı yoktur. Başarısızlık/tahmin → null.
 */
export async function probeDurationSeconds(
  url: string,
  timeoutMs: number = MEDIA_METADATA_TIMEOUT_MS,
): Promise<number | null> {
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
      const timer = setTimeout(() => finish(null), timeoutMs);

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

export function releaseAudio(audio: HTMLAudioElement): void {
  try {
    audio.removeAttribute('src');
    audio.load();
  } catch {
    // Temizleme hatası okuma sonucunu bozmamalı.
  }
}

export function revokeQuietly(url: string): void {
  try {
    URL.revokeObjectURL(url);
  } catch {
    // revoke hatası okuma sonucunu bozmamalı.
  }
}
