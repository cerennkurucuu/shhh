# SHHH-012 — Manuel dosya seçimi ve paylaşım alternatifi

Labels: `type:feature`, `priority:P0`, `phase:01-pwa`, `status:blocked`

## 1. Amaç
Manuel dosya seçimi ve paylaşım alternatifi ile shhh. v1.0 akışının güvenilirliğini sağlamak. Bu kayıt gelecekte yapılacak işi tanımlar; bu organizasyon turunda uygulama geliştirilmez.

## 2. Teknik kapsam
Normal web dosya seçimi, sürükle-bırak, klavye ve paylaşım destek yönlendirmesi.

## 3. Uygulanacak yaklaşım ve algoritmalar
Input/drop aynı doğrulama ve kuyruğa girer; accept yalnız ipucu; iptal mevcut oturumu değiştirmez.

## 4. Kabul kriterleri
- [ ] Kurulumsuz kullanım
- [ ] erişilebilir input
- [ ] geçersiz dosya açıklaması
- [ ] sistem desteğine uygun mesaj.
- [ ] Başarı, hata, iptal ve kesinti davranışları kapsam açısından incelenmiş; uygulanmayan dal gerekçelendirilmiş.
- [ ] İlgili gereksinim ve test kanıtları belgelerde izlenebilir; ölçülmeyen başarı iddiası yok.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Normal web dosya seçimi, sürükle-bırak, klavye ve paylaşım destek yönlendirmesi. için desteklenen en küçük geçerli girdiyle beklenen çıkış üretilir ve ilgili kabul kriteri doğrulanır.

Negatif ve sınır: Drop klasör/non-audio, seçim iptali, tekrar seçim ve mobil picker; WhatsApp sohbetini okuma yok.

Her senaryoda beklenen/gerçek çıktı, cihaz ve sürüm, model/config hash (uygunsa), kaynak ve tarih kaydedilir. Hata senaryosu mevcut tamamlanmış oturum kayıtlarını bozmamalı ve gizli veri loglamamalıdır.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-01](EPIC-01.md).

- [SHHH-007](SHHH-007.md) tamamlanmış veya gerekli kanıtı üretmiş olmalı.

## 7. Kapsam dışı
Bu Issue dışında yeni özellik eklemek; backend veya bulut inference kullanmak. Hesap, reklam, tercüme, özet, konuşmacı tanıma ve çok büyük dosya garantisi v1 dışındadır.

## 8. Definition of Done
- [ ] Tüm kabul kriterleri kanıtla karşılanmış.
- [ ] Pozitif ve negatif senaryoların sonuçları kayıtlı.
- [ ] Bağımlılıklar ve ilgili belgeler güncel; veri/lisans/ağ riskleri açıklanmış.
- [ ] Ceren Kurucu incelemesine hazır; bu turda commit/push/Issue kapatma yok.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](../../docs/03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](../../docs/04-LOCAL-DATA-AND-PRIVACY.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](../../docs/06-NAVIGATION-AND-SCREEN-FLOW.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

