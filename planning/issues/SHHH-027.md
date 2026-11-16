# SHHH-027 — Sıralı işlem kuyruğu

Labels: `type:feature`, `priority:P0`, `phase:04-session`, `status:blocked`

## 1. Amaç
Çoklu ses için kalıcı FIFO sıra, tek ağır inference ve başka pencereyle koordinasyon sağla.

## 2. Teknik kapsam
QueueCoordinator durumları, kalıcı sequence tahsisi, pencere sahipliği, retry/iptal sırası ve decode prefetch sınırı kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
Enqueue sequence IDB transaction'da; queued/preparing/running/paused/completed/error/cancelled geçişleri. Web Locks veya IDB lease/fencing ile tek sahip; BroadcastChannel yalnız bildirim. Kuyruk backlog'u bounded ve kaynak bırakma checkpoint ile uyumlu.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Aynı anda aktif ağır iş sayısı tüm pencerelerde en fazla 1.
- [ ] Eşzamanlı enqueue'da sıra benzersiz ve monoton.
- [ ] Bir ses hata verdiğinde öncekiler korunur, açık retry politikası diğerlerini kilitlemez.
- [ ] Sahip pencere kapanınca stale sonuç yazmadan devralma yapılabilir.

## 5. Pozitif ve negatif test senaryoları
Pozitif: A/B/C sesini sıraya al; sıra A→B→C ve kart kimlikleri sabit; iki pencere tek Worker kullanır.

Negatif: A aktifken B paylaşımı, aynı anda lease devralma, iptal, askıya alınmış eski sahip ve yeniden açılış; iki inference veya sıra atlama oluşmamalı.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-04](EPIC-04.md).

- [SHHH-011](SHHH-011.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-021](SHHH-021.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-025](SHHH-025.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-026](SHHH-026.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Paralel çoklu model inference veya sonsuz RAM backlog'u.

## 8. Definition of Done
- [ ] FIFO, sahiplik ve hata toparlama testleri ile kuyruk durum tablosu teslim edildi.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](../../docs/03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](../../docs/06-NAVIGATION-AND-SCREEN-FLOW.md)

