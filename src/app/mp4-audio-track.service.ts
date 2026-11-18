/**
 * SHHH-014 — MP4/M4A ses izi denetimi (servis katmanı; UI entegrasyonu yok).
 *
 * moov → trak → mdia → hdlr zincirini sınırlı File.slice okumalarıyla gezer.
 * hdlr handler_type 'soun' ise ses izi vardır.
 *
 * Üç durum:
 * - true:  Ses izi doğrulandı.
 * - false: Yapı eksiksiz incelendi, ses izi yok.
 * - null:  Eksik/desteklenmeyen/bütçe aşımı — kesin karar verilemedi.
 *
 * moov yokluğu veya kısmi okuma "ses izi yok" demek DEĞİLDİR → null.
 * Codec tespiti veya decode yapılmaz. Tam dosya RAM'e alınmaz.
 */
import { Injectable } from '@angular/core';

/** Toplam okunan bayt üst sınırı (tüm slice toplamı). */
export const MP4_AUDIO_TRACK_MAX_READ_BYTES = 256 * 1024;

/** İncelenen box sayısı üst sınırı (taşma/sonsuz döngü koruması). */
export const MP4_AUDIO_TRACK_MAX_BOXES = 256;

/** moov içeriği için okuma üst sınırı (genel bütçeye dahil). */
export const MP4_AUDIO_TRACK_MAX_MOOV_BYTES = 128 * 1024;

export type Mp4AudioTrackResult = boolean | null;

const TYPE_MOOV = 'moov';
const TYPE_TRAK = 'trak';
const TYPE_MDIA = 'mdia';
const TYPE_HDLR = 'hdlr';
const HANDLER_SOUND = 'soun';

function asciiAt(bytes: Uint8Array, offset: number, length: number): string {
  if (offset < 0 || offset + length > bytes.length) {
    return '';
  }
  let out = '';
  for (let i = 0; i < length; i++) {
    out += String.fromCharCode(bytes[offset + i]);
  }
  return out;
}

function readU32(bytes: Uint8Array, offset: number): number {
  return (
    ((bytes[offset] << 24) |
      (bytes[offset + 1] << 16) |
      (bytes[offset + 2] << 8) |
      bytes[offset + 3]) >>>
    0
  );
}

interface BoxHeader {
  readonly size: number;
  readonly type: string;
  readonly headerLength: number;
}

/**
 * Buffer içindeki box başlığını yorumlar.
 * size 0 → kalan tamamı; size 1 → 64-bit largesize.
 * Geçersiz/taşma/dosyayı aşan boyut → null.
 */
function parseBoxHeader(bytes: Uint8Array, offset: number, availableEnd: number): BoxHeader | null {
  if (offset < 0 || offset + 8 > bytes.length || offset + 8 > availableEnd) {
    return null;
  }
  const size32 = readU32(bytes, offset);
  const type = asciiAt(bytes, offset + 4, 4);
  if (type.length !== 4) {
    return null;
  }

  if (size32 === 0) {
    return { size: availableEnd - offset, type, headerLength: 8 };
  }

  if (size32 === 1) {
    if (offset + 16 > bytes.length || offset + 16 > availableEnd) {
      return null;
    }
    const hi = readU32(bytes, offset + 8);
    const lo = readU32(bytes, offset + 12);
    if (hi > 0x1fffff) {
      return null;
    }
    const size = hi * 0x100000000 + lo;
    if (!Number.isSafeInteger(size) || size < 16) {
      return null;
    }
    return { size, type, headerLength: 16 };
  }

  if (size32 < 8) {
    return null;
  }
  if (size32 > availableEnd - offset) {
    return null;
  }
  return { size: size32, type, headerLength: 8 };
}

/**
 * Buffer içindeki box yürüyüşü.
 * visit 'error' → geçersiz/kesik yapı (null yolculuk).
 * visit 'stop'  → erken bitir, yürüyüş 'stopped' ile döner (hata değil).
 * void/undefined → devam.
 */
type WalkVisitResult = 'stop' | 'error' | void;

function walkBoxes(
  bytes: Uint8Array,
  start: number,
  end: number,
  visit: (type: string, payloadStart: number, payloadEnd: number) => WalkVisitResult,
): 'ok' | 'stopped' | 'error' {
  let offset = start;
  let visited = 0;
  while (offset + 8 <= end) {
    if (visited >= MP4_AUDIO_TRACK_MAX_BOXES) {
      return 'error';
    }
    visited += 1;
    const header = parseBoxHeader(bytes, offset, end);
    if (header === null || header.size < 8) {
      return 'error';
    }
    const next = offset + header.size;
    if (next > end || next <= offset) {
      return 'error';
    }
    const result = visit(header.type, offset + header.headerLength, next);
    if (result === 'error') {
      return 'error';
    }
    if (result === 'stop') {
      return 'stopped';
    }
    offset = next;
  }
  return 'ok';
}

/** mdia payload'ı içinde hdlr handler_type okur. */
function inspectMdia(bytes: Uint8Array, start: number, end: number): boolean | null {
  let sawHdlr = false;
  let sound = false;

  const walkResult = walkBoxes(
    bytes,
    start,
    end,
    (type, payloadStart, payloadEnd): WalkVisitResult => {
      if (type !== TYPE_HDLR) {
        return undefined;
      }
      sawHdlr = true;
      // full box: version(1)+flags(3)+pre_defined(4)+handler_type(4)
      if (payloadStart + 12 > payloadEnd) {
        return 'error';
      }
      if (asciiAt(bytes, payloadStart + 8, 4) === HANDLER_SOUND) {
        sound = true;
        return 'stop';
      }
      return undefined;
    },
  );

  if (walkResult === 'error') {
    return null;
  }
  if (sound) {
    return true;
  }
  if (!sawHdlr) {
    return null;
  }
  return false;
}

/** trak payload'ı içinde mdia → hdlr arar. */
function inspectTrak(bytes: Uint8Array, start: number, end: number): boolean | null {
  let foundSound = false;
  let sawMdia = false;

  const walkResult = walkBoxes(
    bytes,
    start,
    end,
    (type, payloadStart, payloadEnd): WalkVisitResult => {
      if (type !== TYPE_MDIA) {
        return undefined;
      }
      sawMdia = true;
      const mdiaResult = inspectMdia(bytes, payloadStart, payloadEnd);
      if (mdiaResult === null) {
        return 'error';
      }
      if (mdiaResult === true) {
        foundSound = true;
        return 'stop';
      }
      return undefined;
    },
  );

  if (walkResult === 'error') {
    return null;
  }
  if (foundSound) {
    return true;
  }
  if (!sawMdia) {
    return null;
  }
  return false;
}

/**
 * moov payload'ı içinde trak → mdia → hdlr arar.
 * - true:  bir hdlr 'soun'
 * - false: moov eksiksiz gezildi, soun yok
 * - null:  yapı eksik/bozuk
 */
function inspectMoov(moov: Uint8Array): Mp4AudioTrackResult {
  let foundSound = false;
  let incomplete = false;

  const walkResult = walkBoxes(
    moov,
    0,
    moov.length,
    (type, payloadStart, payloadEnd): WalkVisitResult => {
      if (type !== TYPE_TRAK) {
        return undefined;
      }
      const trakResult = inspectTrak(moov, payloadStart, payloadEnd);
      if (trakResult === null) {
        incomplete = true;
        return 'error';
      }
      if (trakResult === true) {
        foundSound = true;
        return 'stop';
      }
      return undefined;
    },
  );

  if (walkResult === 'error' || incomplete) {
    return null;
  }
  return foundSound;
}

/** Sınırlı bütçeli dosya okuyucu; toplam bayt ve box sayısını izler. */
class BoundedReader {
  private bytesRead = 0;
  private boxesSeen = 0;

  constructor(
    private readonly file: File,
    private readonly maxBytes: number = MP4_AUDIO_TRACK_MAX_READ_BYTES,
    private readonly maxBoxes: number = MP4_AUDIO_TRACK_MAX_BOXES,
  ) {}

  noteBox(): boolean {
    this.boxesSeen += 1;
    return this.boxesSeen <= this.maxBoxes;
  }

  async read(offset: number, length: number): Promise<Uint8Array | null> {
    if (length < 0 || offset < 0) {
      return null;
    }
    if (length === 0) {
      return new Uint8Array(0);
    }
    if (offset + length > this.file.size) {
      return null;
    }
    if (this.bytesRead + length > this.maxBytes) {
      return null;
    }
    try {
      const buf = await this.file.slice(offset, offset + length).arrayBuffer();
      if (buf.byteLength !== length) {
        return null;
      }
      this.bytesRead += length;
      return new Uint8Array(buf);
    } catch {
      return null;
    }
  }
}

/**
 * Üst düzey (dosya başı) box başlığı: 8 bayt okur, gerekirse largesize.
 * kalanEnd: dosyada bu offset'ten itibaren erişilebilir son.
 */
async function readTopLevelHeader(
  reader: BoundedReader,
  file: File,
  offset: number,
): Promise<BoxHeader | null> {
  const headerBytes = await reader.read(offset, 8);
  if (headerBytes === null) {
    return null;
  }
  const size32 = readU32(headerBytes, 0);
  const type = asciiAt(headerBytes, 4, 4);
  if (type.length !== 4) {
    return null;
  }
  const remaining = file.size - offset;

  if (size32 === 0) {
    return { size: remaining, type, headerLength: 8 };
  }

  if (size32 === 1) {
    const largeBytes = await reader.read(offset + 8, 8);
    if (largeBytes === null) {
      return null;
    }
    const hi = readU32(largeBytes, 0);
    const lo = readU32(largeBytes, 4);
    if (hi > 0x1fffff) {
      return null;
    }
    const size = hi * 0x100000000 + lo;
    if (!Number.isSafeInteger(size) || size < 16) {
      return null;
    }
    return { size, type, headerLength: 16 };
  }

  if (size32 < 8 || size32 > remaining) {
    return null;
  }
  return { size: size32, type, headerLength: 8 };
}

/**
 * SHHH-014 — MP4/M4A ses izi denetimi.
 * Yalnız header/box yapısı; codec veya decode yok.
 */
@Injectable({ providedIn: 'root' })
export class Mp4AudioTrackService {
  /**
   * @returns true — ses izi (hdlr soun) doğrulandı
   *          false — yapı eksiksiz, ses izi yok (ör. video-only)
   *          null  — eksik/bozuk/bütçe: kesin karar yok
   */
  async hasAudioTrack(file: File | null | undefined): Promise<Mp4AudioTrackResult> {
    if (
      file === null ||
      file === undefined ||
      typeof file.size !== 'number' ||
      typeof file.slice !== 'function' ||
      file.size === 0
    ) {
      return null;
    }
    if (file.size < 16) {
      return null;
    }

    const reader = new BoundedReader(file);
    let offset = 0;

    while (offset + 8 <= file.size) {
      if (!reader.noteBox()) {
        return null;
      }
      const header = await readTopLevelHeader(reader, file, offset);
      if (header === null || header.size < 8) {
        return null;
      }
      if (header.size > file.size - offset) {
        return null;
      }

      if (header.type === TYPE_MOOV) {
        const payloadLength = header.size - header.headerLength;
        if (payloadLength < 0) {
          return null;
        }
        if (payloadLength > MP4_AUDIO_TRACK_MAX_MOOV_BYTES) {
          return null;
        }
        const moovBytes = await reader.read(offset + header.headerLength, payloadLength);
        if (moovBytes === null || moovBytes.length < payloadLength) {
          return null;
        }
        const result = inspectMoov(moovBytes);
        if (result !== null) {
          return result;
        }
        // null ise yapı eksikti; yürüyüşe devam etme — üst düzey moov tek başına yeter.
        return null;
      }
      // mdat ve diğerleri: boyutla atla, içerik okuma.

      const next = offset + header.size;
      if (next <= offset) {
        return null;
      }
      offset = next;
    }

    // moov bulunamadı: "ses izi yok" DEĞİL.
    return null;
  }
}
