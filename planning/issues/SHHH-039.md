# SHHH-039 — Güvenilmeyen ses dosyalarının güvenli işlenmesi

Labels: `type:security`, `priority:P0`, `phase:06-security`, `status:blocked`

## 1. Amaç
SHHH-013–017 validation/decoder hattını kötü amaçlı girdiler ve kaynak tüketimi açısından sertleştir.

## 2. Teknik kapsam
Validator/demux/decoder'ın düşmanca girdilere karşı tahsis ve süre bütçesi, güvenli dosya adı/metin ve iptal sınırları kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
Bounded header/demux okuma, parser/decode budget ve timeout/cancel; gerçek container/codec kontrolü; dosya adını normalize et ancak ID olarak kullanma; metni escaped göster. Çok büyük/bozuk dosyayı tam buffer oluşturmadan reddet.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Boş/bozuk/sahte uzantılı dosya kontrollü hata verir.
- [ ] Metadata'dan sınırsız allocation oluşmaz.
- [ ] Decoder crash/timeout UI ve diğer kayıtları bozmaz.
- [ ] 50MB/20dk aday limitleri cihaz ölçümüyle kesinleşmeden destek garantisi sayılmaz.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Geçerli tüm desteklenen formatlar aynı güvenlik hattından geçer ve iptal kaynakları bırakır.

Negatif: Fuzz header, sahte duration/channels/sample count, sıkıştırılmış uzun ses, kesik container ve XSS dosya adı; uncontrolled OOM veya executable yorumlama olmamalı.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-06](EPIC-06.md).

- [SHHH-013](SHHH-013.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-014](SHHH-014.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-015](SHHH-015.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-017](SHHH-017.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-037](SHHH-037.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Antivirüs garantisi, sınırsız dosya desteği veya tam dosyayı körlemesine RAM'e alma.

## 8. Definition of Done
- [ ] Kötü girdi corpus'u, bütçe politikası ve decoder failure/cleanup kanıtları kayıtlı.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](../../docs/03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

