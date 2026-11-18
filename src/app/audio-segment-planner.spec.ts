import {
  DEFAULT_CONTEXT_OVERLAP_SECONDS,
  DEFAULT_SEGMENT_DURATION_SECONDS,
  MAX_AUDIO_SAMPLE_COUNT,
  MAX_SEGMENT_DURATION_SECONDS,
  MIN_SEGMENT_DURATION_SECONDS,
  planAudioSegments,
} from './audio-segment-planner';
import { TARGET_SAMPLE_RATE_HZ } from './pcm-resampler';

const samples = (seconds: number): number => seconds * TARGET_SAMPLE_RATE_HZ;

describe('planAudioSegments', () => {
  it('returns an empty plan for empty audio', () => {
    expect(planAudioSegments(0, 'audio-empty')).toEqual([]);
  });

  it('keeps a one-sample tail with exact sample-based duration', () => {
    const [segment] = planAudioSegments(1, 'one-sample');
    expect(segment).toMatchObject({
      coreStartSample: 0,
      coreEndSample: 1,
      contextStartSample: 0,
      contextEndSample: 1,
      durationSeconds: 1 / TARGET_SAMPLE_RATE_HZ,
      partNumber: 1,
    });
  });

  it('keeps a five-second recording as one short segment', () => {
    const [segment] = planAudioSegments(samples(5), 'five-seconds');
    expect(segment.durationSeconds).toBe(5);
    expect(segment.coreStartSample).toBe(0);
    expect(segment.coreEndSample).toBe(samples(5));
  });

  it('makes an exact 25-second recording one core segment', () => {
    const plan = planAudioSegments(samples(25), 'exact-25');
    expect(plan).toHaveLength(1);
    expect(plan[0].durationSeconds).toBe(25);
    expect(plan[0].coreEndSample).toBe(samples(25));
  });

  it('makes an exact 50-second recording two adjacent core segments', () => {
    const plan = planAudioSegments(samples(50), 'exact-50');
    expect(plan).toHaveLength(2);
    expect(plan.map((segment) => segment.durationSeconds)).toEqual([25, 25]);
    expect(plan[0].coreEndSample).toBe(plan[1].coreStartSample);
  });

  it('preserves the one-second tail of a 51-second recording', () => {
    const plan = planAudioSegments(samples(51), 'tail-51');
    expect(plan.map((segment) => segment.durationSeconds)).toEqual([25, 25, 1]);
    expect(plan[2].coreStartSample).toBe(samples(50));
    expect(plan[2].coreEndSample).toBe(samples(51));
  });

  it('plans the full 600-second product limit without exceeding it', () => {
    const plan = planAudioSegments(MAX_AUDIO_SAMPLE_COUNT, 'max-audio');
    expect(plan).toHaveLength(24);
    expect(plan[0].coreStartSample).toBe(0);
    expect(plan.at(-1)?.coreEndSample).toBe(MAX_AUDIO_SAMPLE_COUNT);
    expect(plan.reduce((total, segment) => total + segment.durationSeconds, 0)).toBe(600);
  });

  it('clamps context to PCM boundaries and expands each side by the configured overlap', () => {
    const overlap = 2;
    const plan = planAudioSegments(samples(51), 'overlap', { contextOverlapSeconds: overlap });
    expect(plan[0]).toMatchObject({ contextStartSample: 0, contextEndSample: samples(27) });
    expect(plan[1]).toMatchObject({
      contextStartSample: samples(23),
      contextEndSample: samples(51),
    });
    expect(plan[2]).toMatchObject({
      contextStartSample: samples(48),
      contextEndSample: samples(51),
    });
    expect(plan.every((segment) => segment.contextStartSample >= 0)).toBe(true);
    expect(plan.every((segment) => segment.contextEndSample <= samples(51))).toBe(true);
  });

  it('covers every core sample exactly once with no gaps or overlaps', () => {
    const sampleCount = samples(51) + 17;
    const plan = planAudioSegments(sampleCount, 'coverage');
    let expectedStart = 0;
    for (const segment of plan) {
      expect(segment.coreStartSample).toBe(expectedStart);
      expect(segment.coreEndSample).toBeGreaterThan(segment.coreStartSample);
      expectedStart = segment.coreEndSample;
    }
    expect(expectedStart).toBe(sampleCount);
    expect(
      plan.reduce((total, segment) => total + segment.coreEndSample - segment.coreStartSample, 0),
    ).toBe(sampleCount);
  });

  it('produces stable IDs and explicit zero-based/one-based ordering', () => {
    const first = planAudioSegments(samples(51), 'stable/audio-id');
    const second = planAudioSegments(samples(51), 'stable/audio-id');
    expect(first.map((segment) => segment.segmentId)).toEqual(
      second.map((segment) => segment.segmentId),
    );
    expect(first.map((segment) => segment.segmentIndex)).toEqual([0, 1, 2]);
    expect(first.map((segment) => segment.partNumber)).toEqual([1, 2, 3]);
  });

  it('returns time metadata from exact core and context sample boundaries', () => {
    const [first, second] = planAudioSegments(samples(30), 'time-metadata');
    expect(first.startSeconds).toBe(0);
    expect(first.endSeconds).toBe(25);
    expect(first.durationSeconds).toBe(25);
    expect(first.contextEndSeconds).toBe(26);
    expect(second.startSeconds).toBe(25);
    expect(second.endSeconds).toBe(30);
    expect(second.durationSeconds).toBe(5);
    expect(second.contextStartSeconds).toBe(24);
    expect(second.contextDurationSeconds).toBe(6);
  });

  it('validates sample count, audio identity, target duration and overlap settings', () => {
    expect(() => planAudioSegments(-1, 'bad')).toThrow(RangeError);
    expect(() => planAudioSegments(1.5, 'bad')).toThrow(RangeError);
    expect(() => planAudioSegments(MAX_AUDIO_SAMPLE_COUNT + 1, 'too-long')).toThrow(RangeError);
    expect(() => planAudioSegments(1, '  ')).toThrow(TypeError);
    expect(() => planAudioSegments(1, 'bad-target', { targetDurationSeconds: 19 })).toThrow(
      RangeError,
    );
    expect(() => planAudioSegments(1, 'bad-target', { targetDurationSeconds: 31 })).toThrow(
      RangeError,
    );
    expect(() => planAudioSegments(1, 'bad-target', { targetDurationSeconds: Number.NaN })).toThrow(
      RangeError,
    );
    expect(() => planAudioSegments(1, 'bad-overlap', { contextOverlapSeconds: -1 })).toThrow(
      RangeError,
    );
    expect(() =>
      planAudioSegments(1, 'bad-overlap', {
        contextOverlapSeconds: DEFAULT_SEGMENT_DURATION_SECONDS,
      }),
    ).toThrow(RangeError);
  });

  it('allows the documented 20–30 second target range and zero overlap', () => {
    const shortest = planAudioSegments(samples(20), 'min', {
      targetDurationSeconds: MIN_SEGMENT_DURATION_SECONDS,
      contextOverlapSeconds: 0,
    });
    const longest = planAudioSegments(samples(30), 'max', {
      targetDurationSeconds: MAX_SEGMENT_DURATION_SECONDS,
      contextOverlapSeconds: 0,
    });
    expect(shortest).toHaveLength(1);
    expect(longest).toHaveLength(1);
    expect(shortest[0].contextStartSample).toBe(shortest[0].coreStartSample);
    expect(shortest[0].contextEndSample).toBe(shortest[0].coreEndSample);
    expect(DEFAULT_CONTEXT_OVERLAP_SECONDS).toBe(1);
  });

  it('plans only primitive boundary metadata and never returns PCM copies', () => {
    const plan = planAudioSegments(MAX_AUDIO_SAMPLE_COUNT, 'no-pcm-copy');
    expect(
      plan.every((segment) => Object.values(segment).every((value) => typeof value !== 'object')),
    ).toBe(true);
    expect(
      plan.some((segment) => Object.values(segment).some((value) => ArrayBuffer.isView(value))),
    ).toBe(false);
  });
});
