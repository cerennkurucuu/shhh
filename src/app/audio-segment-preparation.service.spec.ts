import { TestBed } from '@angular/core/testing';
import { AudioPipelineService, type AudioPipelineResult } from './audio-pipeline.service';
import { AudioSegmentPreparationService } from './audio-segment-preparation.service';
import { TARGET_SAMPLE_RATE_HZ } from './pcm-resampler';

const samples = (seconds: number): number => seconds * TARGET_SAMPLE_RATE_HZ;

function audio(seconds: number) {
  return {
    sampleRate: TARGET_SAMPLE_RATE_HZ as typeof TARGET_SAMPLE_RATE_HZ,
    numberOfChannels: 1 as const,
    durationSeconds: seconds,
    pcm: new Float32Array(samples(seconds)),
  };
}

function success(seconds: number): AudioPipelineResult {
  return { ok: true, audio: audio(seconds) };
}

describe('AudioSegmentPreparationService', () => {
  let service: AudioSegmentPreparationService;
  let prepare: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    prepare = vi.fn().mockResolvedValue(success(5));
    TestBed.configureTestingModule({
      providers: [{ provide: AudioPipelineService, useValue: { prepare } }],
    });
    service = TestBed.inject(AudioSegmentPreparationService);
  });

  it.each([5, 25, 51])('prepares %i seconds into the expected core partitions', async (seconds) => {
    prepare.mockResolvedValue(success(seconds));
    const result = await service.prepareSegments({ size: 100 } as File, `audio-${seconds}`);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.segments).toHaveLength(seconds === 51 ? 3 : 1);
    expect(result.segments.map((segment) => segment.durationSeconds)).toEqual(
      seconds === 51 ? [25, 25, 1] : [seconds],
    );
    expect(result.segments.map((segment) => segment.partNumber)).toEqual(
      seconds === 51 ? [1, 2, 3] : [1],
    );
  });

  it('prepares the 600-second limit as 24 ordered segments', async () => {
    prepare.mockResolvedValue(success(600));
    const result = await service.prepareSegments({ size: 100 } as File, 'maximum');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.segments).toHaveLength(24);
    expect(result.segments[0].coreStartSample).toBe(0);
    expect(result.segments.at(-1)?.coreEndSample).toBe(samples(600));
    expect(
      result.segments.every((segment) => segment.pcm.buffer === result.segments[0].pcm.buffer),
    ).toBe(true);
  });

  it('keeps cores gapless and contexts separate, with core offsets inside each view', async () => {
    const sourceAudio = audio(51);
    prepare.mockResolvedValue({ ok: true, audio: sourceAudio });
    const result = await service.prepareSegments({ size: 100 } as File, 'context-check');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [first, middle, last] = result.segments;
    expect([first.contextStartSample, first.contextEndSample]).toEqual([0, samples(26)]);
    expect([middle.contextStartSample, middle.contextEndSample]).toEqual([
      samples(24),
      samples(51),
    ]);
    expect([last.contextStartSample, last.contextEndSample]).toEqual([samples(49), samples(51)]);
    expect([middle.coreStartOffsetSample, middle.coreEndOffsetSample]).toEqual([
      samples(1),
      samples(26),
    ]);
    expect([middle.overlapBeforeSampleCount, middle.overlapAfterSampleCount]).toEqual([
      samples(1),
      samples(1),
    ]);
    expect(middle.overlapMayRepeatWords).toBe(true);
    expect(first.overlapMayRepeatWords).toBe(true);
    expect(last.overlapMayRepeatWords).toBe(true);
    expect(first.coreStartSample).toBe(0);
    expect(first.coreEndSample).toBe(middle.coreStartSample);
    expect(middle.coreEndSample).toBe(last.coreStartSample);
    expect(last.coreEndSample).toBe(samples(51));
    expect(result.segments.every((segment) => segment.pcm.buffer === sourceAudio.pcm.buffer)).toBe(
      true,
    );
  });

  it('uses the 25-second core and one-second context defaults', async () => {
    prepare.mockResolvedValue(success(51));
    const result = await service.prepareSegments({ size: 100 } as File, 'defaults');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.segments[0].durationSeconds).toBe(25);
    expect(result.segments[1].contextStartSeconds).toBe(24);
    expect(result.segments[1].contextEndSeconds).toBe(51);
  });

  it('passes through pipeline failures without building segments', async () => {
    const failure: AudioPipelineResult = {
      ok: false,
      code: 'decode-failed',
      message: 'decode failure',
    };
    prepare.mockResolvedValue(failure);
    const result = await service.prepareSegments({ size: 100 } as File, 'decode-fail');

    expect(result).toEqual(failure);
  });

  it('does not use a successful pipeline result if cancellation arrives before planning', async () => {
    let resolvePrepare!: (result: AudioPipelineResult) => void;
    prepare.mockImplementation(
      () => new Promise<AudioPipelineResult>((resolve) => (resolvePrepare = resolve)),
    );
    const controller = new AbortController();
    const operation = service.prepareSegments({ size: 100 } as File, 'abort-after-decode', {
      signal: controller.signal,
    });
    controller.abort();
    resolvePrepare(success(5));

    await expect(operation).resolves.toMatchObject({ ok: false, code: 'aborted' });
  });

  it('rejects PCM with the wrong sample rate or invalid dimensions', async () => {
    prepare.mockResolvedValue({
      ok: true,
      audio: { ...audio(5), sampleRate: 8000 },
    });
    const wrongRate = await service.prepareSegments({ size: 100 } as File, 'wrong-rate');
    expect(wrongRate).toMatchObject({ ok: false, code: 'invalid-pcm' });

    prepare.mockResolvedValue({
      ok: true,
      audio: { ...audio(5), pcm: new Float32Array(0) },
    });
    const empty = await service.prepareSegments({ size: 100 } as File, 'empty-pcm');
    expect(empty).toMatchObject({ ok: false, code: 'invalid-pcm' });

    const nonFiniteAudio = audio(5);
    nonFiniteAudio.pcm[10] = Number.NaN;
    prepare.mockResolvedValue({ ok: true, audio: nonFiniteAudio });
    const nonFinite = await service.prepareSegments({ size: 100 } as File, 'non-finite-pcm');
    expect(nonFinite).toMatchObject({ ok: false, code: 'invalid-pcm' });
  });

  it('does not mutate a previous successful result when a later preparation fails', async () => {
    const first = await service.prepareSegments({ size: 100 } as File, 'stable-first');
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const original = first.segments[0].pcm.slice();
    prepare.mockResolvedValue({ ok: false, code: 'decode-failed', message: 'later failure' });

    const second = await service.prepareSegments({ size: 100 } as File, 'stable-second');

    expect(second).toMatchObject({ ok: false, code: 'decode-failed' });
    expect(first.segments[0].pcm).toEqual(original);
  });

  it('allows a custom segment configuration without changing the defaults', async () => {
    prepare.mockResolvedValue(success(51));
    const result = await service.prepareSegments({ size: 100 } as File, 'custom', {
      segmentConfig: { targetDurationSeconds: 30, contextOverlapSeconds: 2 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.segments.map((segment) => segment.durationSeconds)).toEqual([30, 21]);
    expect(result.segments[1].contextStartSeconds).toBe(28);
  });
});
