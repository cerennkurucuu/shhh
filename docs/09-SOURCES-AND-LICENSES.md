# shhh. — Kaynaklar ve lisanslar

Tarih: 2026-11-16 · Hedef: v1.0 · Durum: planlama; uygulama geliştirilmedi.


## Doğrulama yöntemi ve sınırı

2026-11-16 tarihinde Angular sürüm politikası, whisper.cpp deposu, Mediabunny ana sayfası ve Chrome Share Target rehberi açılarak incelendi. Aşağıdaki liste seçilecek sürümlerin lisans/advisory onayı değildir. Uygulama kurulmadı, kesin paket/runtime/model sürümü sabitlenmedi. En güncel sürüm numarası tahmin edilmez. SHHH-002/019 kurulum öncesi exact tag/commit, yayımlanma tarihi, license metni, transitive bağımlılıklar ve güvenlik incelemesini tamamlamalıdır.

| Kaynak | Kullanım adayı | Sürüm / lisans / bakım ve uyumluluk durumu |
|---|---|---|
| [Angular](https://angular.dev/) / [releases](https://angular.dev/reference/releases) / [versions](https://angular.dev/reference/versions) | UI ve PWA | Sürüm seçilmedi; destek ve Node/TS matrisi resmi kaynaktan kilitlenecek; MIT dosyası seçilen tag'de doğrulanacak |
| [Node.js](https://nodejs.org/en/about/previous-releases) | geliştirme runtime | Destekli LTS seçilecek; dağıtım lisans bildirimleri incelenecek |
| [TypeScript](https://github.com/microsoft/TypeScript) | strict tipler | Angular uyumlu exact sürüm; Apache-2.0 adayı, tag lisansı doğrulanacak |
| [whisper.cpp](https://github.com/ggml-org/whisper.cpp) | WASM inference | Seçilmedi; MIT adayı; wasm build/SIMD/threads, bakım ve advisory incelenecek |
| [Whisper](https://github.com/openai/whisper) | çok dilli tiny/base | Ağırlık kaynağı/model hash seçilmedi; kod ve ağırlık lisans/dağıtım şartları ayrıca doğrulanacak |
| [Mediabunny](https://mediabunny.dev/) | gerektiğinde media pipeline | Ana sayfa lisans linki ve bounded okuma yaklaşımı içeriyor; lisans metni, codec ekleri ve exact sürüm onayı bekliyor |
| [Vitest](https://github.com/vitest-dev/vitest) | test | Sürüm/Node uyumu ve MIT bildirimi doğrulanacak |
| [Playwright](https://github.com/microsoft/playwright) | E2E | Sürüm ve Apache-2.0; browser binary dağıtım bildirimleri ayrıca incelenecek |

## Web platformu kaynakları

- [Web Share Target Chrome rehberi](https://developer.chrome.com/docs/capabilities/web-apis/web-share-target/): kurulu PWA paylaşım alıcısı; runtime cihaz kanıtı yerine geçmez.
- [Manifest share_target](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/share_target): POST ve enctype davranışları; sürüm/tarayıcı desteği SHHH-003'te doğrulanacak.
- [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API): transaction, object store ve kota; platform API'si paket sürümü değildir.
- [Page Visibility](https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API): görünürlük sinyali; OS process kill'de callback garantisi yok.
- [Web Audio](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API): decode/resampling adayları.
- [WebAssembly](https://webassembly.org/): native inference runtime yetenekleri.

## Model dağıtım ve bütünlük kaydı

SHHH-019 için her artifact kaydı: upstream repository + immutable tag/commit, model adı ve multilingual niteliği, dosya byte sayısı, SHA-256, quantization/config, runtime uyumu, kaynak URL, doğrulayan kişi/tarih, lisans metni/notice ve yeniden dağıtım izni. Bilinmeyen kaynaklardan model indirilmez; hash mismatch'te cache aktifleşmez. Model indirmesi kullanıcı sesi transferi değildir ancak ağ ve bant genişliği gerektirir.

## Güvenlik, maliyet ve onay

Her exact sürüm için resmi advisory/OSV/GitHub security kayıtları, bakım sinyali ve transitif paketler kontrol edilir. “Bilinen açık bulunmadı” tarihli bir sonuçtur, güvenlik garantisi değildir. Ücretsiz lisans ile hosting ve model dağıtım kotası ayrı değerlendirilir. Tüm lisans kararları tamamlanmadan dağıtım onayı verilmez. Proje için yeni bir açık kaynak lisansı bu turda seçilmez; bu karar Ceren Kurucu'ya aittir.

## İlgili belgeler

- [01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md)
- [02-PRD.md](02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](04-LOCAL-DATA-AND-PRIVACY.md)
- [05-UI-DESIGN-SYSTEM.md](05-UI-DESIGN-SYSTEM.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](06-NAVIGATION-AND-SCREEN-FLOW.md)
- [07-CODING-STANDARDS.md](07-CODING-STANDARDS.md)
- [08-TEST-PLAN.md](08-TEST-PLAN.md)

by cerenkurucu · Built with AI assistance

