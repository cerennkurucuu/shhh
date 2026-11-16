# SHHH-034 — Transkript kartları ve kopyalama

Labels: `type:feature`, `priority:P1`, `phase:05-ui`, `status:blocked`

## 1. Amaç
Her ses için zaman sıralı metni, dil/durum bilgisini ve güvenilir kopyalama eylemini göster.

## 2. Teknik kapsam
Audio başına kart kimliği, birleşik transkript seçimi, clipboard adaptörü, uzun liste render'ı ve güvenli metin çıktısı kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
Segment sonucunu SHHH-023/026'dan oku; DOM'a escaped text olarak yaz. Clipboard yalnız açık kullanıcı eyleminde; izin reddinde seçilebilir metin fallback'i. Uzun listede incremental render/sanallaştırma focus ve screen reader'ı korur.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Kopyalanan metin görünür birleşik transkriptle birebir aynı.
- [ ] Clipboard reddinde başarı mesajı çıkmıyor.
- [ ] Sesler arası metin karışmıyor; yeni ses eski kartı değiştirmiyor.
- [ ] XSS benzeri transkript düz metin görünür.
- [ ] Uzun metinlerde seçme ve klavye kopyalama erişilebilir.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Türkçe/İngilizce iki kartı ayrı ayrı kopyala; satır sonları ve Unicode korunur.

Negatif: Clipboard denial/insecure context, 100k karakter fixture, HTML/script metni, tamamlanmamış son segment ve recycled list item; yanlış kart metni kopyalanmaz.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-05](EPIC-05.md).

- [SHHH-023](SHHH-023.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-026](SHHH-026.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-031](SHHH-031.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Otomatik clipboard okuma, paylaşım veya özetleme.

## 8. Definition of Done
- [ ] R08 testleri, uzun metin render ölçümü ve clipboard fallback kanıtları kayıtlı.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](../../docs/03-SOFTWARE-ARCHITECTURE.md)
- [05-UI-DESIGN-SYSTEM.md](../../docs/05-UI-DESIGN-SYSTEM.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](../../docs/06-NAVIGATION-AND-SCREEN-FLOW.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

