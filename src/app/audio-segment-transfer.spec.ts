import { MAX_AUDIO_SAMPLE_COUNT, planAudioSegments } from './audio-segment-planner';
import type { PreparedAudioSegment } from './audio-segment-preparation.service';
import {
  copySegmentForTransfer,
  DEFAULT_MAX_SEGMENT_TRANSFER_BYTES,
} from './audio-segment-transfer';
import { createAudioSegmentViews } from './audio-segment-views';
import { TARGET_SAMPLE_RATE_HZ } from './pcm-resampler';

const samples = (seconds: number): number => seconds * TARGET_SAMPLE_RATE_HZ;

function prepareViews(seconds: number): { source: Float32Array; segments: PreparedAudioSegment[] } {
  const source = Float32Array.from({ length: samples(seconds) }, (_value, index) => index / 10);
  const plan = planAudioSegments(source.length, `transfer-${seconds}`);
  const views = createAudioSegmentViews(source, plan);
  const segments = views.map((segment) => {
    const overlapBeforeSampleCount = segment.coreStartSample - segment.contextStartSample;
    const overlapAfterSampleCount = segment.contextEndSample - segment.coreEndSample;
    return {
      ...segment,
      coreStartOffsetSample: overlapBeforeSampleCount,
      coreEndOffsetSample: segment.coreEndSample - segment.contextStartSample,
      overlapBeforeSampleCount,
      overlapAfterSampleCount,
      overlapMayRepeatWords: overlapBeforeSampleCount > 0 || overlapAfterSampleCount > 0,
    };
  });
  return { source, segments };
}

describe('copySegmentForTransfer', () => {
  it('copies a single segment into an independent buffer with identical samples', () => {
    const { source, segments } = prepareViews(5);
    const original = source.slice();
    const result = copySegmentForTransfer(segments[0]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.segment.pcm).toEqual(segments[0].pcm);
    expect(result.segment.pcm.buffer).not.toBe(source.buffer);
    expect(result.segment.transferableBuffer).toBe(result.segment.pcm.buffer);
    expect(result.byteLength).toBe(samples(5) * Float32Array.BYTES_PER_ELEMENT);
    expect(source).toEqual(original);
  });

  it('copies only the second segment from a 51-second plan and preserves other views', () => {
    const { source, segments } = prepareViews(51);
    const sourceBefore = source.slice();
    const firstBefore = segments[0].pcm.slice();
    const lastBefore = segments[2].pcm.slice();
    const selected = segments[1];
    const result = copySegmentForTransfer(selected);

    expect(segments).toHaveLength(3);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.segment.pcm).toEqual(selected.pcm);
    expect(result.segment.segmentId).toBe(selected.segmentId);
    expect(result.segment.segmentIndex).toBe(1);
    expect(result.segment.partNumber).toBe(2);
    expect(result.segment.coreStartSample).toBe(selected.coreStartSample);
    expect(result.segment.coreEndSample).toBe(selected.coreEndSample);
    expect(result.segment.contextStartSample).toBe(selected.contextStartSample);
    expect(result.segment.contextEndSample).toBe(selected.contextEndSample);
    expect(result.segment.coreStartOffsetSample).toBe(selected.coreStartOffsetSample);
    expect(result.segment.coreEndOffsetSample).toBe(selected.coreEndOffsetSample);
    expect(result.segment.overlapBeforeSampleCount).toBe(selected.overlapBeforeSampleCount);
    expect(result.segment.overlapAfterSampleCount).toBe(selected.overlapAfterSampleCount);
    expect(result.byteLength).toBe(samples(27) * Float32Array.BYTES_PER_ELEMENT);
    expect(result.segment.pcm.buffer).not.toBe(source.buffer);
    expect(source).toEqual(sourceBefore);
    expect(segments[0].pcm).toEqual(firstBefore);
    expect(segments[2].pcm).toEqual(lastBefore);
    expect(segments.every((segment) => segment.pcm.buffer === source.buffer)).toBe(true);
  });

  it('preserves the exact default 27-second context allocation budget', () => {
    expect(DEFAULT_MAX_SEGMENT_TRANSFER_BYTES).toBe(8 * 1024 * 1024);
    const { segments } = prepareViews(51);
    const result = copySegmentForTransfer(segments[1]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.byteLength).toBe(1_728_000);
  });

  it('does not detach the source when the transfer copy is detached', () => {
    const { source, segments } = prepareViews(51);
    const sourceBefore = source.slice();
    const result = copySegmentForTransfer(segments[1]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(typeof structuredClone).toBe('function');
    const received = structuredClone(result.segment.transferableBuffer, {
      transfer: [result.segment.transferableBuffer],
    });

    expect(received.byteLength).toBe(result.byteLength);
    expect(result.segment.transferableBuffer.byteLength).toBe(0);
    expect(result.segment.pcm.length).toBe(0);
    expect(source).toEqual(sourceBefore);
    expect(segments[1].pcm.buffer).toBe(source.buffer);
    expect(segments[1].pcm.length).toBe(samples(27));
  });

  it('rejects malformed sample ranges and inconsistent core offsets', () => {
    const { segments } = prepareViews(51);
    const valid = segments[1];
    const invalidContext = {
      ...valid,
      contextEndSample: valid.contextEndSample + 1,
    };
    const invalidCoreOffset = {
      ...valid,
      coreStartOffsetSample: valid.coreStartOffsetSample + 1,
    };

    expect(copySegmentForTransfer(invalidContext)).toMatchObject({
      ok: false,
      code: 'invalid-segment',
    });
    expect(copySegmentForTransfer(invalidCoreOffset)).toMatchObject({
      ok: false,
      code: 'invalid-segment',
    });
    expect(copySegmentForTransfer({ ...valid, segmentIndex: -1 })).toMatchObject({
      ok: false,
      code: 'invalid-segment',
    });
    const beyondDurationContextStart = MAX_AUDIO_SAMPLE_COUNT - valid.pcm.length + 1;
    expect(
      copySegmentForTransfer({
        ...valid,
        contextStartSample: beyondDurationContextStart,
        contextEndSample: MAX_AUDIO_SAMPLE_COUNT + 1,
        coreStartSample: beyondDurationContextStart + valid.coreStartOffsetSample,
        coreEndSample: beyondDurationContextStart + valid.coreEndOffsetSample,
      }),
    ).toMatchObject({ ok: false, code: 'invalid-segment' });
  });

  it('rejects the copy before allocation when the byte budget is exceeded', () => {
    const { segments } = prepareViews(51);
    const result = copySegmentForTransfer(segments[1], { maxBufferBytes: 1024 });

    expect(result).toMatchObject({ ok: false, code: 'memory-limit' });
  });

  it('returns aborted without reading or copying the segment', () => {
    const controller = new AbortController();
    controller.abort();
    const segment = new Proxy({} as PreparedAudioSegment, {
      get() {
        throw new Error('aborted call must not inspect or copy PCM');
      },
    });

    expect(copySegmentForTransfer(segment, { signal: controller.signal })).toMatchObject({
      ok: false,
      code: 'aborted',
    });
  });

  it('leaves a 24-segment full-length plan metadata-only until one segment is selected', () => {
    const plan = planAudioSegments(samples(600), 'metadata-only-600');
    const selectedPlanItem = plan[1];
    const selectedContextPcm = new Float32Array(
      selectedPlanItem.contextEndSample - selectedPlanItem.contextStartSample,
    );
    const overlapBeforeSampleCount =
      selectedPlanItem.coreStartSample - selectedPlanItem.contextStartSample;
    const overlapAfterSampleCount =
      selectedPlanItem.contextEndSample - selectedPlanItem.coreEndSample;
    const selected: PreparedAudioSegment = {
      ...selectedPlanItem,
      pcm: selectedContextPcm,
      coreStartOffsetSample: overlapBeforeSampleCount,
      coreEndOffsetSample: selectedPlanItem.coreEndSample - selectedPlanItem.contextStartSample,
      overlapBeforeSampleCount,
      overlapAfterSampleCount,
      overlapMayRepeatWords: true,
    };
    const result = copySegmentForTransfer(selected);

    expect(plan).toHaveLength(24);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.segment.pcm.length).toBe(samples(27));
    expect(result.byteLength).toBe(samples(27) * Float32Array.BYTES_PER_ELEMENT);
  });
});
