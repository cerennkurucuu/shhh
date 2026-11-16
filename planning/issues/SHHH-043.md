# SHHH-043 — Algoritma ve servis birim testleri

Labels: `type:test`, `priority:P0`, `phase:07-release`, `status:blocked`

## 1. Amaç
Ses/segment/model/storage/state servislerinin gözlenebilir sözleşmelerini deterministik unit testlerle doğrula.

## 2. Teknik kapsam
Saf ses algoritmaları, Worker sözleşmeleri, model/storage/queue servisleri ve clock kaynaklı state davranışlarının test altyapısı kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
Vitest fake clock, typed Worker fake ve repository failure injection. Validation/resampling sample toleransı, core/overlap, no-speech, model hash, checkpoint, lease/FIFO ve TTL sınırları için tablo ve özellik tabanlı örnekler; uygulama satırlarını kopyalayan test yok.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Kritik başarı/abort/error yollarının test kimlikleri kabul kriterlerine bağlı.
- [ ] Tamamlanmış segment duplicate testinde inference sayısı artmıyor.
- [ ] 12h eşiği ve clock skew testleri deterministik.
- [ ] Fixture lisansı ve model/config varsayımları kayıtlı.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Bilinen tone resampling, küçük Türkçe ground truth, sıra ve transaction fake'lerinde beklenen çıktıları sabitle.

Negatif: NaN/boş/bozuk dosya, overlap doğal tekrar, kota abort, stale lease, yanlış hash ve cleanup failure; test gerçekten bozuk davranışta kırılır.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-07](EPIC-07.md).

- [SHHH-018](SHHH-018.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-024](SHHH-024.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-026](SHHH-026.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-027](SHHH-027.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-029](SHHH-029.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-030](SHHH-030.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Salt kapsam yüzdesi hedefi veya gerçek Android testini mock ile geçti sayma.

## 8. Definition of Done
- [ ] Birim test raporu, gereksinim izlenebilirliği ve bilerek bozulan örneği yakalayan test kanıtı var.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [07-CODING-STANDARDS.md](../../docs/07-CODING-STANDARDS.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

