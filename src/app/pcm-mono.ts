/**
 * SHHH-015 Parça 1 — decode edilmiş çok kanallı Float32 PCM'i mono'ya indirger.
 *
 * Tutarlı ortalama politikası:
 * - Her çıkış örneği, kanalların eşit ağırlıklı aritmetik ortalamasıdır
 *   (toplam / kanal sayısı); stereo için kanal ortalaması.
 * - NaN veya ±Infinity örnekler 0 (sessizlik) sayılarak ortalamaya katılır;
 *   çıktı örnekleri her zaman finite'tır.
 * - Çıkış, [-1, 1] aralığına kırpılır (clipping).
 * - Zıt fazlı kanallar ortalamada birbirini söndürür (doğal sonuç).
 *
 * Sözleşme:
 * - Girdi kanalları değiştirilmez; her zaman yeni bir Float32Array döner
 *   (girdiyle referans paylaşmaz).
 * - Ara dizi oluşturulmaz; tek geçişte tek çıktı tamponu yazılır.
 * - Kanal uzunlukları uyuşmazsa hata fırlatır.
 * - Kanal listesi boşsa veya örnek yoksa boş Float32Array döner.
 * - Yeniden örnekleme (ör. 16 kHz) bu fonksiyonun kapsamı değildir.
 */
export function downmixToMono(channels: readonly Float32Array[]): Float32Array {
  if (channels.length === 0) {
    return new Float32Array(0);
  }
  const sampleCount = channels[0].length;
  for (const channel of channels) {
    if (channel.length !== sampleCount) {
      throw new Error(
        `Channel length mismatch: expected ${sampleCount} samples, got ${channel.length}`,
      );
    }
  }
  const output = new Float32Array(sampleCount);
  const channelCount = channels.length;
  for (let i = 0; i < sampleCount; i++) {
    let sum = 0;
    for (const channel of channels) {
      const sample = channel[i];
      sum += Number.isFinite(sample) ? sample : 0;
    }
    const average = sum / channelCount;
    output[i] = average > 1 ? 1 : average < -1 ? -1 : average;
  }
  return output;
}
