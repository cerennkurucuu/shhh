// SHHH-013 test yardımcıları — deterministik, sentetik başlık üreticileri.
// Bunlar yalnız başlık/yapı testi girdisidir; gerçek dosya ile kanıtlanabilecek codec/süre
// kontrolleri (SHHH-014) bu fixture'larla İDDİA EDİLMEZ.

export function bytesOf(...values: number[]): Uint8Array {
  return Uint8Array.from(values);
}

export function asciiBytes(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i++) {
    out[i] = text.charCodeAt(i);
  }
  return out;
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function le32(value: number): Uint8Array {
  return bytesOf(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
}

function le16(value: number): Uint8Array {
  return bytesOf(value & 0xff, (value >> 8) & 0xff);
}

function be32(value: number): Uint8Array {
  return bytesOf((value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff);
}

/** Geçerli RIFF/WAVE başlığı: PCM mono 8 kHz 16-bit, isteğe bağlı bayt (varsayılan: sessiz veri). */
export function wavBytes(dataSize = 16): Uint8Array {
  const data = new Uint8Array(dataSize);
  return concatBytes(
    asciiBytes('RIFF'),
    le32(36 + dataSize),
    asciiBytes('WAVE'),
    asciiBytes('fmt '),
    le32(16),
    le16(1),
    le16(1),
    le32(8000),
    le32(8000 * 2),
    le16(2),
    le16(16),
    asciiBytes('data'),
    le32(dataSize),
    data,
  );
}

/**
 * 10 dakika eşiğini aşan süre için WAV: 1 Hz / 8-bit / mono, 1201 bayt veri → 1201 sn.
 * Küçük fixture; büyük gerçekçi dosya tahsis edilmez.
 */
export function longDurationWavBytes(dataSize = 1201): Uint8Array {
  const data = new Uint8Array(dataSize);
  return concatBytes(
    asciiBytes('RIFF'),
    le32(36 + dataSize),
    asciiBytes('WAVE'),
    asciiBytes('fmt '),
    le32(16),
    le16(1),
    le16(1),
    le32(1),
    le32(1),
    le16(1),
    le16(8),
    asciiBytes('data'),
    le32(dataSize),
    data,
  );
}

/** LIST chunk, data'yı 512 baytlık başlık bütçesinin dışına iter; süre belirsiz. */
export function unknownDurationWavBytes(listSize = 600): Uint8Array {
  const fmt = concatBytes(
    asciiBytes('fmt '),
    le32(16),
    le16(1),
    le16(1),
    le32(8000),
    le32(16000),
    le16(2),
    le16(16),
  );
  const list = concatBytes(asciiBytes('LIST'), le32(listSize), new Uint8Array(listSize));
  const data = concatBytes(asciiBytes('data'), le32(16), new Uint8Array(16));
  const body = concatBytes(asciiBytes('WAVE'), fmt, list, data);
  return concatBytes(asciiBytes('RIFF'), le32(body.length), body);
}

/** IEEE float (format 3) WAV: ön doğrulamadan geçer, metadata non-pcm reddeder. */
export function nonPcmWavBytes(): Uint8Array {
  const dataSize = 16;
  const data = new Uint8Array(dataSize);
  return concatBytes(
    asciiBytes('RIFF'),
    le32(36 + dataSize),
    asciiBytes('WAVE'),
    asciiBytes('fmt '),
    le32(16),
    le16(3),
    le16(1),
    le32(8000),
    le32(32000),
    le16(4),
    le16(32),
    asciiBytes('data'),
    le32(dataSize),
    data,
  );
}

/**
 * Geçerli OGG/Opus sayfası: SHHH-013 ve OggMetadataService'den geçer.
 * channels: 1 = mono, 2 = stereo (varsayılan mono).
 */
export function oggOpusBytes(channels = 1): Uint8Array {
  const opusHead = concatBytes(
    asciiBytes('OpusHead'),
    le16(1),
    bytesOf(channels),
    le16(0),
    le32(48000),
    le16(0),
    bytesOf(0),
  );
  return concatBytes(
    asciiBytes('OggS'),
    bytesOf(0x00),
    bytesOf(0x02),
    new Uint8Array(8),
    bytesOf(0x11, 0x22, 0x33, 0x44),
    new Uint8Array(4),
    new Uint8Array(4),
    bytesOf(0x01),
    bytesOf(opusHead.length),
    opusHead,
  );
}

/** SHHH-013'ten geçen ama OpusHead içermeyen OGG (ör. Vorbis); metadata servisi reddeder. */
export function oggNonOpusBytes(): Uint8Array {
  const body = concatBytes(bytesOf(0x01), asciiBytes('vorbis'), new Uint8Array(16));
  return concatBytes(
    asciiBytes('OggS'),
    bytesOf(0x00),
    bytesOf(0x02),
    new Uint8Array(8),
    bytesOf(0x11, 0x22, 0x33, 0x44),
    new Uint8Array(4),
    new Uint8Array(4),
    bytesOf(0x01),
    bytesOf(body.length),
    body,
  );
}

/** Ham MPEG Layer III kare başlığı (128 kbps / 44.1 kHz) + dolgu. */
export function mp3FrameBytes(): Uint8Array {
  const frame = new Uint8Array(64);
  frame[0] = 0xff;
  frame[1] = 0xfb;
  frame[2] = 0x90;
  frame[3] = 0x64;
  return frame;
}

/** ID3v2.3 etiketi (boş) + geçerli MP3 kare başlığı. */
export function mp3WithId3Bytes(): Uint8Array {
  return concatBytes(
    asciiBytes('ID3'),
    bytesOf(0x03, 0x00),
    bytesOf(0x00),
    bytesOf(0x00, 0x00, 0x00, 0x00),
    mp3FrameBytes(),
  );
}

/** Geçerli ISO-BMFF ftyp kutusu (M4A). */
export function mp4FtypBytes(): Uint8Array {
  return concatBytes(
    be32(24),
    asciiBytes('ftyp'),
    asciiBytes('M4A '),
    be32(0),
    asciiBytes('M4A '),
    asciiBytes('isom'),
  );
}

/** EBML/WebM başlığı (DocType "webm" içerir). */
export function webmHeaderBytes(): Uint8Array {
  const out = new Uint8Array(32);
  out.set(bytesOf(0x1a, 0x45, 0xdf, 0xa3), 0);
  out[4] = 0x93;
  out.set(asciiBytes('webm'), 7);
  return out;
}

/** FLAC: 'fLaC' + STREAMINFO bloğu (34 bayt). */
export function flacHeaderBytes(): Uint8Array {
  const out = new Uint8Array(42);
  out.set(asciiBytes('fLaC'), 0);
  out[4] = 0x80;
  out[5] = 0x00;
  out[6] = 0x00;
  out[7] = 0x22;
  return out;
}

/** '#!AMR' imzalı dosya (desteklenmeyen biçim). */
export function amrBytes(): Uint8Array {
  return concatBytes(asciiBytes('#!AMR\n'), new Uint8Array(8));
}

/** ADTS AAC kare başlığı (48 kHz, LC; kare uzunluğu 8 bayt). */
export function adtsBytes(): Uint8Array {
  return bytesOf(
    0xff,
    0xf1,
    0x4c,
    0x80,
    0x01,
    0x1f,
    0xfc,
    0x00,
    0x01,
    0x02,
    0x03,
    0x04,
    0x05,
    0x06,
    0x07,
    0x08,
  );
}

/** Ses olmayan metin içeriği. */
export function textBytes(): Uint8Array {
  return asciiBytes('Bu bir metin dosyasidir; ses verisi icermiyor.');
}

/** Sahte WAV: RIFF/WAVE ama 'fmt ' chunk yok. */
export function fakeWavBytes(): Uint8Array {
  const body = concatBytes(asciiBytes('WAVE'), asciiBytes('LIST'), le32(12), new Uint8Array(12));
  return concatBytes(asciiBytes('RIFF'), le32(body.length), body);
}

/** RIFF ama WAVE olmayan (AVI) sahte başlık. */
export function riffNotWaveBytes(): Uint8Array {
  const body = concatBytes(asciiBytes('AVI '), new Uint8Array(32));
  return concatBytes(asciiBytes('RIFF'), le32(4 + body.length), body);
}

/** Kesilmiş WAV: yalnızca 'RIFF' + 2 bayt. */
export function truncatedWavBytes(): Uint8Array {
  return bytesOf(0x52, 0x49, 0x46, 0x46, 0x24, 0x00);
}

/** Geçersiz MP3 kare: bitrate indeksi 0 (rezerve). */
export function badMp3FrameBytes(): Uint8Array {
  return bytesOf(0xff, 0xe2, 0x00, 0x00, 0x00, 0x00);
}

/** Bozuk ID3: synchsafe olmayan boyut alanları (yüksek bitler açık). */
export function badId3SizeBytes(): Uint8Array {
  return concatBytes(
    asciiBytes('ID3'),
    bytesOf(0x03, 0x00),
    bytesOf(0x00),
    bytesOf(0x80, 0x81, 0x82, 0x83),
    mp3FrameBytes(),
  );
}

/** Etiketi dosyadan büyük ID3 (tahsis edilmeden reddedilir). */
export function oversizedId3Bytes(): Uint8Array {
  return concatBytes(
    asciiBytes('ID3'),
    bytesOf(0x03, 0x00),
    bytesOf(0x00),
    bytesOf(0x00, 0x7f, 0x7f, 0x7f),
    mp3FrameBytes(),
  );
}

export function audioFile(bytes: Uint8Array, name: string, type: string): File {
  return new File([new Uint8Array(bytes)], name, { type });
}
