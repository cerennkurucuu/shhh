# SHHH-026 — Atomik checkpoint ve tamamlanan segmentlerin korunması

Labels: `type:feature`, `priority:P0`, `phase:04-session`, `status:blocked`

## 1. Amaç
SHHH-023 segment birleştirme sözleşmesini gerçek kalıcı transaction ve kesinti toparlamasıyla tamamla; algoritmayı yeniden yazma.

## 2. Teknik kapsam
SegmentRepository ile checkpoint deposunun kalıcı commit/restore entegrasyonu; crash recovery, config kimliği ve eski Worker yazımının reddi kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
Sonuç+checkpoint+audio ilerlemesi tek readwrite transaction; oncomplete öncesi başarı yok. session/audio/segment unique key ve model/config hash ile idempotent upsert; monotonic fencing token eski sahibin yazmasını reddeder.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Commit öncesi kesintide sonuç ve checkpoint birlikte yok.
- [ ] Commit sonrası kesintide ikisi birlikte var ve segment tekrar inference'a gitmiyor.
- [ ] Out-of-order sonuç son güvenli ardışık checkpoint'i atlatmıyor.
- [ ] Değişen model/config eski checkpoint'le karışmıyor.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Segment 0/1'i commit et, uygulamayı yeniden başlat; yalnız 2'den devam et ve metinde tek kopya doğrula.

Negatif: Transaction abort, disk/kota hatası, sonuçtan önce öldürme, oncomplete sonrası öldürme ve eski Worker sonucu; yarım segment yeniden denenebilir, tamamlanmış metin kaybolmaz.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-04](EPIC-04.md).

- [SHHH-023](SHHH-023.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-025](SHHH-025.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Aynı metin birleştirme algoritmasının ikinci uygulaması.

## 8. Definition of Done
- [ ] Crash injection testleri dört kesinti noktasında geçer; R06 transaction kanıtı ve restore davranışı kayıtlı.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](../../docs/03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

