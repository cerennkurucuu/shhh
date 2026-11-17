# SHHH-003 — Android Web Share Target fizibilitesi ve ağ güvenliği araştırması

Tarih: 2026-11-16 · Bağlı Issue: [cerennkurucuu/shhh#11](https://github.com/cerennkurucuu/shhh/issues/11) · Yerel kayıt: `planning/issues/SHHH-003.md`
Durum: **Araştırma tamamlandı (kaynak + tek gerçek ağ probu); gerçek cihaz testleri YAPILMADI.**
Kapsam dışı: uygulama kodu, kurulum, commit/push/Issue kapatma.

---

## 1. Özet ve karar (v1.0)

1. **Web Share Target (POST) mekanizması çalışır; paylaşılan dosya, SW aktif değilse doğrudan ağa (sunucuya) gider.** Bu, hem W3C Web Share Target ED'sinin "launch" algoritması hem de Chrome/MDN rehberleriyle tutarlıdır: servis worker veriyi "network'e gönderilmeden önce" okuma *seçeneğidir*, varsayılan değildir.
2. **Chrome'un güncel kurulabilirlik kriterlerinde servis worker zorunlu değil** (`web.dev/articles/install-criteria`, 2026-11-16). Yani kurulu bir PWA, SW'siz/bozuk-SW'li hâlde bile Android paylaşım sayfasında görünebilir → POST ağ fallback'ine düşebilir. Bu, SHHH-003'ün ana riskidir.
3. **GitHub Pages probu (2026-11-16, gerçek istek): `POST https://pages.github.com/` → HTTP 405 MethodNotAllowed.** 405, gövdenin sunucuya **ulaşmadığı anlamına gelmez**: TLS GitHub kenar sonlandırmasında bitiyor, istek baytları (başlıklar + gövde) reddeden tarafa kadar iletiliyor. Ayrıca GitHub Pages erişim loglarına erişimimiz yok → gövde saklanıp saklanmadığı **doğrulanamaz**.
4. **Karar (PRD R01 + docs/03): "Sesler asla sunucuya gitmez" garantisi kanıtlanana kadar `share_target` yayın manifestine EKLENMEZ.** v1.0 varsayılan yol her zaman manuel dosya seçicidir. Paylaşım, yalnızca gerçek cihaz proxy + log kanıtı (T14/T15) sıfır bayt sızıntısı gösterirse açılır.
5. Paylaşım açılsa bile mimari zorunluluğu: dosyalı POST **asla** `fetch(event.request)` ile ağa forward edilmez; bilinmeyen POST'lar yerel olarak reddedilir (deny-by-default).

---

## 2. Mekanizma: paylaşım anında ne oluyor?

### 2.1 Şartname düzeyi (W3C Web Share Target API, Editor's Draft, 2026-11-16 okundu)

- "Launching the web share target" algoritmasında UA, `action` URL'sine **yeni bir top-level browsing context açar ve `method`/`enctype`'a göre gövdesi olan bir Request ile oraya navigate eder.** POST için gövde `multipart/form-data` (veya urlencoded) olarak üretilir. Yani istek tipik bir navigasyon POST'idir.
- Şartname ifadesi: paylaşılan bilgi "…**might be read by a service worker, rather than being sent over the network to the server**" — yani SW müdahalesi bir *istisnadır*; varsayılan gönderim yoludur.
- `action`, manifest `scope` **içinde** ve trustworthy origin'de olmalı; değilse `share_target` üyeliği işleme sırasında **sessizce düşer** (spec §process the share_target member). → Kapsam dışı action = uygulama paylaşım listesinde görünmez.
- Kayıt (registration) UA takdirindedir; spec açıkça UA'ların "Only register a web share target if it has a service worker" stratejisini **kullanabileceğini** söyler — ama gerekmez.
- Güvenlik/gizlilik notları: paylaşım çağrısı "potansially sending private user data to a third-party website"; spoofing riski (sahte ad/ikon); origin trustworthy olmalı; kaynak ve alıcı siteler kullanıcı kimliğini birleştirebilir.

### 2.2 Chrome rehberi (developer.chrome.com/docs/capabilities/web-apis/web-share-target, 2026-11-16)

- Paylaşım alıcısı olmak için **Chrome installability criteria'a uymak + kullanıcının uygulamayı ana ekranına eklemiş olması** gerekir. Başka şart (ör. SW) listelenmiyor.
- **Processing POST shares:** "The foreground page cannot process this data directly… the page passes it to the service worker, where you can intercept it with a `fetch` event listener." Örnek handler hem yerel işleme hem `saveBookmark()` sonrası ağ çağrısı içerebilir — hangisinin olacağı **geliştiricinin** handler'ına bağlıdır.
- Gelen veri doğrulanmalı; Android'te `url` alanı boş kalabiliyor (Chromium bug 789379), URL'ler çoğunlukla `text` içinde geliyor.

### 2.3 MDN (share_target, son düzenleme 2026-08-27, 2026-11-16 okundu)

- Dosya paylaşımı için `method: POST`, `enctype: multipart/form-data` ve `files[]` zorunlu.
- POST isteği SW'de `fetch` dinleyicisiyle yakalanabilir; **303 See Other** ile yönlendirme önerilir (yenilemede çift POST engellenir).
- Dosyaları SW bağlamından sayfaya taşımak için: geçici olarak Cache/IndexedDB'e yaz, sonra `Client.postMessage()` ile bildir (docs/03'teki staging tasarımıyla birebir aynı).
- Security & Privacy: yalnız kurulu PWA paylaşım alıcısı olabilir; gelen veri HTML form gönderimi gibi dikkatle doğrulanmalı.
- `share_target` **Baseline değil** (Limitid availability) — iOS Safari kapsam dışı; v1.0 zaten Android hedefli (PRD).

### 2.4 Servis worker yaşam döngüsü — risk matrisi için kanıtlar

Kaynaklar: web.dev "The service worker lifecycle" ve MDN "Using Service Workers" / `skipWaiting` / `clients.claim` (2026-11-16).

| Durum | Davranış (kaynaklı) | Paylaşım POST sonucu |
|---|---|---|
| İlk ziyaret, SW henüz install/activate olmadan | Register çağıran sayfa kontrolsüz kalır ("consistency" default); `clients.claim()` ile zorlanabilir (timing hassas) | **Ağa gider** (SW henüz yok) |
| SW active, sayfa **kontrollü** | Fetch event SW'e düşer | Intercept edilir |
| SW active, sayfa **kontrolsüz** (ilk yükleme, claim yok) | İkinci yükleyişte/refresh'te kontrol edilir; navigasyon istekleri active worker eşleşmesiyle ele alınır (offline cold-start davranışı) | Intercept **beklenir**; Chrome Android'de share-target navigasyonuna özel doğrulama **cihaz testiyle** yapılmalı |
| Soğuk başlangıç (uygulama tamamen kapalı, SW active) | SW bağımsız çalışır, navigasyon fetch'i tetiklenir | Intercept edilir (T14/S9 ile kanıtlanacak) |
| SW **install başarısız** | "promise rejects… browser throws the service worker away. It'll never control clients" | **Ağa gider** |
| SW yok (kayıt silinmiş/site data temizlenmiş, hiç kaydedilmemiş) | Eşleşme yok | **Ağa gider** |
| Güncelleme: yeni SW **waiting** | Eski SW hâlâ kontrollü sayfaları yönetir; yeni sürüm action URL'sini/route'u farklıysa davranış **eski handler**'a bağlı | Eski handler geçerli → intercept sürer (veya eski route ile tutarsızlık → yerel hata) |
| `skipWaiting()` ile anlık devralma | Yeni SW kontrolleri devralır, `controllerchange` | Yeni handler geçer |
| Offline, SW active | Ağ yok; SW yerel yanıtlarsa akış sürer | Intercept / yerel yanıt |
| SW **kapsam dışı** (action manifest scope dışında) | `share_target` üyeliği şartnamece düşer | Uygulama paylaşım listesinde **hiç görünmez** |

**Negatif kriterin cevabı (şartname+rehber düzeyi):** SW yok/bozuk/kurulmamışsa dosya **evet, sunucuya gider.** Kanıt yoksa sıfır bayt garantisi verilemez (docs/01 §Gizlilik maddesi ile aynı).

---

## 3. Gerçekleştirilen ağ probu (bu turda yapılan tek ölçüm)

- **Tarih/saat:** 2026-11-16, PowerShell 5.1 `Invoke-WebRequest -Method Post` ile.
- **Hedef:** `https://pages.github.com/` (GitHub Pages statik host örneği).
- **Gerçek sonuç:** `405 MethodNotAllowed`.
- **Yorum:** Reddi üreten taraf TLS sonlandırma noktasının ötesinde (GitHub altyapısı). İstek başlıkları ve gövdesi, 405 üretilene kadar GitHub'a ulaşmıştır. Yani **"sunucu 405 döndü" ≠ "bayt hiç gitmedi"** (docs/03'teki uyarı ile birebir).
- **Ölçülemeyen:** GitHub Pages'in istek gövdesini loglayıp saklayıp saklamadığı — log erişimimiz yok, **garanti verilemez**.
- **Not:** Bu prob yalnızca fallback'in sunucuya ulaştığını gösterir; paylaşılan gerçek ses dosyası hiçbir zaman bu turda gönderilmemiştir. Kontrollü hedefde (kendi logladığımız origin) tekrarlanmalıdır.

---

## 4. v1.0 güvenli çözüm (mimari ile uyumlu)

1. **Manifest kararı:** `share_target` (POST+multipart) **yalnızca** T14/T15 cihaz kanıtı sıfır bayt gösterirse yayına eklenir. Kanıt yoksa eklenmez; uygulama her zaman manuel picker sunar (PRD R01, docs/03 son cümle).
2. **SW handler zorunlu tasarımı (açıldığında):**
   - `action` yolundaki dosyalı POST: `event.respondWith(...)` ile **yalnız yerel** — formData oku → IndexedDB staging'e yaz → `transferId` ile 303 yerel yönlendirme / `postMessage`.
   - **Açık ağ fallback'i yasak:** dosya POST'u için `fetch(event.request)` çağrılmaz; eşleşmeyen POST'lar yerel 4xx/uygulama hatası döner (deny-by-default).
   - Dosya/metin asla query'ye konmaz (yalnız `transferId`).
3. **Çalışma zamanı kapısı (runtime gate):** Uygulama açılışında `navigator.serviceWorker.controller` + `registration.active` + handler sürüm handshake'i kontrol edilir; kontrolsüzse arayüz paylaşımı devre dışı bırakıp manuel picker'a düşer (PRD R01'in "güvenlik kanıtı yoksa paylaşım kapalı" şartının UI karşılığı). Not: manifest statik olduğu için paylaşımdan **önceki** kapıyı bu gate sağlar; paylaşımdan **anındaki** SW varlığı cihaz testiyle (S3, S5) kanıtlanmalıdır.
4. **Çakışma önleme:** Angular/Workbox SW ile özel handler tek kayıtta; iki ayrı registration (docs/03: "iki kayıtla kontrol çakışması varsayılmaz"), scope test edilir.
5. **Güncelleme güvenliği:** Yeni sürümde action/route değişikliği varsa `skipWaiting`+`controllerchange` reload stratejisi veya eski route'un da geçici olarak korunması değerlendirilir (waiting matrisi §2.4).

---

## 5. Tekrar edilebilir test yöntemi (T14/T15 için; sonuçlar YAPILMADI)

**Kanıt formatı:** docs/08 §Kanıt formatı — kimlik, R/Issue, önkoşul, adımlar, beklenen/gerçek, cihaz/OS/tarayıcı sürümü, tarih, kanıt dosyası.
**Araçlar:** gerçek Android cihaz + Chrome; ağ yakalama için ya mitmproxy/Charles (cihazda CA kurulumu) ya da Chrome `chrome://net-export` netlog; sunucu tarafı için **log verebilen kontrol edilmiş origin** (GitHub Pages log erişimi yok → GH Pages'te yalnız proxy/netlog kanıtına dayanılır, bu sınır rapora yazılır). Ortam: HTTPS, gerçek WhatsApp sürümü kaydedilir.

| ID | Senaryo | Adım özeti | Beklenen | Kanıt |
|---|---|---|---|---|
| S1 | Kontrollü normal paylaşım | Uygulama 2. kez aç → WhatsApp ses paylaş → shhh. seç | SW yerelde yakalar; proxy/log'da **0 bayt** | proxy capture + netlog + SW konsol logu |
| S2 | Sayfa açıkken paylaşım | shhh. ön planda iken paylaş | Aynı; transfer staging'e yazılır | aynı |
| S3 | Soğuk başlangıç | shhh. tamamen kapalı (task kapat) → paylaş → açılış | SW aktifse intercept; 0 bayt | aynı |
| S4 | SW yok (site data temizlenmiş / hiç kaydedilmemiş) | Uygulama verisini sil → paylaş | **POST ağa gider** (405 vb.) → kanıt yoksa paylaşım kapalı kalmalı | proxy/log'da gövde görünür (negatif kanıt) |
| S5 | Registration sıfırlanmış / tarayıcı cache temizlenmiş | Tarayıcı verisi temiz → paylaş | S4 ile aynı | aynı |
| S6 | SW güncelleme (waiting) | action/route değişen yeni sürüm yükle, sayfayı kapatmadan paylaş | Eski handler davranışı; tutarsızsa yerel hata, ağ yok | SW iki sürüm logu |
| S7 | Offline | Uçak modu → paylaş | Yerel yanıt veya güvenli hata; ağ çağrısı yok | netlog (dış istek yok) |
| S8 | Kapsam dışı action | Manifest scope ihlali simüle (test build) | `share_target` üyeliği düşer, uygulama listede görünmez | manifest işleme kaydı |
| S9 | Sayfa kapalı / WebAPK cold launch | Ana ekrandan paylaşım ile açılış | S3 ile aynı | cihaz videosu/netlog |
| S10 | İptal | Paylaşım sayfasında geri/iptal | İstek hiç üretilmez; uygulama açılmaz, veri yok | ekran kaydı |
| S11 | Hata/doğrulama | Bozuk MIME, boş gövde, Android'in boş `url` alanı | Güvenli reddetme (MDN doğrulama uyarısı); ağ yok | UI hatası + konsol |
| S12 | Kesinti | Paylaşım sırasında SW install hatası/kill | Ağa düşme tespiti → gate paylaşımı kapatır | hata logu + gate çıktısı |

**Başarı/hata/iptal/kesinti kapsam eşlemesi (kabul kriteri 4):**
- Başarı → S1, S2, S3, S9 (dosya yerelde, 0 bayt).
- Hata → S11 (veri doğrulama), S6 (tutarsız sürüm), S8 (geçersiz manifest).
- İptal → S10 (istek üretilmeden kullanıcı geri çeker; yüklenen istek yoksa sıfır bayt trivialdir).
- Kesinti → S7 (offline), S12 (SW install/kill yarışı).
- **Gerekçelenen kapsam dışı:** Gerçek WhatsApp ses formatının (.opus ses notu vs. belge olarak paylaşım) Android sürümüne göre farklılık göstermesi S1'de ölçülür; ayrı senaryo açılmaz, S1'in varyantı olarak kaydedilir. iOS paylaşımı PRD gereği v1.0 dışıdır (MDN: `share_target` Baseline değil).

**Başarı kriteri (negatif):** S1–S3, S9'da proxy capture + netlog + (mümkünse) sunucu logunda ses gövdesi **0 bayt**; aksi halde share hâlâ kapalı.

---

## 6. Kabul kriterleri eşlemesi (Issue #11 / SHHH-003.md §4)

| Kriter | Durum | Kanıt |
|---|---|---|
| POST intercept ve fallback davranışı belgeli | ✅ | §2 (spec/Chrome/MDN), §3 (405 probu), §2.4 (SW matrisi) |
| Test yöntemi tekrar edilebilir | ✅ | §5 (S1–S12, araçlar, kanıt formatı) |
| Kanıt yoksa paylaşım kapalı ve manuel seçim mevcut | ✅ (karar) | §4.1: `share_target` manifest'te yok; manuel picker v1.0 varsayılanı (PRD R01) |
| Başarı/hata/iptal/kesinti kapsam açısından incelenmiş; uygulanmayan dal gerekçeli | ✅ | §5 kapsam eşlemesi + gerekçe |
| Gereksinim/test kanıtları izlenebilir; ölçülmeyen başarı iddiası yok | ✅ | §7 izlenebilirlik; cihaz testi sonucu **"yapılmadı"** olarak işaretli (§ Başlık) |

Definition of Done içindeki "pozitif ve negatif senaryoların sonuçları kayıtlı" maddesi: senaryolar ve **beklenen** sonuçları kayıtlıdır; **gerçek** cihaz sonuçları bu turda üretilmemiştir (kapsam: fizibilite, uygulama kurulumu yok). Ceren Kurucu incelemesine açıktır.

---

## 7. İzlenebilirlik (gereksinim ↔ belge ↔ test)

- **PRD R01** (`docs/02` satır 14): "Güvenlik kanıtı yoksa paylaşım kapalı ve normal web dosya seçimi." → Bu rapor §4.1 kararı; T14/T15 kapısı (`docs/08` satır 25–26).
- **docs/03** §Service Worker ve paylaşım: staging, query'ye dosya koymama, fallback uyarısı, "risk çözülmezse share_target eklenmez" → bu rapor §2 ve §4.
- **docs/01** §Gizlilik: "POST fallback riski gerçek cihaz/ağ/sunucu testleriyle çözülmeden 'sesler asla sunucuya gitmez' garantisi verilmez" → §1.4 kararıyla uyumlu.
- **SHHH-002** (`planning/implementation/SHHH-002-technology-matrix.md`): bağımlılık karşılandı (teknoloji matrisi tamam, kanıt üretildi).
- **docs/09** kaynak kaydı: Chrome Share Target rehberi ve MDN share_target sayfaları bu turda yeniden açılıp doğrulandı (2026-11-16).

## 8. Kalan riskler / açık sorular

1. **Chrome installability'de SW zorunlu değil** (web.dev kriter listesinde SW yok) → kurulu PWA SW'siz paylaşım alıcısı olabilir. Yapısal risk; S4/S5 ile cihazda doğrulanmalı.
2. **Share-target navigasyonunun active-but-uncontrolled SW tarafından Chrome Android'de kesin yakalanması** şartnameden çıkarım; cihaz testi (S3/S9) olmadan kesin değil.
3. **GitHub Pages gövde/log davranışı bilinmiyor** → otonom ölçümde log'lu kontrol origin şart.
4. **WhatsApp ses notu paylaşım biçimi** (.opus / belge) cihaza göre değişir; S1 varyantında ölçülür.
5. iOS/Safari `share_target` desteklenmiyor (Baseline değil) — v1.0 kapsam dışı, dokümante.
6. Şartname notu: paylaşılan veri üçüncü taraf siteye gidebilir; spoofing/origin kullanıcı eğitimi (düşük öncelikli, arayüz metinleriyle ilgilidir).

## 9. Kaynaklar (2026-11-16 erişim)

- Web Share Target API (W3C ED): https://w3c.github.io/web-share-target/
- Chrome — Sharing on mobile and desktop simplified with the Web Share Target API: https://developer.chrome.com/docs/capabilities/web-apis/web-share-target
- MDN — share_target (Security & Privacy bölümü dahil): https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target
- web.dev — Install criteria: https://web.dev/articles/install-criteria
- web.dev — The service worker lifecycle: https://web.dev/articles/service-worker-lifecycle
- MDN — Using Service Workers / skipWaiting / clients.claim
- Yerel ağ probu: PowerShell `Invoke-WebRequest` → `https://pages.github.com/` POST → 405 (2026-11-16)
