import { TestBed } from '@angular/core/testing';
import {
  AudioFileValidationService,
  HEADER_READ_BYTES,
  MAX_FILE_SIZE_BYTES,
} from './audio-file-validation.service';
import {
  adtsBytes,
  amrBytes,
  asciiBytes,
  audioFile,
  badId3SizeBytes,
  badMp3FrameBytes,
  bytesOf,
  concatBytes,
  fakeWavBytes,
  flacHeaderBytes,
  mp3FrameBytes,
  mp3WithId3Bytes,
  mp4FtypBytes,
  oggOpusBytes,
  oversizedId3Bytes,
  riffNotWaveBytes,
  textBytes,
  truncatedWavBytes,
  wavBytes,
  webmHeaderBytes,
} from './testing/audio-fixtures';

describe('AudioFileValidationService', () => {
  let service: AudioFileValidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioFileValidationService);
  });

  it('rejects a missing file as invalid-file', async () => {
    const nullResult = await service.validate(null);
    const undefinedResult = await service.validate(undefined);
    const notAFile = await service.validate({} as File);

    for (const result of [nullResult, undefinedResult, notAFile]) {
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.code).toBe('invalid-file');
        expect(result.reason).toBe('missing-file');
      }
    }
  });

  it('rejects a 0-byte file without reading any data', async () => {
    const file = new File([], 'bos.mp3', { type: 'audio/mpeg' });
    let sliceCalls = 0;
    const watched = {
      name: file.name,
      type: file.type,
      size: file.size,
      slice: (...args: Parameters<File['slice']>) => {
        sliceCalls += 1;
        return file.slice(...args);
      },
    } as unknown as File;

    const result = await service.validate(watched);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid-file');
      expect(result.reason).toBe('empty-file');
      expect(result.message).toContain('boş görünüyor');
    }
    expect(sliceCalls).toBe(0);
  });

  it('rejects an oversize file before any read (controlled mock, no full file)', async () => {
    let sliceCalled = false;
    const oversize = {
      name: 'buyuk.mp3',
      type: 'audio/mpeg',
      size: MAX_FILE_SIZE_BYTES + 1,
      slice: () => {
        sliceCalled = true;
        throw new Error('slice çağrılmamalı');
      },
    } as unknown as File;

    const result = await service.validate(oversize);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid-file');
      expect(result.reason).toBe('size-limit');
      expect(result.message).toContain('50 MB');
    }
    expect(sliceCalled).toBe(false);
  });

  it('reads at most one bounded header slice of HEADER_READ_BYTES', async () => {
    const real = audioFile(oggOpusBytes(), 'ornek.ogg', 'audio/ogg');
    const calls: (readonly [number, number | undefined])[] = [];
    const watched = {
      name: real.name,
      type: real.type,
      size: real.size,
      slice: (start?: number, end?: number) => {
        calls.push([start ?? 0, end]);
        return real.slice(start, end);
      },
    } as unknown as File;

    const result = await service.validate(watched);

    expect(result.ok).toBe(true);
    expect(calls).toEqual([[0, HEADER_READ_BYTES]]);
  });

  it('accepts a valid OGG/Opus header as ogg', async () => {
    const result = await service.validate(audioFile(oggOpusBytes(), 'ses-notu.ogg', 'audio/ogg'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.container).toBe('ogg');
      expect(result.warning).toBeNull();
    }
  });

  it('accepts a valid WAV header (silence is content, not an error)', async () => {
    const result = await service.validate(audioFile(wavBytes(), 'kayit.wav', 'audio/wav'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.container).toBe('wav');
    }
  });

  it('accepts a raw MP3 frame header as mp3', async () => {
    const result = await service.validate(audioFile(mp3FrameBytes(), 'sarki.mp3', 'audio/mpeg'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.container).toBe('mp3');
    }
  });

  it('accepts ID3 + MP3 frame as mp3', async () => {
    const result = await service.validate(
      audioFile(mp3WithId3Bytes(), 'etiketli.mp3', 'audio/mpeg'),
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.container).toBe('mp3');
    }
  });

  it('accepts an MP4/M4A ftyp header as mp4', async () => {
    const result = await service.validate(audioFile(mp4FtypBytes(), 'kayit.m4a', 'audio/mp4'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.container).toBe('mp4');
    }
  });

  it('accepts a WebM/EBML header as webm', async () => {
    const result = await service.validate(audioFile(webmHeaderBytes(), 'kayit.webm', 'audio/webm'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.container).toBe('webm');
    }
  });

  it('accepts a FLAC header as flac', async () => {
    const result = await service.validate(audioFile(flacHeaderBytes(), 'kayit.flac', 'audio/flac'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.container).toBe('flac');
    }
  });

  it('detects the real container of a wrong-extension OGG and warns (sniff wins)', async () => {
    const result = await service.validate(audioFile(oggOpusBytes(), 'sarki.mp3', 'audio/mpeg'));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.container).toBe('ogg');
      expect(result.warning).toContain('uyuşmuyor');
      expect(result.warning).toContain('OGG');
    }
  });

  it('does not reject a valid file solely because MIME type is empty', async () => {
    const result = await service.validate(audioFile(oggOpusBytes(), 'ses-notu.ogg', ''));

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.container).toBe('ogg');
      expect(result.warning).toBeNull();
    }
  });

  it('rejects a text file named .mp3 with audio/mpeg type (sniff over extension/MIME)', async () => {
    const result = await service.validate(audioFile(textBytes(), 'metin.mp3', 'audio/mpeg'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid-file');
      expect(result.reason).toBe('unknown-signature');
      expect(result.message).toContain('anlaşılamadı');
    }
  });

  it('rejects a fake WAV without a fmt chunk', async () => {
    const result = await service.validate(audioFile(fakeWavBytes(), 'sahte.wav', 'audio/wav'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('wav-no-fmt');
    }
  });

  it('rejects a RIFF file that is not WAVE', async () => {
    const result = await service.validate(audioFile(riffNotWaveBytes(), 'sahte.wav', 'audio/wav'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('wav-not-wave');
      expect(result.message).toContain('başlığı bozuk');
    }
  });

  it('rejects a truncated WAV header', async () => {
    const result = await service.validate(audioFile(truncatedWavBytes(), 'kesik.wav', 'audio/wav'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid-file');
      expect(result.reason).toBe('truncated-wav');
      expect(result.message).toContain('yarıda kesilmiş');
    }
  });

  it('rejects a broken MP3 frame header (bitrate index reserved)', async () => {
    const result = await service.validate(audioFile(badMp3FrameBytes(), 'bozuk.mp3', 'audio/mpeg'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('mp3-bad-frame-header');
    }
  });

  it('rejects ID3 with non-synchsafe size fields', async () => {
    const result = await service.validate(audioFile(badId3SizeBytes(), 'bozuk.mp3', 'audio/mpeg'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('id3-bad-size-encoding');
    }
  });

  it('rejects an ID3 tag larger than the file without allocating it', async () => {
    const result = await service.validate(audioFile(oversizedId3Bytes(), 'dev.mp3', 'audio/mpeg'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('invalid-file');
      expect(result.reason).toBe('truncated-id3');
    }
  });

  it('rejects an ID3-only file with no audio frames', async () => {
    const file = audioFile(
      concatBytes(
        asciiBytes('ID3'),
        bytesOf(0x03, 0x00),
        bytesOf(0x00),
        bytesOf(0x00, 0x00, 0x00, 0x00),
      ),
      'yalniz-etiket.mp3',
      'audio/mpeg',
    );

    const result = await service.validate(file);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('mp3-no-frames');
    }
  });

  it('rejects an OGG page with an invalid container version', async () => {
    const bytes = oggOpusBytes();
    bytes[4] = 0x05;
    const result = await service.validate(audioFile(bytes, 'bozuk.ogg', 'audio/ogg'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('ogg-bad-version');
    }
  });

  it('rejects FLAC without a STREAMINFO block of size 34', async () => {
    const bytes = flacHeaderBytes();
    bytes[7] = 0x10;
    const result = await service.validate(audioFile(bytes, 'bozuk.flac', 'audio/flac'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('flac-bad-streaminfo');
    }
  });

  it('rejects EBML without a webm/matroska doctype', async () => {
    const bytes = concatBytes(bytesOf(0x1a, 0x45, 0xdf, 0xa3), new Uint8Array(28));
    const result = await service.validate(audioFile(bytes, 'bozuk.webm', 'audio/webm'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('ebml-missing-doctype');
    }
  });

  it('rejects an MP4 ftyp box smaller than a valid header', async () => {
    const bytes = concatBytes(bytesOf(0x00, 0x00, 0x00, 0x08), asciiBytes('ftypM4A '));
    const result = await service.validate(audioFile(bytes, 'kucuk.mp4', 'audio/mp4'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('mp4-ftyp-too-small');
    }
  });

  it('rejects an MP4 ftyp box that claims to be larger than the file', async () => {
    const bytes = concatBytes(
      bytesOf(0x00, 0x00, 0x01, 0x00),
      asciiBytes('ftypM4A '),
      new Uint8Array(8),
    );
    const result = await service.validate(audioFile(bytes, 'kesik.mp4', 'audio/mp4'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('truncated-mp4');
    }
  });

  it('reports AMR as unsupported-codec with an actionable message', async () => {
    const result = await service.validate(audioFile(amrBytes(), 'not.amr', 'audio/amr'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('unsupported-codec');
      expect(result.reason).toBe('amr');
      expect(result.message).toContain('AMR');
      expect(result.message).toContain('MP3');
    }
  });

  it('reports ADTS/AAC as unsupported-codec (documented SHHH-005 assumption, not a device measurement)', async () => {
    const result = await service.validate(audioFile(adtsBytes(), 'parca.aac', 'audio/aac'));

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('unsupported-codec');
      expect(result.reason).toBe('adts');
      expect(result.message).toContain('ADTS');
    }
  });

  it('rejects an empty-file result when the slice yields no bytes', async () => {
    const ghost = {
      name: 'hayalet.ogg',
      type: 'audio/ogg',
      size: 10,
      slice: () => ({ arrayBuffer: async () => new ArrayBuffer(0) }),
    } as unknown as File;

    const result = await service.validate(ghost);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('empty-file');
    }
  });

  it('reports an unreadable file as invalid-file instead of crashing', async () => {
    const broken = {
      name: 'kirik.wav',
      type: 'audio/wav',
      size: 100,
      slice: () => {
        throw new Error('okunamıyor');
      },
    } as unknown as File;

    const result = await service.validate(broken);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('unreadable');
    }
  });
});
