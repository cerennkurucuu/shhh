# SHHH-029 — Arka plan duraklatma ve devam ettirme

Labels: `type:feature`, `priority:P0`, `phase:04-session`, `status:blocked`

## 1. Amaç
Page Visibility üzerinden ağır işi durdur ve görünürlük geri geldiğinde güvenli checkpoint'ten devam ettir.

## 2. Teknik kapsam
Visibility sinyali, Worker/decoder iptali, güvenli restore, lease devralma ve görünür kullanıcı kontrolü kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
hidden geldiğinde yeni segment başlatma; aktif işi kooperatif iptal veya Worker terminate ile durdur; yalnız güvenli commit'i koru. Visible ve kullanıcı devam eyleminde lease/config doğrula; process kill için açılış restore'u kullan, background callback garantisi verme.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Hidden sonrasında yeni inference işi başlatılmıyor.
- [ ] Yarım segment kalıcı tamamlandı sayılmıyor.
- [ ] Görünür+devam durumunda son committed checkpoint kullanılıyor.
- [ ] Pause sırasında Worker/decoder kaynakları bırakılıyor; sürekli background zamanlayıcı yok.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Segment 1 sonrasında uygulamadan ayrıl, dön ve devam et; önceki metin aynı, segment 2 bir kez eklenir.

Negatif: Segment ortasında hidden, OS kill, kilit ekranı, tab freeze ve geri dönüşte lease'in başkasına ait olması; stale result kabul edilmez.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-04](EPIC-04.md).

- [SHHH-017](SHHH-017.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-021](SHHH-021.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-026](SHHH-026.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-027](SHHH-027.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Tarayıcı kapalıyken garantili transkripsiyon veya background servis.

## 8. Definition of Done
- [ ] Görünürlük testleri ve gerçek cihaz CPU kanıtı SHHH-046 ile eşleşir; pause mesajı ve kontrol akışı belgeli.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](../../docs/03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](../../docs/06-NAVIGATION-AND-SCREEN-FLOW.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

