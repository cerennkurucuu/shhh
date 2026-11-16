# SHHH-041 — Kullanıcı gizlilik bilgilendirmesi

Labels: `type:documentation`, `priority:P1`, `phase:06-security`, `status:blocked`

## 1. Amaç
Gerçek veri/ağ davranışını tek sayfada kısa ve doğru anlat; gizlilik ifadesini test kanıtlarıyla eşleştir.

## 2. Teknik kapsam
Kısa gizlilik açıklaması ile model download, session TTL, clipboard ve silme sınırlamalarını anlatan teknik olarak doğru kullanıcı metni kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
“Konuşmalar sunucumuzda saklanmaz. Devam eden oturum verileri cihazda geçici tutulur ve oturum bitirildiğinde temizlenir.” cümlesi; 12h sonrası bir sonraki açılış, model indirmesi ağı, clipboard'un sistemde kalabilmesi ve disk silme sınırı. Paylaşım güvenliği yayın kapısıyla tutarlı.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Zorunlu gizlilik cümlesi kullanıcıya görünür.
- [ ] 12 saat sonrası arka planda otomatik silme sözü yok.
- [ ] Koşulsuz sunucuya gitmeme ve fiziksel geri getirilemez silme iddiası yok.
- [ ] Ücretli AI, hesap, takip ve backend olmaması doğru belirtilir.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Manuel seçim ve doğrulanmış paylaşım sürümü için görünen metni ağ/veri yaşam döngüsü delilleriyle madde madde karşılaştır.

Negatif: Share kapalı/yayınlanmamış, silme hatası, clipboard reddi ve browser eviction durumlarında yanlış garanti veya yanıltıcı başarı ifadesi reddedilir.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-06](EPIC-06.md).

- [SHHH-030](SHHH-030.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-036](SHHH-036.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-037](SHHH-037.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-040](SHHH-040.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Hukuki uygunluk sertifikası, takip rızası ekranı veya gereksiz hesap akışı.

## 8. Definition of Done
- [ ] Gizlilik metni içerik kontrolü, teknik kanıt bağlantıları ve Ceren Kurucu içerik onayı hazır.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [01-PROJECT-OVERVIEW.md](../../docs/01-PROJECT-OVERVIEW.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [05-UI-DESIGN-SYSTEM.md](../../docs/05-UI-DESIGN-SYSTEM.md)

