import { DEFAULT_CONTEXT_OVERLAP_SECONDS, planAudioSegments } from './audio-segment-planner';
import { createAudioSegmentViews } from './audio-segment-views';
import { TARGET_SAMPLE_RATE_HZ } from './pcm-resampler';

const samples = (seconds: number): number => seconds * TARGET_SAMPLE_RATE_HZ;

describe('createAudioSegmentViews', () => {
  it.each([5, 25])('creates one context view for %i seconds of PCM', (seconds) => {
    const pcm = new Float32Array(samples(seconds));
    const plan = planAudioSegments(pcm.length, `single-${seconds}`);
    const views = createAudioSegmentViews(pcm, plan);

    expect(views).toHaveLength(1);
    expect(views[0]).toMatchObject({
      segmentId: plan[0].segmentId,
      segmentIndex: 0,
      partNumber: 1,
      coreStartSample: 0,
      coreEndSample: pcm.length,
      contextStartSample: 0,
      contextEndSample: pcm.length,
    });
    expect(views[0].pcm).toBeInstanceOf(Float32Array);
    expect(views[0].pcm.length).toBe(pcm.length);
  });

  it('creates three shared views for 51 seconds and preserves overlap samples', () => {
    const pcm = new Float32Array(samples(51));
    pcm.forEach((_value, index) => {
      pcm[index] = index;
    });
    const plan = planAudioSegments(pcm.length, 'overlap-51');
    const views = createAudioSegmentViews(pcm, plan);

    expect(views).toHaveLength(3);
    expect(views.map((view) => view.pcm.length)).toEqual([samples(26), samples(27), samples(2)]);
    expect(views[0].pcm.at(-1)).toBe(pcm[samples(26) - 1]);
    expect(views[1].pcm[0]).toBe(pcm[samples(24)]);
    expect(views[1].pcm[samples(25)]).toBe(pcm[samples(49)]);
    expect(views[2].pcm[0]).toBe(pcm[samples(49)]);
    expect(views[2].pcm.at(-1)).toBe(pcm.at(-1));
    expect(
      views.map(({ segmentId, segmentIndex, partNumber }) => ({
        segmentId,
        segmentIndex,
        partNumber,
      })),
    ).toEqual(
      plan.map(({ segmentId, segmentIndex, partNumber }) => ({
        segmentId,
        segmentIndex,
        partNumber,
      })),
    );
  });

  it('creates 24 views for the 600-second limit using the same backing buffer', () => {
    const pcm = new Float32Array(samples(600));
    const plan = planAudioSegments(pcm.length, 'max-600');
    const views = createAudioSegmentViews(pcm, plan);

    expect(views).toHaveLength(24);
    expect(views[0].contextStartSample).toBe(0);
    expect(views[0].contextEndSample).toBe(samples(26));
    expect(views.at(-1)?.contextStartSample).toBe(samples(574));
    expect(views.at(-1)?.contextEndSample).toBe(samples(600));
    expect(views.every((view) => view.pcm.buffer === pcm.buffer)).toBe(true);
    expect(views.every((view) => view.pcm.length <= samples(27))).toBe(true);
  });

  it('uses each exact context interval and shares the source byte range', () => {
    const pcm = Float32Array.from({ length: samples(51) }, (_value, index) => index / 10);
    const plan = planAudioSegments(pcm.length, 'range-check', {
      contextOverlapSeconds: DEFAULT_CONTEXT_OVERLAP_SECONDS,
    });
    const snapshot = pcm.slice();
    const views = createAudioSegmentViews(pcm, plan);

    for (const [index, view] of views.entries()) {
      const source = plan[index];
      expect(view.pcm.buffer).toBe(pcm.buffer);
      expect(view.pcm.byteOffset).toBe(
        pcm.byteOffset + source.contextStartSample * Float32Array.BYTES_PER_ELEMENT,
      );
      expect(view.pcm.length).toBe(source.contextEndSample - source.contextStartSample);
      expect(view.pcm[0]).toBe(pcm[source.contextStartSample]);
    }
    expect(pcm).toEqual(snapshot);
  });

  it('returns an empty list for empty PCM and empty plan', () => {
    expect(createAudioSegmentViews(new Float32Array(0), [])).toEqual([]);
  });

  it('rejects malformed or incomplete plans', () => {
    const pcm = new Float32Array(samples(51));
    const valid = planAudioSegments(pcm.length, 'valid');

    expect(() => createAudioSegmentViews(pcm, valid.slice(0, 1))).toThrow(RangeError);
    expect(() =>
      createAudioSegmentViews(pcm, [
        valid[0],
        { ...valid[1], coreStartSample: valid[1].coreStartSample + 1 },
        valid[2],
      ]),
    ).toThrow(RangeError);
    expect(() =>
      createAudioSegmentViews(pcm, [
        valid[0],
        { ...valid[1], contextEndSample: pcm.length + 1 },
        valid[2],
      ]),
    ).toThrow(RangeError);
    expect(() =>
      createAudioSegmentViews(pcm, [
        valid[0],
        { ...valid[1], segmentId: valid[0].segmentId },
        valid[2],
      ]),
    ).toThrow(RangeError);
    expect(() => createAudioSegmentViews(new Float32Array(1), valid)).toThrow(RangeError);
    expect(() => createAudioSegmentViews(new Float32Array(1), [])).toThrow(RangeError);
  });
});
