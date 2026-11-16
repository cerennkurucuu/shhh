# shhh. — Kodlama standartları

Tarih: 2026-11-16 · Hedef: v1.0 · Durum: planlama; uygulama geliştirilmedi.


## Dil ve yapı

Angular ve TypeScript strict; any yerine unknown ve runtime doğrulama. UI, audio pipeline, Worker, model ve storage modülleri ayrılır; saf algoritmalar framework'ten bağımsız tutulur. İngilizce anlamlı identifier, Türkçe kullanıcı metni; gerekçeyi anlatan kısa yorumlar, gereksiz tekrar yorumları yoktur. Dosyalar tek sorumluluk taşır.

## Sözleşmeler ve veri güvenliği

Worker mesajları discriminated union ve protokol sürümü taşır. Session/audio/segment ID'leri typed/opaque olabilir; timestamp birimleri isimde belirtilir (Ms/Samples). AbortSignal her uzun akışta taşınır. Eski request/epoch cevabı kabul edilmez. IDB transaction dışına sarkan await yüzünden transaction kapanması engellenir; repository callback düzeniyle oncomplete/onabort izlenir.

## Hata ve kaynak yönetimi

Türlü hata kodları: invalid-file, unsupported-codec, quota, model-integrity, network, worker-crash, cleanup-failed. Teknik neden korunur ancak transkript loglanmaz. finally cleanup, transferable ownership ve sınırlı prefetch zorunludur. Dosya adı/metin HTML'e güvenilir içerik olarak eklenmez.

## Bağımlılık ve kalite

Kurulumdan önce resmi destek/lisans/advisory/uyumluluk kaydı; exact sürüm ve lockfile. Mevcut .gitignore package-lock.json/yarn.lock'ı dışlıyor: uygulama kurulumunda seçilen tek paket yöneticisinin lockfile'ı izlenebilir hale getirilmeli; bu dokümantasyon turunda değiştirilmez. Lint, format check, typecheck, unit/integration, build ve uygun E2E kalite kapılarıdır. Komut adları proje kurulurken tanımlanır; şu an çalıştıkları iddia edilmez.

## Test yaklaşımı

Algoritma sınırları ve failure injection test edilir; uygulamanın satırlarını tekrar eden testlerden kaçınılır. Deterministik fixture, sabit model/hash/config ve cihaz bilgisi kullanılır. Playwright, gerçek Android WhatsApp/ağ kanıtının yerine geçmez.

## Git ve onay

Bu turda yalnız yerel Markdown ve GitHub Issue/label organizasyonu yetkilidir. Commit/push/PR/merge/deploy, uygulama kurulumu ve Issue kapatma yapılmaz. Mevcut çalışma korunur. Gelecekte final approval Ceren Kurucu'dadır. .env, anahtar, kullanıcı sesleri ve özel fixture'lar Git'e girmez. Dokümantasyon ve teknik uygulamada agent ürün sahibi gösterilmez.

## İlgili belgeler

- [01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md)
- [02-PRD.md](02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](04-LOCAL-DATA-AND-PRIVACY.md)
- [05-UI-DESIGN-SYSTEM.md](05-UI-DESIGN-SYSTEM.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](06-NAVIGATION-AND-SCREEN-FLOW.md)
- [08-TEST-PLAN.md](08-TEST-PLAN.md)
- [09-SOURCES-AND-LICENSES.md](09-SOURCES-AND-LICENSES.md)

by cerenkurucu · Built with AI assistance

