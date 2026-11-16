# SHHH-032 — Ses yükleme ve paylaşım karşılama arayüzü

Labels: `type:feature`, `priority:P1`, `phase:05-ui`, `status:blocked`

## 1. Amaç
Picker/drop ve Android share gelişini aynı doğrulama/oturum akışına bağlayan erişilebilir giriş alanı oluştur.

## 2. Teknik kapsam
Upload alanı, erişilebilir file input/drop yüzeyi, paylaşım karşılama kartı, erken uyarılar ve destek açıklamaları kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
Dosya accept yalnız ipucu; gerçek doğrulama SHHH-013/014. Boş/drag/validating/rejected/queued durumları ve klavye alternatifi; paylaşım desteği yoksa manuel seçim, güvenlik kapısı kapalıysa koşulsuz paylaşım önerisi yok.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Kurulumsuz webde picker çalışıyor.
- [ ] Drop ve picker aynı reddetme nedenini veriyor.
- [ ] 50MB/20dk ölçülmemiş öneri olarak ifade ediliyor.
- [ ] Paylaşım alındı duyurusu var, eski kartlar korunuyor.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Geçerli OPUS seç ve paylaş; her iki yolda aynı kart/sıra ve “Sesin geldi, hemen hazırlıyorum.” duyurusunu doğrula.

Negatif: Boş dosya, yanlış codec, klasör drop, seçim iptali, unsupported share ve aşırı büyük dosya; pahalı decode öncesi uyarı/ret.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-05](EPIC-05.md).

- [SHHH-012](SHHH-012.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-013](SHHH-013.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-014](SHHH-014.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-028](SHHH-028.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-031](SHHH-031.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
MIME/codec algoritmasını UI içinde yeniden uygulama.

## 8. Definition of Done
- [ ] R01/R02 UI entegrasyon kanıtları, klavye picker ve hata metinleri tamam.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [05-UI-DESIGN-SYSTEM.md](../../docs/05-UI-DESIGN-SYSTEM.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](../../docs/06-NAVIGATION-AND-SCREEN-FLOW.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

