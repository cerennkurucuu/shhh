# SHHH-046 — Performans, bellek, CPU ve pil davranışı

Labels: `type:test`, `priority:P0`, `phase:07-release`, `status:blocked`

## 1. Amaç
Kısa/orta ses hedefinde tiny/base CPU/RAM/süre ve görünürlük/pil etkisini ölç; cihaz limitlerini veriye bağla.

## 2. Teknik kapsam
Ölçüm cihazları/fixture'lar, cold/warm runtime durumları, kaynak/pil/termal gözlemler ve limit karar matrisi kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
Düşük/orta hedef cihaz sınıflarında cold model download/init ve warm inference ayrı, aynı fixture için en az 3 tekrar. Peak RAM, gerçek zaman oranı, long task, CPU, termal/pil koşulları ve pause sonrası kullanım; ardışık kayıtlarla trend.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Cihaz/OS/browser/model/hash/ses uzunluğu/ortam koşulu raporda.
- [ ] En az 3 tekrar ve min/medyan/max değerler var.
- [ ] Pause sonrası ağır inference başlatılmadığı ölçülüyor.
- [ ] 50MB/20dk yalnız kanıtlanan cihaz bütçesinde limit olarak kararlaştırılır.
- [ ] Bellek birikimi veya OOM için ret/fallback kararı var.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Kısa ve orta kayıtları model tiny/base ile işleyip süre/RAM/CPU karşılaştır; tekrar kayıt sonunda kaynaklar tabana yaklaşır.

Negatif: Düşük RAM, termal throttle, batarya düşük, sekme hidden ve ön limit çevresi; 90dk/40GB garantisi veya ölçülmemiş pil vaadi verilmez.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-07](EPIC-07.md).

- [SHHH-004](SHHH-004.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-017](SHHH-017.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-021](SHHH-021.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-029](SHHH-029.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-044](SHHH-044.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Kesin pil yüzdesi tasarrufu garantisi veya uzun kayıt kapsamını kendiliğinden büyütme.

## 8. Definition of Done
- [ ] Ölçüm ham verisi, cihaz destek/limit önerisi ve Ceren Kurucu performans kararı mevcut.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [01-PROJECT-OVERVIEW.md](../../docs/01-PROJECT-OVERVIEW.md)
- [03-SOFTWARE-ARCHITECTURE.md](../../docs/03-SOFTWARE-ARCHITECTURE.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

