/**
 * SHHH-014 — WebM/Matroska ses izi denetimi (servis katmanı; UI entegrasyonu yok).
 *
 * EBML Segment → Tracks → TrackEntry → TrackType zincirini sınırlı File.slice
 * okumalarıyla gezer. TrackType = 2 ise ses izi vardır (1 = video izidir).
 *
 * Üç durum:
 * - true:  En az bir ses izi (TrackType=2) doğrulandı.
 * - false: Tracks eksiksiz incelendi, ses izi yok.
 * - null:  Tracks bulunamadı / yapı eksik, kesik, desteklenmeyen / bütçe doldu.
 *
 * Cluster ve diğer büyük payload'lar boyutla atlanır, okunmaz.
 * Codec (Opus/Vorbis) tespiti yapılmaz; container varsayımı üretilmez.
 * Tam dosya RAM'e alınmaz; kullanıcı dosyası ağa gönderilmez, loglanmaz.
 */
import { Injectable } from '@angular/core';

/** Toplam okunan bayt üst sınırı (tüm slice toplamı). */
export const WEBM_AUDIO_TRACK_MAX_READ_BYTES = 256 * 1024;

/** İncelenen EBML element sayısı üst sınırı (taşma/sonsuz döngü koruması). */
export const WEBM_AUDIO_TRACK_MAX_ELEMENTS = 512;

/** Tracks payload'ı için okuma üst sınırı (genel bütçeye dahil). */
export const WEBM_AUDIO_TRACK_MAX_TRACKS_BYTES = 128 * 1024;

export type WebmAudioTrackResult = boolean | null;

const ID_SEGMENT = 0x18538067;
const ID_TRACKS = 0x1654ae6b;
const ID_TRACK_ENTRY = 0xae;
const ID_TRACK_TYPE = 0x83;

const MAX_ID_BYTES = 4;
const MIN_ELEMENT_BYTES = 2;
const TRACK_TYPE_AUDIO = 2;

interface VintResult {
  readonly value: number;
  readonly length: number;
}

interface SizeVintResult extends VintResult {
  readonly unknown: boolean;
}

interface EbmlElementHeader {
  readonly id: number;
  readonly headerLength: number;
  readonly size: number;
  readonly unknownSize: boolean;
}

/** İlk byte'tan vint uzunluğunu belirler; marker yoksa veya sınır aşılırsa null. */
function vintLengthFromFirstByte(first: number, maxLength: number): number | null {
  if (first === undefined || first === 0) {
    return null;
  }
  let length = 1;
  let mask = 0x80;
  while ((first & mask) === 0) {
    length += 1;
    mask >>= 1;
    if (length > maxLength) {
      return null;
    }
  }
  return length;
}

/** EBML ID vint'i: işaret bitleri değere dahildir; 5+ bayt ID desteklenmez. */
function readIdVint(bytes: Uint8Array, offset: number): VintResult | null {
  const first = bytes[offset];
  if (first === undefined || first === 0) {
    return null;
  }
  let length = 1;
  let mask = 0x80;
  while ((first & mask) === 0) {
    length += 1;
    mask >>= 1;
    if (length > MAX_ID_BYTES) {
      return null;
    }
  }
  if (offset + length > bytes.length) {
    return null;
  }
  let value = 0;
  for (let i = 0; i < length; i++) {
    value = value * 256 + bytes[offset + i];
  }
  return { value, length };
}

/** EBML size vint'i: tüm veri bitleri 1 ise bilinmeyen boyut. */
function readSizeVint(bytes: Uint8Array, offset: number): SizeVintResult | null {
  const first = bytes[offset];
  if (first === undefined || first === 0) {
    return null;
  }
  let length = 1;
  let mask = 0x80;
  while ((first & mask) === 0) {
    length += 1;
    mask >>= 1;
    if (length > 8) {
      return null;
    }
  }
  if (offset + length > bytes.length) {
    return null;
  }
  const firstMask = mask - 1;
  let unknown = (first & firstMask) === firstMask;
  let value = first & firstMask;
  for (let i = 1; i < length; i++) {
    const byte = bytes[offset + i];
    if (unknown && byte !== 0xff) {
      unknown = false;
    }
    value = value * 256 + byte;
  }
  if (unknown) {
    return { value: -1, length, unknown: true };
  }
  if (!Number.isSafeInteger(value)) {
    return null;
  }
  return { value, length, unknown: false };
}

/**
 * Sınırlı bütçeli dosya okuyucu; toplam bayt ve element sayısını izler.
 */
class BoundedReader {
  private bytesRead = 0;
  private elementsSeen = 0;

  constructor(
    private readonly file: File,
    private readonly maxBytes: number = WEBM_AUDIO_TRACK_MAX_READ_BYTES,
    private readonly maxElements: number = WEBM_AUDIO_TRACK_MAX_ELEMENTS,
  ) {}

  noteElement(): boolean {
    this.elementsSeen += 1;
    return this.elementsSeen <= this.maxElements;
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
 * Dosya penceresi içinde tek bir EBML element başlığını okur (id + size).
 * Yalnız header baytları okunur; payload'a (Cluster vb.) hiçbir bayt sızmaz.
 */
async function readElementHeader(
  reader: BoundedReader,
  offset: number,
  limit: number,
): Promise<EbmlElementHeader | null> {
  if (offset < 0 || limit <= offset) {
    return null;
  }
  const idFirstBytes = await reader.read(offset, 1);
  if (idFirstBytes === null) {
    return null;
  }
  const idLength = vintLengthFromFirstByte(idFirstBytes[0], MAX_ID_BYTES);
  if (idLength === null) {
    return null;
  }
  // ID'den sonra en az 1 baytlık size alana için yer kalmalı.
  if (offset + idLength >= limit) {
    return null;
  }
  // ID kalanı + size ilk byte tek okumada.
  const idRestAndSizeFirst = await reader.read(offset + 1, idLength);
  if (idRestAndSizeFirst === null) {
    return null;
  }
  let idValue = idFirstBytes[0];
  for (let i = 0; i < idLength - 1; i++) {
    idValue = idValue * 256 + idRestAndSizeFirst[i];
  }
  const sizeFirst = idRestAndSizeFirst[idLength - 1];
  const sizeLength = vintLengthFromFirstByte(sizeFirst, 8);
  if (sizeLength === null) {
    return null;
  }
  if (offset + idLength + sizeLength > limit) {
    return null;
  }
  const sizeBytes = new Uint8Array(sizeLength);
  sizeBytes[0] = sizeFirst;
  if (sizeLength > 1) {
    const sizeRest = await reader.read(offset + idLength + 1, sizeLength - 1);
    if (sizeRest === null) {
      return null;
    }
    sizeBytes.set(sizeRest, 1);
  }
  const size = readSizeVint(sizeBytes, 0);
  if (size === null) {
    return null;
  }
  const headerLength = idLength + sizeLength;
  if (!size.unknown) {
    const payloadEnd = offset + headerLength + size.value;
    if (payloadEnd > limit || payloadEnd < offset + headerLength) {
      return null;
    }
  }
  return { id: idValue, headerLength, size: size.value, unknownSize: size.unknown };
}

/** TrackEntry payload'ı içinde TrackType arar; bulunamazsa null (belirsiz). */
function inspectTrackEntryPayload(
  bytes: Uint8Array,
  start: number,
  end: number,
  reader: BoundedReader,
): boolean | null {
  let offset = start;
  while (offset < end) {
    if (end - offset < MIN_ELEMENT_BYTES) {
      return null;
    }
    if (!reader.noteElement()) {
      return null;
    }
    const id = readIdVint(bytes, offset);
    if (id === null) {
      return null;
    }
    const size = readSizeVint(bytes, offset + id.length);
    if (size === null || size.unknown) {
      return null;
    }
    const headerLength = id.length + size.length;
    const childEnd = offset + headerLength + size.value;
    if (childEnd > end || childEnd < offset + headerLength) {
      return null;
    }
    if (id.value === ID_TRACK_TYPE) {
      if (size.value < 1 || size.value > 8) {
        return null;
      }
      let value = 0;
      for (let i = offset + headerLength; i < childEnd; i++) {
        value = value * 256 + bytes[i];
      }
      if (!Number.isSafeInteger(value)) {
        return null;
      }
      return value === TRACK_TYPE_AUDIO;
    }
    offset = childEnd;
  }
  // TrackType Matroska'da zorunludur; yoksa tip bilinmiyor → belirsiz.
  return null;
}

/** Tracks payload'ını bellekte gezer: true / false / null. */
function inspectTracksPayload(bytes: Uint8Array, reader: BoundedReader): WebmAudioTrackResult {
  let offset = 0;
  while (offset < bytes.length) {
    if (bytes.length - offset < MIN_ELEMENT_BYTES) {
      return null;
    }
    if (!reader.noteElement()) {
      return null;
    }
    const id = readIdVint(bytes, offset);
    if (id === null) {
      return null;
    }
    const size = readSizeVint(bytes, offset + id.length);
    if (size === null || size.unknown) {
      return null;
    }
    const headerLength = id.length + size.length;
    const end = offset + headerLength + size.value;
    if (end > bytes.length || end < offset + headerLength) {
      return null;
    }
    if (id.value === ID_TRACK_ENTRY) {
      const result = inspectTrackEntryPayload(bytes, offset + headerLength, end, reader);
      if (result === null) {
        return null;
      }
      if (result === true) {
        return true;
      }
    }
    offset = end;
  }
  return false;
}

/** Segment payload'ı içinde Tracks arar; bulunamaz veya bozuksa null. */
async function inspectSegment(
  reader: BoundedReader,
  start: number,
  end: number,
): Promise<WebmAudioTrackResult> {
  let offset = start;
  while (offset < end) {
    if (end - offset < MIN_ELEMENT_BYTES) {
      return null;
    }
    if (!reader.noteElement()) {
      return null;
    }
    const header = await readElementHeader(reader, offset, end);
    if (header === null) {
      return null;
    }
    if (header.id === ID_TRACKS) {
      if (header.unknownSize) {
        return null;
      }
      const payloadLength = header.size;
      if (payloadLength > WEBM_AUDIO_TRACK_MAX_TRACKS_BYTES) {
        return null;
      }
      const payload = await reader.read(offset + header.headerLength, payloadLength);
      if (payload === null) {
        return null;
      }
      return inspectTracksPayload(payload, reader);
    }
    if (header.unknownSize) {
      // Bilinmeyen boyutlu Cluster vb. güvenli atlanamaz (Tracks'ten önceyse).
      return null;
    }
    const next = offset + header.headerLength + header.size;
    if (next <= offset || next > end) {
      return null;
    }
    offset = next;
  }
  // Segment'te Tracks yok: "ses izi yok" değil, belirsiz.
  return null;
}

/**
 * SHHH-014 — WebM/Matroska ses izi denetimi.
 * Yalnız EBML başlık/yapı yürüyüşü; codec veya decode yok.
 */
@Injectable({ providedIn: 'root' })
export class WebmAudioTrackService {
  /**
   * @returns true — en az bir ses izi (TrackType=2) doğrulandı
   *          false — Tracks eksiksiz gezildi, ses izi yok
   *          null  — Tracks yok/eksik/bozuk/bütçe: kesin karar yok
   */
  async hasAudioTrack(file: File | null | undefined): Promise<WebmAudioTrackResult> {
    if (
      file === null ||
      file === undefined ||
      typeof file.size !== 'number' ||
      typeof file.slice !== 'function' ||
      file.size === 0
    ) {
      return null;
    }
    if (file.size < MIN_ELEMENT_BYTES) {
      return null;
    }

    const reader = new BoundedReader(file);
    const fileEnd = file.size;
    let offset = 0;

    while (offset + MIN_ELEMENT_BYTES <= fileEnd) {
      if (!reader.noteElement()) {
        return null;
      }
      const header = await readElementHeader(reader, offset, fileEnd);
      if (header === null) {
        return null;
      }
      if (header.id === ID_SEGMENT) {
        const segmentEnd = header.unknownSize
          ? fileEnd
          : offset + header.headerLength + header.size;
        if (segmentEnd > fileEnd || segmentEnd < offset + header.headerLength) {
          return null;
        }
        return inspectSegment(reader, offset + header.headerLength, segmentEnd);
      }
      if (header.unknownSize) {
        return null;
      }
      const next = offset + header.headerLength + header.size;
      if (next <= offset || next > fileEnd) {
        return null;
      }
      offset = next;
    }
    // Segment bulunamadı: kesin karar yok.
    return null;
  }
}
