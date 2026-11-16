# SHHH-031 — Responsive tek sayfa ve sistem teması

Labels: `type:feature`, `priority:P1`, `phase:05-ui`, `status:blocked`

## 1. Amaç
Menüsüz tek çalışma ekranı; mobil öncelikli, masaüstünde ortalanmış düzen ve sistem açık/koyu görünümü uygula.

## 2. Teknik kapsam
Tek ekranın layout/token/semantik bileşenleri ve tema-reflow davranışları; Angular uygulama kabuğu yeniden kurulmaz.

## 3. Uygulanacak yaklaşım ve algoritmalar
CSS token'ları prefers-color-scheme ile seç; 320px–desktop akış düzeni, 200% zoom/reflow ve reduced motion. UI iş mantığından ayrı; semantik başlıklar, focus stilleri ve renk+simge+metin durumları.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] 320 CSS px ve 200% zoom'da ana işlemler yatay scroll istemiyor.
- [ ] Sistem teması çalışma sırasında değişince görünüm güncelleniyor.
- [ ] Gövde/eylem metinleri AA kontrast incelemesini geçiyor.
- [ ] Klavye focus'u görünür, menü/dashboard eklenmiyor.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Mobil portrait/landscape ve geniş masaüstünde aynı tek ekranı, iki temayı ve klavyeyle tab sırasını doğrula.

Negatif: Uzun dosya adı, uzun tek kelime, büyük sistem fontu, reduced-motion ve yüksek kontrast; ana eylemler taşmamalı.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-05](EPIC-05.md).

- [SHHH-007](SHHH-007.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Yeni tasarım teması seçicisi, profil veya ek dashboard ekranı.

## 8. Definition of Done
- [ ] Token tablosu, viewport ekran kanıtları ve temel erişilebilirlik kontrolü mevcut tasarım belgesiyle tutarlı.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [05-UI-DESIGN-SYSTEM.md](../../docs/05-UI-DESIGN-SYSTEM.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](../../docs/06-NAVIGATION-AND-SCREEN-FLOW.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

