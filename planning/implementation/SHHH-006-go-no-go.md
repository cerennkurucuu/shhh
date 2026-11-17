# SHHH-006 — Teknik risk değerlendirmesi ve GO/NO-GO kararı

Tarih: 2026-11-16 · Bağlı Issue: [cerennkurucuu/shhh#14](https://github.com/cerennkurucuu/shhh/issues/14) · Yerel kayıt: `planning/issues/SHHH-006.md`
Kaynaklar: SHHH-002/003/004/005 raporları + docs/01,02,03,07,08,09 + mevcut taslak Issue'lar (SHHH-007…048).
Durum: **Önerilen kararlar Ceren Kurucu onayına açıktır; bu rapor nihai onay VERMEZ.** Uygulama kodu yazılmadı; yeni bağımlılık indirilmedi; commit/push/Issue kapatma yok. Hiçbir cihaz/tarayıcı/model testi bu turda çalıştırılmadı; ölçülmeyen hiçbir sonuç "başarılı" sunulmaz.

---

## 1. Üç karar (öneri)

| # | Karar | Sonuç | Dayanak |
|---|---|---|---|
| **K1** | **Yerel geliştirmeye (SHHH-007 Angular iskeleti dahil)** | **GO** | SHHH-002 teknoloji zinciri yerelde çalıştırılarak doğrulandı (tsc/ng/vitest zinciri, ERESOLVE/EBADENGINE negatif testleri, npm audit 0 açık); mimari docs/03 backend'siz; paylaşıma/koda bağımlı riskler prototipte ölçeceğimiz şeylerdir. Şartlar §5.1. |
| **K2** | **Android WhatsApp paylaşımına (share_target)** | **ŞU AN NO-GO** | Sıfır-bayt kanıtı yok: installability'de SW zorunlu değil, POST fallback `pages.github.com`'da 405'e çarptı (405 ≠ 0 bayt), gerçek cihaz proxy/netlog kanıtı üretilmedi (SHHH-003 §3/§5). Şartname+rehber kaynaklı P0 gizlilik riski. Koşullu yeniden değerlendirme: SHHH-045 (T14) S1–S3/S9'da 0 bayt + SHHH-040 (T15). |
| **K3** | **Halka açık yayına (GitHub Pages)** | **ŞU AN NO-GO** | Aşağıdaki P0 kapıları açıktır: T01 codec cihaz kanıtı, T08 Türkçe WER, T14/T15 ağ sızıntısı, T18 bellek/termal, lisans/notice envanteri (SHHH-042), final kontrol (SHHH-048). docs/08: "P0 gizlilik, veri bütünlüğü, temizleme veya lisans hatası yayını engeller"; docs/01: sayısal eşikler ölçümle Ceren Kurucu tarafından kesinleştirilir. **Share kapalı, manuel-picker'lı yayın varyantı** ayrı ve daha düşük kapıya sahiptir (docs/08 son cümle) — o da ancak T01/T08/T15/T18 + lisans kapısı geçilirse ve Ceren onayıyla değerlendirilir. |

**SHHH-007'ye güvenle başlanır mı? → EVET (K1 = GO).** SHHH-007 §6 bağımlılığı (SHHH-006 kanıt üretmeli) bu raporla karşılanır. Şartlar §5.1'de; özellikle `.gitignore` `/package-lock.json` engeli kurulum turunda kaldırılacak (SHHH-002 §7 tespiti, SHHH-042 §4 ile eşleşir).

---

## 2. Risk değerlendirme tablosu (görev maddesi 2–3)

Ölçek: Olasılık Düşük/Orta/Yüksek · Etki Kritik(P0)/Yüksek/Orta · Kanıt düzeyi: `Kaynak` = resmî metin 2026-11-16 · `Prob` = yerel gerçek istek/çalıştırma · `Ölçüm` = cihaz testi (**hepsinde yok**) · Yayın engeli: EVET = v1.0'un tamamını, **Koşul** = yalnız yayın varyantını bağlar.

| # | Risk | Olasılık | Etki | Kanıt düzeyi | Azaltım (mevcut karar) | Sonraki test Issue'su | Yayın engeli |
|---|---|---|---|---|---|---|---|
| **R1** | **Android Web Share Target ve veri sızıntısı** — SW yok/bozuk/ilk yüklemede dosyalı POST ağ fallback'ine düşer; GitHub Pages log davranışı bilinmiyor | **Yüksek** | **Kritik (P0 gizlilik)** | Kaynak (W3C ED + Chrome/MDN + web.dev install-criteria) + Prob (405); **Ölçüm yok** | `share_target` manifest'te **yok** (SHHH-003 §4.1); varsayılan manuel picker (R01); açılışta runtime gate (SHHH-003 §4.3); deny-by-default SW handler tasarımı zorunlu | **SHHH-045** (T14, S1–S12) + **SHHH-040** (T15); tasarım: SHHH-009/010/011 | **EVET** (paylaşım için) — kanıt yoksa share açılmaz; manuel-picker prototipi/yayın varyantını **engellemez** |
| **R2** | **Whisper Tiny Türkçe doğruluğu** — `tiny` çok dilli ama Türkçe WER ölçülmedi; aksan/gürültü düşüşü | **Orta–Yüksek** | **Kritik** (kamu metni doğruluk iddiası + R04) | Kaynak (multilingual + `tr` tokenizer + upstream "x2–3 RT" iddiası); **WER Ölçümü yok** | Başlangıç `ggml-tiny.bin` çok dilli (SHHH-004 §7); kaçış: `base` veya `tiny-q5_1` **ölçüm sonrası**; metinde doğruluk garantisi yok, sınırlama raporu zorunlu (T08, R12) | **SHHH-024** (T08 WER/CER/no-speech) + **SHHH-019** (model pin) + **SHHH-022** (dil) | **EVET** — WER ölçümü + Ceren onaylı eşik yoksa v1.0 yayınlanmaz (şu an eşik **yoktur**) |
| **R3** | **WASM bellek, CPU ve termal sınırlar** — `INITIAL_MEMORY=512MB` + PCM + model (~273 MB native atıf); düşük-RAM Android OOM/kill; termal throttle RTF'yi bozar; GH Pages'te COOP/COEP yok → tek iplik | **Orta** | **Kritik** (OOM = veri/kayıp + arayüz kill) | Kaynak (whisper.cpp README/CMake + GH Pages header probu + GitHub discussion); **cihaz Ölçümü yok** | tiny varsayılan; tek iplik fallback; 20–30 sn segment + bounded decode (docs/03); tek ağır iş kilidi; hidden→paused; başarısızlıkta q5_1'e düşüş planı | **SHHH-046** (T18: peak RAM/RTF/termal, 3 tekrar) + **SHHH-021** (Worker) + **SHHH-029** (pause) + **SHHH-017** (buffer) | **EVET** — 50 MB/20 dk dahil sayısal limitler ancak T18 ölçümüyle kararlaştırılır (docs/08 Performans kapıları) |
| **R4** | **Ses formatları ve decoder uyumluluğu** — AAC yalnız Google Chrome (markasız Chromium yok); ADTS/AMR belirsiz; `decodeAudioData` desteği cihaza bağlı; yanlış uzantı/bozuk header | **Orta** | **Yüksek** (ret UX + destek genişliği; bozuk dosya işleme = veri bütünlüğü) | Kaynak (Chromium codec matrisi, MDN, Meta) + SHHH-005 matrisi; **decode Ölçümü yok** | sniff (imza) + decode denemesi boru hattı; güvenli ret mesajları (SHHH-005 §9, docs/07 kodları); AMR "desteklenmiyor" say; A→C (Mediabunny, MPL-2.0) koşullu kaçış; gerçek Chrome hedefi (markasız Chromium ≠ üretim, docs/07) | T01/T02 → **SHHH-013**/**SHHH-014** (uygulama) + **SHHH-043** (birim) + **SHHH-044** (E2E) + gerçek Android varyantı **SHHH-045** oturumuna (§6) | **Koşul** — T01 negatifleri (0 bayt, sahte header, yanlış MIME, büyük boyut, eksik track) geçmeden SHHH-048 kapanmaz |
| **R5** | **Decode işleminin iptali ve arka plan davranışı** — `decodeAudioData` Window bağlamında ve **iptal edilemez**; hidden→paused decode çağrısına sonra uygulanır; tam dosya zorunlu | **Yüksek** (yapısal) | **Yüksek** (iptal/kesinti sözleşmesi + R06 + bellek) | Kaynak (Web Audio spec/MDN: tam dosya, abort API'si yok; docs/03 durum makinesi); SHHH-004 §4 katmanları **yalnız inference içindir** | §4 düzeltmeleri: decode öncesi tüm ön kontroller; decode başlarsa sonuç **commit edilmez**; uzun/sorunlu decode'da MediaElement+B yolu (pause = iptal edilebilir) T18 sonrası değerlendirilir; whisper worker abort/terminate ayrı katman | **SHHH-021** (worker iptal) + **SHHH-029** (hidden/pause) + **SHHH-015/016** (segment) + **SHHH-046** (uzun decode ölçümü) | **Koşul** — iptal/hata cleanup yolları T06/T10/T13'te test edilmeden SHHH-048 kapanmaz |
| **R6** | **Lisanslar, ücretsiz kullanım ve hosting** — MPL-2.0 dosya-bazlı (Mediabunny, henüz eklenmedi); `.gitignore` lockfile engeli; transitif/advisory sürümü tarihli; GitHub Pages kotası | **Düşük** (Mevcut set MIT/Apache/MPL + audit 0) | **Kritik** (lisans hatası P0) | Kaynak + Prob (npm audit 0/189, 2026-11-16; GitHub Pages limits OK; LICENSE metinleri okundu); depo lockfile **henüz yok** | Ek paket yok; lockfile izlenecek + `.gitignore` düzeltmesi SHHH-007/042'de; Mediabunny **eklenirse** MPL notice docs/09'a; bağımlılık envanteri | **SHHH-042** (tedarik zinciri/notice/advisory) + **SHHH-019/020** (model hash) + **SHHH-048** (final kapı) | **EVET** — çözülmemiş kritik advisory veya eksik lisans kaydı SHHH-048'de NO-GO sebebi |

Kabul eşiği (Issue §3): her risk için "kabul" = ilgili sonraki test Issue'sunun kriterlerini geçmek; **şu an hiçbirinin geçtiği iddia edilmez.**

---

## 3. SHHH-005'teki üç tasarım probleminin düzeltilmesi (görev maddesi 4)

> Bu bölüm, SHHH-005 raporundaki ilgili ifadeleri **aşağıda belirtilen şekliyle değiştirir**; SHHH-005 dosyası silinmedi/yeniden yazılmadı (kural gereği).

**D-1 — Decode, Worker'da değildir ve iptal edilemez.**
SHHH-005 §11-6 "A yolunda decode Worker içinde; iptal = terminate" ifadesi **geçersizdir.** `AudioContext`/`OfflineAudioContext` ve `decodeAudioData` **Window ana bağlamındadır**; Worker içinde `AudioContext` oluşturulmaz.
Doğrusu:
1. Kullanıcı iptali **yalnız decode çağrısından ÖNCE** garanti altındadır (boyut/imza/süre ön kontrolları tamamlanır → `aborted` durumuna hiç girilmez).
2. Decode başladıktan sonra durdurma API'si **yoktur** → tek davranış: promise sonucu **atmak** (sonuç commit edilmez, kaynaklar `finally`'de serbest bırakılır; docs/03 "yarım segment commit edilmez" ile uyumlu). `Worker.terminate()` yalnız **whisper inference worker'ı** içindir (SHHH-004 §4 katman 2), decode için bir iptal mekanizması sunmaz.
3. `hidden → paused` (T10/SHHH-029) decode'ın ortasına uygulanamaz; arka plan davranışı = decode bitene kadar bekleme + UI'da "iptal edilemez pencere" bilgisi. Uzun/sorunlu decode ölçümü (T18) çıkarsa SHHH-005 §6-B yolu (MediaElement + AudioWorklet; `element.pause()` **iptal edilebilir**) alternatif olarak değerlendirilir — ama gerçek zaman üstü olmadığı için v1 varsayılanı değildir.

**D-2 — Tepe RAM yalnız son 16 kHz AudioBuffer'a eşit değildir.**
SHHH-005 §5 hesabı tek katmandır. Doğru bütçe (hepsi aritmetik **üst sınır tahmini**, ölçüm T18'de):

| Faz | Bileşenler (16 kHz hattı, 20 dk için) | Tahmini |
|---|---|---|
| Decode fazı (Window) | sıkıştırılmış dosya baytları (≤50 MB, elde) + kaynak örneklemde geçici PCM (48 kHz f32 stereo'ya kadar çıkabilir: ~460 MiB'e kadar anlık) + çıktı 16 kHz f32 (~73 MiB) | **Dosya + (geçici kaynak PCM) + ~73 MiB** — geçici kaynak boyutu codec/orneklem kanalına bağlı, hesapla kesinleşmez |
| Inference fazı | WASM `INITIAL_MEMORY=512MB` (büyür) + model ~74 MiB + aktif segment PCM (20–30 sn @16k f32 ≈ 1,3–1,9 MiB) + checkpoint/IDB | **≈ 512 MiB + 74 MiB + küçük tamponlar** (upstream/native atıflı) |
| Örtüşme | decode ile model yüklemesi/NASIL çakışırsa toplam artar (docs/03: "sadece bir ağır AI işi, sınırlı decode prefetch") | fazları **seriştirme** zorunlu |

Sonuç: 50 MB/20 dk ön limitleri **ölçülmemiş** bellek güvenliği değildir; nihai eşik T18'de ölçülür; bütçe aşılırsa (a) limit düşürülür, (b) A→C (Mediabunny bounded) geçilir (docs/03 kuyruk/bellek maddesi ile birebir).

**D-3 — Tamamen sessiz ama geçerli dosya `invalid-file` DEĞİLDİR.**
SHHH-005 §8.1-F5 "tüm kanal örnekleri sıfır → invalid-file" ifadesi **yanlıştır** ve silinmiştir. Ayrım:

| Durum | Sınıf | Karar |
|---|---|---|
| 0 bayt, tanınmayan imza, bozuk header, decode reddi, ses track yok | **Geçersiz dosya** | `invalid-file` (erken ret, §8.1 F0–F4 kalır) |
| Decode reddi ama container biliniyor | Codec | `unsupported-codec` |
| Decode başarılı, süre > 0, ses enerjisi çok düşük/sıfır (sessizlik, müzik yok, konuşma yok) | **Geçerli dosya — içerik sonucu** | **no-speech**: kullanıcıya anlaşılır mesaj ("bu kayıtta konuşma bulunamadı"), oturum/temizleme bozulmaz, `invalid-file` DEĞİL (docs/08 T08 "no-speech oranı"; **SHHH-018** sahibi) |
| Decode başarılı ama transcript üretilemedi (düşük güven) | İçerik sonucu | SHHH-018/024 low-confidence yolu; sahte doğruluk yüzdesi yok (R07) |

---

## 4. Önerilen ilk prototip mimarisi (görev maddesi 7 — kesinleştirilmiş)

| Karar | Seçim | Dayanak |
|---|---|---|
| Uygulama | **Angular 22.2.6 + strict TypeScript 6.0.3**, npm 10.5.0, `package-lock.json` Git'de | SHHH-002 §2/§3/§7 |
| Backend | **Yok** — statik GitHub Pages (ücretsiz, 1 GB/100 GB-ay/yumuşak) | docs/03 bileşenler; SHHH-002 §8 |
| Model | **Yerel whisper.cpp v1.9.5 (`d1be6fd`) WASM, `ggml-tiny.bin` çok dilli**, SHA-256 `be07e048…c6e1b21` sabitlemeli (indirme/hash SHHH-019/020'de) | SHHH-004 §2.1/§7 |
| Giriş yolu | **Yalnız manuel dosya seçimi** (R01); `share_target` manifest'te **yok** (K2 NO-GO) | SHHH-003 §4.1; docs/01 gizlilik |
| Gizlilik | Ses/metin/transkript **hiçbir fetch body/query/log'a girmez**; ağ allowlist = model indirmesi + statik asset; SHHH-040 sentinel kanıtı yayın kapısı | docs/01/02 R14; docs/08 T15 |
| Bellek | Ön limitler (50 MB/20 dk, tam okumadan byte sınırı) → sniff → `decodeAudioData` (16 kHz OfflineAudioContext) → 20–30 sn segment → tek ağır iş Worker; fazlar seri; bütçe T18'de ölçülür; aşarsa limit/A→C | docs/03 veri akışı+kuyruk; §3-D2 |
| Hata | F0–F6 boru hattı, docs/07 kodları (`invalid-file`/`unsupported-codec`/`quota`/`network`/`worker-crash`), Türkçe mesajlar (SHHH-005 §9, D-3 ile güncelli) | docs/07/PRD R12 |
| İptal/arka plan | Ön kontroller → decode iptal edilemez (D-1) → sonuç atma; inference: whisper.h abort callback + `Worker.terminate()`; `visibilitychange` → paused + checkpoint; `finally` ile context/worker temizliği | SHHH-004 §4; docs/03 durum makinesi |
| Thread | **Tek iplik WASM** (GH Pages COOP/COEP yok); SIMD feature-detect zorunlu; coi-SW **v1'de yok** (SHH çakışması) | SHHH-004 §3 |
| Test altyapısı | Vitest 5.1.0 + Playwright 1.65.1 (masaüstü; cihaz kanıtı SHHH-045) | SHHH-002 §2; docs/08 katmanlar |

---

## 5. Karar gerekçeleri ve şartlar

### 5.1 K1 = GO — yerel geliştirme şartları (SHHH-007 bu şartlarla başlar)
1. Backend/bulut inference yok; ağ yalnız npm registry + (ileride) model indirmesi.
2. `package-lock.json` izlenecek; `.gitignore`'daki `/package-lock.json` satırı **kurulum turunda kaldırılır** (SHHH-002 §7, SHHH-042 §4).
3. `share_target` manifest'e **eklenmez**; manuel picker tek giriş (K2 bağlayıcı).
4. Doğrulanmamış performans/ER iddiası kod yorumuna/README'ye yazılmaz; sayısal limitler T18'e bağlanır.
5. Kurulum sonrası `npm audit` + `ng build` + `tsc` + `vitest` temiz (SHHH-007 kabul kriterleri).

### 5.2 K2 = NO-GO — Android paylaşım kapalı kalır; kapanma koşulu
SHHH-045'te S1–S3/S9 (+S4 negatif kanıt) proxy capture + netlog ile **0 ses baytı** → paylaşıma yeniden değerlendirilir; tasarım şartları SHHH-003 §4 (deny-by-default, query'ye dosya yok, gate). **Kanal testi olmadan manifest'e eklenemez.**

### 5.3 K3 = NO-GO — yayın; iki varyant
- **Varyant A (paylaşımlı):** K2 GO olduktan sonra anlamlı.
- **Varyant B (manuel picker):** SHHH-048 kapıları — T01 negatifleri, T08 WER+eşik onayı, T15 ağ, T18 bellek/limitler, SHHH-042 lisans/notice, T13 temizleme, T16/T17 erişilebilirlik — geçince ve **Ceren Kurucu onayıyla** değerlendirilebilir. Paylaşımdan bağımsızdır.
Nihai yayın/onay kararı münhasıran Ceren Kurucu'ya aittir (docs/01/PRD DoD); bu rapor onay **vermez**.

---

## 6. Kalan ölçümler → mevcut Issue eşlemesi (görev maddesi 8; YENİ Issue OLUŞTURULMADI)

| Kalan ölçüm / kanıt | Test kimliği | Mevcut Issue |
|---|---|---|
| Türkçe/İngilizce WER/CER, no-speech oranı, gürültü/müzik | T08 | **SHHH-024** (fixture seti + lisans notu: SHHH-004 §6.1; birim tarafı SHHH-043) |
| Peak RAM, RTF, termal, cold/warm model yükleme, 50 MB/20 dk bütçesi | T18 | **SHHH-046** (protokol: SHHH-004 §6.2, 3 tekrar) |
| Gerçek Android WhatsApp paylaşım + 0 bayt | T14 | **SHHH-045** (S1–S12, SHHH-003 §5) |
| Ağ allowlist, sentinel sızıntı, log/URL/cache | T15 | **SHHH-040** (+SHHH-038 CSP/allowlist) |
| Codec/container gerçek cihaz matrisi (SHHH-005 §10 kombinasyonları: AAC marka, ADTS, AMR, sahte uzantı) | T01/T02 | Uygulama: **SHHH-013/014**; birim: **SHHH-043**; masaüstü E2E: **SHHH-044**; gerçek Android varyantı: **SHHH-045** oturumuna ek senaryo (§7-a; yeni Issue yok) |
| Model hash/indirme/kesinti/önbellek | T05 | **SHHH-019/020** (+SHHH-042 envanteri) |
| Worker iptal/OOM/stale result, tek ağır iş | T06 | **SHHH-021** (+SHHH-027 kuyruk) |
| Görünürlük/pause/checkpoint | T09/T10 | **SHHH-026**, **SHHH-029** |
| Temizleme/TTL/quota | T12/T13 | **SHHH-030** (+SHHH-040 geri okuma) |
| Lisans/notice/advisory | — | **SHHH-042** (+docs/09 Mediabunny satır güncellemesi) |
| Final GO/NO-GO paketi | — | **SHHH-048** (bu rapor girdisidir) |

**Gerekçelenen boşluk (yeni Issue açılmadı):** gerçek Android'de codec matrisi için ayrı Issue yoktur; SHHH-045 kanıt oturumuna varyant olarak eklenmesi **önerilir** — ek Issue açıp açmama kararı Ceren Kurucu'ya aittir.

---

## 7. Kabul kriterleri durumu (Issue #14 / SHHH-006 §4)

| Kriter | Durum | Kanıt |
|---|---|---|
| SHHH-002–005 kanıtları değerlendirildi | **Tamam** | §2 tablosu her satırda kanıt düzeyiyle atıf yapar |
| Çözülmeyen P0 yayın engeli | **Tamam** | §1 K3 + §2 "Yayın engeli" sütunu: R1/T14-T15, R2/T08, R3/T18, R6/SHHH-042 **açık**; R4/R5 **koşul** |
| Karar ve gerekçe Ceren Kurucu onayına hazır | **Tamam** | §1–§5; onay **verilmedi** (açık belirtildi) |
| Başarı/hata/iptal/kesinti kapsam incelendi; gerekçeli | **Tamam** | §8 |
| Gereksinim/test kanıtları izlenebilir; ölçülmemiş başarı yok | **Tamam** | §6 + §9; tüm risklerde "Ölçüm yok" açık |
| (DoD) Pozitif/negatif senaryo sonuçları | **Kısmi** | Kararlar (pozitif) + NO-GO engelleri (negatif) kayıtlı; gerçek cihaz sonucu **yok** — gerekçe: kapsam araştırmadır, cihaz ölçümü SHHH-045/046'ya devrolundu |
| (DoD) Bağımlılıklar/veri/lisans/ağ riskleri | **Tamam** | §2 R1/R6, §5 |
| (DoD) İncelemeye hazır; commit/push/kapatma yok | **Tamam** | `git status`: yalnız `planning/implementation/` untracked; önceki raporlar değişmedi |

---

## 8. Başarı / hata / iptal / kesinti kapsam eşlemesi (kabul kriteri 4)

| Davranış | Kapsam | Uygulanmayan dalın gerekçesi |
|---|---|---|
| Başarı | 3 karar + 6 risk + 3 SHHH-005 düzeltmesi + mimari + Issue eşlemesi | Cihaz başarısı: T01/T08/T14/T15/T18 henüz yapılmadı (§6'ya devredildi) |
| Hata | P0 engeller (0 bayt kanıtı yok, WER yok, RAM ölçümü yok, lisans envanteri açık) NO-GO gerekçesi; 405 probu "reddedildi ama gövde" olarak doğru yorumlandı | Gerçek cihaz hata çıktısı yok |
| İptal | K2 share kapalı (üretim kararı öncesi iptal edilebilir özellik); decode iptal edilemezliği D-1 ile tasarım kararına bağlandı | Gerçek iptal testi T06/T10 (SHHH-021/029) |
| Kesinti | Model indirme kesintisi (T05/SHHH-020), OOM/kill (T18/SHHH-046), SW install yarışı (T14/S12) kapsandı | Uygulama katmanı testleri SHHH-007+ |

---

## 9. İzlenebilirlik

- **Issue #14 kabul kriterleri** → §7; negatif senaryo "Ağ sızıntısı veya uygunsuz lisans NO-GO" → R1/R6 (K2, K3 NO-GO); "model cihaz testleri eksikse kesin GO verilemez" → K3 NO-GO + §1 notu.
- **PRD R01** (docs/02: "güvenlik kanıtı yoksa paylaşım kapalı") → K2; **R02** → SHHH-005/R4; **R03** → mimari satır 4; **R12** → §4 hata satırı; **ön limit** → §3-D2/§4 bellek satırı.
- **docs/01** ("gerçek Android ağ güvenliği testleri geçmeden v1 yayınlanmaz") → K3; **Gizlilik maddesi** → K2 gerekçesi.
- **docs/08** Performans/yayın kapıları → R2/R3 engelleri; "Sayısal limitler SHHH-004/006 sonucunda kararlaştırılır" → §5.1-4/5 (bu rapor limit **vermez**, T18'e bağlar).
- **docs/03** ("Native Web Audio yeterliyse ek decoder yok; Mediabunny lisans kanıtı sonrası") → §4 + SHHH-005 §7; "decoder tüm dosyayı RAM'e alıyorsa daha düşük limit veya alternatif kararı gerekir" → §3-D2.
- **SHHH-002 §7** (.gitignore) → §5.1-2, SHHH-042.

## 10. Açık noktalar (Ceren Kurucu kararı)

1. Üç kararın (K1/K2/K3) nihai onayı.
2. Türkçe WER kabul eşiği (şu an **yok**; SHHH-024'te tanımlanacak).
3. `.gitignore` lockfile düzeltmesi (SHHH-007 içinde uygulanacak).
4. Codec matrisi için ayrı Issue açılıp açılmaması (§6 boşluk).
5. Yayın varyantı B'nin (paylaşımsız) önceliklendirilmesi.

## 11. Kaynaklar

Yerel: `planning/implementation/SHHH-002…005-*.md`; `docs/01,02,03,07,08,09`; `planning/issues/SHHH-007,013,014,018,024,040,042,045,046,048,INDEX`.
Web (2026-11-16, önceki turlarda erişildi): GitHub Issue #14; chromium.org/audio-video; MDN decodeAudioData/Containers; W3C Web Share Target ED; web.dev install-criteria; Meta WhatsApp audio-messages; mediabunny.dev (+MPL-2.0); whisper.cpp README/models/whisper.h/whisper.wasm; GitHub Pages limits.

---
by cerenkurucu · Built with AI assistance · SHHH-006 karar raporu — nihai onay Ceren Kurucu'ya aittir; commit/push/Issue kapatma yok; test çalıştırılmadı
