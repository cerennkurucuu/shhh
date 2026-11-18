import { MAX_AUDIO_DURATION_SECONDS } from './audio-decode.service';
import { TARGET_SAMPLE_RATE_HZ } from './pcm-resampler';

export const DEFAULT_SEGMENT_DURATION_SECONDS = 25;
export const MIN_SEGMENT_DURATION_SECONDS = 20;
export const MAX_SEGMENT_DURATION_SECONDS = 30;
export const DEFAULT_CONTEXT_OVERLAP_SECONDS = 1;
export const MAX_AUDIO_SAMPLE_COUNT = MAX_AUDIO_DURATION_SECONDS * TARGET_SAMPLE_RATE_HZ;

export interface AudioSegmentPlanConfig {
  /** Core audio duration. Must be between 20 and 30 seconds, inclusive. */
  readonly targetDurationSeconds?: number;
  /** Context added on each side of a core range, clamped to file bounds. */
  readonly contextOverlapSeconds?: number;
}

/** All sample intervals are half-open: [start, end). */
export interface AudioSegmentPlanItem {
  /** Stable when audioId, PCM length and configuration are unchanged. */
  readonly segmentId: string;
  /** Zero-based order in the plan. */
  readonly segmentIndex: number;
  /** One-based order suitable for labels such as “1. Part”. */
  readonly partNumber: number;
  readonly coreStartSample: number;
  readonly coreEndSample: number;
  readonly contextStartSample: number;
  readonly contextEndSample: number;
  readonly startSeconds: number;
  readonly endSeconds: number;
  /** Core range duration; adjacent core ranges never overlap. */
  readonly durationSeconds: number;
  readonly contextStartSeconds: number;
  readonly contextEndSeconds: number;
  readonly contextDurationSeconds: number;
}

function validateConfig(
  sampleCount: number,
  audioId: string,
  config: AudioSegmentPlanConfig,
): { targetSamples: number; overlapSamples: number } {
  if (
    !Number.isSafeInteger(sampleCount) ||
    sampleCount < 0 ||
    sampleCount > MAX_AUDIO_SAMPLE_COUNT
  ) {
    throw new RangeError(`sampleCount must be an integer between 0 and ${MAX_AUDIO_SAMPLE_COUNT}`);
  }
  if (typeof audioId !== 'string' || audioId.trim().length === 0) {
    throw new TypeError('audioId must be a non-empty string');
  }

  const targetDurationSeconds = config.targetDurationSeconds ?? DEFAULT_SEGMENT_DURATION_SECONDS;
  if (
    !Number.isFinite(targetDurationSeconds) ||
    targetDurationSeconds < MIN_SEGMENT_DURATION_SECONDS ||
    targetDurationSeconds > MAX_SEGMENT_DURATION_SECONDS
  ) {
    throw new RangeError(
      `targetDurationSeconds must be between ${MIN_SEGMENT_DURATION_SECONDS} and ${MAX_SEGMENT_DURATION_SECONDS}`,
    );
  }

  const contextOverlapSeconds = config.contextOverlapSeconds ?? DEFAULT_CONTEXT_OVERLAP_SECONDS;
  if (
    !Number.isFinite(contextOverlapSeconds) ||
    contextOverlapSeconds < 0 ||
    contextOverlapSeconds >= targetDurationSeconds
  ) {
    throw new RangeError('contextOverlapSeconds must be >= 0 and less than targetDurationSeconds');
  }

  // Convert configuration to integer sample counts once; all boundaries below use integer math.
  return {
    targetSamples: Math.round(targetDurationSeconds * TARGET_SAMPLE_RATE_HZ),
    overlapSamples: Math.round(contextOverlapSeconds * TARGET_SAMPLE_RATE_HZ),
  };
}

/**
 * Builds metadata-only segment boundaries for mono 16 kHz PCM. This function
 * accepts a sample count rather than PCM, so it never slices or copies audio.
 * Core ranges exactly partition [0, sampleCount); context ranges may overlap.
 *
 * A future transcript merger must handle words cut at core boundaries and use
 * context overlap to reconcile repeated text. Transcription and merging are
 * deliberately outside this planner.
 */
export function planAudioSegments(
  sampleCount: number,
  audioId: string,
  config: AudioSegmentPlanConfig = {},
): AudioSegmentPlanItem[] {
  const { targetSamples, overlapSamples } = validateConfig(sampleCount, audioId, config);
  if (sampleCount === 0) {
    return [];
  }

  const safeAudioId = encodeURIComponent(audioId.trim());
  const segments: AudioSegmentPlanItem[] = [];
  const segmentCount = Math.ceil(sampleCount / targetSamples);

  for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
    const coreStartSample = segmentIndex * targetSamples;
    const coreEndSample = Math.min(coreStartSample + targetSamples, sampleCount);
    const contextStartSample = Math.max(0, coreStartSample - overlapSamples);
    const contextEndSample = Math.min(sampleCount, coreEndSample + overlapSamples);
    const contextDurationSamples = contextEndSample - contextStartSample;

    segments.push({
      segmentId: `${safeAudioId}:segment:${segmentIndex}`,
      segmentIndex,
      partNumber: segmentIndex + 1,
      coreStartSample,
      coreEndSample,
      contextStartSample,
      contextEndSample,
      startSeconds: coreStartSample / TARGET_SAMPLE_RATE_HZ,
      endSeconds: coreEndSample / TARGET_SAMPLE_RATE_HZ,
      durationSeconds: (coreEndSample - coreStartSample) / TARGET_SAMPLE_RATE_HZ,
      contextStartSeconds: contextStartSample / TARGET_SAMPLE_RATE_HZ,
      contextEndSeconds: contextEndSample / TARGET_SAMPLE_RATE_HZ,
      contextDurationSeconds: contextDurationSamples / TARGET_SAMPLE_RATE_HZ,
    });
  }

  return segments;
}
