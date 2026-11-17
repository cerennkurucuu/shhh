import { TestBed } from '@angular/core/testing';
import { App, RECOMMENDED_MAX_DURATION_SECONDS } from './app';
import { AudioFileValidationService, type ValidationResult } from './audio-file-validation.service';
import {
  amrBytes,
  audioFile,
  longDurationWavBytes,
  mp3FrameBytes,
  mp3WithId3Bytes,
  nonPcmWavBytes,
  oggNonOpusBytes,
  oggOpusBytes,
  textBytes,
  unknownDurationWavBytes,
  wavBytes,
} from './testing/audio-fixtures';
import { OggMetadataService, type OggMetadataResult } from './ogg-metadata.service';
import { Mp3MetadataService, type Mp3MetadataResult } from './mp3-metadata.service';
import { WavMetadataService, type WavMetadataResult } from './wav-metadata.service';

describe('App', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
    });
  });

  const createFixture = () => TestBed.createComponent(App);

  it('creates the app', () => {
    const fixture = createFixture();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the product name and the honest development status', async () => {
    const fixture = createFixture();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('h1')?.textContent).toContain('shhh.');
    expect(compiled.querySelector('.status')?.textContent).toContain('henüz etkin değil');
  });

  it('renders the about section and the exact footer text', async () => {
    const fixture = createFixture();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('#about-title')?.textContent).toContain('shhh. nedir?');
    expect(compiled.querySelector('footer')?.textContent?.trim()).toBe(
      'by cerenkurucu · Built with AI assistance',
    );
  });

  it('has a single page without navigation menu', async () => {
    const fixture = createFixture();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('nav')).toBeNull();
    expect(compiled.querySelector('main')).toBeTruthy();
  });

  describe('file picker', () => {
    it('renders an accessible single-file input with a label and accept hint', async () => {
      const fixture = createFixture();
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      const input = compiled.querySelector<HTMLInputElement>('#audio-file');
      expect(input).toBeTruthy();
      expect(input?.type).toBe('file');
      expect(input?.hasAttribute('multiple')).toBe(false);
      expect(input?.getAttribute('accept')).toContain('audio/*');

      const label = compiled.querySelector<HTMLLabelElement>('label[for="audio-file"]');
      expect(label?.textContent?.trim()).toBe('Dosya seç');
      expect(compiled.querySelector('label[for="audio-file"]')).toBeTruthy();
    });

    it('shows the selected file name, size, container and pre-validation status', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      await component.handleFiles([audioFile(wavBytes(), 'deneme.wav', 'audio/wav')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.selected()).toEqual({
        name: 'deneme.wav',
        size: 60,
        container: 'wav',
      });
      expect(component.error()).toBeNull();

      const ready = compiled.querySelector('.file-ready');
      expect(ready?.getAttribute('role')).toBe('status');
      expect(ready?.textContent).toContain('deneme.wav');
      expect(ready?.textContent).toContain('60 B');
      expect(ready?.textContent).toContain('WAV');
      expect(ready?.textContent).toContain('ön doğrulamadan geçti');
      expect(compiled.querySelector('.file-note')?.textContent).toContain('geliştirme aşamasında');
    });

    it('keeps the validated file reference in memory and only there', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      const file = audioFile(wavBytes(), 'referans.wav', 'audio/wav');

      await component.handleFiles([file]);
      expect(component.file()).toBe(file);

      await component.handleFiles([audioFile(textBytes(), 'bozuk.mp3', 'audio/mpeg')]);
      expect(component.error()).not.toBeNull();
      expect(component.file()).toBe(file);
      expect(component.selected()).toEqual({ name: 'referans.wav', size: 60, container: 'wav' });
    });

    it('replaces the previous selection when a new valid file is chosen', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'ilk.wav', 'audio/wav')]);
      await component.handleFiles([audioFile(oggOpusBytes(), 'ikinci.ogg', 'audio/ogg')]);

      expect(component.selected()).toEqual({
        name: 'ikinci.ogg',
        size: oggOpusBytes().length,
        container: 'ogg',
      });
      expect(component.error()).toBeNull();
      expect(component.warning()).toBeNull();
    });

    it('rejects a non-audio file with an understandable error and keeps the previous selection', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'notlar.wav', 'audio/wav')]);
      await component.handleFiles([audioFile(textBytes(), 'notlar.mp3', 'audio/mpeg')]);

      expect(component.error()).toContain('anlaşılamadı');
      expect(component.errorCode()).toBe('invalid-file');
      expect(component.selected()).toEqual({ name: 'notlar.wav', size: 60, container: 'wav' });
    });

    it('rejects an empty file with an understandable error', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([new File([], 'bos.mp3', { type: 'audio/mpeg' })]);

      expect(component.error()).toContain('boş görünüyor');
      expect(component.errorCode()).toBe('invalid-file');
      expect(component.selected()).toBeNull();
    });

    it('keeps the current state when the selection is cancelled', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'onceki.wav', 'audio/wav')]);
      await component.handleFiles([]);

      expect(component.selected()).toEqual({ name: 'onceki.wav', size: 60, container: 'wav' });
      expect(component.error()).toBeNull();
    });

    it('rejects multiple files at once', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([
        audioFile(wavBytes(), 'a.wav', 'audio/wav'),
        audioFile(wavBytes(), 'b.wav', 'audio/wav'),
      ]);

      expect(component.error()).toContain('yalnızca bir dosya');
      expect(component.errorCode()).toBe('invalid-file');
      expect(component.selected()).toBeNull();
    });

    it('clears the input value after change so the same file can be re-selected', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      const input = document.createElement('input');
      input.type = 'file';
      const file = audioFile(wavBytes(), 'ayni.wav', 'audio/wav');
      Object.defineProperty(input, 'files', { value: [file], configurable: true });

      let assignedValue: string | null = null;
      Object.defineProperty(input, 'value', {
        configurable: true,
        get: () => 'C:\\fakepath\\ayni.wav',
        set: (next: string) => {
          assignedValue = next;
        },
      });

      await component.onFileInputChange({ target: input } as unknown as Event);

      expect(component.selected()).toEqual({ name: 'ayni.wav', size: 60, container: 'wav' });
      expect(assignedValue).toBe('');
    });

    it('toggles drag state and applies a dropped file', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      component.onDragEnter();
      component.onDragEnter();
      expect(component.dragging()).toBe(true);

      component.onDragLeave();
      expect(component.dragging()).toBe(true);
      component.onDragLeave();
      expect(component.dragging()).toBe(false);

      const preventDefault = vi.fn();
      const file = audioFile(oggOpusBytes(), 'bırakilan.ogg', 'audio/ogg');
      await component.onDrop({
        preventDefault,
        dataTransfer: { files: [file] },
      } as unknown as DragEvent);

      expect(preventDefault).toHaveBeenCalled();
      expect(component.dragging()).toBe(false);
      expect(component.selected()).toEqual({
        name: 'bırakilan.ogg',
        size: file.size,
        container: 'ogg',
      });
    });

    it('ignores a drop without files so the current state stays intact', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'mevcut.wav', 'audio/wav')]);
      await component.onDrop({
        preventDefault: vi.fn(),
        dataTransfer: { files: [] },
      } as unknown as DragEvent);

      expect(component.selected()).toEqual({ name: 'mevcut.wav', size: 60, container: 'wav' });
      expect(component.error()).toBeNull();
    });

    it('renders the error as plain text with role=alert and the machine-readable code', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(textBytes(), 'notlar.txt', 'text/html')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      const alert = compiled.querySelector('.picker-error');
      expect(alert?.getAttribute('role')).toBe('alert');
      expect(alert?.textContent).toContain('anlaşılamadı');
      expect(compiled.querySelector('.error-code')?.textContent).toBe('invalid-file');
      expect(compiled.querySelector('.picker-error img')).toBeNull();
    });

    it('shows a hostile file name as plain text, never as HTML', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      const hostileName = '<img src=x onerror="alert(1)">.wav';

      await component.handleFiles([audioFile(wavBytes(), hostileName, 'audio/wav')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      const ready = compiled.querySelector('.file-ready');
      expect(ready?.textContent).toContain(hostileName);
      expect(compiled.querySelector('.file-ready img')).toBeNull();
    });

    it('warns when extension/MIME disagree with the sniffed container (without rejecting)', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(oggOpusBytes(), 'sarki.mp3', 'audio/mpeg')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.selected()?.container).toBe('ogg');
      expect(component.error()).toBeNull();
      expect(component.warning()).toContain('uyuşmuyor');

      const band = compiled.querySelector('.picker-warning');
      expect(band?.getAttribute('role')).toBe('note');
      expect(band?.textContent).toContain('uyuşmuyor');
      expect(band?.textContent).toContain('OGG');
    });

    it('clears the mismatch warning after a later consistent selection', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;
      await fixture.whenStable();

      await component.handleFiles([audioFile(oggOpusBytes(), 'sarki.mp3', 'audio/mpeg')]);
      expect(component.warning()).not.toBeNull();

      await component.handleFiles([audioFile(wavBytes(), 'temiz.wav', 'audio/wav')]);
      expect(component.warning()).toBeNull();
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).querySelector('.picker-warning')).toBeNull();
    });

    it('reports an unsupported container as unsupported-codec and keeps the previous selection', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'onceki.wav', 'audio/wav')]);
      await component.handleFiles([audioFile(amrBytes(), 'kayit.amr', 'audio/amr')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.errorCode()).toBe('unsupported-codec');
      expect(component.error()).toContain('AMR');
      expect(component.selected()).toEqual({ name: 'onceki.wav', size: 60, container: 'wav' });
      expect(compiled.querySelector('.error-code')?.textContent).toBe('unsupported-codec');
    });

    it('ignores a stale validation result that resolves after a newer selection', async () => {
      const pending: {
        file: File;
        resolve: (result: ValidationResult) => void;
      }[] = [];
      TestBed.configureTestingModule({
        providers: [
          {
            provide: AudioFileValidationService,
            useValue: {
              validate: (file: File) =>
                new Promise<ValidationResult>((resolve) => pending.push({ file, resolve })),
            },
          },
        ],
      });

      const fixture = createFixture();
      const component = fixture.componentInstance;
      const fileA = audioFile(wavBytes(), 'eski.wav', 'audio/wav');
      const fileB = audioFile(oggOpusBytes(), 'yeni.ogg', 'audio/ogg');

      const first = component.handleFiles([fileA]);
      const second = component.handleFiles([fileB]);

      const jobA = pending.find((job) => job.file === fileA);
      const jobB = pending.find((job) => job.file === fileB);
      expect(jobA).toBeTruthy();
      expect(jobB).toBeTruthy();

      jobB?.resolve({ ok: true, container: 'ogg', warning: null });
      await second;
      expect(component.selected()).toEqual({
        name: 'yeni.ogg',
        size: fileB.size,
        container: 'ogg',
      });

      jobA?.resolve({
        ok: false,
        code: 'invalid-file',
        reason: 'stale',
        message: 'geçmiş bir doğrulama sonucu',
      });
      await first;

      expect(component.selected()).toEqual({
        name: 'yeni.ogg',
        size: fileB.size,
        container: 'ogg',
      });
      expect(component.error()).toBeNull();
      expect(component.errorCode()).toBeNull();
    });

    it('formats byte sizes deterministically', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      expect(component.formatSize(0)).toBe('0 B');
      expect(component.formatSize(512)).toBe('512 B');
      expect(component.formatSize(2048)).toBe('2 KB');
      expect(component.formatSize(1024 * 1024 * 1.5)).toBe('1,5 MB');
    });
  });

  describe('WAV metadata integration', () => {
    it('shows duration, sample rate, channels and bit depth for a valid WAV', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'kayit.wav', 'audio/wav')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.wavMetadata()).toEqual({
        sampleRateHz: 8000,
        channels: 1,
        bitsPerSample: 16,
        byteRate: 16000,
        durationSeconds: 0.001,
      });

      const meta = compiled.querySelector('.file-meta');
      expect(meta).toBeTruthy();
      expect(meta?.textContent).toContain('Süre: 0:00');
      expect(meta?.textContent).toContain('8 kHz');
      expect(meta?.textContent).toContain('1 kanal');
      expect(meta?.textContent).toContain('16 bit');
      expect(compiled.querySelector('.file-note')?.textContent).toContain('WAV başlığından okundu');
    });

    it('shows "Süre bilinmiyor" when duration cannot be determined (no estimate)', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([
        audioFile(unknownDurationWavBytes(), 'belirsiz.wav', 'audio/wav'),
      ]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.error()).toBeNull();
      expect(component.wavMetadata()?.durationSeconds).toBeNull();

      const meta = compiled.querySelector('.file-meta');
      expect(meta?.textContent).toContain('Süre bilinmiyor');
      expect(meta?.textContent).not.toContain('Süre:');
      expect(meta?.textContent).not.toContain('tahmin');
    });

    it('formats sample rates in Hz or kHz deterministically', () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      expect(component.formatSampleRate(8000)).toBe('8 kHz');
      expect(component.formatSampleRate(44100)).toBe('44100 Hz');
      expect(component.formatSampleRate(16000)).toBe('16 kHz');
      expect(component.formatDuration(0)).toBe('0:00');
      expect(component.formatDuration(61)).toBe('1:01');
      expect(component.formatDuration(1200)).toBe('20:00');
    });

    it('rejects a WAV longer than 20 minutes with a clear error and keeps the previous selection', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'onceki.wav', 'audio/wav')]);
      const previousMeta = component.wavMetadata();
      expect(previousMeta).not.toBeNull();

      await component.handleFiles([audioFile(longDurationWavBytes(), 'uzun.wav', 'audio/wav')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.error()).toContain('20 dakika');
      expect(component.errorCode()).toBe('invalid-file');
      expect(component.selected()).toEqual({ name: 'onceki.wav', size: 60, container: 'wav' });
      expect(component.wavMetadata()).toEqual(previousMeta);
      expect(compiled.querySelector('.error-code')?.textContent).toBe('invalid-file');
      expect(RECOMMENDED_MAX_DURATION_SECONDS).toBe(1200);
    });

    it('rejects an over-long WAV on first selection without selecting it', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(longDurationWavBytes(), 'ilk-uzun.wav', 'audio/wav')]);

      expect(component.error()).toContain('20 dakika');
      expect(component.selected()).toBeNull();
      expect(component.wavMetadata()).toBeNull();
      expect(component.file()).toBeNull();
    });

    it('shows the existing error model for a non-PCM WAV without crashing', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'gecerli.wav', 'audio/wav')]);
      await component.handleFiles([audioFile(nonPcmWavBytes(), 'float.wav', 'audio/wav')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.error()).toContain('PCM');
      expect(component.errorCode()).toBe('unsupported-codec');
      expect(component.selected()).toEqual({ name: 'gecerli.wav', size: 60, container: 'wav' });
      expect(compiled.querySelector('.picker-error')?.getAttribute('role')).toBe('alert');
      expect(compiled.querySelector('.error-code')?.textContent).toBe('unsupported-codec');
    });

    it('does not read WAV metadata for OGG and does not read OGG metadata for WAV', async () => {
      const wavReadCalls: File[] = [];
      const oggReadCalls: File[] = [];
      TestBed.configureTestingModule({
        providers: [
          {
            provide: WavMetadataService,
            useValue: {
              read: (file: File) => {
                wavReadCalls.push(file);
                return Promise.resolve({
                  ok: true,
                  metadata: {
                    sampleRateHz: 1,
                    channels: 1,
                    bitsPerSample: 8,
                    byteRate: 1,
                    durationSeconds: 1,
                  },
                } satisfies WavMetadataResult);
              },
            },
          },
          {
            provide: OggMetadataService,
            useValue: {
              read: (file: File) => {
                oggReadCalls.push(file);
                return Promise.resolve({
                  ok: true,
                  metadata: {
                    codec: 'opus',
                    channels: 1,
                    outputSampleRateHz: 48000,
                    inputSampleRateHz: 48000,
                    preSkipSamples: 0,
                    mappingFamily: 0,
                    durationSeconds: null,
                  },
                } satisfies OggMetadataResult);
              },
            },
          },
        ],
      });

      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'yalniz.wav', 'audio/wav')]);
      expect(wavReadCalls).toHaveLength(1);
      expect(oggReadCalls).toHaveLength(0);

      await component.handleFiles([audioFile(oggOpusBytes(), 'yalniz.ogg', 'audio/ogg')]);
      expect(wavReadCalls).toHaveLength(1);
      expect(oggReadCalls).toHaveLength(1);
    });

    it('clears WAV metadata when an OGG file replaces a WAV selection', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'wav-once.wav', 'audio/wav')]);
      expect(component.wavMetadata()).not.toBeNull();
      expect(component.oggMetadata()).toBeNull();

      await component.handleFiles([audioFile(oggOpusBytes(), 'sonra.ogg', 'audio/ogg')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.wavMetadata()).toBeNull();
      expect(component.oggMetadata()).not.toBeNull();
      expect(compiled.querySelector('.file-meta')?.textContent).toContain('Opus');
      expect(component.selected()?.container).toBe('ogg');
    });

    it('ignores a stale WAV metadata result that resolves after a newer selection', async () => {
      const pending: {
        file: File;
        resolve: (result: WavMetadataResult) => void;
      }[] = [];
      TestBed.configureTestingModule({
        providers: [
          {
            provide: WavMetadataService,
            useValue: {
              read: (file: File) =>
                new Promise<WavMetadataResult>((resolve) => pending.push({ file, resolve })),
            },
          },
        ],
      });

      const fixture = createFixture();
      const component = fixture.componentInstance;
      const wavA = audioFile(wavBytes(), 'eski.wav', 'audio/wav');
      const wavB = audioFile(wavBytes(), 'yeni.wav', 'audio/wav');

      const first = component.handleFiles([wavA]);
      // SHHH-013 doğrulaması tamamlanıp metadata beklemeye alınsın.
      for (let i = 0; i < 20 && pending.length === 0; i++) {
        await Promise.resolve();
      }
      expect(pending).toHaveLength(1);

      const second = component.handleFiles([wavB]);
      for (let i = 0; i < 20 && pending.length < 2; i++) {
        await Promise.resolve();
      }
      expect(pending).toHaveLength(2);

      pending[1].resolve({
        ok: true,
        metadata: {
          sampleRateHz: 44100,
          channels: 2,
          bitsPerSample: 16,
          byteRate: 176400,
          durationSeconds: 1,
        },
      });
      await second;
      expect(component.selected()?.name).toBe('yeni.wav');
      expect(component.wavMetadata()?.sampleRateHz).toBe(44100);

      pending[0].resolve({
        ok: true,
        metadata: {
          sampleRateHz: 8000,
          channels: 1,
          bitsPerSample: 16,
          byteRate: 16000,
          durationSeconds: 0.001,
        },
      });
      await first;

      expect(component.selected()?.name).toBe('yeni.wav');
      expect(component.wavMetadata()?.sampleRateHz).toBe(44100);
      expect(component.error()).toBeNull();
    });

    it('ignores a stale over-long metadata error that resolves after a newer valid selection', async () => {
      const pending: {
        file: File;
        resolve: (result: WavMetadataResult) => void;
      }[] = [];
      TestBed.configureTestingModule({
        providers: [
          {
            provide: WavMetadataService,
            useValue: {
              read: (file: File) =>
                new Promise<WavMetadataResult>((resolve) => pending.push({ file, resolve })),
            },
          },
        ],
      });

      const fixture = createFixture();
      const component = fixture.componentInstance;
      const longWav = audioFile(longDurationWavBytes(), 'uzun.wav', 'audio/wav');
      const goodWav = audioFile(wavBytes(), 'kisa.wav', 'audio/wav');

      const first = component.handleFiles([longWav]);
      for (let i = 0; i < 20 && pending.length === 0; i++) {
        await Promise.resolve();
      }
      const second = component.handleFiles([goodWav]);
      for (let i = 0; i < 20 && pending.length < 2; i++) {
        await Promise.resolve();
      }

      pending[1].resolve({
        ok: true,
        metadata: {
          sampleRateHz: 8000,
          channels: 1,
          bitsPerSample: 16,
          byteRate: 16000,
          durationSeconds: 0.001,
        },
      });
      await second;
      expect(component.selected()?.name).toBe('kisa.wav');

      pending[0].resolve({
        ok: true,
        metadata: {
          sampleRateHz: 1,
          channels: 1,
          bitsPerSample: 8,
          byteRate: 1,
          durationSeconds: RECOMMENDED_MAX_DURATION_SECONDS + 1,
        },
      });
      await first;

      expect(component.selected()?.name).toBe('kisa.wav');
      expect(component.error()).toBeNull();
      expect(component.errorCode()).toBeNull();
      expect(component.wavMetadata()?.sampleRateHz).toBe(8000);
    });
  });

  describe('OGG metadata integration', () => {
    it('shows Codec Opus, Mono, 48 kHz and unknown duration for a mono OGG', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(oggOpusBytes(1), 'mono.ogg', 'audio/ogg')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.error()).toBeNull();
      expect(component.oggMetadata()).toEqual({
        codec: 'opus',
        channels: 1,
        outputSampleRateHz: 48000,
        inputSampleRateHz: 48000,
        preSkipSamples: 0,
        mappingFamily: 0,
        durationSeconds: null,
      });
      expect(component.wavMetadata()).toBeNull();

      const meta = compiled.querySelector('.file-meta');
      expect(meta).toBeTruthy();
      expect(meta?.textContent).toContain('Codec: Opus');
      expect(meta?.textContent).toContain('Mono');
      expect(meta?.textContent).toContain('48 kHz');
      expect(meta?.textContent).toContain('Süre bilinmiyor');
      expect(meta?.textContent).not.toContain('Süre:');
      expect(compiled.querySelector('.file-note')?.textContent).toContain(
        'sesin tamamı doğrulanmadı',
      );
    });

    it('shows Stereo for a stereo OGG/Opus file', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(oggOpusBytes(2), 'stereo.ogg', 'audio/ogg')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.error()).toBeNull();
      expect(component.oggMetadata()?.channels).toBe(2);

      const meta = compiled.querySelector('.file-meta');
      expect(meta?.textContent).toContain('Stereo');
      expect(meta?.textContent).not.toContain('Mono');
    });

    it('always reports unknown duration for OGG (no estimate, no fake percent)', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(oggOpusBytes(), 'sure.ogg', 'audio/ogg')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.oggMetadata()?.durationSeconds).toBeNull();

      const meta = compiled.querySelector('.file-meta');
      expect(meta?.textContent).toContain('Süre bilinmiyor');
      expect(meta?.textContent).not.toContain('%');
      expect(meta?.textContent).not.toContain('tahmin');
      expect(compiled.querySelector('.file-note')?.textContent).toContain(
        'Süre başlık okumasıyla güvenle hesaplanamaz',
      );
    });

    it('does not confuse Opus output rate with input rate in the UI', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(oggOpusBytes(), 'hiz.ogg', 'audio/ogg')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      const meta = compiled.querySelector('.file-meta');
      expect(meta?.textContent).toContain('48 kHz');
      expect(component.oggMetadata()?.outputSampleRateHz).toBe(48000);
      expect(component.oggMetadata()?.inputSampleRateHz).toBe(48000);
    });

    it('shows an understandable error for a non-Opus OGG and keeps the previous selection', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'onceki.wav', 'audio/wav')]);
      const previousWavMeta = component.wavMetadata();
      expect(previousWavMeta).not.toBeNull();

      await component.handleFiles([audioFile(oggNonOpusBytes(), 'vorbis.ogg', 'audio/ogg')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.error()).toContain('Opus');
      expect(component.errorCode()).toBe('unsupported-codec');
      expect(component.selected()).toEqual({ name: 'onceki.wav', size: 60, container: 'wav' });
      expect(component.wavMetadata()).toEqual(previousWavMeta);
      expect(component.oggMetadata()).toBeNull();
      expect(compiled.querySelector('.error-code')?.textContent).toBe('unsupported-codec');
      expect(compiled.querySelector('.picker-error')?.getAttribute('role')).toBe('alert');
    });

    it('shows an understandable error for a corrupt OGG without crashing', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'guvenli.wav', 'audio/wav')]);
      // SHHH-013'ten geçemeyen bozuk OGG (imza yok).
      await component.handleFiles([audioFile(textBytes(), 'copu.ogg', 'audio/ogg')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.error()).not.toBeNull();
      expect(component.selected()).toEqual({ name: 'guvenli.wav', size: 60, container: 'wav' });
      expect(compiled.querySelector('.picker-error')?.getAttribute('role')).toBe('alert');
    });

    it('does not call OggMetadataService for non-OGG containers', async () => {
      const readCalls: File[] = [];
      TestBed.configureTestingModule({
        providers: [
          {
            provide: OggMetadataService,
            useValue: {
              read: (file: File) => {
                readCalls.push(file);
                return Promise.resolve({
                  ok: true,
                  metadata: {
                    codec: 'opus',
                    channels: 1,
                    outputSampleRateHz: 48000,
                    inputSampleRateHz: 48000,
                    preSkipSamples: 0,
                    mappingFamily: 0,
                    durationSeconds: null,
                  },
                } satisfies OggMetadataResult);
              },
            },
          },
        ],
      });

      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'wav-only.wav', 'audio/wav')]);
      await component.handleFiles([audioFile(textBytes(), 'metin.mp3', 'audio/mpeg')]);

      expect(readCalls).toHaveLength(0);
      expect(component.oggMetadata()).toBeNull();
    });

    it('keeps WAV metadata display intact after WAV selection (WAV regression)', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'regresyon.wav', 'audio/wav')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.wavMetadata()).not.toBeNull();
      expect(component.oggMetadata()).toBeNull();

      const meta = compiled.querySelector('.file-meta');
      expect(meta?.textContent).toContain('Süre: 0:00');
      expect(meta?.textContent).toContain('8 kHz');
      expect(meta?.textContent).toContain('1 kanal');
      expect(meta?.textContent).toContain('16 bit');
      expect(meta?.textContent).not.toContain('Codec:');
      expect(compiled.querySelector('.file-note')?.textContent).toContain('WAV başlığından okundu');
    });

    it('clears OGG metadata when a WAV file replaces an OGG selection', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(oggOpusBytes(), 'ogg-once.ogg', 'audio/ogg')]);
      expect(component.oggMetadata()).not.toBeNull();

      await component.handleFiles([audioFile(wavBytes(), 'sonra.wav', 'audio/wav')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.oggMetadata()).toBeNull();
      expect(component.wavMetadata()).not.toBeNull();
      expect(compiled.querySelector('.file-meta')?.textContent).not.toContain('Codec:');
      expect(compiled.querySelector('.file-meta')?.textContent).toContain('16 bit');
    });

    it('ignores a stale OGG metadata result that resolves after a newer selection', async () => {
      const pending: {
        file: File;
        resolve: (result: OggMetadataResult) => void;
      }[] = [];
      TestBed.configureTestingModule({
        providers: [
          {
            provide: OggMetadataService,
            useValue: {
              read: (file: File) =>
                new Promise<OggMetadataResult>((resolve) => pending.push({ file, resolve })),
            },
          },
        ],
      });

      const fixture = createFixture();
      const component = fixture.componentInstance;
      const oggA = audioFile(oggOpusBytes(1), 'eski.ogg', 'audio/ogg');
      const oggB = audioFile(oggOpusBytes(2), 'yeni.ogg', 'audio/ogg');

      const first = component.handleFiles([oggA]);
      for (let i = 0; i < 20 && pending.length === 0; i++) {
        await Promise.resolve();
      }
      expect(pending).toHaveLength(1);

      const second = component.handleFiles([oggB]);
      for (let i = 0; i < 20 && pending.length < 2; i++) {
        await Promise.resolve();
      }
      expect(pending).toHaveLength(2);

      pending[1].resolve({
        ok: true,
        metadata: {
          codec: 'opus',
          channels: 2,
          outputSampleRateHz: 48000,
          inputSampleRateHz: 48000,
          preSkipSamples: 0,
          mappingFamily: 0,
          durationSeconds: null,
        },
      });
      await second;
      expect(component.selected()?.name).toBe('yeni.ogg');
      expect(component.oggMetadata()?.channels).toBe(2);

      pending[0].resolve({
        ok: true,
        metadata: {
          codec: 'opus',
          channels: 1,
          outputSampleRateHz: 48000,
          inputSampleRateHz: 48000,
          preSkipSamples: 0,
          mappingFamily: 0,
          durationSeconds: null,
        },
      });
      await first;

      expect(component.selected()?.name).toBe('yeni.ogg');
      expect(component.oggMetadata()?.channels).toBe(2);
      expect(component.error()).toBeNull();
    });

    it('ignores a stale OGG metadata error that resolves after a newer valid selection', async () => {
      const pending: {
        file: File;
        resolve: (result: OggMetadataResult) => void;
      }[] = [];
      TestBed.configureTestingModule({
        providers: [
          {
            provide: OggMetadataService,
            useValue: {
              read: (file: File) =>
                new Promise<OggMetadataResult>((resolve) => pending.push({ file, resolve })),
            },
          },
        ],
      });

      const fixture = createFixture();
      const component = fixture.componentInstance;
      const badOgg = audioFile(oggNonOpusBytes(), 'bozuk.ogg', 'audio/ogg');
      const goodOgg = audioFile(oggOpusBytes(2), 'iyi.ogg', 'audio/ogg');

      const first = component.handleFiles([badOgg]);
      for (let i = 0; i < 20 && pending.length === 0; i++) {
        await Promise.resolve();
      }
      const second = component.handleFiles([goodOgg]);
      for (let i = 0; i < 20 && pending.length < 2; i++) {
        await Promise.resolve();
      }

      pending[1].resolve({
        ok: true,
        metadata: {
          codec: 'opus',
          channels: 2,
          outputSampleRateHz: 48000,
          inputSampleRateHz: 48000,
          preSkipSamples: 0,
          mappingFamily: 0,
          durationSeconds: null,
        },
      });
      await second;
      expect(component.selected()?.name).toBe('iyi.ogg');
      expect(component.error()).toBeNull();

      pending[0].resolve({
        ok: false,
        code: 'unsupported-codec',
        reason: 'not-opus',
        message: 'geçmiş bir hata sonucu',
      });
      await first;

      expect(component.selected()?.name).toBe('iyi.ogg');
      expect(component.error()).toBeNull();
      expect(component.errorCode()).toBeNull();
      expect(component.oggMetadata()?.channels).toBe(2);
    });

    it('handles rapid consecutive OGG selections without losing the newest result', async () => {
      const pending: {
        file: File;
        resolve: (result: OggMetadataResult) => void;
      }[] = [];
      TestBed.configureTestingModule({
        providers: [
          {
            provide: OggMetadataService,
            useValue: {
              read: (file: File) =>
                new Promise<OggMetadataResult>((resolve) => pending.push({ file, resolve })),
            },
          },
        ],
      });

      const fixture = createFixture();
      const component = fixture.componentInstance;
      const oggA = audioFile(oggOpusBytes(1), 'a.ogg', 'audio/ogg');
      const oggB = audioFile(oggOpusBytes(2), 'b.ogg', 'audio/ogg');
      const oggC = audioFile(oggOpusBytes(1), 'c.ogg', 'audio/ogg');

      // A metadata'da beklerken B ve C ardışık gelir; en yenisi kazanmalı.
      const first = component.handleFiles([oggA]);
      for (let i = 0; i < 20 && pending.length === 0; i++) {
        await Promise.resolve();
      }
      expect(pending).toHaveLength(1);

      const second = component.handleFiles([oggB]);
      const third = component.handleFiles([oggC]);
      for (let i = 0; i < 40 && pending.length < 2; i++) {
        await Promise.resolve();
      }
      // B, C başlamadan metadata'ya ulaşamaz (seq koruması); C metadata'ya girer.
      expect(pending.length).toBeGreaterThanOrEqual(2);

      const lastJob = pending[pending.length - 1];
      lastJob.resolve({
        ok: true,
        metadata: {
          codec: 'opus',
          channels: 1,
          outputSampleRateHz: 48000,
          inputSampleRateHz: 48000,
          preSkipSamples: 0,
          mappingFamily: 0,
          durationSeconds: null,
        },
      });
      await third;
      expect(component.selected()?.name).toBe('c.ogg');

      // İlk sonucu geç çöz; seçimi bozmamalı.
      pending[0].resolve({
        ok: true,
        metadata: {
          codec: 'opus',
          channels: 2,
          outputSampleRateHz: 48000,
          inputSampleRateHz: 48000,
          preSkipSamples: 0,
          mappingFamily: 0,
          durationSeconds: null,
        },
      });
      await first;
      await second;

      expect(component.selected()?.name).toBe('c.ogg');
      expect(component.oggMetadata()?.channels).toBe(1);
      expect(component.error()).toBeNull();
    });
  });

  describe('MP3 metadata integration', () => {
    function mockMp3Read(
      read: (file: File) => Promise<Mp3MetadataResult> | Mp3MetadataResult,
    ): void {
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Mp3MetadataService,
            useValue: { read: (file: File) => Promise.resolve(read(file)) },
          },
        ],
      });
    }

    function mp3Success(durationSeconds: number | null): Mp3MetadataResult {
      return {
        ok: true,
        metadata: { codec: 'mp3', durationSeconds },
        exceedsRecommendedDuration:
          durationSeconds !== null && durationSeconds > RECOMMENDED_MAX_DURATION_SECONDS,
      };
    }

    it('shows Codec MP3 and a reliable m:ss duration', async () => {
      mockMp3Read(() => mp3Success(65.4));
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(mp3FrameBytes(), 'kisa.mp3', 'audio/mpeg')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.error()).toBeNull();
      expect(component.mp3Metadata()).toEqual({ codec: 'mp3', durationSeconds: 65.4 });
      expect(component.wavMetadata()).toBeNull();
      expect(component.oggMetadata()).toBeNull();

      const meta = compiled.querySelector('.file-meta');
      expect(meta?.textContent).toContain('Codec: MP3');
      expect(meta?.textContent).toContain('Süre: 1:05');
      expect(compiled.querySelector('.file-note')?.textContent).toContain(
        'dosyanın tamamı çözülmedi',
      );
      expect(compiled.querySelector('.file-note')?.textContent).not.toContain('tamamı doğrulandı');
    });

    it('shows "Süre bilinmiyor" when MP3 duration is null (no estimate)', async () => {
      mockMp3Read(() => mp3Success(null));
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(mp3WithId3Bytes(), 'vbr.mp3', 'audio/mpeg')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.error()).toBeNull();
      expect(component.mp3Metadata()?.durationSeconds).toBeNull();

      const meta = compiled.querySelector('.file-meta');
      expect(meta?.textContent).toContain('Codec: MP3');
      expect(meta?.textContent).toContain('Süre bilinmiyor');
      expect(meta?.textContent).not.toContain('Süre:');
      expect(meta?.textContent).not.toContain('tahmin');
      expect(meta?.textContent).not.toContain('%');
    });

    it('does not show NaN or Infinity duration as a definite value', async () => {
      for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        TestBed.resetTestingModule();
        TestBed.configureTestingModule({
          imports: [App],
          providers: [
            {
              provide: Mp3MetadataService,
              useValue: {
                read: () =>
                  Promise.resolve({
                    ok: true,
                    metadata: { codec: 'mp3', durationSeconds: bad },
                    exceedsRecommendedDuration: false,
                  } satisfies Mp3MetadataResult),
              },
            },
          ],
        });
        const fixture = createFixture();
        const component = fixture.componentInstance;

        await component.handleFiles([audioFile(mp3FrameBytes(), 'gecersiz.mp3', 'audio/mpeg')]);
        await fixture.whenStable();
        const compiled = fixture.nativeElement as HTMLElement;

        expect(component.error()).toBeNull();
        const meta = compiled.querySelector('.file-meta');
        expect(meta?.textContent).toContain('Süre bilinmiyor');
        expect(meta?.textContent).not.toContain('NaN');
        expect(meta?.textContent).not.toContain('Infinity');
        expect(component.isUsableDuration(bad)).toBe(false);
        expect(component.isUsableDuration(null)).toBe(false);
        expect(component.isUsableDuration(0)).toBe(true);
        expect(component.isUsableDuration(12.5)).toBe(true);
      }
    });

    it('rejects an MP3 longer than 20 minutes with the existing error model', async () => {
      mockMp3Read(() => mp3Success(RECOMMENDED_MAX_DURATION_SECONDS + 1));
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'guvenli.wav', 'audio/wav')]);
      await component.handleFiles([audioFile(mp3FrameBytes(), 'uzun.mp3', 'audio/mpeg')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.error()).toContain('20 dakika');
      expect(component.errorCode()).toBe('invalid-file');
      expect(component.selected()).toEqual({ name: 'guvenli.wav', size: 60, container: 'wav' });
      expect(component.mp3Metadata()).toBeNull();
      expect(component.wavMetadata()).not.toBeNull();
      expect(compiled.querySelector('.error-code')?.textContent).toBe('invalid-file');
    });

    it('accepts an MP3 of exactly 20 minutes (boundary is not exceeded)', async () => {
      mockMp3Read(() => mp3Success(RECOMMENDED_MAX_DURATION_SECONDS));
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(mp3FrameBytes(), 'tam.mp3', 'audio/mpeg')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.error()).toBeNull();
      expect(component.selected()?.name).toBe('tam.mp3');
      expect(component.mp3Metadata()?.durationSeconds).toBe(1200);
      expect(compiled.querySelector('.file-meta')?.textContent).toContain('Süre: 20:00');
      expect(RECOMMENDED_MAX_DURATION_SECONDS).toBe(1200);
    });

    it('keeps the previous file and metadata when MP3 metadata read fails', async () => {
      mockMp3Read(() =>
        Promise.resolve({
          ok: false,
          code: 'invalid-file',
          reason: 'unreadable',
          message: 'Dosya okunamadı. Tekrar seçmeyi deneyin.',
        } satisfies Mp3MetadataResult),
      );
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'wav-once.wav', 'audio/wav')]);
      const previousWav = component.wavMetadata();
      expect(previousWav).not.toBeNull();

      await component.handleFiles([audioFile(mp3FrameBytes(), 'kirik.mp3', 'audio/mpeg')]);
      await fixture.whenStable();

      expect(component.error()).toContain('okunamadı');
      expect(component.selected()).toEqual({ name: 'wav-once.wav', size: 60, container: 'wav' });
      expect(component.wavMetadata()).toEqual(previousWav);
      expect(component.mp3Metadata()).toBeNull();
    });

    it('keeps the previous file when MP3 fails pre-validation', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(oggOpusBytes(), 'ogg-once.ogg', 'audio/ogg')]);
      await component.handleFiles([audioFile(textBytes(), 'metin.mp3', 'audio/mpeg')]);

      expect(component.error()).not.toBeNull();
      expect(component.selected()?.name).toBe('ogg-once.ogg');
      expect(component.oggMetadata()).not.toBeNull();
      expect(component.mp3Metadata()).toBeNull();
    });

    it('ignores a stale MP3 metadata result that resolves after a newer selection', async () => {
      const pending: {
        file: File;
        resolve: (result: Mp3MetadataResult) => void;
      }[] = [];
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Mp3MetadataService,
            useValue: {
              read: (file: File) =>
                new Promise<Mp3MetadataResult>((resolve) => pending.push({ file, resolve })),
            },
          },
        ],
      });

      const fixture = createFixture();
      const component = fixture.componentInstance;
      const mp3A = audioFile(mp3FrameBytes(), 'eski.mp3', 'audio/mpeg');
      const wavB = audioFile(wavBytes(), 'yeni.wav', 'audio/wav');

      const first = component.handleFiles([mp3A]);
      for (let i = 0; i < 20 && pending.length === 0; i++) {
        await Promise.resolve();
      }
      expect(pending).toHaveLength(1);

      const second = component.handleFiles([wavB]);
      await second;
      expect(component.selected()?.name).toBe('yeni.wav');
      expect(component.wavMetadata()).not.toBeNull();

      pending[0].resolve(mp3Success(99));
      await first;

      expect(component.selected()?.name).toBe('yeni.wav');
      expect(component.wavMetadata()?.sampleRateHz).toBe(8000);
      expect(component.mp3Metadata()).toBeNull();
      expect(component.error()).toBeNull();
    });

    it('handles rapid consecutive MP3 selections without losing the newest result', async () => {
      const pending: {
        file: File;
        resolve: (result: Mp3MetadataResult) => void;
      }[] = [];
      TestBed.configureTestingModule({
        providers: [
          {
            provide: AudioFileValidationService,
            useValue: {
              validate: () =>
                Promise.resolve({ ok: true, container: 'mp3', warning: null } as ValidationResult),
            },
          },
          {
            provide: Mp3MetadataService,
            useValue: {
              read: (file: File) =>
                new Promise<Mp3MetadataResult>((resolve) => pending.push({ file, resolve })),
            },
          },
        ],
      });

      const fixture = createFixture();
      const component = fixture.componentInstance;
      const a = audioFile(mp3FrameBytes(), 'a.mp3', 'audio/mpeg');
      const b = audioFile(mp3FrameBytes(), 'b.mp3', 'audio/mpeg');

      const first = component.handleFiles([a]);
      for (let i = 0; i < 20 && pending.length === 0; i++) {
        await Promise.resolve();
      }
      const second = component.handleFiles([b]);
      for (let i = 0; i < 40 && pending.length < 2; i++) {
        await Promise.resolve();
      }
      expect(pending.length).toBeGreaterThanOrEqual(2);

      const lastJob = pending[pending.length - 1];
      lastJob.resolve(mp3Success(2.5));
      await second;
      expect(component.selected()?.name).toBe('b.mp3');
      expect(component.mp3Metadata()?.durationSeconds).toBe(2.5);

      pending[0].resolve(mp3Success(77));
      await first;

      expect(component.selected()?.name).toBe('b.mp3');
      expect(component.mp3Metadata()?.durationSeconds).toBe(2.5);
      expect(component.error()).toBeNull();
    });

    it('clears metadata across MP3 → WAV → OGG transitions', async () => {
      mockMp3Read(() => mp3Success(3));
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(mp3FrameBytes(), 'mp3-secim.mp3', 'audio/mpeg')]);
      expect(component.mp3Metadata()).not.toBeNull();
      expect(component.wavMetadata()).toBeNull();
      expect(component.oggMetadata()).toBeNull();

      await component.handleFiles([audioFile(wavBytes(), 'wav-sonra.wav', 'audio/wav')]);
      expect(component.wavMetadata()).not.toBeNull();
      expect(component.mp3Metadata()).toBeNull();
      expect(component.oggMetadata()).toBeNull();

      await component.handleFiles([audioFile(oggOpusBytes(), 'ogg-sonra.ogg', 'audio/ogg')]);
      expect(component.oggMetadata()).not.toBeNull();
      expect(component.wavMetadata()).toBeNull();
      expect(component.mp3Metadata()).toBeNull();

      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;
      expect(compiled.querySelector('.file-meta')?.textContent).toContain('Codec: Opus');
      expect(compiled.querySelector('.file-meta')?.textContent).not.toContain('Codec: MP3');
    });

    it('does not call Mp3MetadataService for non-MP3 containers', async () => {
      const mp3ReadCalls: File[] = [];
      TestBed.configureTestingModule({
        providers: [
          {
            provide: Mp3MetadataService,
            useValue: {
              read: (file: File) => {
                mp3ReadCalls.push(file);
                return Promise.resolve(mp3Success(1));
              },
            },
          },
        ],
      });

      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'yalniz.wav', 'audio/wav')]);
      await component.handleFiles([audioFile(oggOpusBytes(), 'yalniz.ogg', 'audio/ogg')]);
      expect(mp3ReadCalls).toHaveLength(0);
      expect(component.mp3Metadata()).toBeNull();
    });

    it('keeps WAV metadata display intact after WAV selection (WAV regression)', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(wavBytes(), 'regresyon.wav', 'audio/wav')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.wavMetadata()).not.toBeNull();
      expect(component.mp3Metadata()).toBeNull();
      expect(component.oggMetadata()).toBeNull();

      const meta = compiled.querySelector('.file-meta');
      expect(meta?.textContent).toContain('Süre: 0:00');
      expect(meta?.textContent).toContain('8 kHz');
      expect(meta?.textContent?.includes('Codec: MP3')).toBe(false);
      expect(compiled.querySelector('.file-note')?.textContent).toContain('WAV başlığından okundu');
    });

    it('keeps OGG metadata display intact after OGG selection (OGG regression)', async () => {
      const fixture = createFixture();
      const component = fixture.componentInstance;

      await component.handleFiles([audioFile(oggOpusBytes(2), 'regresyon.ogg', 'audio/ogg')]);
      await fixture.whenStable();
      const compiled = fixture.nativeElement as HTMLElement;

      expect(component.oggMetadata()).not.toBeNull();
      expect(component.mp3Metadata()).toBeNull();
      expect(component.wavMetadata()).toBeNull();

      const meta = compiled.querySelector('.file-meta');
      expect(meta?.textContent).toContain('Codec: Opus');
      expect(meta?.textContent).toContain('Stereo');
      expect(meta?.textContent).toContain('Süre bilinmiyor');
      expect(meta?.textContent?.includes('Codec: MP3')).toBe(false);
    });
  });
});
