# SHHH-033 — Gerçek ilerleme ve işlem durumu bileşenleri

Labels: `type:feature`, `priority:P1`, `phase:05-ui`, `status:blocked`

## 1. Amaç
İndirme baytı ve işlenmiş ses süresine dayalı ilerleme; preparation/download/inference/pause/error durumlarını ayır.

## 2. Teknik kapsam
Model ve inference progress event'lerinin sunumu, hesaplanan pay/payda, durum paleti, eski event filtresi ve canlı duyuru kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
Model loadedBytes/totalBytes; segment core süreleri üzerinden toplam committed işlenmiş süre, overlap iki kez sayılmaz. Bilinmeyen toplamda indeterminate; state machine ve requestId filtresi; aria-live güncellemelerini seyrekleştir.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Bilinen toplamda gösterilen yüzde ölçülen pay/payda ile aynı.
- [ ] Content-Length veya süre yoksa yüzde gösterilmiyor.
- [ ] Resume sonrası committed süre düşmüyor veya iki kez artmıyor.
- [ ] Sarı/yeşil/kırmızı/nötr durumlar yazı ve simgeyle birlikte.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Model indirme ve 3 segmentli işte progress event'lerini UI değerleriyle karşılaştır; pause/continue'da durum doğru.

Negatif: Stale progress, sıfır toplam, kesilen indirme, sonucun commit edilememesi ve aşırı event; sahte 99/100 veya kalıcı başarı yok.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-05](EPIC-05.md).

- [SHHH-020](SHHH-020.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-021](SHHH-021.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-027](SHHH-027.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-029](SHHH-029.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-031](SHHH-031.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Sahte zaman bazlı yüzde, ölçülmemiş ETA veya doğruluk yüzdesi.

## 8. Definition of Done
- [ ] R07 için hesap ve erişilebilir duyuru testleri; indeterminate ve error ekranları doğrulandı.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](../../docs/03-SOFTWARE-ARCHITECTURE.md)
- [05-UI-DESIGN-SYSTEM.md](../../docs/05-UI-DESIGN-SYSTEM.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](../../docs/06-NAVIGATION-AND-SCREEN-FLOW.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

