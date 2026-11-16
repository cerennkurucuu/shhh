# SHHH-044 — Entegrasyon ve E2E kullanıcı senaryoları

Labels: `type:test`, `priority:P0`, `phase:07-release`, `status:blocked`

## 1. Amaç
Gerçek IndexedDB/Cache/Worker sınırları ve tek sayfalık uçtan uca kullanıcı akışını doğrula.

## 2. Teknik kapsam
Gerçek tarayıcı depolama sınırları, kullanıcı eylemleri, çoklu pencere ve hata toparlama için otomatik entegrasyon/E2E akışları kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
Playwright temiz profil ve seeded storage; dosya seç→model→transkript→kopyala→bekle→yeni ses→bitir. Commit crash noktası, offline, çoklu pencere ve TTL; fixture model fake'i kullanılırsa gerçek model smoke ayrı işaretlenir.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Her ana akış R01–R12 ile eşleşir ve sonuçlar otomatik doğrulanır.
- [ ] IDB abort gerçek tarayıcıda sonucu/checkpoint'i birlikte geri alır.
- [ ] İki pencerede tek ağır iş ve temizleme bariyeri gözlenir.
- [ ] Fake model testleri gerçek doğruluk/Android kanıtı diye sunulmaz.

## 5. Pozitif ve negatif test senaryoları
Pozitif: İki sesli başarılı oturum; reload/checkpoint resume; başarılı kopyalama ve verified cleanup senaryoları.

Negatif: Ağ/model kesintisi, worker crash, unsupported codec, quota, clipboard denial, stale ACK ve finish yarışları; UI/DB tutarlılığı bozulmamalı.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-07](EPIC-07.md).

- [SHHH-028](SHHH-028.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-030](SHHH-030.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-035](SHHH-035.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-040](SHHH-040.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-043](SHHH-043.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Emüle share ile WhatsApp güvenliğini kanıtlanmış sayma.

## 8. Definition of Done
- [ ] Playwright raporu ve failure artifacts gizli veri içermeden kaydedilmiş; gerçek cihazdaki eksikler ayrı listeli.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](../../docs/06-NAVIGATION-AND-SCREEN-FLOW.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

