import type { AudioSegmentPlanItem } from './audio-segment-planner';

/**
 * A context-window view over the original PCM buffer. Treat `pcm` as read-only:
 * typed-array views share mutable memory and writes would change the source.
 */
export interface AudioSegmentView extends AudioSegmentPlanItem {
  /** Shared-memory view for contextStartSample..contextEndSample (end-exclusive). */
  readonly pcm: Float32Array;
}

/**
 * Creates zero-copy views for a valid plan. Each view keeps the source
 * ArrayBuffer alive; do not transfer that buffer to a Worker because transfer
 * would detach the original PCM. A future Worker boundary must use a separately
 * designed, controlled copy of only the required segment.
 */
export function createAudioSegmentViews(
  pcm: Float32Array,
  plan: readonly AudioSegmentPlanItem[],
): AudioSegmentView[] {
  if (!(pcm instanceof Float32Array)) {
    throw new TypeError('pcm must be a Float32Array');
  }
  if (!Array.isArray(plan)) {
    throw new TypeError('plan must be an array');
  }
  if (pcm.length === 0) {
    if (plan.length !== 0) {
      throw new RangeError('an empty PCM buffer requires an empty segment plan');
    }
    return [];
  }
  if (plan.length === 0) {
    throw new RangeError('a non-empty PCM buffer requires a segment plan');
  }

  const ids = new Set<string>();
  let expectedCoreStart = 0;

  for (let index = 0; index < plan.length; index++) {
    const segment = plan[index];
    const { coreStartSample, coreEndSample, contextStartSample, contextEndSample } = segment;
    if (
      typeof segment.segmentId !== 'string' ||
      segment.segmentId.length === 0 ||
      ids.has(segment.segmentId) ||
      segment.segmentIndex !== index ||
      segment.partNumber !== index + 1
    ) {
      throw new RangeError('segment identity and order must be unique and sequential');
    }
    ids.add(segment.segmentId);

    if (
      !Number.isSafeInteger(coreStartSample) ||
      !Number.isSafeInteger(coreEndSample) ||
      !Number.isSafeInteger(contextStartSample) ||
      !Number.isSafeInteger(contextEndSample) ||
      coreStartSample !== expectedCoreStart ||
      coreEndSample <= coreStartSample ||
      contextStartSample < 0 ||
      contextStartSample > coreStartSample ||
      contextEndSample < coreEndSample ||
      contextEndSample > pcm.length
    ) {
      throw new RangeError(
        'segment sample ranges must be valid, ordered, and within the PCM buffer',
      );
    }
    expectedCoreStart = coreEndSample;
  }

  if (expectedCoreStart !== pcm.length) {
    throw new RangeError('segment core ranges must cover the entire PCM buffer');
  }

  return plan.map((segment) => ({
    ...segment,
    pcm: pcm.subarray(segment.contextStartSample, segment.contextEndSample),
  }));
}
