# SHHH-002 — Güncel teknoloji, sürüm ve ücretsiz kullanım doğrulaması

- Issue: [#10 SHHH-002](https://github.com/cerennkurucuu/shhh/issues/10) (erişim: 2026-11-16, web üzerinden; `gh` CLI oturumu yok)
- Doğrulama tarihi: **2026-11-16**
- Hedef: shhh. v1.0 (planlama turu; uygulama kurulumu ve ürün kodlaması kapsam dışı)
- Durum: araştırma tamamlandı; commit/push/Issue kapatma yapılmadı

## 0. Yöntem ve sınır

Aşağıdaki her satır 2026-11-16 tarihinde bu makinede çalıştırılan komutlardan veya aynı gün
erişilen resmi kaynaklardan alınmıştır. Ölçülmemiş hiçbir donanım performansı, hız, WER veya
bant genişliği ihtiyacı tahmini olarak sunulmamıştır. Doğrulanamayan kalemler §9'da listelenmiştir.
Bu turda depoda bağımlılık kurulmadı; aday paket kurulum ve denetimleri
`%TEMP%\opencode\shhh-002-*` altındaki geçici dizinlerde yapıldı (depoya yazılmadı).

Çalıştırılan ana komutlar (kabuk: PowerShell 5.1, win32):

| Komut | Amaç |
|---|---|
| `git status`, `git log --oneline -5` | Repo durumu: temiz çalışma ağacı, `main`, son commit `5582c48` |
| `node -v; npm -v; git --version` | Yerel araç sürümleri |
| `npm view <paket> <alan> --json` | Sürüm, tarih, lisans, peer/engines meta verisi |
| `npm install --package-lock-only` + `npm audit --json` (geçici dizin) | Advisory denetimi |
| `npm install` + `npx tsc --version`, `npx ng version`, `npx vitest --version` (geçici dizin) | Pozitif araç zinciri testi |
| `npm install` (typescript@7.0.2 + @angular/compiler-cli@22.2.6) | Negatif sürüm uyumu testi |
| `npm install --engine-strict` (engines: node ^20) | Negatif destek dışı Node politika testi |

## 1. Yerel geliştirme ortamı (doğrulandı)

| Araç | Tespit edilen sürüm | Kaynak | Not |
|---|---|---|---|
| Node.js | **v22.23.5** | `node -v`, `C:\Program Files\nodejs\node.exe` | 22.x "Jod" Maintenance LTS; 2026-11-11'de yayımlanan güvenlik güncellemeli sürümle aynı |
| npm | **10.5.0** | `npm -v` | Node kurulumuyla gelen sürüm |
| Git | **2.56.0.windows.4** | `git --version` | — |
| İşletim sistemi | Windows 11/10.0.26200 x64 | `[System.Environment]::OSVersion.Version` | AMD64, 12 işlemci mantıksal çekirdek (sayaç; performans ölçümü yapılmadı) |
| Visual Studio Code | 1.145.2 (c4453f8e) | `code --version` | IDE; derleme/test için zorunlu değil |

## 2. Aday teknoloji matrisi

Tüm "Tarih" değerleri yayım tarihidir ve inceleme tarihinden (2026-11-16) ileri değildir
(negatif sınır kriteri karşılanır).

| Aday | Tam sürüm | Yayımlanma tarihi | Lisans | Kaynak | Bakım sinyali | Karar |
|---|---|---|---|---|---|---|
| Node.js (geliştirme runtime) | **22.23.5** (yerelde kurulu) | 2026-11-11 | MIT (Node.js projesi) | nodejs.org release blog + github.com/nodejs/release schedule | 22.x EOL 2027-04-30; Active LTS hattı 26.13.1 (2026-11-11) | **Seçildi** — yerel sürüm destekli LTS ve Angular CLI engine aralığında; ileride 26.x'e geçiş not edildi |
| npm (paket yöneticisi) | 10.5.0 | Node 22.23.5 ile kurulu | Artık npm lisansı (Node.js dağıtımı içinde) | yerel kurulum | npm 10 hattı Node 22 ile birlikte gelir | **Seçildi** (bkş. §7) |
| Angular | **22.2.6** (@angular/core, @angular/cli) | 2026-11-12 | MIT | npm registry; angular.dev/reference/releases | v22 Active; Active ends 2027-06, LTS ends 2028-06 | **Seçildi** |
| TypeScript | **6.0.3** | 2026 (registry `versions` listesinde 6.0.3; `latest` 7.0.2) | Apache-2.0 | npm registry; github.com/microsoft/TypeScript | Angular 22.2 peer aralığı `>=6.0 <6.1` | **Seçildi**; TS 7.0.2 reddedildi (§4) |
| Vitest (unit test) | **5.1.0** | npm `latest` | MIT | npm registry; github.com/vitest-dev/vitest | engines: `node ^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` | **Seçildi** |
| Playwright (E2E) | **@playwright/test 1.65.1** | npm `latest` | Apache-2.0 | npm registry; github.com/microsoft/playwright | engines: `node >=20` | **Seçildi** (tarayıcı binary'leri indirilmedi, §9) |
| whisper.cpp (WASM inference) | **v1.9.5**, commit `d1be6fde11ac6e0407606b4e42fe72d34add8037` | 2026-10-06 | MIT (LICENSE metni 2026-11-16 okundu) | github.com/ggml-org/whisper.cpp releases | ggml v0.26.0 senkronu; repo 5.789 commit, aktif sürüm çizgisi (v1.9.x, Haziran–Ekim 2026) | **Seçildi** (kaynak tag/commit sabitlendi) |
| `whisper.cpp` npm paketi | 1.0.3 | 2022-12-12 (son değişiklik) | MIT | npm registry | 4 yıldır güncellenmemiş | **Reddedildi** — bayat paket; WASM build resmi tag'den yapılacak |
| Whisper model ağırlıkları (openai/whisper) | repo `main` LICENSE | LICENSE sha `d25552598bb9c5400612159ed4bab92ce12a5ce5` | MIT | GitHub API `/repos/openai/whisper/license` | Resmi OpenAI deposu | **Ön koşul kabul edildi**; kesin model dosyası/quantization/hash SHHH-019'da sabitlenecek |
| Mediabunny (media pipeline) | 1.66.0 | 2026-11-13 | **MPL-2.0** | npm registry; github.com/Vanilagy/mediabunny | Aktif (2026-11-13 güncellemesi) | **Koşullu aday** — MPL-2.0 dosya bazlı copyleft; yalnızca gerçekten ihtiyaç varsa eklenecek, lisans yükümlülüğü dağıtımı etkileyecek |
| @huggingface/transformers (alternatif decoder) | 4.3.2 | npm `latest` | Apache-2.0 | npm registry | Aktif | **Seçilmedi (şu an)** — yedek seçenek; whisper.cpp WASM yolu asıl plan |
| Web Audio, MediaRecorder, IndexedDB, Page Visibility, WebAssembly | Platform API'leri | — | Tarayıcı spesifikasyonu | MDN / webassembly.org | Paket sürümü değildir | **Kullanılacak** — sürüm bağımlılığı yok; cihaz/tarayıcı kanıtı SHHH-003+'ta |

## 3. Node/TS eşleşmesi (kabul kriteri)

| Kısıt | Değer | Doğrulama |
|---|---|---|
| @angular/cli 22.2.6 `engines.node` | `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` | `npm view @angular/cli@22.2.6 engines` |
| Yerel Node | 22.23.5 | `22.23.5 ∈ ^22.22.3` → **uygun** |
| @angular/cli 22.2.6 `engines.npm` | `^6.11.0 \|\| ^7.5.6 \|\| >=8.0.0` | Yerel npm 10.5.0 → **uygun** |
| @angular/compiler-cli 22.2.6 peer `typescript` | `>=6.0 <6.1` | `npm view @angular/compiler-cli@22.2.6 peerDependencies` |
| Seçilen TypeScript | 6.0.3 | `6.0.3 ∈ >=6.0 <6.1` → **uygun** |
| Vitest 5.1.0 `engines.node` | `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` | 22.23.5 → **uygun** |
| @playwright/test 1.65.1 `engines.node` | `>=20` | 22.23.5 → **uygun** |
| @angular/core 22.2.6 peer'ları | `rxjs ^6.5.3\|\|^7.4.0`, `zone.js ~0.15.0\|\|~0.16.0` | Uygulama iskeleti kurulumunda (kapsam dışı) sağlanacak |

Pozitif zincir testi (geçici dizin, 2026-11-16, gerçek çalıştırma):

```
npx tsc --version        → Version 6.0.3
npx ng version           → Angular CLI 22.2.6 / Angular 22.2.6 / Node.js 22.23.5 /
                           Package Manager npm 10.5.0 / win32 x64
                           (typescript 6.0.3, vitest 5.1.0 istenen sürümlerle eşleşti)
npx vitest --version     → vitest/5.1.0 win32-x64 node-v22.23.5
```

## 4. Advisory (güvenlik) denetimi

- Araç: `npm audit` (npm 10.5.0), 2026-11-16, geçici dizinde aday setin `package-lock.json`'ı üzerine.
- Denetlenen set: `@angular/core@22.2.6`, `@angular/cli@22.2.6`, `typescript@6.0.3`,
  `vitest@5.1.0`, `@playwright/test@1.65.1`, `mediabunny@1.66.0`.
- Sonuç: `auditReportVersion 2 → vulnerabilities: {} ; info/low/moderate/high/critical = 0`;
  çözümleylenen toplam bağımlılık 189 (prod 8, dev 182, optional 52, peer 42).
- Sınır: Bu, **2026-11-16 tarihli** bir sonuçtur, güvenlik garantisi değildir (docs/09 ile aynı dil).
  Depoda henüz package.json/lockfile olmadığı için depo düzeyinde audit bu turda yapılamaz;
  uygulama iskeleti kurulduğunda `npm audit` tekrarlanmalıdır.
- Node.js tarafı: 22.23.5, 2026-11-11 tarihli güvenlik sürümüdür (http2/tls CVE düzeltmeleri içeren
  26.13.1 ile birlikte yayımlanan 22.23.5). Node 20 EOL'dür (2026-03 sonu) ve Angular CLI 22
  engine aralığından hariçtir.

## 5. Negatif ve sınır testleri (gerçek çıktılar)

| Senaryo | Beklenen | Gerçek çıktı | Sonuç |
|---|---|---|---|
| Destek dışı TS: `typescript@7.0.2` + `@angular/compiler-cli@22.2.6` kurulumu | reddedilmeli | `npm ERR! code ERESOLVE ... peerOptional typescript@">=6.0 <6.1" from @angular/compiler-cli@22.2.6 ... Conflicting peer dependency: typescript@6.0.3`, `EXIT=1` | **PASS** |
| Destek dışı Node politikası: `engines.node = ^20.0.0` + `npm install --engine-strict` | reddedilmeli | `npm ERR! code EBADENGINE ... Required: {"node":"^20.0.0"} Actual: {"npm":"10.5.0","node":"v22.23.5"}`, `EXIT=1` | **PASS** (politika mekanizması bu makinede çalışıyor) |
| Sürüm yayın tarihi inceleme tarihinden ileri olamaz | tüm adaylar ≤ 2026-11-16 | en yeni aday Angular 22.2.6 (2026-11-12) ve whisper.cpp v1.9.5 (2026-10-06) | **PASS** |
| Lisansı doğrulanmamış decoder adayı reddedilmeli | — | lisansı API/registry'den doğrulanamayan hiçbir aday matrise alınmadı; `whisper.cpp` npm paketi güncellik gerekçesiyle reddedildi | **PASS** |
| Hata senaryosu mevcut oturum kayıtlarını bozmamalı, gizli veri loglamamalı | bozulma/kaçak yok | Depo `git status` öncesi ve sonrası temiz; yalnızca `%TEMP%` altında aday dizinler yazıldı; token/şifre okunmadı veya yazılmadı | **PASS** |

Gerçek Android cihaz testi, gerçek mikrofonla ses kaydı ve model çıkarımı bu turda
**yapılmamıştır**; yapılmış gibi raporlanmamıştır.

## 6. Başarı / hata / iptal / kesinti davranışları (kapsam incelemesi)

| Davranış | Bu araştırma kapsamında | Uygulanmayan dalın gerekçesi |
|---|---|---|
| Başarı | Matris + kanıtlar tek rapor dosyasına yazıldı; pozitif testler §3'te | — |
| Hata | Beklenen reddler (ERESOLVE, EBADENGINE) gerçek çıktısıyla kaydedildi; hata çıktısı gizli veri içermiyor | — |
| İptal | Tur commit/push/Issue kapatma olmadan bitirildi; geçici dizinler depoda değil | Onay Ceren Kurucu'ya ait |
| Kesinti | Rapor tek atomik Markdown dosyası; yarı yazılmış durum depoya girmez (depoya bu turda yalnızca bu dosya yazılır, commit edilmez) | Uygulama katmanındaki kesinti davranışları (Page Visibility, OS process kill) SHHH-003/004 kapsamındadır; bu turda uygulanmaz |

## 7. Paket yöneticisi ve lockfile politikası

- **Seçim: npm 10.5.0.** Gerekçe: Node 22.23.5 ile zaten kurulu (ek kurulum/indirme yok),
  Angular CLI 22.2.6 tarafından desteklenen sürümdür, `npm audit` advisory denetimi yerleşiktir.
  pnpm/yarn bu turda gerekçesiz ek araç zinciri eklerdi.
- **Lockfile politikası: `package-lock.json` Git tarafından izlenmelidir.** Kilit dosyası olmadan
  advisory denetimi ve yeniden üretilebilir kurulum garanti edilemez.
- **Çakışma (tespit edildi, düzeltilmedi):** mevcut `.gitignore` satır 12'de `/package-lock.json`,
  satır 13'te `/yarn.lock` satırlarını yok sayıyor. Bu, yukarıdaki politikayla **çelişir**.
  Bu tur mevcut dosyaları değiştirme yetkisi dışında olduğu için yalnızca tespit edildi;
  uygulama iskeletinin kurulduğu turda `.gitignore`'dan `/package-lock.json` satırının kaldırılması
  gerekir (karar: Ceren Kurucu).

## 8. Ücretsiz çalışma — backend ve ücretli API olmadan teknik gereksinimler

Seçilen tüm yazılımlar ücretsiz ve açık kaynak lisanslıdır; çalışma zamanında ücretli API,
abonelik veya API anahtarı **gerektirmez**:

| Gereksinim | Karşılama | Kanıt |
|---|---|---|
| Arayüz | Angular 22.2.6 (MIT), statik build | §2 |
| Transkripsiyon | whisper.cpp v1.9.5 WASM olarak tarayıcıda; model dosyası kullanıcı cihazında | §2; resmi README "WebAssembly" destekli platformlar arasında |
| Ses yakalama/çözme | Web Audio + MediaRecorder (platform API, ücretsiz) | MDN (docs/09 §Web platformu) |
| Veri saklama | IndexedDB (platform API, cihaz içi) | docs/04 |
| Sunucu/backend | **Gerekmiyor** — tüm işlem tarayıcıda; sunucu tarafı kod yok | mimari docs/03 |
| Barındırma (ücretsiz ayrı) | GitHub Pages: herkese açık depo için ücretsiz; yayınlanmış site ≤ 1 GB, bant genişliği 100 GB/ay **yumuşak** limit, saatte 10 build (Actions workflow ile muaf), deploy timeout 10 dk | docs.github.com/en/pages/.../github-pages-limits (2026-11-16 okundu) |
| Bant genişliği maliyeti (ücretsiz ayrı) | İlk kurulumda model dosyası indirimi **kullanıcı** bant genişliği harcar; miktar ölçülmedi | Ölçüm yok → sayısal iddia yok |

Not: GitHub Pages'in online business/e-ticaret/SaaS barındırılması yasaktır; shhh. kişisel bir
yerel uygulama olduğu için bu turda uygun görülmüştür, nihai dağıtım kararı Ceren Kurucu'ya aittir.

## 9. Doğrulanmadı / yapılmadı

1. Playwright tarayıcı binary'leri (`npx playwright install`) indirilmedi — Chromium/Firefox/WebKit
   sürümü ve lisans bildirimi doğrulanmadı.
2. whisper.cpp WASM build'i derlenmedi; SIMD/threads bayrakları ve tarayıcıda çalıştırılması test edilmedi.
3. Model dosyası indirilmedi; byte sayısı/SHA-256/quantization sabitlenmedi (SHHH-019).
4. Hiçbir performans (süre, bellek, WER, FPS) ölçülmedi; hiçbir donanım performansı iddiası yoktur.
5. Gerçek Android cihazda test yapılmadı; gerçek mikrofon/ses kaydı test edilmedi.
6. Node 20 gibi EOL bir sürümde canlı çalışma testi yapılmadı; ret gerekçesi resmi engine
   aralığı + resmi EOL tablosudur (spec tabanlı).
7. `gh` CLI kimlik doğrulaması yok; Issue #10 içeriği web sayfası üzerinden okundu.
8. Angular uygulaması iskeleti kurulmadı (SHHH kapsam dışı: "Uygulama kurulumu ve ürün kodlaması").
9. Depo düzeyinde `npm audit` yapılamadı (lockfile henüz yok; bkş. §7 çakışması).

## 10. Kabul kriterleri durumu

| Kriter | Durum | Kanıt |
|---|---|---|
| Her aday için tam sürüm, kaynak, tarih, lisans ve karar | **Tamam** | §2 tablosu |
| Node/TS eşleşmesi | **Tamam** | §3 + `ng version` çıktısı + ERESOLVE negatif testi |
| Advisory kontrolü | **Tamam (tarihli)** | §4: 189 bağımlılık, 0 açık, 2026-11-16 |
| Kilit dosyası politikası | **Tamam (belirtildi); uygulama kısmi** | §7; `.gitignore` çakışması tespit edildi, karar Ceren Kurucu'ya bırakıldı |
| Başarı/hata/iptal/kesinti kapsandı; uygulanmayan dal gerekçelendirildi | **Tamam** | §6 |
| Gereksinim ve test kanıtları izlenebilir; ölçülmemiş başarı iddiası yok | **Tamam** | §0–§5, §9 |
| (DoD) Pozitif/negatif senaryo sonuçları kayıtlı | **Tamam** | §3, §5 |
| (DoD) Bağımlılıklar güncel; veri/lisans/ağ riskleri açıklanmış | **Tamam** | §2, §8, §9 |
| (DoD) Ceren Kurucu incelemesine hazır; commit/push/kapatma yok | **Tamam** | `git status` bu dosya dışında temiz; commit edilmedi |
| Bağımlılık: SHHH-001 | **Kısmi** | #9 "open"; ancak dokuz doküman depoda mevcut (kanıt üretildi) |

## 11. Kaynaklar (erişim tarihi: 2026-11-16)

| Kaynak | URL | Kullanım |
|---|---|---|
| GitHub Issue #10 (SHHH-002) | https://github.com/cerennkurucuu/shhh/issues/10 | Kabul kriterleri |
| Node.js release blog | https://nodejs.org/en/blog/release | 22.23.5 / 26.13.1 / 24.22.3 sürüm ve tarihler |
| Node.js release schedule | https://github.com/nodejs/release | 22.x EOL 2027-04-30, 26.x Active LTS |
| endoflife.date/nodejs | https://endoflife.date/nodejs | Node 20 EOL (2026-03) |
| Angular sürüm & destek politikası | https://angular.dev/reference/releases | v22 Active (2026-06-03 → 2027-06 Active, 2028-06 LTS sonu) |
| npm registry (npm view) | https://www.npmjs.com | Sürüm/tarih/lisans/peer/engines meta verisi |
| Angular CLI engines | `npm view @angular/cli@22.2.6 engines` | node `^22.22.3 \|\| ^24.15.0 \|\| >=26.0.0` |
| Angular compiler-cli peer | `npm view @angular/compiler-cli@22.2.6 peerDependencies` | typescript `>=6.0 <6.1` |
| whisper.cpp releases | https://github.com/ggml-org/whisper.cpp/releases | v1.9.5, 2026-10-06, commit `d1be6fd` |
| whisper.cpp LICENSE | https://github.com/ggml-org/whisper.cpp/blob/master/LICENSE | MIT (2026-11-16 okundu) |
| openai/whisper license (API) | https://api.github.com/repos/openai/whisper/license | MIT, sha `d255525…` |
| GitHub Pages limits | https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits | 1 GB / 100 GB yumuşak bant genişliği / 10 build-saat |
| npm audit | yerel çalıştırma (2026-11-16) | 0 açık / 189 bağımlılık |

---
by cerenkurucu · Built with AI assistance · SHHH-002 araştırma turu, commit yok
