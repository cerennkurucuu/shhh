# SHHH-028 — WhatsApp'tan arka arkaya ses paylaşımı

Labels: `type:feature`, `priority:P0`, `phase:04-session`, `status:blocked`

## 1. Amaç
SHHH-010 teslim altyapısını mevcut oturum ve FIFO ile bütünleştir; kullanıcı başka uygulamaya gidip dönünce eski metni koru.

## 2. Teknik kapsam
Share tesliminden oturum kartına kadar transfer ledger/ACK ve FIFO bütünleşmesi; art arda gelen farklı seslerin kimliklerinin korunması kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
transferId teslim ledger'ı ve ACK idempotency; yeni ses mevcut session'a atomik eklenir. Aynı transfer yeniden teslimi duplicate sayılır, bilinçli tekrar seçim yeni audioId olabilir. Cleanup kilidi sırasında gelen transfer silinen oturumu diriltemez.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] A sonucu dururken B paylaşımı A'yı silmiyor.
- [ ] Bir transferId en fazla bir audio oluşturuyor.
- [ ] Yeni paylaşım tek ağır iş kuralını bozmuyor.
- [ ] Cleanup/expired oturumda gelen paylaşım önce temizlik bariyerini bekliyor.

## 5. Pozitif ve negatif test senaryoları
Pozitif: WhatsApp→A→Başka ses ekle→WhatsApp→B akışında iki kart ve sıra korunur; B sonra tamamlanır.

Negatif: ACK kaybı, process kill, iki ayrı pencereye teslim, geç gelen eski transfer ve yeni sesin aynı dosya adına sahip olması; isimden dedup yapılmaz.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-04](EPIC-04.md).

- [SHHH-010](SHHH-010.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-011](SHHH-011.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-027](SHHH-027.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
WhatsApp sohbetini doğrudan okuma veya otomatik uygulama açma garantisi.

## 8. Definition of Done
- [ ] Tekrarlı teslim ve oturum birleşimi entegrasyon testleri; gerçek WhatsApp kanıtı SHHH-045'e izlenebilir.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](../../docs/06-NAVIGATION-AND-SCREEN-FLOW.md)

