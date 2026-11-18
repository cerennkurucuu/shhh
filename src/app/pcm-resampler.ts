/**
 * SHHH-015 Parça 2 — mono Float32 PCM'i 16 kHz'e yeniden örnekler.
 *
 * Algoritma: pencereli (Blackman) sinc FIR doğrudan çıktı konumlarında
 * değerlendirilir (bandlimited interpolasyon). Ne örnek atlama ne de yalın
 * lineer interpolasyon kullanılır; filtre gerçektir ve anti-alias etkisi vardır.
 *
 * Kesim frekansı politikası: fc = min(kaynakRate, 16000) / 2
 * - Düşürme (ör. 44,1/48 → 16 kHz): fc = 8000 Hz (hedef Nyquist); 8 kHz üstü
 *   içerik örneklemeden önce bastırılır → aliasing azalır.
 * - Yükseltme (ör. 8 → 16 kHz): fc = 4000 Hz (kaynak Nyquist); görüntü
 *   (imaging) bileşenleri söndürülür.
 * - Zaten 16 kHz: doğrudan kopya (değerler korunur; yalnız non-finite → 0).
 *
 * Sınır örnekleri: tap indeksleri [0, length-1] dışına taşınırken kenar değeri
 * kullanılır (edge extension); sabit girişte tam sabit çıkış korunur.
 *
 * Çıkış uzunluğu: ceil(girdiUzunluğu × 16000 / kaynakRate) — kaynak süresi
 * hiçbir zaman kısaltılmaz, en fazla 1 örnek (+62,5 µs) uzatılır.
 *
 * Geçersiz örnek (NaN/±Infinity) politikası: 0 (sessizlik) sayılır; çıktı
 * örnekleri her zaman finite'tır (pcm-mono ile aynı politika).
 *
 * Bellek/CPU: girdi değiştirilmez, ara tampon oluşturulmaz; yalnız çıktı
 * tamponu allocate edilir. Maliyet ≈ çıktıUzunluğu × 65 tap (sin/cos dahil);
 * uzun kayıtlarda (ör. 10 dk) tek parça çalışma saniyeler sürebilir — gerçek
 * zamanlı/uzun süreli kullanım için ileride blok işleyiş + polifaz/tablolama
 * gerekir.
 *
 * Blok sürekliliği: bu işlev tüm diziyi tek parça işler; filtre durumu bloklar
 * arasında taşınmaz. Gelecekte decode blokları ayrı işlenecekse overlap-save
 * veya durumlu kuyruk ZORUNLUDUR; blokları bağımsız işlemek sınırda
 * titremeye/bozulmaya yol açar — bu entegrasyon işi henüz YAPILMADI.
 */

/** Hedef örnekleme hızı (SHHH-015 pipeline: 16 kHz mono). */
export const TARGET_SAMPLE_RATE_HZ = 16000;

/** Her yönde sinc lobu sayısı; 2×32+1 = 65 tap, Blackman ile ~-60 dB durdurma bandı. */
const SINC_LOBES = 32;

/** sinc(x) = sin(πx)/(πx); x = 0 → 1. */
function sinc(x: number): number {
  if (x === 0) {
    return 1;
  }
  const px = Math.PI * x;
  return Math.sin(px) / px;
}

/**
 * Mono Float32 PCM'i 16 kHz mono Float32Array'e yeniden örnekleme.
 * Geçersiz örnekleme hızında (finite olmayan, ≤ 0 veya sayı olmayan) hata fırlatır.
 */
export function resampleTo16kHz(input: Float32Array, sampleRate: number): Float32Array {
  if (typeof sampleRate !== 'number' || !Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error(`Invalid sample rate: ${String(sampleRate)}`);
  }
  if (input.length === 0) {
    return new Float32Array(0);
  }
  if (sampleRate === TARGET_SAMPLE_RATE_HZ) {
    // Aynı hız: örnek değerleri korunur; yalnız non-finite → 0 sanitizasyonu.
    const sameRate = new Float32Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const v = input[i];
      sameRate[i] = Number.isFinite(v) ? v : 0;
    }
    return sameRate;
  }

  // Çıkış uzunluğu: kaynak süresini koruyan tek formül (bkz. başlık yorumu).
  const outputLength = Math.ceil((input.length * TARGET_SAMPLE_RATE_HZ) / sampleRate);
  const output = new Float32Array(outputLength);

  const cutoffHz = Math.min(sampleRate, TARGET_SAMPLE_RATE_HZ) / 2;
  const twoFc = (2 * cutoffHz) / sampleRate; // normalize çift kesim (sinc argümanı çarpanı)
  const sourceStep = sampleRate / TARGET_SAMPLE_RATE_HZ; // çıktı başına kaynak örnek adımı
  const windowSpan = SINC_LOBES + 0.5;

  for (let n = 0; n < outputLength; n++) {
    const position = n * sourceStep; // kaynak dizininde kesirli konum
    const center = Math.round(position);
    let accumulator = 0;
    let weightSum = 0;
    for (let k = -SINC_LOBES; k <= SINC_LOBES; k++) {
      const sourceIndex = center + k;
      const offset = sourceIndex - position;
      const u = offset / windowSpan; // [-1, 1]
      // Blackman penceresi: u=0 → 1, u=±1 → 0.
      const window = 0.42 + 0.5 * Math.cos(Math.PI * u) + 0.08 * Math.cos(2 * Math.PI * u);
      const weight = twoFc * sinc(twoFc * offset) * window;
      // Edge extension: destek dışı indekslerde kenar örnek kullanılır.
      const clamped =
        sourceIndex < 0 ? 0 : sourceIndex >= input.length ? input.length - 1 : sourceIndex;
      const sample = input[clamped];
      accumulator += weight * (Number.isFinite(sample) ? sample : 0);
      weightSum += weight;
    }
    // Birim DC kazancı: ağırlık toplamına bölerek sabit girdi → sabit çıktı.
    const value = weightSum !== 0 ? accumulator / weightSum : 0;
    output[n] = Number.isFinite(value) ? value : 0;
  }
  return output;
}
