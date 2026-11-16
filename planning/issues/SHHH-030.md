# SHHH-030 — 12 saatlik zaman aşımı ve manuel güvenli temizleme

Labels: `type:feature`, `priority:P0`, `phase:04-session`, `status:blocked`

## 1. Amaç
Son gerçek etkinlikten 12 saat sonra sonraki açılışta ve kullanıcı bitir dediğinde geçici ses/metin/iş kayıtlarını doğrulayarak sil.

## 2. Teknik kapsam
Session TTL, lastActivityAt kaynağı, manuel finish, çoklu store/cache temizliği, epoch bariyeri ve doğrulanmış başarı bildirimi kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
TTL now-lastActivityAt >= 12h; progress/heartbeat TTL uzatmaz. Açılışta temizleme iş kabulünden önce. Epoch artır→Worker/decoder durdur→pencereler arası yazma bariyeri→ilgili store ve geçici cache sil→geri oku. Model/statik cache ayrı; hata retry edilebilir cleaning-error.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] 11:59:59 oturum korunur, tam 12:00:00 açılışta temizlenir.
- [ ] Manuel temizleme tüm kullanıcı sesi/transkript/checkpoint/transfer kayıtlarını sıfırlar.
- [ ] Silme doğrulanmadan başarı gösterilmez.
- [ ] Geç Worker cevabı veri geri yazamaz.
- [ ] Model cache ve başka uygulama verileri silinmez.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Birkaç seslik oturumu bitir; tüm store/cache sayımlarını geri okuyup sıfır doğrula; model cache'i koru.

Negatif: DB blocked, silme hatası, iki pencere, saat geri/ileri değişimi, eksik timestamp ve cleanup ortasında kapanma; sonraki açılışta tekrar dene ve fiziksel geri getirilemez silme iddiası verme.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-04](EPIC-04.md).

- [SHHH-025](SHHH-025.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-026](SHHH-026.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-029](SHHH-029.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Arka planda 12 saatlik sürekli timer veya disk düzeyinde silme garantisi.

## 8. Definition of Done
- [ ] R10/R11 test matrisi, sahte saat sınır testi, cleanup failure injection ve veri yaşam döngüsü kanıtı hazır.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](../../docs/06-NAVIGATION-AND-SCREEN-FLOW.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

