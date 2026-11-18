import type { PreparedAudioSegment } from './audio-segment-preparation.service';
import { MAX_AUDIO_SAMPLE_COUNT } from './audio-segment-planner';

/** Covers the largest planner-supported context at 30s core / <30s overlap. */
export const DEFAULT_MAX_SEGMENT_TRANSFER_BYTES = 8 * 1024 * 1024;

export interface AudioSegmentTransferOptions {
  readonly signal?: AbortSignal;
  readonly maxBufferBytes?: number;
}

/**
 * A single segment copy ready for a future Worker transfer. `pcm` and
 * `transferableBuffer` refer to the same independent allocation. After passing
 * `transferableBuffer` in a transfer list, do not read either property: the
 * sender-side buffer and view will be detached and ownership moves to the
 * Worker. This module does not create or message a Worker.
 */
export type TransferReadyAudioSegment = Omit<PreparedAudioSegment, 'pcm'> & {
  readonly pcm: Float32Array;
  readonly transferableBuffer: ArrayBuffer;
};

export type AudioSegmentTransferResult =
  | { readonly ok: true; readonly segment: TransferReadyAudioSegment; readonly byteLength: number }
  | {
      readonly ok: false;
      readonly code: 'aborted' | 'invalid-segment' | 'memory-limit' | 'copy-failed';
      readonly message: string;
    };

function isValidSegment(segment: PreparedAudioSegment): boolean {
  if (
    segment === null ||
    typeof segment !== 'object' ||
    typeof segment.segmentId !== 'string' ||
    segment.segmentId.length === 0 ||
    !Number.isSafeInteger(segment.segmentIndex) ||
    segment.segmentIndex < 0 ||
    segment.partNumber !== segment.segmentIndex + 1 ||
    !(segment.pcm instanceof Float32Array)
  ) {
    return false;
  }

  const {
    coreStartSample,
    coreEndSample,
    contextStartSample,
    contextEndSample,
    coreStartOffsetSample,
    coreEndOffsetSample,
    overlapBeforeSampleCount,
    overlapAfterSampleCount,
  } = segment;
  return (
    Number.isSafeInteger(coreStartSample) &&
    Number.isSafeInteger(coreEndSample) &&
    Number.isSafeInteger(contextStartSample) &&
    Number.isSafeInteger(contextEndSample) &&
    contextStartSample >= 0 &&
    contextEndSample <= MAX_AUDIO_SAMPLE_COUNT &&
    coreStartSample >= contextStartSample &&
    coreEndSample > coreStartSample &&
    contextEndSample >= coreEndSample &&
    contextEndSample - contextStartSample === segment.pcm.length &&
    coreStartOffsetSample === coreStartSample - contextStartSample &&
    coreEndOffsetSample === coreEndSample - contextStartSample &&
    overlapBeforeSampleCount === coreStartSample - contextStartSample &&
    overlapAfterSampleCount === contextEndSample - coreEndSample
  );
}

/**
 * Copy only this segment's context PCM when the caller is ready to process it.
 * Callers should finish its transfer/use and release their returned reference
 * before requesting the next segment; this helper intentionally has no batch
 * or queue API and cannot enforce caller-side concurrency.
 */
export function copySegmentForTransfer(
  segment: PreparedAudioSegment,
  options: AudioSegmentTransferOptions = {},
): AudioSegmentTransferResult {
  if (options.signal?.aborted) {
    return { ok: false, code: 'aborted', message: 'Segment kopyalama iptal edildi.' };
  }
  if (!isValidSegment(segment)) {
    return {
      ok: false,
      code: 'invalid-segment',
      message: 'Segment PCM veya örnek sınırları geçersiz.',
    };
  }

  const byteLength = segment.pcm.length * Float32Array.BYTES_PER_ELEMENT;
  const maxBufferBytes = options.maxBufferBytes ?? DEFAULT_MAX_SEGMENT_TRANSFER_BYTES;
  if (
    !Number.isSafeInteger(maxBufferBytes) ||
    maxBufferBytes <= 0 ||
    !Number.isSafeInteger(byteLength) ||
    byteLength > maxBufferBytes
  ) {
    return {
      ok: false,
      code: 'memory-limit',
      message: 'Segment aktarım tamponu bellek bütçesini aşıyor.',
    };
  }

  try {
    const { pcm: sourcePcm, ...metadata } = segment;
    const pcm = new Float32Array(sourcePcm.length);
    pcm.set(sourcePcm);
    if (options.signal?.aborted) {
      return { ok: false, code: 'aborted', message: 'Segment kopyalama iptal edildi.' };
    }

    return {
      ok: true,
      segment: {
        ...metadata,
        pcm,
        transferableBuffer: pcm.buffer,
      },
      byteLength,
    };
  } catch (error) {
    return {
      ok: false,
      code: error instanceof RangeError ? 'memory-limit' : 'copy-failed',
      message: 'Segment aktarım tamponu oluşturulamadı.',
    };
  }
}
