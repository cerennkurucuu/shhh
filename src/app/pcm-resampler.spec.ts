import { resampleTo16kHz, TARGET_SAMPLE_RATE_HZ } from './pcm-resampler';

/**
 * Sentetik sinyaller — yalnız algoritma testi girdisidir.
 * Bunlar gerçek ses çözme (decode) kanıtı DEĞİLDİR.
 *
 * Açık toleranslar (gerçek ölçümlerle desteklenir):
 * - Geçirgen bant (1 kHz): tepe genlik hatası ≤ %5 (±0,05);
 *   ölçülen sapma 48 kHz'te 0,0023, 44,1 kHz'te 0,0025, 8 kHz'te 0,0000.
 * - Durdurma bandı (12 kHz): iç bölge tepe < 0,01 (≥ 40 dB bastırma);
 *   ölçülen iç bölge tepe 0,000035 (−89 dB).
 * - Kenar (edge extension) geçici bölgesi ilk/son 100 çıktı örneğinde ~0,21
 *   tepeye ulaşır (sinyalin aniden başlaması); referans ölçümlerinden hariç
 *   tutulur (filtre desteği ~21 örnek).
 * - DC/sabit giriş: mutlak sapma < 1e-5 (ölçülen en büyük sapma 2,4e-8).
 */
function sine(frequencyHz: number, sampleRate: number, seconds: number): Float32Array {
  const length = Math.round(seconds * sampleRate);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    out[i] = Math.sin((2 * Math.PI * frequencyHz * i) / sampleRate);
  }
  return out;
}

function peak(data: Float32Array, from = 0, to = data.length): number {
  let max = 0;
  for (let i = from; i < to; i++) {
    const magnitude = Math.abs(data[i]);
    if (magnitude > max) {
      max = magnitude;
    }
  }
  return max;
}

function argmax(data: Float32Array, from: number, to: number): number {
  let index = from;
  for (let i = from; i < to; i++) {
    if (Math.abs(data[i]) > Math.abs(data[index])) {
      index = i;
    }
  }
  return index;
}

describe('resampleTo16kHz', () => {
  it('resamples 8 kHz to 16 kHz', () => {
    const input = sine(1000, 8000, 1);

    const output = resampleTo16kHz(input, 8000);

    expect(TARGET_SAMPLE_RATE_HZ).toBe(16000);
    expect(output).toHaveLength(16000);
    // Çift interpolate eden sinc, tam sayı konumlarında özdeşliği korur:
    // çift indisli çıktılar girdi örnekleriyle (±1e-6) eşleşir.
    for (let n = 0; n < 100; n += 2) {
      expect(output[n]).toBeCloseTo(input[n / 2], 5);
    }
    expect(peak(output)).toBeGreaterThan(0.95);
    expect(peak(output)).toBeLessThan(1.05);
  });

  it('resamples 44.1 kHz to 16 kHz', () => {
    const input = sine(1000, 44100, 1);

    const output = resampleTo16kHz(input, 44100);

    expect(output).toHaveLength(16000);
    expect(peak(output)).toBeGreaterThan(0.95);
    expect(peak(output)).toBeLessThan(1.05);
  });

  it('resamples 48 kHz to 16 kHz', () => {
    const input = sine(1000, 48000, 1);

    const output = resampleTo16kHz(input, 48000);

    expect(output).toHaveLength(16000);
    expect(peak(output)).toBeGreaterThan(0.95);
    expect(peak(output)).toBeLessThan(1.05);
  });

  it('preserves sample values when the source is already 16 kHz', () => {
    const input = Float32Array.from([0.5, -0.25, 0.75, 0, 1, -1, 0.125]);

    const output = resampleTo16kHz(input, 16000);

    expect(output).toEqual(input);
    expect(output).not.toBe(input);
  });

  it('keeps a constant-amplitude signal flat at the output', () => {
    const at44k = new Float32Array(4410).fill(0.75);
    const out44k = resampleTo16kHz(at44k, 44100);
    expect(out44k).toHaveLength(1600);
    for (const sample of out44k) {
      expect(Math.abs(sample - 0.75)).toBeLessThan(1e-5);
    }

    const at8k = new Float32Array(800).fill(0.5);
    const out8k = resampleTo16kHz(at8k, 8000);
    expect(out8k).toHaveLength(1600);
    for (const sample of out8k) {
      expect(Math.abs(sample - 0.5)).toBeLessThan(1e-5);
    }
  });

  it('returns silence for silent input', () => {
    const silent48k = new Float32Array(4800);
    const out48k = resampleTo16kHz(silent48k, 48000);
    expect(out48k).toHaveLength(1600);
    expect(peak(out48k)).toBe(0);

    const silent44k = new Float32Array(4410);
    const out44k = resampleTo16kHz(silent44k, 44100);
    expect(out44k).toHaveLength(1600);
    expect(peak(out44k)).toBe(0);
  });

  it('handles a single sample deterministically', () => {
    expect(resampleTo16kHz(Float32Array.from([0.5]), 16000)).toEqual(Float32Array.from([0.5]));

    const at8k = resampleTo16kHz(Float32Array.from([0.5]), 8000);
    expect(at8k).toHaveLength(2); // 125 µs × 16 kHz = 2 örnek
    for (const sample of at8k) {
      expect(Number.isFinite(sample)).toBe(true);
    }

    // Süre kuralı: 1 örnek @48 kHz = 20,8 µs → ceil(0,33) = 1 örnek.
    const at48k = resampleTo16kHz(Float32Array.from([0.5]), 48000);
    expect(at48k).toHaveLength(1);
    expect(Number.isFinite(at48k[0])).toBe(true);
  });

  it('returns an empty output for empty input', () => {
    expect(resampleTo16kHz(new Float32Array(0), 48000)).toEqual(new Float32Array(0));
    expect(resampleTo16kHz(new Float32Array(0), 8000)).toEqual(new Float32Array(0));
    expect(resampleTo16kHz(new Float32Array(0), 16000)).toEqual(new Float32Array(0));
  });

  it('rejects invalid sample rates', () => {
    const input = Float32Array.from([0.25, 0.5]);
    for (const rate of [0, -44100, Number.NaN, Infinity, -Infinity]) {
      expect(() => resampleTo16kHz(input, rate)).toThrow(/Invalid sample rate/);
    }
    expect(() => resampleTo16kHz(input, undefined as unknown as number)).toThrow(
      /Invalid sample rate/,
    );
    expect(() => resampleTo16kHz(input, '48000' as unknown as number)).toThrow(
      /Invalid sample rate/,
    );
  });

  it('replaces NaN and Infinity so every output sample is finite', () => {
    const broken = Float32Array.from([0.5, Number.NaN, Infinity, -Infinity, 0.25]);
    const clean = Float32Array.from([0.5, 0, 0, 0, 0.25]);

    // Aynı hız (16 kHz): sanitizasyon + değer koruma.
    expect(resampleTo16kHz(broken, 16000)).toEqual(clean);

    // Farklı hız: çıktı finite ve "non-finite → 0" politikasıyla özdeş.
    const outBroken = resampleTo16kHz(broken, 48000);
    const outClean = resampleTo16kHz(clean, 48000);
    expect(outBroken).toHaveLength(outClean.length);
    for (let i = 0; i < outBroken.length; i++) {
      expect(Number.isFinite(outBroken[i])).toBe(true);
      expect(outBroken[i]).toBeCloseTo(outClean[i], 6);
    }
  });

  it('does not modify the input array', () => {
    const input = sine(1000, 44100, 0.1);
    const before = Float32Array.from(input);

    resampleTo16kHz(input, 44100);

    expect(input).toEqual(before);
  });

  it('matches the source duration within one output sample', () => {
    const cases: { rate: number; length: number }[] = [
      { rate: 8000, length: 8000 },
      { rate: 8000, length: 1234 },
      { rate: 44100, length: 44100 },
      { rate: 44100, length: 44107 },
      { rate: 48000, length: 48000 },
      { rate: 48000, length: 48001 },
      { rate: 16000, length: 16000 },
    ];
    for (const { rate, length } of cases) {
      const input = new Float32Array(length).fill(0.1);
      const output = resampleTo16kHz(input, rate);

      const inputDuration = length / rate;
      const outputDuration = output.length / TARGET_SAMPLE_RATE_HZ;
      expect(Math.abs(outputDuration - inputDuration)).toBeLessThanOrEqual(
        1 / TARGET_SAMPLE_RATE_HZ + 1e-12,
      );
      expect(output.length).toBe(Math.ceil((length * TARGET_SAMPLE_RATE_HZ) / rate));
    }
    // Klasik süreler birebir.
    expect(resampleTo16kHz(new Float32Array(8000), 8000)).toHaveLength(16000);
    expect(resampleTo16kHz(new Float32Array(44100), 44100)).toHaveLength(16000);
    expect(resampleTo16kHz(new Float32Array(48000), 48000)).toHaveLength(16000);
  });

  it('processes the last sample safely', () => {
    // 0 → 1 eğrisi @48 kHz, 0,1 s; kenar uzatma son değeri korur.
    const ramp = new Float32Array(4800);
    for (let i = 0; i < ramp.length; i++) {
      ramp[i] = i / (ramp.length - 1);
    }

    const output = resampleTo16kHz(ramp, 48000);

    expect(output).toHaveLength(1600);
    for (const sample of output) {
      expect(Number.isFinite(sample)).toBe(true);
    }
    expect(output[output.length - 1]).toBeCloseTo(1, 1);
  });

  it('suppresses a 12 kHz sine above the 16 kHz Nyquist limit (48 kHz → 16 kHz)', () => {
    const input = sine(12000, 48000, 1);
    expect(peak(input)).toBeGreaterThan(0.99); // girdi tam genlikte

    const output = resampleTo16kHz(input, 48000);

    // Filtre desteği ~21 çıktı örneği; kenar geçici bölgesi hariç iç bölge ölçülür.
    const interiorPeak = peak(output, 100, output.length - 100);
    expect(interiorPeak).toBeLessThan(0.01); // ≥ 40 dB; ölçülen: 0,000035 (−89 dB)
    expect(peak(output)).toBeLessThan(0.5); // kenar hariç gross aliasing yok (ölçülen: 0,212)
    for (const sample of output) {
      expect(Number.isFinite(sample)).toBe(true);
    }
  });

  it('preserves a 1 kHz passband sine within amplitude tolerance (48 kHz → 16 kHz)', () => {
    const input = sine(1000, 48000, 1);
    expect(peak(input)).toBeGreaterThan(0.99);

    const output = resampleTo16kHz(input, 48000);

    expect(peak(output)).toBeGreaterThan(0.95);
    expect(peak(output)).toBeLessThan(1.05);

    // Tepe zamanı korunur: 1 kHz tepegilleri çıktıda 4 + 16k indisindedir.
    const interiorMaxIndex = argmax(output, 100, output.length - 100);
    expect((interiorMaxIndex - 4) % 16).toBe(0);
  });

  it('preserves a 1 kHz passband sine at 44.1 kHz and 8 kHz sources', () => {
    const out44k = resampleTo16kHz(sine(1000, 44100, 1), 44100);
    expect(peak(out44k)).toBeGreaterThan(0.95);
    expect(peak(out44k)).toBeLessThan(1.05);

    const out8k = resampleTo16kHz(sine(1000, 8000, 1), 8000);
    expect(peak(out8k)).toBeGreaterThan(0.95);
    expect(peak(out8k)).toBeLessThan(1.05);
  });
});
