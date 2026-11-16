# SHHH-037 — Tehdit modeli ve Web Share Target güvenliği

Labels: `type:security`, `priority:P0`, `phase:06-security`, `status:blocked`

## 1. Amaç
Paylaşım ve yerel veri için varlık, saldırgan, güven sınırı ve yayın engeli modelini oluştur; SHHH-003 araştırmasını uygulama kanıtıyla tamamla.

## 2. Teknik kapsam
Varlık/saldırgan/güven sınırı tablosu, SW paylaşım kanalları, sunucu fallback'i, local storage ve yayın risk kararları kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
SW multipart POST, registration scope, first load/cold start/update/no-controller fallback, malicious same-origin script, transfer replay ve multi-window risklerini değerlendir. Her risk için etki/olasılık/sahip/azaltım/kalan risk/kanıt; manuel picker fallback.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Her paylaşım yolu için dosyanın ağ çıkışı izlenebilir.
- [ ] SW'siz POST riskine sadece sunucunun reddiyle “bayt gönderilmedi” sonucu çıkarılmaz.
- [ ] Kanıt yoksa share_target yayın manifestinde kapalı.
- [ ] Tehdit modelinde XSS, kota, çalıntı cihaz ve stale write bulunur.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Kontrollü SW altında bir paylaşımın yerel teslimini ağ kaydı ve sunucu request loguyla eşleştir.

Negatif: SW absent/scope dışı/crash/güncelleme, redirect ve crafted multipart; dosya sunucuya gidebiliyorsa P0 ve paylaşım NO-GO.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-06](EPIC-06.md).

- [SHHH-003](SHHH-003.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-006](SHHH-006.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-009](SHHH-009.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-010](SHHH-010.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-011](SHHH-011.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Güvensiz akışı sırf çalışıyor diye yayınlama veya mutlak gizlilik iddiası.

## 8. Definition of Done
- [ ] Tehdit tablosu, ağ test adımları ve kalan risk kararı Ceren Kurucu incelemesine hazır; gerçek cihaz doğrulaması SHHH-045'te.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](../../docs/03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

