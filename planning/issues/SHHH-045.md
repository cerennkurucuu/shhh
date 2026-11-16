# SHHH-045 — Gerçek Android PWA ve WhatsApp paylaşım testleri

Labels: `type:test`, `priority:P0`, `phase:07-release`, `status:blocked`

## 1. Amaç
Android cihazda kurulum, gerçek WhatsApp ses paylaşımı ve SW POST gizlilik kapısını kanıtla.

## 2. Teknik kapsam
Gerçek Android kurulum/WhatsApp paylaşım senaryoları, SW yaşam döngüsü, proxy kayıtları ve sunucu fallback kanıtları kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
Cihaz/Android/Chrome/WhatsApp sürümleriyle cold/warm/offline/update/controller yok/scope yanlış matrisini çalıştır. Proxy/network capture+sunucu request logu eşleştir; sıfır audio byte çıkışını gözle. Güvensizse share manifesti kapalı ve picker alternatifi testli.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Gerçek WhatsApp A/B paylaşımı aynı geçerli oturuma doğru sırada eklenir.
- [ ] SW yok/update/fallback koşullarında ağ sızıntısı sonucu açık.
- [ ] Güvenli olduğu kanıtlanmayan share yayın kapısını geçmez.
- [ ] Manuel picker kurulumsuz ve share kapalı sürümde çalışır.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Kurulu PWA'ya iki gerçek ses paylaş; pause/resume ve tüm ağ çıkışını kaydet.

Negatif: PWA cold start, SW unregister, güncelleme, offline, uygulama öldürme, process restore ve kullanıcı kurmamışken paylaşım; server 405 tek başına yeterli kanıt değil.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-07](EPIC-07.md).

- [SHHH-003](SHHH-003.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-008](SHHH-008.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-009](SHHH-009.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-010](SHHH-010.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-028](SHHH-028.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-037](SHHH-037.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-038](SHHH-038.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-044](SHHH-044.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Kullanıcıdan yalnız “denedim çalıştı” istemek veya desktop E2E'yi cihaz testi yerine koymak.

## 8. Definition of Done
- [ ] Gerçek cihaz matrisi, redakte ağ/sunucu delilleri, tekrar adımları ve share GO/NO-GO sonucu hazır.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](../../docs/03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

