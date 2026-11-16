# SHHH-036 — shhh. nedir açıklaması, kaynaklar ve footer

Labels: `type:feature`, `priority:P1`, `phase:05-ui`, `status:blocked`

## 1. Amaç
Sayfa sonunda ürün amacı, yerel teknoloji/gizlilik sınırları, kaynaklar ve sahiplik açıklamasını göster.

## 2. Teknik kapsam
En alt tek sayfa açıklaması, teknoloji/kaynak bağlantıları, sahiplik ayrımı ve footer metni; ayrı navigasyon eklenmez.

## 3. Uygulanacak yaklaşım ve algoritmalar
Menüsüz sayfada alt bilgi; Ceren Kurucu fikir/araştırma/algoritmik yaklaşım/ürün yönetimi sahibi, agent teknik kod uygulayıcısı. Footer tam “by cerenkurucu · Built with AI assistance”. Resmi kaynaklara güvenli bağlantılar; bağımsız yeni ekran yok.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Ürün adı yalnız shhh. olarak görünür.
- [ ] Footer tam metinle bulunur.
- [ ] Kullanıcı hesabı/backend/ücretli AI/takip olmadığı doğru kapsamda açıklanır.
- [ ] POST fallback doğrulanmadan “asla sunucuya gitmez” yazmaz.
- [ ] 12 saat ve geçici yerel veri açıklaması erişilebilir.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Alt bölümü iki temada klavye/ekran okuyucuyla oku; sahiplik ve teknoloji kaynakları doğru.

Negatif: Kırık dış link, dar ekran uzun URL, AI'yı ürün sahibi gösteren metin ve kesin silme/başarı oranı iddiası içerik denetiminde reddedilir.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-05](EPIC-05.md).

- [SHHH-001](SHHH-001.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-031](SHHH-031.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Pazarlama dashboard'u, reklam, analitik veya AI'ya fikir sahipliği atfetme.

## 8. Definition of Done
- [ ] Sahiplik ve footer içerik kontrolü ile kaynak bağlantı listesi doğrulandı; gizlilik metni SHHH-041 ile eşleşir.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [01-PROJECT-OVERVIEW.md](../../docs/01-PROJECT-OVERVIEW.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [05-UI-DESIGN-SYSTEM.md](../../docs/05-UI-DESIGN-SYSTEM.md)
- [09-SOURCES-AND-LICENSES.md](../../docs/09-SOURCES-AND-LICENSES.md)

