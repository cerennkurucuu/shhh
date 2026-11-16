# SHHH-038 — CSP, HTTPS ve ağ erişim politikası

Labels: `type:security`, `priority:P0`, `phase:06-security`, `status:blocked`

## 1. Amaç
Statik dağıtımda HTTPS, en az yetkili CSP ve yalnız uygulama/model kaynaklarına izin veren ağ politikası tasarla/uygula.

## 2. Teknik kapsam
Hosting header'ları, network allowlist, Worker/WASM policy gereksinimleri, statik ve model kaynaklarının cross-origin politikaları kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
connect-src/worker-src/script-src/object-src/base-uri/frame-ancestors envanteri; WASM/Worker ihtiyacını seçilen runtime'a göre doğrula, blanket unsafe-eval ekleme. COOP/COEP/CORP ve model CORS uyumu gerekiyorsa kontrollü test et; font/analytics gibi gereksiz üçüncü taraf yok.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Üretim origin HTTPS ve mixed-content yok.
- [ ] Ses/transkript/dosya adı için upload/telemetry endpoint'i yok.
- [ ] CSP ihtiyaç dışı dış bağlantıyı engelliyor; modeli/Worker'ı bozmayacak test kanıtı var.
- [ ] Headers ve hosting config sürümlenebilir; localhost geliştirme farkları belgeli.

## 5. Pozitif ve negatif test senaryoları
Pozitif: İzinli model indirme, Worker WASM başlatma ve offline cache tekrar kullanımını policy altında çalıştır.

Negatif: Harici fetch, inline injection, iframe embedding, mixed content, COEP CORS hatası ve CSP ihlali logunda hassas içerik; engel/uyum açıkça raporlanır.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-06](EPIC-06.md).

- [SHHH-007](SHHH-007.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-008](SHHH-008.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-020](SHHH-020.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-037](SHHH-037.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Bulut çıkarım API'sine izin veya gerekçesiz geniş CSP istisnası.

## 8. Definition of Done
- [ ] Header ve allowlist matrisi, CSP pozitif/negatif testleri ve hosting gereksinimleri hazır.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](../../docs/03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [09-SOURCES-AND-LICENSES.md](../../docs/09-SOURCES-AND-LICENSES.md)

