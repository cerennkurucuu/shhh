# SHHH-025 — IndexedDB geçici oturum veri modeli

Labels: `type:feature`, `priority:P0`, `phase:04-session`, `status:blocked`

## 1. Amaç
sessions, audios, segments, checkpoints, transfers ve leases store'larını, birleşik anahtarlarını ve sadece gereken geçici veri politikasını somutlaştır.

## 2. Teknik kapsam
Repository arayüzü, şema sürümü, store/index anahtarları, ilişkisel tutarlılık, geçici Blob yaşam döngüsü ve migration hata durumları bu işin sınırıdır.

## 3. Uygulanacak yaklaşım ve algoritmalar
Versioned şema; sessionId/audioId/segmentIndex benzersizliği; sıra ve dil/config metadata'sı; onupgradeneeded migration ve blocked/versionchange protokolü. Transfer Blob ACK sonrası silinir; kaynak ses ancak yeniden üretim gerekmiyorsa kaldırılır.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Boş kurulum ve sürüm geçişi veri bütünlüğünü korur.
- [ ] Store'lar arasında oturuma bağlı yetim kayıt kalmaz.
- [ ] QuotaExceeded/abort yazıyı geri alır, diğer kayıtlar bozulmaz.
- [ ] Ham sesin saklanma gerekçesi ve silinme anı store bazında belgeli.

## 5. Pozitif ve negatif test senaryoları
Pozitif: İki ses ve üç segment kaydet, yeniden aç ve aynı ID/sıra/metinleri geri oku; tamamlanan ve tekrar üretim gerektirmeyen sesin Blob'unu kaldır.

Negatif: Migration ortasında kapanma, başka pencerede eski DB bağlantısı, kota dolması ve geçersiz yabancı kimlik dene; yarım şema veya başka oturuma veri sızması olmamalı.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-04](EPIC-04.md).

- [SHHH-007](SHHH-007.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-010](SHHH-010.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-011](SHHH-011.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Kalıcı arşiv, hesap veya sunucu veritabanı.

## 8. Definition of Done
- [ ] Şema/migration entegrasyon kanıtı, store yaşam döngüsü tablosu ve quota hata yolu hazır.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](../../docs/03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)

