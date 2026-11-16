# SHHH-040 — Veri sızıntısı, log ve temizleme testleri

Labels: `type:security`, `priority:P0`, `phase:06-security`, `status:blocked`

## 1. Amaç
Geçici verinin ağ/log/cache/URL üzerinden sızmadığını ve güvenli silme protokolünü bağımsız sınamalarla doğrula.

## 2. Teknik kapsam
Ağ/console/log/URL/IDB/Cache gözlemi, hassas sentinel testleri, temizlik geri okuması ve stale result yarış testleri kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
Sentinel ses/metin/dosya adı kullan; request body/query, console, hata logu, cache ve IDB taraması. Manuel/TTL cleanup, retry, transfer staging ve multi-window stale result injection; model cache ayrımı.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Hassas sentinel ağ URL/body/log/analytics çıktısında yok.
- [ ] Manuel ve expired cleanup sonrası kullanıcı verisi store/cache taraması sıfır.
- [ ] Silme hatasında UI başarı göstermiyor.
- [ ] Model cache korunuyor; hata raporları transkript taşımıyor.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Başarılı iki sesli oturum sonrası manuel/12h cleanup; IDB/cache/network delillerini karşılaştır.

Negatif: Cleanup ortasında crash, SW fallback POST, decoder exception içine dosya adı gömme, iki pencere stale result ve quota hatası; sızıntı veya kalıntı P0 kaydedilir.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-06](EPIC-06.md).

- [SHHH-030](SHHH-030.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-037](SHHH-037.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-038](SHHH-038.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-039](SHHH-039.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Diskten fiziksel veri kurtarma testini garanti olarak sunma.

## 8. Definition of Done
- [ ] Sentinel tabanlı tekrar edilebilir testler ve sıfır sızıntı/kalıntı kanıtı veya açık yayın engeli raporu mevcut.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

