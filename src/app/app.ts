import { UpperCasePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  AudioFileValidationService,
  type AudioErrorCode,
  type ContainerId,
} from './audio-file-validation.service';
import { OggMetadataService, type OggOpusMetadata } from './ogg-metadata.service';
import { Mp3MetadataService, type Mp3Metadata } from './mp3-metadata.service';
import { M4aMetadataService, type M4aMetadata } from './m4a-metadata.service';
import { WebmMetadataService, type WebmMetadata } from './webm-metadata.service';
import { FlacMetadataService, type FlacMetadata } from './flac-metadata.service';
import { WavMetadataService, type WavMetadata } from './wav-metadata.service';

interface SelectedFile {
  readonly name: string;
  readonly size: number;
  readonly container: ContainerId;
}

/** docs/02: 20 dakika öneri eşiği; doğrulanmış cihaz sınırı değildir. */
export const RECOMMENDED_MAX_DURATION_SECONDS = 20 * 60;

const MSG_DURATION_LIMIT = 'Kayıt 20 dakika sınırından uzun. Bu sürümde kısa kayıtlar işleniyor.';

@Component({
  selector: 'app-root',
  imports: [UpperCasePipe],
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  readonly selected = signal<SelectedFile | null>(null);
  readonly error = signal<string | null>(null);
  readonly errorCode = signal<AudioErrorCode | null>(null);
  readonly warning = signal<string | null>(null);
  readonly dragging = signal(false);
  /** Son geçerli dosyanın bellek içi referansı; hiçbir yere gönderilmez, diske yazılmaz. */
  readonly file = signal<File | null>(null);
  /** Yalnız SHHH-013'ten geçmiş WAV için başlık metadata'sı; non-WAV seçimde null. */
  readonly wavMetadata = signal<WavMetadata | null>(null);
  /** Yalnız SHHH-013'ten geçmiş OGG için başlık metadata'sı; non-OGG seçimde null. */
  readonly oggMetadata = signal<OggOpusMetadata | null>(null);
  /** Yalnız SHHH-013'ten geçmiş MP3 için süre metadata'sı; non-MP3 seçimde null. */
  readonly mp3Metadata = signal<Mp3Metadata | null>(null);
  /** Yalnız SHHH-013'ten geçmiş M4A/MP4 için metadata; non-MP4 seçimde null. */
  readonly m4aMetadata = signal<M4aMetadata | null>(null);
  /** Yalnız SHHH-013'ten geçmiş WebM için metadata; non-WebM seçimde null. */
  readonly webmMetadata = signal<WebmMetadata | null>(null);
  /** Yalnız SHHH-013'ten geçmiş FLAC için STREAMINFO metadata'sı; non-FLAC seçimde null. */
  readonly flacMetadata = signal<FlacMetadata | null>(null);

  private dragDepth = 0;
  private validationSeq = 0;

  private readonly validator = inject(AudioFileValidationService);
  private readonly wavReader = inject(WavMetadataService);
  private readonly oggReader = inject(OggMetadataService);
  private readonly mp3Reader = inject(Mp3MetadataService);
  private readonly m4aReader = inject(M4aMetadataService);
  private readonly webmReader = inject(WebmMetadataService);
  private readonly flacReader = inject(FlacMetadataService);

  async onFileInputChange(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    await this.handleFiles(files);
  }

  onDragEnter(): void {
    this.dragDepth += 1;
    this.dragging.set(true);
  }

  onDragLeave(): void {
    this.dragDepth = Math.max(0, this.dragDepth - 1);
    if (this.dragDepth === 0) {
      this.dragging.set(false);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragDepth = 0;
    this.dragging.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    await this.handleFiles(files);
  }

  async handleFiles(files: readonly File[]): Promise<void> {
    if (files.length === 0) {
      return;
    }
    if (files.length > 1) {
      this.validationSeq += 1;
      this.errorCode.set('invalid-file');
      this.error.set('Bir seferde yalnızca bir dosya seçebilirsiniz.');
      return;
    }
    await this.validateFile(files[0]);
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${Math.round(bytes / 1024)} KB`;
    }
    const megaBytes = Math.round((bytes / (1024 * 1024)) * 10) / 10;
    return `${megaBytes.toString().replace('.', ',')} MB`;
  }

  formatDuration(seconds: number): string {
    const total = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(total / 60);
    const rest = total % 60;
    return `${minutes}:${rest.toString().padStart(2, '0')}`;
  }

  formatSampleRate(hz: number): string {
    if (hz >= 1000 && hz % 1000 === 0) {
      return `${hz / 1000} kHz`;
    }
    return `${hz} Hz`;
  }

  formatOggChannels(channels: number): string {
    if (channels === 1) {
      return 'Mono';
    }
    if (channels === 2) {
      return 'Stereo';
    }
    return `${channels} kanal`;
  }

  /** null/NaN/Infinity/negatif süre kesin değer olarak gösterilmez. */
  isUsableDuration(seconds: number | null): seconds is number {
    return seconds !== null && Number.isFinite(seconds) && seconds >= 0;
  }

  /**
   * M4A/WebM için güvenilir süre: null/NaN/Infinity/negatif VE sıfır gösterilmez.
   * HTMLAudioElement `loadedmetadata` tam decode veya ses izi kanıtı sayılmaz.
   */
  isUsableM4aDuration(seconds: number | null): seconds is number {
    return seconds !== null && Number.isFinite(seconds) && seconds > 0;
  }

  private async validateFile(file: File): Promise<void> {
    const seq = ++this.validationSeq;
    const result = await this.validator.validate(file);
    if (seq !== this.validationSeq) {
      return;
    }
    if (!result.ok) {
      // Hatalı seçim önceki geçerli dosyayı ve referansını bozmaz.
      this.errorCode.set(result.code);
      this.error.set(result.message);
      return;
    }

    if (result.container === 'wav') {
      const metaResult = await this.wavReader.read(file);
      if (seq !== this.validationSeq) {
        return;
      }
      if (!metaResult.ok) {
        this.errorCode.set(metaResult.code);
        this.error.set(metaResult.message);
        return;
      }
      const duration = metaResult.metadata.durationSeconds;
      if (duration !== null && duration > RECOMMENDED_MAX_DURATION_SECONDS) {
        this.errorCode.set('invalid-file');
        this.error.set(MSG_DURATION_LIMIT);
        return;
      }
      this.commitSelection(file, result.container, result.warning, {
        wav: metaResult.metadata,
        ogg: null,
        mp3: null,
        m4a: null,
        webm: null,
        flac: null,
      });
      return;
    }

    if (result.container === 'ogg') {
      const metaResult = await this.oggReader.read(file);
      if (seq !== this.validationSeq) {
        return;
      }
      if (!metaResult.ok) {
        // Bozuk/non-Opus OGG: mevcut hata modeli; önceki geçerli seçim korunur.
        this.errorCode.set(metaResult.code);
        this.error.set(metaResult.message);
        return;
      }
      this.commitSelection(file, result.container, result.warning, {
        wav: null,
        ogg: metaResult.metadata,
        mp3: null,
        m4a: null,
        webm: null,
        flac: null,
      });
      return;
    }

    if (result.container === 'mp3') {
      const metaResult = await this.mp3Reader.read(file);
      if (seq !== this.validationSeq) {
        return;
      }
      if (!metaResult.ok) {
        // MP3 metadata okunamadı: mevcut hata modeli; önceki geçerli seçim korunur.
        this.errorCode.set(metaResult.code);
        this.error.set(metaResult.message);
        return;
      }
      const duration = metaResult.metadata.durationSeconds;
      if (this.isUsableDuration(duration) && duration > RECOMMENDED_MAX_DURATION_SECONDS) {
        // Tam 20 dakika aşılmış sayılmaz (yalnız > eşik).
        this.errorCode.set('invalid-file');
        this.error.set(MSG_DURATION_LIMIT);
        return;
      }
      this.commitSelection(file, result.container, result.warning, {
        wav: null,
        ogg: null,
        mp3: metaResult.metadata,
        m4a: null,
        webm: null,
        flac: null,
      });
      return;
    }

    if (result.container === 'mp4') {
      const metaResult = await this.m4aReader.read(file);
      if (seq !== this.validationSeq) {
        return;
      }
      if (!metaResult.ok) {
        // M4A metadata okunamadı: mevcut hata modeli; önceki geçerli seçim korunur.
        this.errorCode.set(metaResult.code);
        this.error.set(metaResult.message);
        return;
      }
      const duration = metaResult.metadata.durationSeconds;
      if (this.isUsableDuration(duration) && duration > RECOMMENDED_MAX_DURATION_SECONDS) {
        // Tam 20 dakika aşılmaz (yalnız > eşik); sıfır/güvenilir olmayan süre eşiğe girmez.
        this.errorCode.set('invalid-file');
        this.error.set(MSG_DURATION_LIMIT);
        return;
      }
      this.commitSelection(file, result.container, result.warning, {
        wav: null,
        ogg: null,
        mp3: null,
        m4a: metaResult.metadata,
        webm: null,
        flac: null,
      });
      return;
    }

    if (result.container === 'webm') {
      const metaResult = await this.webmReader.read(file);
      if (seq !== this.validationSeq) {
        return;
      }
      if (!metaResult.ok) {
        // WebM metadata okunamadı: mevcut hata modeli; önceki geçerli seçim korunur.
        this.errorCode.set(metaResult.code);
        this.error.set(metaResult.message);
        return;
      }
      const duration = metaResult.metadata.durationSeconds;
      if (this.isUsableDuration(duration) && duration > RECOMMENDED_MAX_DURATION_SECONDS) {
        // Tam 20 dakika aşılmaz (yalnız > eşik); sıfır/güvenilir olmayan süre eşiğe girmez.
        this.errorCode.set('invalid-file');
        this.error.set(MSG_DURATION_LIMIT);
        return;
      }
      this.commitSelection(file, result.container, result.warning, {
        wav: null,
        ogg: null,
        mp3: null,
        m4a: null,
        webm: metaResult.metadata,
        flac: null,
      });
      return;
    }

    if (result.container === 'flac') {
      const metaResult = await this.flacReader.read(file);
      if (seq !== this.validationSeq) {
        return;
      }
      if (!metaResult.ok) {
        // FLAC metadata okunamadı: mevcut hata modeli; önceki geçerli seçim korunur.
        this.errorCode.set(metaResult.code);
        this.error.set(metaResult.message);
        return;
      }
      const duration = metaResult.metadata.durationSeconds;
      if (this.isUsableDuration(duration) && duration > RECOMMENDED_MAX_DURATION_SECONDS) {
        // Tam 20 dakika aşılmaz (yalnız > eşik); null süre eşiğe girmez.
        this.errorCode.set('invalid-file');
        this.error.set(MSG_DURATION_LIMIT);
        return;
      }
      this.commitSelection(file, result.container, result.warning, {
        wav: null,
        ogg: null,
        mp3: null,
        m4a: null,
        webm: null,
        flac: metaResult.metadata,
      });
      return;
    }

    this.commitSelection(file, result.container, result.warning, {
      wav: null,
      ogg: null,
      mp3: null,
      m4a: null,
      webm: null,
      flac: null,
    });
  }

  private commitSelection(
    file: File,
    container: ContainerId,
    warning: string | null,
    metadata: {
      wav: WavMetadata | null;
      ogg: OggOpusMetadata | null;
      mp3: Mp3Metadata | null;
      m4a: M4aMetadata | null;
      webm: WebmMetadata | null;
      flac: FlacMetadata | null;
    },
  ): void {
    this.errorCode.set(null);
    this.error.set(null);
    this.warning.set(warning);
    this.file.set(file);
    this.wavMetadata.set(metadata.wav);
    this.oggMetadata.set(metadata.ogg);
    this.mp3Metadata.set(metadata.mp3);
    this.m4aMetadata.set(metadata.m4a);
    this.webmMetadata.set(metadata.webm);
    this.flacMetadata.set(metadata.flac);
    this.selected.set({ name: file.name, size: file.size, container });
  }
}
