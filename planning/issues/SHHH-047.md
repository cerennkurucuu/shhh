# SHHH-047 — Responsive, erişilebilirlik, offline ve regresyon testleri

Labels: `type:test`, `priority:P1`, `phase:07-release`, `status:blocked`

## 1. Amaç
Mobil/desktop sistem teması ve assistive kullanım ile cache/offline regresyonlarını yayın öncesi doğrula.

## 2. Teknik kapsam
Görünüm, klavye/ekran okuyucu, offline cache, uzun metin ve güncelleme regresyonlarının çapraz tarayıcı/viewport testleri kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
320/375/768/desktop, portrait/landscape, 200% zoom, açık/koyu canlı değişim, reduced-motion. Klavye/ekran okuyucu/kontrast elle+otomatik kontrol. İlk ziyaret offline ile model/kabuk cache sonrası offline ayrılır; SW update oturumu korur.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Ana eylemler klavyeyle erişilebilir ve focus kaybolmuyor.
- [ ] Durumlar sadece renkle anlatılmıyor; live region spam yok.
- [ ] Uzun metin/listede yatay taşma ve yanlış kopyalama yok.
- [ ] Önbellekli modelle offline transkripsiyon kanıtlı; ilk offline açılış sınırlaması açıklanmış.
- [ ] Önceki başarılı regresyonlar yeniden geçiyor.

## 5. Pozitif ve negatif test senaryoları
Pozitif: İki tema ve mobil/desktop'ta ses ekle/kopyala/bitir; cached offline resume ve SW update senaryoları.

Negatif: Eksik/bozuk model cache, ilk offline ziyaret, yüksek zoom, clipboard denial, büyük sistem fontu ve virtual list focus; yanıltıcı hazır/başarı yok.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-07](EPIC-07.md).

- [SHHH-031](SHHH-031.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-034](SHHH-034.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-036](SHHH-036.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-038](SHHH-038.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-044](SHHH-044.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Otomatik erişilebilirlik aracının tek başına tam uygunluk kanıtı sayılması.

## 8. Definition of Done
- [ ] Viewport/AA/klavye/ekran okuyucu ve offline regresyon raporu; kalan P0/P1 bulguları sahipli ve yayın etkisi belli.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [05-UI-DESIGN-SYSTEM.md](../../docs/05-UI-DESIGN-SYSTEM.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](../../docs/06-NAVIGATION-AND-SCREEN-FLOW.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

