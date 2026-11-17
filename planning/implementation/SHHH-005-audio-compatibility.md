# SHHH-005 — Ses biçimleri ve kodek uyumluluk matrisi

Tarih: 2026-11-16 · Bağlı Issue: [cerennkurucuu/shhh#13](https://github.com/cerennkurucuu/shhh/issues/13) · Yerel kayıt: `planning/issues/SHHH-005.md`
Durum: **Araştırma tamamlandı. Bu turda HİÇBİR tarayıcı/codec testi çalıştırılmadı, ses dosyası decode edilmedi; uyumluluk iddiaları resmî kaynak metinleridir, cihaz ölçümü DEĞİLDİR.** Gerçek decode denemeleri T01'de (docs/08) yapılacaktır.
Önceki raporlar korunur: SHHH-002/003/004 (`planning/implementation/`) değiştirilmedi.

---

## 1. Karar tablosu (özet)

| Karar | Sonuç |
|---|---|
| **v1.0 desteklenecek formatlar (hedef: Android Chrome + masaüstü Chrome)** | **OGG/Opus, OGG/Vorbis, WAV/PCM, MP3, M4A/MP4/AAC, WebM/Opus, WebM/Vorbis, FLAC** (matris §4; AAC "yalnız Google Chrome" markası şartıyla) |
| **Öncelikli decoder** | **Web Audio `decodeAudioData`** — ön limitler (50 MB/20 dk) ve bellek ölçümü tutuyorsa yeterli (§6) |
| **Fallback (B planı, koşullu)** | **Mediabunny (MPL-2.0) demux + WebCodecs `AudioDecoder`** — ancak yalnız bellek bütçesi aşılırsa; SHHH-002'deki "koşullu aday" statüsü korunur (§7) |
| **Reddedilen yaklaşım** | ffmpeg.wasm (paket/analiz bu turda yapılmadı, lisans+bellek yükü kanıtlanmadan aday değil), `ScriptProcessorNode` (deprecated), el yazımı demux |
| **Desteklenmeyen sayılan** | AMR, ADTS/.aac (kesin değil → doğrulama listesinde), Ogg içinde Opus dışı egzotik codec, AC3/DTS (tarayıcı decode yok) — güvenli ret (§8) |
| **Tanılama ilkesi** | Uzantı ve `File.type` **yalnız ipucu**; asıl karar **magic-byte sniff + decode denemesi** (§8) |

---

## 2. Kavram ayrımı: uzantı ≠ MIME ≠ container ≠ codec (kabul kriteri 1)

| Kavram | Ne ifade eder | Güvenilirlik | Kaynak |
|---|---|---|---|
| **Dosya uzantı** (`.ogg`, `.m4a`, `.opus`) | Dosya adının sonu; işletim sistemi/uygulama geleneği | **Düşük** — paylaşımda değişebilir/sahte olabilir; Android `.opus`'u MediaScanner hiç tanımayabilir (Wikipedia/Opus: Android 9 notu — ikincil kaynak) | MDN Containers: ".opus eklense bile aslında Ogg dosyasıdır" |
| **MIME türü** (`File.type`, `audio/ogg`) | Bayt dizisine göre iddia edilen tip | **Orta-düşük** — paylaşımda **boş** olabilir; kullanıcı uzantısından türetilir (yalanlayabilir); doğrulama başarısızlıklarında **en yaygın hata türü** Meta'nın kendi tespiti | Meta/WhatsApp API: "en common errors … mismatched MIME types" |
| **Container** (Ogg, ISO-BMFF/MP4, WebM/Matroska, RIFF/WAVE, MPEG-PS benzeri MP3 akışı) | Codec'i saran paketleme biçimi | **Yüksek** — ilk baytlardaki **imza** ile tespit edilir (§8.2) | MDN Containers; Chromium media/base |
| **Codec** (Opus, Vorbis, AAC-LC, MP3, FLAC, PCM) | Asıl ses kodlaması | **Yalnız decode ile kesinleşir** — container imzası codec'i söylemez (Ogg içine Opus Veya Speex konabilir); tanılama: sniff + `decodeAudioData` denemesi | Web Audio spec/MDN |

Ek:
- MP3 "geleneksel container içinde değildir" — doğrudan MPEG ses kareleri + ID3 (MDN Containers). MIME'ı `audio/mpeg`.
- `decodeAudioData(arrayBuffer)` **sadece byte alır; MIME parametresi yoktur** → MIME uyuşmazlığı decode'u etkilemez, karar sniff + decode'dur (MDN decodeAudioData, Web Audio API spec).
- Resmî MIME kaydı: IANA `audio/ogg`, `audio/mpeg`, `audio/mp4`, `audio/wav`(`audio/wave`), `audio/webm`, `audio/aac`, `audio/flac`; liste MDN Containers'taki çapraz referansla sınırlı tutuldu (bu turda IANA'dan ayrıca çekilmedi).

---

## 3. WhatsApp/Android'ten gelen gerçekçi girdi seti

| Kaynak (2026-11-16) | Veri |
|---|---|
| **Meta resmî** (developers.facebook.com, WhatsApp Cloud API "Audio messages") | **Ses notu (voice message): `.ogg` + OPUS codec, mono** (Vorbis'li "base audio/ogg" desteklenmiyor). Normal ses dosyası: **AAC `.aac` (audio/aac), AMR `.amr` (audio/amr), MP3 `.mp3` (audio/mpeg), M4A `.m4a` (audio/mp4), OGG/OPUS**. Maks 16 MB. "En yaygın hatalar: MIME↔uzantı uyuşmazlığı ve Ogg'ta Opus olmayan encoding." |
| Wikipedia "Opus (audio format)" (ikincil) | "Since 2016, WhatsApp has been using Opus"; 8–16 kHz örneklem; Android 9 `.opus` uzantısı MediaScanner tarafından tanınmaz → `.ogg`/`.m4a` taklidi gerekir. |
| Sonuç (v1.0 için) | **Birincil hedef: Ogg/Opus (ses notları)**; ikincil: M4A/AAC, MP3, WAV (dışarıdan gelen belgeler); **AMR WhatsApp tarafından gönderilebilir ama tarayıcı tarafı desteklenmiyor sayılır** → güvenli ret + anlaşılır mesaj (§8–§9). |

---

## 4. Uyumluluk matrisi — resmî Chromium kaynağı (kabul kriteri 1)

Kaynak: **chromium.org/audio-video "Codec and Container Support"** (2026-11-16 okundu; aynı metin `chromium.googlesource.com/website/.../audio-video/index.md` içinde).

- **Container'lar:** MP4 (QuickTime/MOV/ISO-BMFF/CMAF), Ogg, WebM, WAV, Matroska, HLS.
- **Açık ses codec'leri:** FLAC, MP3, **Opus**, PCM (8/16-bit int, 32-bit float, μ-law), Vorbis.
- **Tescilli (yalnız Google Chrome):** **AAC (Main, LC, HE)** ve **xHE-AAC (native OS: Android P+, macOS, Windows 11 22H2+)**.
- Build bayrakları: `ffmpeg_branding=Chrome` → tescilli codec'ler; `proprietary_codecs=false` (markasız Chromium) → `canPlayType` AAC'yi **desteklemez**.

| Girdi (beklenen) | Android Chrome (markalı) | Masaüstü Chrome | Markasız Chromium | Karar v1.0 |
|---|---|---|---|---|
| OGG + Opus (WhatsApp ses notu) | ✓ (Opus açık listede) | ✓ | ✓ | **Desteklenir — birincil** |
| OGG + Vorbis | ✓ (Vorbis açık) | ✓ | ✓ | Desteklenir |
| WAV + PCM (LPCM) | ✓ | ✓ | ✓ | Desteklenir (ADPCM/GSM/μ-law WAV: MDN'de Chrome desteklemiyor → ret) |
| MP3 (`audio/mpeg`) | ✓ (MP3 açık listede) | ✓ | ✓ | Desteklenir |
| M4A/MP4 + AAC | ✓ (tessilli; xHE-AAC Android P+) | ✓ | **✗** | **Koşullu** — yalnız Google Chrome; markasız Chromium'da ret (runtime test ile) |
| WebM + Opus/Vorbis | ✓ | ✓ | ✓ | Desteklenir |
| FLAC (`.flac` / Ogg-FLAC) | ✓ | ✓ | ✓ | Desteklenir |
| ADTS `.aac` (raw AAC akışı) | ? (MDN ADTS: "OS media framework'üne bağlı"; Chromium container listesinde açıkça yok) | ? | ✗ | **Doğrulanacak kombinasyon** (§10) — varsayım: desteklenmiyor say, güvenli ret |
| AMR `.amr` | Chromium resmî listesinde **YOK** (eski sayfalarda "Chrome OS only") | ✗ | ✗ | **Desteklenmiyor say** → ret mesajı; cihazda negatif kontrol |
| Ogg + Speex/FLAC-harici, AC3/DTS, WMA | listelerde yok | — | — | Ret |

**Önemli sınır:** Bu tablo **kaynak metni** okumasıdır; decode davranışı cihaz/tarayıcı sürümüne bağlıdır ve **bu turda çalıştırılmamıştır**. Tüm satırlar T01'de gerçek fixture ile doğrulanacaktır (docs/08 T01: MP3/WAV/OGG-OPUS/M4A-AAC/WebM pozitif; boş/yanlış MIME/bozuk header/büyük boyut negatif).

---

## 5. Web Audio API ne zaman yeterlidir? (görev 4)

`decodeAudioData` davranışı (MDN + Web Audio spec, 2026-11-16):
- **Yalnız tam dosya verisiyle çalışır — parçalarla/fragment'larla çalışmaz** (MDN: "only works on complete file data, not fragments").
- Çıktı `AudioBuffer`; **context sample rate'ine yeniden örneklenir** → `OfflineAudioContext(…, 16000)` ile doğrudan 16 kHz mono PCM elde edilebilir (whisper girişi docs/03 ile uyumlu).
- Hata: promise reject (tipik `EncodingError`) → §8'de hata kodlarına eşlenir.
- **İptal edilemez** — çağırdıktan sonra durdurma API'si yok (docs/07 "AbortSignal her uzun akışta zorunlu" ile çelişir; bkş. §9-iptal kararı).

**Yeterli olduğu koşullar (hepsi sağlanmalı):**
1. Dosya ön limitlerde: **≤50 MB ve ≤20 dk** (docs/02 ön limit; tam dosya okunmadan byte sınırı `File.slice` ile uygulanır).
2. Sniff container'ı §4 listesinde.
3. **Bellek bütçesi:** AudioBuffer boyutu (hesap, ölçüm değil — f32 mono):

| Süre | 16 kHz (OfflineAudioContext ile) | 48 kHz (varsayılan context) |
|---|---|---|
| 5 dk | 18,3 MiB | 54,9 MiB |
| 20 dk | **73,2 MiB** | **219,7 MiB** (+ sıkıştırılmış dosya ≤50 MB) |

→ 16 kHz hattı ~4,8 MB/dk; 48 kHz'e düşmeden decode **zorunlu** (aksi halde 20 dk'da ~220 MB yalnız AudioBuffer). Düşük-RAM cihazda ölçümden (T06/T18) sonra karar.

**Yetersiz olduğu durumlar:**
- Bütçe aşımı / çok uzun ses (PRD NFR: "çözümleyici streaming sağlayamıyorsa cihaz bütçesi kontrol edilir veya kayıt reddedilir").
- Parçalı/akışkan işleme, ilerleme raporu **bayan süreye** bağlıysa (decodeAudioData tümünü tek seferde yapar).
- Desteklenmeyen codec (AMR, ADTS-belirsiz) — Web Audio çözümleyemez.
- Süre sınırının "tam okumadan" uygulanması gereken durumlarda: MP3'te süre tam okuma olmadan güvenilir değildir (ID3/Xing olsa bile) → PRD: "Bilinmeyen süre destek garantisi değildir"; decode sonrası süreyle sınırla.

---

## 6. Tam dosya RAM'e alınmadan çözümleme — yöntem karşılaştırması (görev 6)

| Yöntem | Bellek davranışı | Hız | Tarayıcı gereksinimi | Artı / Eksi |
|---|---|---|---|---|
| **A. `decodeAudioData` (16 kHz OfflineAudioContext)** | Sınırsız-değil ama **bütün dosya**: ≤50 MB girdi + ~4,8 MB/dk PCM; segmentlere ayırma Worker'da | Native, gerçek zaman üstü | Tüm Chrome (Baseline, Nisan 2021+) | + Basit, hızlı, resmî Baseline; − Tam dosya RAM'de, iptal yok, ilerleme yok |
| **B. `<audio>` + `MediaElementAudioSourceNode` + AudioWorklet** | Akışkan (element buffer'ı) | **Yalnız gerçek zaman** (oynatma hızına kilitli), seek/pitch karmaşası | Baseline API'ler; AudioWorklet gerekli | + RAM düşük; − Süre = ses süresi (20 dk = 20 dk işlem), ses oynatmadan yakalama koşullu, OS audio focus kesintileri |
| **C. Mediabunny demux + WebCodecs `AudioDecoder`** | **Sınırlı**: paket→PCM akışı, yalnız aktif segment (~20–30 sn) RAM'de (docs/03 Segmenter ile birebir) | Gerçek zaman üstü mümkün (oynatmaya bağlı değil) | WebCodecs (`AudioDecoder`); çalışma zamanı `canDecode` kontrolü | + Gerçek bounded decode, MDN'in önerdiği demux yolu; − WebCodecs bağımlılığı, MPL-2.0 (dosya-bazlı), entegrasyon maliyeti |
| **D. El yazımı demux (`File.slice` + manuel parser)** | Sınırlı | — | — | − Yüksek hata riski, kod bakım yükü → **red** |
| **E. ffmpeg.wasm** | Büyük WASM heap | — | — | − Paket büyüklüğü/lisans (LGPL static link) kanıtlanmadı → **bu turda aday değil** (docs/03: "başka runtime otomatik seçilmez") |

**Öneri:** v1.0 **A ile başla** (ön limitler + 16 kHz + ölçüm), **C'ye kaçış** yalnız T06 bellek ölçümü bütçeyi aşarsa. B, ancak kullanıcıya dinletemeden PCM sağlayamadığı için transcript hattı için pratik değil (yalnız teşhis amaçlı).

---

## 7. Mediabunny değerlendirmesi (görev 5)

| Başlık | Bulgu (2026-11-16 resmî sayfalar) |
|---|---|
| **Lisans** | **MPL-2.0** — resmî ana sayfa: "open-source project released under the MPL-2.0 … free to use for any purpose, including closed-source commercial use" (docs/09'daki "ana sayfa lisans linki" bekleneni karşılıyor). **Dosya-bazlı copyleft:** değişen kaynak dosyalar MPL'e tabi; npm paketi `mediabunny` (SHHH-002: 1.66.0, 2026-11-13). Kesin sürüm/tag ve license metni + transitive denetimi **kurulumda (SHHH-002 §9-1 / docs/09)** tekrarlanmalı. |
| **Container desteği** | MP4/ISOBMFF, MOV, CMAF, MKV, **WebM**, **Ogg**, **MP3**, **WAV**, ADTS, **FLAC**, TS, HLS — hedefimizin tamamı. |
| **Codec** | WebCodecs'teki tüm codec'ler + gömülü PCM decoder'lar ("always supported"). Ses: aac, **opus**, **mp3**, **vorbis**, **flac**, pcm-*. **Kritik:** "availability of the codecs provided by the WebCodecs API depends on the browser and thus cannot be guaranteed by this library." |
| **Codec-container matrisi** | Ogg: opus ✓, vorbis ✓; MP4: aac ✓ opus ✓ mp3 ✓ flac ✓; WebM: opus ✓ vorbis ✓; WAV/MP3/FLAC kendi codec'leri ✓. |
| **Bounded okuma** | "efficiently read data … no matter the size … Load only what you need"; `BlobSource`/`UrlSource`; progressive okuma. |
| **Çalışma zamanı tanılama** | `canDecode('opus')`, `track.canDecode()`, `getDecodableAudioCodecs()` → unsupported için **erken güvenli ret** imkânı. |
| **Bakım/sinyal** | SHHH-002: aktif (1.66.0, 2026-11-13), MIT değil **MPL-2.0**; docs/09 satırı: "lisans metni, codec ekleri ve exact sürüm onayı bekliyor" → bu rapor lisans kararını **günceller (MPL-2.0, resmî beyan)**, sürüm onayı kurulumda. |
| **Performans iddiaları** | Ana sayfa benchmark'ları (862 ops/s vb.) **vendor ölçümüdür** (Ryzen 7600X/RTX 4070, 2025-06-22) — mobil cihaz için **kabul kriteri yapılmaz**. |
| **MDN bağımsız referansı** | MDN Codec selection rehberi demux kütüphanesi olarak Mediabunny'yi açıkça örnekler (bağımsız tanınırlık sinyali). |

**Karar (SHHH-002 ile uyumlu):** **Koşullu aday kalır** — yalnız A yolu bellek bütçesini aşarsa (§6). v1.0'da bağımlılık olarak EKLENMEZ; eklenirse tek seferlik lisans/notice kaydı docs/09'a işlenir.

---

## 8. Güvenli hata davranışı (görev 7)

### 8.1 Doğrulama boru hattı (sıra önemlidir; docs/02 R02 + docs/07 hata kodları)

| Adım | Kontrol | Teknik | Hata kodu |
|---|---|---|---|
| **F0** | Boş dosya | `size === 0` → **tam okuma yok** | `invalid-file` |
| **F1** | Byte sınırı | `size > 50 MB` → **dosyanın tamamı açılmadan** reddet (yalnız header slice) | `invalid-file` (boyut) |
| **F2** | **Magic sniff** | `File.slice(0, 512).arrayBuffer()` — ilk baytlar (§8.2) | tanınmıyorsa `invalid-file` |
| **F3** | MIME/uzantı | `File.type` + uzantı **yalnız uyarı sinyali** (sniff ile çelişiyorsa kullanıcıya "dosya adı gerçek formatla uyuşmuyor" notu, yine de sniff kazanır) | — (uyarı) |
| **F4** | Decode denemesi | `decodeAudioData` reject → bilinen container ise `unsupported-codec`, tanınmayan ise `invalid-file` | `unsupported-codec` / `invalid-file` |
| **F5** | Boş/eksik track | decode başarılı ama `duration` NaN/0 veya tüm kanal örnekleri sıfır → **eksik audio track** | `invalid-file` |
| **F6** | Süre/kota | decode sonrası süre >20 dk → ret; >50 MB zaten F1'de | `invalid-file` (süre) / `quota` |

Ek kurallar:
- **Sniff kazanır:** yanlış uzantılı ama geçerli dosya **işlenir** (uyarıyla); doğru uzantılı bozuk dosya **ret** edilir.
- **Çevrimdışı/kota/worker** hataları ayrı koddur (docs/07: `quota`, `network`, `worker-crash`, `model-integrity`, `cleanup-failed`) — codec hatalarıyla **karıştırılmaz** (PRD R12: "Codec/ağ/model/kota/worker hatası ayrılır").
- Hata nedeni teknik olarak saklanır; **transkript/byte loglanmaz** (docs/07).

### 8.2 İmza tablosu (ilk baytlar; eldeki 512 B ile yetinilir)

| İmza | Tanıma | Sonuç |
|---|---|---|
| `4F 67 67 53` (`OggS`) | Ogg container | Opus/Vorbis/FLAC ayrımı decode'a bırakılır |
| `52 49 46 46` + `57 41 56 45` (`RIFF….WAVE`) | WAV | PCM kontrolü decode'da (ADPCM/GSM → ret) |
| offset 4'te `66 74 79 70` (`ftyp`) | ISO-BMFF (M4A/MP4) | AAC profile decode'da |
| `1A 45 DF A3` | EBML → WebM/Matroska | Opus/Vorbis decode'da |
| `49 44 33` (`ID3`) veya `FF Ex/Fx` senkronu | MP3 | — |
| `66 4C 61 43` (`fLaC`) | FLAC | — |
| `23 21 41 4D 52` (`#!AMR`) | AMR | **§4: desteklenmiyor → `unsupported-codec`** (erken ret, decode'a gerek yok) |
| `FF F1/FF F9` senkronu | ADTS AAC | §4 belirsiz → decode denemesi; başarısızsa ret |

---

## 9. Önerilen kullanıcı mesajları (görev 8)

İlke (docs/07/PRD R12): teknik neden korunur ama **kullanıcı metni kısa, eyleme dönük ve suçlayıcı değildir**; dosya adı/metin HTML'e güvenli içerik olarak eklenmez.

| Hata kodu | Kullanıcıya gösterilecek metin (TR) | Önerilen eylem |
|---|---|---|
| `invalid-file` (boş) | "Dosya boş görünüyor. Başka bir kayıt seçmeyi deneyin." | Tekrar seç |
| `invalid-file` (boyut) | "Dosya 50 MB sınırını aşıyor. Daha kısa/küçük bir kayıt paylaşın." | Boyut ipucu |
| `invalid-file` (tanınmayan/imza) | "Bu dosyanın ses verisi olduğu anlaşılamadı. Dosya bozuk olabilir ya da ses formatı değil." | Farklı dosya |
| `invalid-file` (süre) | "Kayıt 20 dakika sınırından uzun. Bu sürümde kısa kayıtlar işleniyor." | Süre ipucu |
| `invalid-file` (boş track) | "Dosyada ses verisi bulunamadı." | Farklı dosya |
| `unsupported-codec` | "Bu ses biçimi bu tarayıcıda açılamıyor. WhatsApp ses notları (OGG), MP3, M4A veya WAV ile deneyin." | Desteklenen format listesi |
| `unsupported-codec` (AMR) | "AMR biçimi tarayıcıda desteklenmiyor. Dosyayı MP3 veya M4A olarak dışa aktarıp tekrar deneyin." | Dönüştürme önerisi |
| `invalid-file` (sniff↔uzantı uyarısı) | "Dosya adı gerçek formatla uyuşmuyor; yine de deneniyor." (bilgi bandı, engelleyici değil) | — |
| `quota` | "Cihazda yer/kota yetersiz. Uygulamayı kapatıp tekrar deneyin." | Temizleme (R10) |
| `network` | "İndirme tamamlanmadı. Bağlantınızı kontrol edip yeniden deneyin." | Yeniden dene (model) |
| `worker-crash` | "İşlem beklenmedik şekilde durdu. Kayıt silinmedi; tekrar deneyebilirsiniz." | Yeniden dene |

Kapsam dışı: ekran okuyucu/erişilebilirlik uygulaması (R13, sonraki epic).

---

## 10. Doğrulanması gereken kombinasyonlar (T01/T14'e devir; sonuç YAPILMADI)

| # | Kombinasyon | Beklenen | Neden riskli |
|---|---|---|---|
| 1 | Android Chrome + WhatsApp ses notu (**Ogg/Opus mono, ~48 kHz** — Meta mono diyor, WhatsApp pratikte 48 kHz Opus) | decode OK | Birincil senaryo; Opus `decodeAudioData`'da resmî destek kanıtı yok (yalnız `<audio>` destek tabloları var) |
| 2 | Android Chrome + `.m4a` AAC-LC | decode OK | Tessilli codec; Android sürümüne bağlı (xHE-AAC Android P+) |
| 3 | Masaüstü Chrome + `.m4a` | OK | — |
| 4 | **Markasız Chromium + `.m4a`** | **Ret** | `proprietary_codecs=false` (§4) |
| 5 | ADTS `.aac` | Ret veya OK → kararı ver | Kaynaklar çelişkili (§4) |
| 6 | AMR | **Ret + §9 mesajı** | Resmî listede yok; Android platform codec'i varsa Chrome yine de reddedebilir |
| 7 | Yanlış uzantılı geçerli Ogg (`.mp3` adıyla) | **İşlenir + uyarı** | Uzantı≠gerçeklik (§8) |
| 8 | `File.type` boş (share yolu) | sniff ile çözülür | SHHH-003 paylaşım yolu |
| 9 | Bozuk header / yarıda kesilmiş Ogg | `invalid-file` | Negatif kriter |
| 10 | 0 bayt, sahte `ftyp`, ADPCM-WAV | ret | §8 |
| 11 | 48 kHz stereo 20 dk (bütçe testi) | 16 kHz hattı tutmazsa A→C kararı | §5/§6 bellek |

Her koşul: cihaz/OS/Chrome sürümü, dosya SHA-256, tarih, beklenen/gerçek (docs/08 kanıt formatı).

---

## 11. Kalan riskler

1. **`decodeAudioData` için codec destek kanıtı = kaynak okuması**; Opus/AAC/MP3'ün `decodeAudioData` yolu cihazda doğrulanmadı (§10-1/2/3).
2. **AAC marka bağımlılığı** — markasız Chromium/uzantılarda sürpriz ret (pratikte Chrome hedefi ama Playwright/Chromium E2E bunu gizleyebilir: E2E `proprietary_codecs` içermeyebilir → test ortamı ≠ üretim, docs/07 "Playwright gerçek cihaz kanıtının yerine geçmez").
3. **Bellek hesabı aritmetiktir, ölçüm değildir** (§5); düşük-RAM cihaz davranışı T06'da.
4. **Süre tahmini:** MP3/VBR'de tam okuma olmadan güvenilir süre yok → PRD'ye göre "bilinmeyen süre destek garantisi değil"; sınır decode sonrası.
5. **Mediabunny lisansı MPL-2.0 dosya-bazlı** — SHHH-002'deki "MIT/MPL ayrımı" docs/09'a işlenmeli; kesin sürüm ve advisory kurulumda.
6. **İptal boşluğu:** `decodeAudioData` durdurulamaz → uzun decode'lar Worker terminate ile iptal edilir; bu, docs/07 "AbortSignal her uzun akışta" kuralıyla **tasarım kararına** bağlandı (A yolunda decode Worker içinde; iptal = terminate, yarım sonuç commit edilmez — docs/03 ile uyumlu).
7. AMR/ADTS kesin cevabı cihaz testine kaldı (§10).

---

## 12. Kabul kriterleri durumu (Issue #13 / SHHH-005 §4)

| Kriter | Durum | Kanıt |
|---|---|---|
| Dosya uzantısından bağımsız container/codec matrisi | **Tamam** | §2 (uzantı/MIME/container/codec ayrımı) + §8.2 sniff tablosu + §4 matris |
| Desteklenmeyen yol ve kullanıcı mesajı | **Tamam** | §8 boru hattı + §9 mesaj tablosu |
| Lisanslı fallback kararı | **Tamam (karar; kurulum onayı açık)** | §7: Mediabunny **MPL-2.0** resmî beyan, koşullu fallback; kesin sürüm+license metni SHHH-002/docs/09 kurulum kapısında |
| Başarı/hata/iptal/kesinti kapsandı; uygulanmayan dal gerekçeli | **Tamam** | §13 |
| Gereksinim/test kanıtları izlenebilir; ölçülmemiş başarı iddiası yok | **Tamam** | §14; tüm "destekliyor" ifadeleri resmî kaynağa atıflı, hiçbir decode testi yapılmadığı başlıkta belirtildi |
| (DoD) Pozitif/negatif senaryo sonuçları kayıtlı | **Kısmi** | Senaryolar ve **beklenen** sonuçlar §10'da; **gerçek** çıktılar T01'de — bu tur tarayıcı çalıştırılmadı (gerekçe: "gerçekte çalıştırmadığın testi başarılı gösterme" kuralı) |
| (DoD) Bağımlılıklar; veri/lisans/ağ riskleri | **Tamam** | §7 lisans, §11 riskler; SHHH-002 bağımlılığı karşılandı |
| (DoD) Ceren Kurucu incelemesine hazır; commit/push/kapatma yok | **Tamam** | `git status`: yalnız `planning/implementation/` untracked; önceki raporlar değişmedi |

## 13. Başarı / hata / iptal / kesinti kapsam eşlemesi

| Davranış | Kapsam | Uygulanmayan dalın gerekçesi |
|---|---|---|
| Başarı | §1 kararları, §4 matris, §5 yeterlilik koşulları, §6 decoder yaklaşımı | Gerçek decode = T01 (bu tur kapsam dışı, kural gereği) |
| Hata | §8 F0–F6 + §9 mesajlar + AMR/ADTS/bozuk/imza negatifleri | — |
| İptal | `decodeAudioData`'nın iptal edilememesi tespit edildi (§11-6) → A yolunda decode Worker + terminate, yarım segment commit edilmez (docs/03); paylaşım iptali SHHH-003 §5-S10 | Gerçek iptal testi T14/T01 |
| Kesinti | Paylaşım/okuma yarım kesilirse F1–F4 hiç çalışmaz, veri yazılmaz; model indirme kesintisi ayrı kod (`network`, SHHH-004 §6.3-3); kota `quota` | Uygulama katmanı testleri SHHH-006+ |

## 14. İzlenebilirlik

- **PRD R02** (docs/02): "Sahte uzantı/bozuk/boş dosya reddi; büyük dosyada tam okumadan uyarı" → §8 F0–F3; **R12** hata ayrımı → §9; ön limit 50 MB/20 dk → §5/F1/F6. İzlenebilirlik satırı: "R02: SHHH-005,013–014".
- **docs/03** §Veri akışı: "erken boyut/imza kontrolü → metadata/codec → decoder → mono/16 kHz" → §8.2 + §5 (16 kHz OfflineAudioContext); "Native Web Audio yeterliyse ek decoder yok; Mediabunny ancak codec/streaming matrisi ve lisans kanıtı sonrası" → §6/§7 (bu rapor o kanıtı üretti).
- **docs/07**: hata kodları (`invalid-file`, `unsupported-codec`, `quota`, `network`, `worker-crash`…) §8/§9'da birebir kullanıldı; `AbortSignal` zorunluluğu §11-6'da bağlandı.
- **docs/08 T01/T15**: §10 devir listesi; **SHHH-002 §2** (Mediabunny MPL-2.0 koşullu) → §7 güncellendi.
- **SHHH-003**: paylaşım yolu (`File.type` boş olabilir) → §10-8.

## 15. Kaynaklar (erişim: 2026-11-16)

| Kaynak | Kullanım |
|---|---|
| https://www.chromium.org/audio-video/ (ve chromium.googlesource website aynası) | Container/codec listesi, `ffmpeg_branding`/`proprietary_codecs`, AAC "Google Chrome only" |
| https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData | Tam dosya zorunluluğu, resample, hata; Baseline Nisan 2021 |
| Web Audio API spec (MDN'deki spec linki) | decodeAudioData girdisi = ArrayBuffer (MIME yok) |
| https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Containers + /Audio_codecs | Uzantı/codec/container ayrımı, .opus gerçekte Ogg, MIME listeleri, ADTS/AMR notları |
| https://developers.facebook.com/docs/whatsapp/cloud-api/messages/audio-messages | WhatsApp ses formatları: OGG+OPUS ses notu (mono), AAC/AMR/MP3/M4A, 16 MB, MIME hata notu |
| en.wikipedia.org/wiki/Opus_(audio_format) (ikincil) | WhatsApp 2016'dan beri Opus; Android 9 `.opus` tanınmaz |
| https://mediabunny.dev/ + /guide/supported-formats-and-codecs | MPL-2.0, container/codec matrisi, WebCodecs bağımlılığı, `canDecode`, vendor benchmark |
| https://developer.mozilla.org/en-US/docs/Web/API/WebCodecs_API/Using_the_WebCodecs_API + /Codec_selection | AudioDecoder akışı, demux bağımlılığı, Mediabunny örneği |
| https://www.w3.org/TR/webcodecs-codec-registry | Ses codec string'leri (flac/mp3/mp4a.*/opus); destek uygulamaya bağlı (non-normative) |
| webcodecsfundamentals.org codec tablosu (üçüncü taraf, telemetri) | WebCodecs decode oranları (≈%96–97 oturum) — **ikincil, kabul kriteri değil** |

---
by cerenkurucu · Built with AI assistance · SHHH-005 araştırma turu — commit/push/Issue kapatma yok; codec testi çalıştırılmadı, paket/model indirilmedi
