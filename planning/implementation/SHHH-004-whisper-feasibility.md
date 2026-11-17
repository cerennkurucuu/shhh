# SHHH-004 — Whisper Tiny/Base çok dilli model fizibilitesi

Tarih: 2026-11-16 · Bağlı Issue: [cerennkurucuu/shhh#12](https://github.com/cerennkurucuu/shhh/issues/12) · Yerel kayıt: `planning/issues/SHHH-004.md` (bkş. ilgili belgeler)
Durum: **Araştırma + yerel ağ doğrulaması tamamlandı. Model İNDİRİLMEDİ, tarayıcıda veya Android cihazda ÇALIŞTIRILMADI; hız/RAM/WER ölçülmedi.**
Önceki raporlar korunur: `SHHH-002-technology-matrix.md`, `SHHH-003-share-target-feasibility.md` (değiştirilmedi).

---

## 1. Karar tablosu (özet)

| Soru | Karar | Kanıt durumu |
|---|---|---|
| Başlangıç modeli | **`tiny` çok dilli (`ggml-tiny.bin`)** — v1.0 ilk kurulum ve ölçüm adayı | Dosya/bellek/ticari olmayan ölçütler kaynaklı; Türkçe doğruluk **ölçülmedi** (gate §9) |
| Base rolü | İkinci aşama adayı; yalnız Türkçe WER hedefi tutmazsa ve cihaz ölçümü elverişliyse | Ölçüm kapıya bağlı |
| `.en` modelleri (tiny.en/base.en) | **Kesinlikle Türkçe adayı değil** — resmî olarak İngilizce-özel | whisper.cpp `models/README.md`: "Models are multilingual unless the model name includes `.en`" |
| Çoklu iş parçacığı (WASM pthreads) | Varsayılan değil; GitHub Pages'te **COOP/COEP header'ı kurulamadığı için** `SharedArrayBuffer` kapalı → tek iplik fallback plana alındı | Yerel header probu + resmî olmayan/försat talebi kaynakları §5 |
| SIMD | Zorunlu altyapı; upstream WASM portu SIMD128 kullanır → tarayıcıda feature-detect zorunlu | whisper.wasm README |
| Kuantizasyon (q5_1) | Opsiyonel indirme/bellek optimizasyonu; doğruluk etkisi ölçülmeden kullanılmaz | Boyutlar HF API + HEAD ile doğrulandı |
| Nihai "cihaz sınıfına göre" karar | Ölçüm sonrası (§8 matrisi); bu rapor **başlangıç** önerisidir | Kabul kriteri 2 ile uyumlu |

---

## 2. Tiny vs Base karşılaştırması (resmî kaynaklar + yerel HEAD probu, 2026-11-16)

### 2.1 Dosya boyutları ve hash'ler (yerel doğrulama)

HF API (`https://huggingface.co/api/models/ggerganov/whisper.cpp/tree/main`) listesi ve dosya başlıkları üzerine **gövde indirmeden** `Invoke-WebRequest -Method Head` ile doğrulanan gerçek `Content-Length`/`ETag`:

| Dosya | Content-Length (HEAD) | HF API boyutu | İçerik SHA-256 (HF API `lfs.oid`) | ETag (HEAD = API `xetHash`) |
|---|---|---|---|---|
| `ggml-tiny.bin` | **77.691.713 B ≈ 74,1 MiB** | birebir aynı | `be07e048e1e599ad46341c8d2a135645097a538221678b7acdd1b1919c6e1b21` | `518970a29bedb265…61243acf3` |
| `ggml-base.bin` | **147.951.465 B ≈ 141,1 MiB** | birebir aynı | `60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe` | `2f62d18b50c3f3fe…de2e374` |
| `ggml-tiny-q5_1.bin` | **32.152.673 B ≈ 30,7 MiB** | birebir aynı | `818710568da3ca15689e31a743197b520007872ff9576237bda97bd1b469c3d7` | `3e8822ab7e529860…e17036794d3` |
| `ggml-base-q5_1.bin` | **59.707.625 B ≈ 56,9 MiB** | birebir aynı | `422f1ae452ade6f30a004d7e5c6a43195e4433bc370bf23fac9cc591f01a8898` | `1472da3b8dde27b9…45fba2efe` |

- Resmî tablo (whisper.cpp `models/README.md`): tiny 75 MiB / base 142 MiB — HEAD değerleriyle tutarlı (yuvarlama farkı).
- Boyut oranı: **base ≈ tiny'in ~1,9 katı** (hem tam hem q5_1'de ~1,86×).
- Kuantize alternatifler: HF'de tiny/base için yalnız `q5_1` ve `q8_0` var (`q5_0` yok — API listesi).
- Bu turda **hiçbir dosya gövdesi indirilmedi** (yalnız HEAD + API).

### 2.2 Bellek gereksinimleri

| Kaynak | tiny | base | Not |
|---|---|---|---|
| whisper.cpp README "Memory usage" tablosu (native) | disk 75 MiB, **~273 MB RAM** | disk 142 MiB, **~388 MB RAM** | Upstream'in native ölçümü; **bizim ölçümüz değil**, cihaz/koşul belirtilmemiş |
| whisper.wasm CMake link bayrakları | `-s INITIAL_MEMORY=512MB -s MAXIMUM_MEMORY=2000MB -s ALLOW_MEMORY_GROWTH=1` | aynı | WASM hattı için resmî derleme parametresi (her iki modelde aynı modül ayarı) |

Yorum: WASM başlangıç tahsisi 512 MB'tır; küçük RAM'li Android'de bu, sayfa/OOM riskini artırır (§7). Ayni anda decoder PCM, segment kopyaları ve model tamponu eklenir (docs/03: "sadece bir ağır AI işi, sınırlı decode prefetch").

### 2.3 Türkçe ve çok dilli destek (resmî doğrulama)

- whisper.cpp `models/README.md`: **"Models are multilingual unless the model name includes `.en`."** → `tiny` ve `base` çok dilli; `tiny.en`/`base.en` yalnız İngilizce.
- openai/whisper `whisper/tokenizer.py` (yerel fetch, 2026-11-16): **`"tr": "turkish"`** → Türkçe, modelin dil listesinde (99 dil arasında).
- whisper.wasm demo `index-tmpl.html`: dil seçici (`document.getElementById("language").value`) — çok dilli modelde çalışır.
- **Negatif kriter (Issue §5):** `.en` modeli Türkçe adayı olarak SEÇİLMEMELİ; bu raporda `.en` yalnızca karşılaştırma referansıdır, aday değildir.

### 2.4 WASM uyumluluğu (upstream kanıtı)

- whisper.cpp README platform listesinde **`[x] WebAssembly`**; örnek: `examples/whisper.wasm`.
- whisper.wasm README (resmî):
  - "The audio data does not leave your computer — it is processed locally."
  - **Upstream performans iddiası:** "x2 or x3 real-time for the `tiny` and `base` models on a modern CPU and browser" — **upstream'in iddiasıdır; Android cihazda ölçülmedi, kabul kriteri olarak kullanılamaz.**
  - "The example is capable of running all models up to size `small` inclusive." → tiny/base bu sınırın içinde.
  - "WASM SIMD 128-bit intrinsics" zorunlu; tarayıcı desteği kontrol edilmeli.
  - Örnekte ses süresi üst sınırı **120 sn**; örnek yalnız **Greedy** sampling destekler.
  - `tiny` modeli "74MB" — HEAD ölçümümüzle tutarlı.
- Derleme: `emcmake cmake ..` (Emscripten); `WHISPER_WASM_SINGLE_FILE` opsiyonel; `coi-serviceworker.js` örneğe dahil (§5).

---

## 3. İş parçacığı / SIMD / çoklu iş parçacığı seçenekleri

| Seçenek | Teknik dayanak | Mobil tarayıcı gereksinimi | Karar |
|---|---|---|---|
| **SIMD128** | Upstream WASM portu SIMD128 intrinsics kullanır (whisper.wasm README); `system_info` çıktısında `WASM_SIMD` bayrağı görünür | SIMD destekli tarayıcı (modern Chrome Android); çalışma zamanında feature-detect | **Zorunlu**; detect başarısızsa desteklenmeyen tarayıcı reddi (uygun UI hatası) |
| **Çoklu iş parçacığı (pthread)** | whisper.wasm CMake: `-s USE_PTHREADS=1 -s PTHREAD_POOL_SIZE_STRICT=0`; demo iş parçacığı sürgüsü 1–16 (varsayılan 8) | `SharedArrayBuffer` → sayfa **cross-origin isolated** olmalı → `Cross-Origin-Opener-Policy: same-origin` + `Cross-Origin-Embedder-Policy: require-corp` **HTTP header'ları** (Chrome Android 88+; web.dev/MDN) | **GitHub Pages'te header kurulamıyor** (aşağıda) → varsayılan DEĞİL |
| **Tek iş parçacığı (fallback)** | Demo sürgüsü `min=1` → n_threads=1 upstream tarafından desteklenir; docs/03: "ihtiyaç halinde single-thread fallback cihazda test edilir" | Ek gereksinim yok | **Planlanan varsayılan**; hızı ölçümle kesinleşir |

**GitHub Pages header kanıtı (yerel prob, 2026-11-16):**
- `Invoke-WebRequest -Method Head https://pages.github.com/` → header'lar: `Access-Control-Allow-Origin: *`, `Server: ...`, `X-GitHub-Request-Id...` — **`Cross-Origin-Opener-Policy` ve `Cross-Origin-Embedder-Policy` YOK.**
- GitHub staff beyanı: community discussion #54257 → "We don't support this feature today"; discussion #13309 ("Allow setting COOP and COEP headers in Github Pages") yanıtlanmamış durumda.
- Sonuç: GitHub Pages'te `crossOriginIsolated=false` → `SharedArrayBuffer` kapalı → **pthread'li WASM build'i bu barındırmada çalışmaz.**
- Bilinen geçici çözüm: **`coi-serviceworker`** (SW ile yanıt header'larını enjekte eder) — upstream whisper.cpp deposu `examples/coi-serviceworker.js` içerir ve whisper.wasm `index-tmpl.html` bunu yükler (`<script src="coi-serviceworker.js">`). **Uyarı:** Bu, SHHH-003'teki paylaşım POST'unu koruyan SW ile **aynı origin'de ikinci bir SW yükü/farklı rol** demektir; docs/03 "iki kayıtla kontrol çakışması varsayılmaz" kuralı gereği **tek SW içinde birleştirilmesi** veya COI-SW'siz tek iplikli yayına gitmek gerekir. Karar: SHHH-005+ tasarımında; bu rapor **tek iplikli varsayılanı** önerir (daha az SW riski, SHHH-003 kapılarıyla çakışmaz).

---

## 4. Arka planda durdurma / yeniden başlatma yaklaşımı

docs/03 §Worker sözleşmesi ve §Durum makinesi ile uyumlu, whisper.cpp `include/whisper.h` (yerel fetch 2026-11-16) ile doğrulanmış katmanlar:

| Katman | Mekanizma | Kanıt / dayanak |
|---|---|---|
| **1. Nazik iptal (tercih)** | `pause/cancel` mesajı → worker ggml hesaplaması arasında `ggml_abort_callback` **false** dönüşü ve `whisper_encoder_begin_callback` "If it returns false, the computation is aborted" → mevcut segment/iş durur; yarım segment commit edilmez | whisper.h (yukarıdaki alıntılar); docs/03 §Worker sözleşmesi |
| **2. Sert iptal** | İşbirlikçi iptal mümkünse `Worker.terminate()` (docs/03: "İşbirlikçi iptal mümkün değilse Worker terminate edilip yeniden oluşturulur") → WASM lineer belleği ve worker serbest kalır | docs/03; serbest RAM miktarı **cihazda ölçülür** |
| **3. Arka plana geçiş (hidden)** | `visibilitychange` → paused (T10): ağır iş durur, checkpoint yazılır; arka planda devam **yok** | docs/03 §Durum makinesi; docs/08 T10 |
| **4. OS kill / soğuk yeniden başlatma** | Açılışta cleaning → checkpoint'ten resume (T09); model yeniden yüklenir (ModelManager, SHA-256 sonrası Cache Storage'tan aktifleşir) | docs/03 §Model ve cache; docs/08 T09/T05 |
| **5. Yeniden başlatma maliyeti** | Model yükleme süresi (soğuk/sıcak) **ölçüm planına** dahil edilir (§8); sayısal iddia yok | — |

Ek: tek ağır iş kilidi Web Locks/IDB lease (docs/03) — arka plan/ön plan geçişlerinde iki worker yarışı engellenir.

---

## 5. Risk değerlendirmesi (aşırı ısınma, yetersiz bellek, uzun süre)

| Risk | Mekanizma | Etkilenen model | Önlem / ölçüm | Sayısal iddia? |
|---|---|---|---|---|
| **Termal yavaşlama** | Uzun CPU-bound çıkarım → SoC throttling → RTF bozulması | her ikisi; base daha uzun süre yüksek yük | 3 tekrar RTF karşılaştırması (1. vs 3. tekrar farkı), cihaz sıcaklık/performans gözlemi (§8) | **YOK — ölçülmedi** |
| **Yetersiz bellek (OOM)** | WASM `INITIAL_MEMORY=512MB` + PCM + segment tamponları; Android düşük-RAM'de renderer kill | base (native ~388 MB vs tiny ~273 MB upstream tablosu) | Peak bellek ölçümü; düşük-RAM cihaz sınıfı zorunlu; başarısızlıkta tiny+q5_1'e düşüş | Yalnız upstream native sayıları (atıflı) |
| **Uzun işlem süresi** | Segment başına çıkarım; upstream "x2–3 real-time (modern CPU)" iddiası mobil için geçerli olmayabilir | base > tiny | RTF ölçümü (soğuk/sıcak, 3 tekrar); 120 sn örnek sınırı → uygulamada segment 20–30 sn (docs/03) | Upstream atıflı; **bizim ölçümümüz yok** |
| **İndirme/kota** | 75 MiB / 142 MiB kullanıcı bant genişliği; GitHub Pages 100 GB/ay yumuşak limit (SHHH-002) | base 1,9× | Model indirme kesintisi senaryosu (T05); resume/hash doğrulama | Boyutlar ölçüldü (§2.1); hız/bant ölçülmedi |
| **Doğruluk riski** | Türkçe WER tiny'de kabul edilebilirin altında olabilir; gürültü/aksan | tiny için asıl belirsizlik | T08 WER/CER kapısı (§8); gate yoksa base'e geçiş | **Ölçülmedi → garanti yok** |
| **SW/isolasyon karmaşası** | coi-serviceworker ↔ paylaşım SW'si çakışması | — | Tek SW birleştirme kararı (§3) veya tek iplik varsayılan | SHHH-003 bulgularıyla aynı |

---

## 6. Gerçek Android testleri için ölçüm planı (kısa TR/EN sesler)

Bu plan **tekrar edilebilir protokoldür; sonuçlar YAPILMADI** (docs/08 §Kanıt formatı: kimlik, R/Issue, fixture lisansı, önkoşul, adımlar, beklenen/gerçek, cihaz/OS/tarayıcı, model hash, tarih, kanıt dosyası).

### 6.1 Fixture seti

- **10 kısa Türkçe + 10 kısa İngilizce** cümle; süre **5–15 sn**; tek konuşmacı; temiz oda koşulu (T08 grubu).
- Kaynak: izinli/açık lisanslı konuşma klipleri (ör. Common Voice CC0 başlıkları) — **lisans ve depoya alınabilirlik SHHH-008/fikri mülkiyet onayı ile**; gerçek konuşma/gizli veri YOK (docs/08 §Katmanlar).
- Her fixture: dosya adı, süre, ground-transkript, kaynak URL, **SHA-256** ile kayıtta.
- varyantlar (negatif senaryolar): hafif gürültülü TR, hızlı konuşma, boşluklu; ayrı dosya olarak işaretlenir.

### 6.2 Ölçüm matrisi (her hücre için **3 tekrar**, cold/warm ayrı)

Boyutlar: `Model ∈ {tiny, base}` × `Thread ∈ {1, (N>1 yalnız cross-origin isolation varsa)}` × `Cihaz sınıfı ∈ {düşük RAM, orta, üst}` × `Dil ∈ {tr, en}`.

| Metrik | Yöntem | Eşik/rapor |
|---|---|---|
| Doğruluk | WER + CER (ground truth'e göre) — T08 | rapor edilir; **kabul eşiği SHHH-008/T08 kararıdır** |
| Hız | RTF = çıkarım süresi / ses süresi; 1.–3. tekrar farkı (termal) | sayısal sonuç, ölçüm |
| Bellek | peak RSS/RAM: DevTools/`chrome://inspect` (WASM heap growth logu); `performance.measureUserAgentSpecificMemory()` yalnız `crossOriginIsolated` olduğunda çalışır → GitHub Pages'te **beklenen: kullanılamaz**, alternatif yöntem kayda girer | rapor edilir |
| Model yükleme | soğuk (cache temiz) vs sıcak (cache var) süre + indirme baytı (§2.1 bilinen Content-Length; gerçekleşen indirme DevTools Network'ten) | rapor edilir |
| Kararlılık | OOM/kill, sayfa yeniden yüklenme, yarım segment commit olmaması | sıfır hata zorunlu değil; hata raporlanır |

### 6.3 Negatif / sınır senaryoları (Issue §5)

1. Düşük RAM cihazda base → beklenen: ya tamamlanır ya kontrollü hata (crash değil).
2. Uzun süreli termal: 3+ ardışık dosya → RTF kayması raporlanır.
3. Model indirme kesintisi → T05 gibi yeniden başlar, hash doğrulanmadan aktifleşmez.
4. Bozuk/eksik dosya → güvenli ret (T01/T05).
5. **`.en` modeliyle Türkçe ses** → kaba/yanlış çıktı beklenir; bu, `.en`'in Türkçe adayı olmadığının kanıtı olarak **kayıtta tutulur** (negatif kontrol).
6. Yanlış dil parametresi/manuel dil → T07 kapsamı.

Her senaryoda: beklenen/gerçek, cihaz+OS+Chrome sürümü, model SHA-256 (§2.1), tarih.

---

## 7. Başlangıç önerisi ve gerekçeleri (görev maddesi 7)

**Öneri: `ggml-tiny.bin` (çok dilli) ile başla.**

Kanıtlar (hepsi kaynaklı; ölçüm içermez):
1. **Türkçe desteği kritere uygun:** `tiny` multilingual; `.en` aday değil (resmî `models/README.md` + tokenizer `tr` kaydı).
2. **İndirme:** 74,1 MiB vs 141,1 MiB — base ~1,9× (yerel HEAD probu, §2.1). V1.0 kullanıcı bant genişliği ve GitHub Pages 100 GB/ay limiti düşünüldüğünde ilk kurulumda belirgin fark.
3. **Bellek:** upstream tablosunda ~273 MB vs ~388 MB (atıflı); WASM'de 512 MB INITIAL_MEMORY ile tiny, düşük-RAM Android'de daha güvenli marj bırakır (§2.2).
4. **Upstream uyumluluk sınırı:** "models up to size `small` inclusive" — tiny/base ikisi de içinde; upstream "x2–3 real-time (tiny ve base, modern CPU)" iddiası tiny lehine riski düşürür ama **ölçülmemiştir**.
5. **Mimarî tutarlılık:** docs/03 "Model tiny/base seçimi ölçüme bağlıdır" → bu rapor **başlangıç** adayını sabitler, **nihai kararı T08/WER ölçümü**ne bağlar (kabul kriteri: "cihaz sınıfına göre karar").
6. **Kaçış yolu:** tiny Türkçe WER hedefi tutmazsa → `base` (aynı çok dilli hat); indirme/bellek kısıtı varsa → `tiny-q5_1` (30,7 MiB). Her geçiş **ölçüm sonrası**; quantize doğruluk etkisi ölçülmeden varsayılan yapılmaz.

---

## 8. Başarı / hata / iptal / kesinti kapsam eşlemesi (kabul kriteri 3)

| Davranış | Bu araştırmanın kapsamında | Uygulanmayan dalın gerekçesi |
|---|---|---|
| Başarı | §1–§3 kaynak doğrulama + §2.1 gerçek HEAD ölçümü + §6 ölçüm protokolü + §7 karar | Cihazda başarı koşuşi — uygulama/ölçüm kapsam dışı (Issue §7 "fizibilite verisini ölçülmüş gibi sunmak" yasak) |
| Hata | Model yükleme/hash reddi (T05), bozuk dosya, dil reddi, SIMD/SAB destek yoksa UI hatası tanımları (§6.3) | Gerçek hata çıktısı yok: model çalıştırılmadı |
| İptal | §4 katman 1–3 (abort_callback, terminate, hidden→paused); ölçüm protokolünde yarıda kesme + resume senaryosu planlandı | Yürütme yok |
| Kesinti | İndirme kesintisi (T05), OS kill + checkpoint (§4.4), termal (§5) | Ölçüm yok |

---

## 9. Kabul kriterleri durumu (Issue #12 / SHHH-004 §4)

| Kriter | Durum | Kanıt |
|---|---|---|
| Her model için ölçüm matrisi ve tekrar sayısı | **Tamam (plan)** | §6.2: 2 model × thread × 3 cihaz sınıfı × 2 dil, **her hücre 3 tekrar (cold/warm)**; sonuçlar toplanmadı olarak işaretli |
| Cihaz sınıfına göre karar | **Kısmi** | §7 başlangıç önerisi (tiny) + geçiş gate'leri; **nihai cihaz-sınıfı kararı ölçüm sonrası** (ölçüm bu turda kapsam dışı) |
| Ölçümsüz başarı veya performans garantisi yok | **Tamam** | Tüm sayısal değerler: (a) yerel HEAD probu (boyut), (b) resmî README (upstream atıflı), (c) "ölçülmedi" işaretli; hiçbir hız/RAM/WER sonucu iddia edilmiyor |
| Başarı/hata/iptal/kesinti kapsandı; uygulanmayan dal gerekçeli | **Tamam** | §8 |
| Gereksinim/test kanıtları izlenebilir; ölçülmeyen başarı iddiası yok | **Tamam** | §10 |
| (DoD) Pozitif/negatif senaryo sonuçları kayıtlı | **Kısmi** | Pozitif/negatif senaryolar tanımlı ve **beklenen** sonuçları yazılı (§6.3); gerçek cihaz sonuçları YOK — gerekçe: Issue §7 kapsam dışı + cihaz erişimi yok |
| (DoD) Bağımlılıklar; veri/lisans/ağ riskleri | **Tamam** | SHHH-002 bağımlılığı karşılandı (teknoloji matrisi §2 whisper.cpp v1.9.5); §5 riskler, §6.1 lisans notu |
| (DoD) Ceren Kurucu incelemesine hazır; commit/push/kapatma yok | **Tamam** | `git status`: yalnız `planning/implementation/` untracked; commit YOK |
| Negatif kriter: `.en` Türkçe adayı değil | **Tamam** | §2.3 + §6.3-5 (negatif kontrol olarak `.en` testi planlandı) |

## 10. İzlenebilirlik

- **PRD R03/R02 (docs/02):** cihazda ağır işlem, Türkçe doğruluk → SHHH-004; T08 (WER/CER), T05 (model/hash/kesinti), T10 (hidden), T09 (checkpoint), T07 (diller), T06 (Worker tek ağır iş) bu raporun §4/§6/§8 ile bağlantılı.
- **docs/03:** "whisper.cpp WASM birincil adaydır… Model tiny/base seçimi ölçüme bağlıdır" → §7 gate; "COOP/COEP, SharedArrayBuffer, WASM SIMD/threads desteği ölçülür; tek iplik fallback" → §3; worker iptal sözleşmesi → §4.
- **docs/01 §Gizlilik / SHHH-003:** ölçümün parçası olarak sesin çıkmaması T15 ile birlikte değerlendirilir; bu rapor ağ güvenliği iddiası üretmez.
- **SHHH-002 §9-3:** "Model dosyası indirilmedi; byte/SHA-256/quantization sabitlenmedi (SHHH-019)" → bu rapor **boyut ve SHA-256'yi HEAD+API ile sağladı** (§2.1); quantization kararı ve indirme SHHH-019'da kalır.
- **docs/09 §kaynaklar:** whisper.cpp (MIT) ve openai/whisper (MIT) lisansları SHHH-002'de doğrulandı; model ağırlıkları MIT.

## 11. Kaynaklar (erişim: 2026-11-16)

| Kaynak | Kullanım |
|---|---|
| https://raw.githubusercontent.com/ggml-org/whisper.cpp/master/README.md | Bellek tablosu, WASM platformu, SIMD/quantization, upstream perf iddiası |
| https://raw.githubusercontent.com/ggml-org/whisper.cpp/master/models/README.md | Multilingual/.en kuralı, resmî boyut/SHA tablosu |
| https://raw.githubusercontent.com/ggml-org/whisper.cpp/master/examples/whisper.wasm/README.md + CMakeLists.txt + index-tmpl.html | WASM: SIMD, 120 sn, greedy, `USE_PTHREADS=1`, 512MB/2000MB bellek, coi-serviceworker, thread 1–16 |
| https://huggingface.co/api/models/ggerganov/whisper.cpp/tree/main | Dosya listesi, boyut, `lfs.oid` (SHA-256) |
| `Invoke-WebRequest -Method Head` × 4 (yerel) | Gerçek Content-Length/ETag doğrulaması (gövde indirilmedi) |
| https://raw.githubusercontent.com/openai/whisper/main/whisper/tokenizer.py | `"tr": "turkish"` dil kaydı |
| https://raw.githubusercontent.com/ggml-org/whisper.cpp/master/include/whisper.h | `ggml_abort_callback`, `whisper_encoder_begin_callback` (iptal katmanı) |
| https://web.dev/articles/coop-coep + https://developer.chrome.com/blog/enabling-shared-array-buffer + MDN `SharedArrayBuffer`/`crossOriginIsolated` | SAB/COOP/COEP gereksinimi (Android Chrome 88+) |
| `Invoke-WebRequest -Method Head https://pages.github.com/` (yerel) | GitHub Pages'te COOP/COEP header'ı **yok** |
| https://github.com/orgs/community/discussions/54257 ve /13309 | GitHub Pages özel header destek yok (staff beyanı + açık talep) |
| https://github.com/ggml-org/whisper.cpp (examples/coi-serviceworker.js) | Upstream'in statik host workaround'ı |

---
by cerenkurucu · Built with AI assistance · SHHH-004 araştırma turu — commit/push/Issue kapatma yok, model indirilmedi, cihaz ölçümü yapılmadı
