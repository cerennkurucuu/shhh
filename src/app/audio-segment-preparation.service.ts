import { inject, Injectable } from '@angular/core';
import {
  AudioPipelineService,
  type AudioPipelineOptions,
  type AudioPipelineResult,
  type PreparedAudio,
} from './audio-pipeline.service';
import {
  DEFAULT_CONTEXT_OVERLAP_SECONDS,
  DEFAULT_SEGMENT_DURATION_SECONDS,
  MAX_AUDIO_SAMPLE_COUNT,
  type AudioSegmentPlanConfig,
  type AudioSegmentPlanItem,
  planAudioSegments,
} from './audio-segment-planner';
import { createAudioSegmentViews, type AudioSegmentView } from './audio-segment-views';
import { TARGET_SAMPLE_RATE_HZ } from './pcm-resampler';

export interface AudioSegmentPreparationOptions extends AudioPipelineOptions {
  readonly segmentConfig?: AudioSegmentPlanConfig;
}

export interface PreparedAudioSegment extends AudioSegmentView {
  /** Core start relative to the first sample in this segment's context view. */
  readonly coreStartOffsetSample: number;
  /** Core end relative to the first sample in this segment's context view. */
  readonly coreEndOffsetSample: number;
  readonly overlapBeforeSampleCount: number;
  readonly overlapAfterSampleCount: number;
  /** Indicates that context audio can contain words also heard by a neighbor. */
  readonly overlapMayRepeatWords: boolean;
}

export type AudioSegmentPreparationResult =
  | {
      readonly ok: true;
      readonly sampleRate: typeof TARGET_SAMPLE_RATE_HZ;
      readonly numberOfChannels: 1;
      readonly durationSeconds: number;
      readonly segments: readonly PreparedAudioSegment[];
    }
  | {
      readonly ok: false;
      readonly code:
        | Extract<AudioPipelineResult, { ok: false }>['code']
        | 'aborted'
        | 'invalid-pcm'
        | 'segment-plan-failed';
      readonly message: string;
    };

const ABORTED_RESULT: AudioSegmentPreparationResult = {
  ok: false,
  code: 'aborted',
  message: 'Ses hazırlama işlemi iptal edildi.',
};

function isValidPreparedAudio(audio: PreparedAudio): boolean {
  const validDimensions =
    audio.sampleRate === TARGET_SAMPLE_RATE_HZ &&
    audio.numberOfChannels === 1 &&
    audio.pcm instanceof Float32Array &&
    audio.pcm.length > 0 &&
    audio.pcm.length <= MAX_AUDIO_SAMPLE_COUNT &&
    Number.isFinite(audio.durationSeconds) &&
    audio.durationSeconds > 0 &&
    audio.durationSeconds <= 600 &&
    Math.abs(audio.pcm.length / TARGET_SAMPLE_RATE_HZ - audio.durationSeconds) <=
      1 / TARGET_SAMPLE_RATE_HZ;
  if (!validDimensions) {
    return false;
  }
  for (const sample of audio.pcm) {
    if (!Number.isFinite(sample)) {
      return false;
    }
  }
  return true;
}

/** Connects local decode/resampling to metadata planning and zero-copy views. */
@Injectable({ providedIn: 'root' })
export class AudioSegmentPreparationService {
  private readonly pipeline = inject(AudioPipelineService);

  async prepareSegments(
    file: File | null | undefined,
    audioId: string,
    options: AudioSegmentPreparationOptions = {},
  ): Promise<AudioSegmentPreparationResult> {
    if (options.signal?.aborted) {
      return ABORTED_RESULT;
    }

    const { segmentConfig, ...pipelineOptions } = options;
    const prepared = await this.pipeline.prepare(file, pipelineOptions);
    if (!prepared.ok) {
      return prepared;
    }
    if (options.signal?.aborted) {
      return ABORTED_RESULT;
    }
    if (!isValidPreparedAudio(prepared.audio)) {
      return {
        ok: false,
        code: 'invalid-pcm',
        message: 'Ses hattı 16 kHz mono PCM üretmedi veya PCM sınırları geçersiz.',
      };
    }

    try {
      const config: AudioSegmentPlanConfig = {
        targetDurationSeconds: DEFAULT_SEGMENT_DURATION_SECONDS,
        contextOverlapSeconds: DEFAULT_CONTEXT_OVERLAP_SECONDS,
        ...segmentConfig,
      };
      const plan: AudioSegmentPlanItem[] = planAudioSegments(
        prepared.audio.pcm.length,
        audioId,
        config,
      );
      if (options.signal?.aborted) {
        return ABORTED_RESULT;
      }
      const views = createAudioSegmentViews(prepared.audio.pcm, plan);
      if (options.signal?.aborted) {
        return ABORTED_RESULT;
      }

      const segments: PreparedAudioSegment[] = views.map((segment) => {
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

      return {
        ok: true,
        sampleRate: prepared.audio.sampleRate,
        numberOfChannels: prepared.audio.numberOfChannels,
        durationSeconds: prepared.audio.durationSeconds,
        segments,
      };
    } catch {
      return {
        ok: false,
        code: 'segment-plan-failed',
        message: 'Ses segment planı veya görünüm sınırları doğrulanamadı.',
      };
    }
  }
}
