# SHHH-014 — Ses süresi ve kodek tespiti

Labels: `type:feature`, `priority:P0`, `phase:02-audio`, `status:blocked`

## 1. Amaç
Ses süresi ve kodek tespiti ile shhh. v1.0 akışının güvenilirliğini sağlamak. Bu kayıt gelecekte yapılacak işi tanımlar; bu organizasyon turunda uygulama geliştirilmez.

## 2. Teknik kapsam
Metadata üzerinden süre/codec/track ve destek tespiti.

## 3. Uygulanacak yaklaşım ve algoritmalar
Bounded demux; süre belirsizse indeterminate ve işlenmiş süre göster; NaN/Infinity/negatif metadata reddi; full decode zorunluysa bütçe kontrolü.

## 4. Kabul kriterleri
- [ ] Gerçek codec ve süre veya açık belirsizlik
- [ ] 20 dakika öneri uyarısı
- [ ] tam çözümleme gereksinimi gerekçeli.
- [ ] Başarı, hata, iptal ve kesinti davranışları kapsam açısından incelenmiş; uygulanmayan dal gerekçelendirilmiş.
- [ ] İlgili gereksinim ve test kanıtları belgelerde izlenebilir; ölçülmeyen başarı iddiası yok.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Metadata üzerinden süre/codec/track ve destek tespiti. için desteklenen en küçük geçerli girdiyle beklenen çıkış üretilir ve ilgili kabul kriteri doğrulanır.

Negatif ve sınır: VBR MP3, eksik duration, bozuk seek index ve audio track olmayan container; desteklenmeyen codec.

Her senaryoda beklenen/gerçek çıktı, cihaz ve sürüm, model/config hash (uygunsa), kaynak ve tarih kaydedilir. Hata senaryosu mevcut tamamlanmış oturum kayıtlarını bozmamalı ve gizli veri loglamamalıdır.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-02](EPIC-02.md).

- [SHHH-013](SHHH-013.md) tamamlanmış veya gerekli kanıtı üretmiş olmalı.

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
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

