import { downmixToMono } from './pcm-mono';

/**
 * Sentetik Float32 örnekleri — yalnız algoritma testi girdisidir.
 * Bunlar gerçek ses çözme (decode) kanıtı DEĞİLDİR.
 * Tüm beklenti değerleri Float32'te tam temsil edilebilir seçilmiştir.
 */
describe('downmixToMono', () => {
  it('preserves samples for a single channel input', () => {
    const mono = Float32Array.from([0.5, -0.25, 0.75, 0, 1, -1]);

    const output = downmixToMono([mono]);

    expect(output).toEqual(Float32Array.from([0.5, -0.25, 0.75, 0, 1, -1]));
  });

  it('averages two channels with equal weight', () => {
    const left = Float32Array.from([1, 0.5, 0]);
    const right = Float32Array.from([0.5, 0.5, -1]);

    const output = downmixToMono([left, right]);

    expect(output).toEqual(Float32Array.from([0.75, 0.5, -0.5]));
  });

  it('cancels opposite-phase stereo to silence', () => {
    const left = Float32Array.from([0.5, -0.25, 1]);
    const right = Float32Array.from([-0.5, 0.25, -1]);

    const output = downmixToMono([left, right]);

    expect(output).toEqual(Float32Array.from([0, 0, 0]));
  });

  it('averages three or more channels consistently', () => {
    const three = downmixToMono([
      Float32Array.from([1, 0.5]),
      Float32Array.from([0.5, 0.5]),
      Float32Array.from([0, 0.5]),
    ]);
    expect(three).toEqual(Float32Array.from([0.5, 0.5]));

    const four = downmixToMono([
      Float32Array.from([1, 1]),
      Float32Array.from([1, 1]),
      Float32Array.from([0, 0]),
      Float32Array.from([1, 1]),
    ]);
    expect(four).toEqual(Float32Array.from([0.75, 0.75]));
  });

  it('returns silence when every input sample is zero', () => {
    const output = downmixToMono([Float32Array.from([0, 0, 0]), Float32Array.from([0, 0, 0])]);

    expect(output).toEqual(Float32Array.from([0, 0, 0]));
  });

  it('returns an empty output for empty input', () => {
    expect(downmixToMono([])).toEqual(new Float32Array(0));
    expect(downmixToMono([new Float32Array(0)])).toEqual(new Float32Array(0));
    expect(downmixToMono([new Float32Array(0), new Float32Array(0)])).toEqual(new Float32Array(0));
  });

  it('throws a safe error on mismatched channel lengths', () => {
    const short = Float32Array.from([0.5, 0.5, 0.5]);
    const long = Float32Array.from([0.5, 0.5]);

    expect(() => downmixToMono([short, long])).toThrow(/Channel length mismatch/);
    expect(() => downmixToMono([new Float32Array(0), new Float32Array(2)])).toThrow(
      /Channel length mismatch/,
    );
  });

  it('replaces NaN and Infinity so every output sample is finite', () => {
    const broken = Float32Array.from([Number.NaN, Infinity, -Infinity, 0.5]);
    const steady = Float32Array.from([0.5, 0.5, 0.5, 0.5]);

    const output = downmixToMono([broken, steady]);

    // Politika: non-finite örnek 0 (sessizlik) sayılır; ortalamalar etkilenmez.
    expect(output).toEqual(Float32Array.from([0.25, 0.25, 0.25, 0.5]));
    for (const sample of output) {
      expect(Number.isFinite(sample)).toBe(true);
    }
  });

  it('clips out-of-range samples to [-1, 1]', () => {
    const hot = Float32Array.from([1.5, -2]);
    const alsoHot = Float32Array.from([1.5, -2]);

    expect(downmixToMono([hot, alsoHot])).toEqual(Float32Array.from([1, -1]));
    expect(downmixToMono([Float32Array.from([2])])).toEqual(Float32Array.from([1]));
    expect(downmixToMono([Float32Array.from([-3])])).toEqual(Float32Array.from([-1]));
  });

  it('does not modify the input channels', () => {
    const left = Float32Array.from([0.5, -1.5, Number.NaN]);
    const right = Float32Array.from([-0.5, 1.5, 0.25]);
    const leftBefore = Float32Array.from(left);
    const rightBefore = Float32Array.from(right);

    downmixToMono([left, right]);

    expect(left).toEqual(leftBefore);
    expect(right).toEqual(rightBefore);
  });

  it('preserves the output sample count', () => {
    const cases: Float32Array[][] = [
      [Float32Array.from([0.1, 0.2, 0.3, 0.4, 0.5])],
      [Float32Array.from([0, 0, 0, 0, 0, 0, 0]), Float32Array.from([1, 1, 1, 1, 1, 1, 1])],
      [
        Float32Array.from([1, 2, 3, 4]),
        Float32Array.from([1, 2, 3, 4]),
        Float32Array.from([1, 2, 3, 4]),
      ],
      [],
      [new Float32Array(0)],
    ];

    for (const channels of cases) {
      const expected = channels.length === 0 ? 0 : channels[0].length;
      expect(downmixToMono(channels)).toHaveLength(expected);
    }
  });

  it('returns a new Float32Array without aliasing the input', () => {
    const mono = Float32Array.from([0.5, -0.25]);

    const output = downmixToMono([mono]);

    expect(output).not.toBe(mono);
    expect(output).toBeInstanceOf(Float32Array);
    output[0] = 0.75;
    expect(mono[0]).toBe(0.5);
  });
});
