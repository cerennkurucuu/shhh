# SHHH-035 — Yeni ses bekleme, bitirme ve hata deneyimi

Labels: `type:feature`, `priority:P1`, `phase:05-ui`, `status:blocked`

## 1. Amaç
“Başka ses ekle” ile beklemeyi ve “İşlemi bitir ve temizle” ile oturum bitirmeyi açıkça ayır; hata toparlamasını anlaşılır yap.

## 2. Teknik kapsam
Bekleme/paused/completed/cleaning/error etkileşimleri, düğme durumları, retry mesajları ve focus geçişleri kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
Bekleme oturumu saklar ve background inference tetiklemez. Finish cleaning durumunda girişleri engeller; silme onayı sonrası empty. Hata kodu ve uygulanabilir retry; focus geri dönüşü ve önceki metinlerin korunması.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Başka ses ekle sonrası kartlar kalır ve yeni ses aynı oturuma eklenir.
- [ ] Temizleme hatası “temizlendi” diye sunulmaz.
- [ ] Codec/model/kota/worker hatasının gerçek teknik nedeni kullanıcıya anlaşılır verilir.
- [ ] Pause, waiting, cleaning ve retry görsel+semantik olarak ayrılır.

## 5. Pozitif ve negatif test senaryoları
Pozitif: A tamamla→bekle→B ekle→bitir akışını tek ekranda uygula; focus ilgili eyleme döner.

Negatif: Retry sırasında yeniden paylaşım, DB silme reddi, çift finish tıklaması ve stale result; silinen oturum dirilmez.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-05](EPIC-05.md).

- [SHHH-028](SHHH-028.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-029](SHHH-029.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-030](SHHH-030.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-032](SHHH-032.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-033](SHHH-033.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-034](SHHH-034.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
WhatsApp'a zorunlu otomatik yönlendirme veya teknik nedeni gizleyen genel hata.

## 8. Definition of Done
- [ ] R09/R10/R12 durum geçişlerinin UI testleri ve kibar/hafif eğlenceli metinleri onaya hazır.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [05-UI-DESIGN-SYSTEM.md](../../docs/05-UI-DESIGN-SYSTEM.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](../../docs/06-NAVIGATION-AND-SCREEN-FLOW.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

