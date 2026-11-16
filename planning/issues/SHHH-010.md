# SHHH-010 — Paylaşılan dosyanın güvenli geçici aktarımı

Labels: `type:feature`, `priority:P0`, `phase:01-pwa`, `status:blocked`

## 1. Amaç
Paylaşılan dosyanın güvenli geçici aktarımı ile shhh. v1.0 akışının güvenilirliğini sağlamak. Bu kayıt gelecekte yapılacak işi tanımlar; bu organizasyon turunda uygulama geliştirilmez.

## 2. Teknik kapsam
SW→sayfa aktarımı, kimlik, ACK, kısa ömürlü staging ve temizlik.

## 3. Uygulanacak yaklaşım ve algoritmalar
TransferId ile idempotent teslim; IDB staging commit sonrası yönlendirme; ACK sonrası staging silme; yetim kayıt taraması.

## 4. Kabul kriterleri
- [ ] Teslim kaybolmuyor
- [ ] tekrar ACK çift kayıt yapmıyor
- [ ] quota ve client kapanmasında toparlama
- [ ] staging TTL belgeli.
- [ ] Başarı, hata, iptal ve kesinti davranışları kapsam açısından incelenmiş; uygulanmayan dal gerekçelendirilmiş.
- [ ] İlgili gereksinim ve test kanıtları belgelerde izlenebilir; ölçülmeyen başarı iddiası yok.

## 5. Pozitif ve negatif test senaryoları
Pozitif: SW→sayfa aktarımı, kimlik, ACK, kısa ömürlü staging ve temizlik. için desteklenen en küçük geçerli girdiyle beklenen çıkış üretilir ve ilgili kabul kriteri doğrulanır.

Negatif ve sınır: Teslimden önce/sonra çökme; storage dolu; yanlış transferId; ACK kaybı; büyük dosyada gereksiz kopya yok.

Her senaryoda beklenen/gerçek çıktı, cihaz ve sürüm, model/config hash (uygunsa), kaynak ve tarih kaydedilir. Hata senaryosu mevcut tamamlanmış oturum kayıtlarını bozmamalı ve gizli veri loglamamalıdır.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-01](EPIC-01.md).

- [SHHH-009](SHHH-009.md) tamamlanmış veya gerekli kanıtı üretmiş olmalı.

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

