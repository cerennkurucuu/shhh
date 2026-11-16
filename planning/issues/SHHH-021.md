# SHHH-021 — Web Worker içinde Whisper çalıştırma

Labels: `type:feature`, `priority:P0`, `phase:03-ai`, `status:blocked`

## 1. Amaç
Web Worker içinde Whisper çalıştırma ile shhh. v1.0 akışının güvenilirliğini sağlamak. Bu kayıt gelecekte yapılacak işi tanımlar; bu organizasyon turunda uygulama geliştirilmez.

## 2. Teknik kapsam
Ana thread dışı inference, typed protokol, hata/iptal ve tek model.

## 3. Uygulanacak yaklaşım ve algoritmalar
requestId/jobId/epoch içeren start/progress/result/error/cancel; stale yanıt red; abort desteklenmiyorsa worker terminate/recreate.

## 4. Kabul kriterleri
- [ ] UI responsive
- [ ] tek ağır iş/model
- [ ] iptal ve crash kaynak temizliği
- [ ] ilerleme gerçek ölçüden.
- [ ] Başarı, hata, iptal ve kesinti davranışları kapsam açısından incelenmiş; uygulanmayan dal gerekçelendirilmiş.
- [ ] İlgili gereksinim ve test kanıtları belgelerde izlenebilir; ölçülmeyen başarı iddiası yok.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Ana thread dışı inference, typed protokol, hata/iptal ve tek model. için desteklenen en küçük geçerli girdiyle beklenen çıkış üretilir ve ilgili kabul kriteri doğrulanır.

Negatif ve sınır: İş ortasında iptal, eski result, model init fail, WASM OOM ve arka plana geçme.

Her senaryoda beklenen/gerçek çıktı, cihaz ve sürüm, model/config hash (uygunsa), kaynak ve tarih kaydedilir. Hata senaryosu mevcut tamamlanmış oturum kayıtlarını bozmamalı ve gizli veri loglamamalıdır.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-03](EPIC-03.md).

- [SHHH-011](SHHH-011.md) tamamlanmış veya gerekli kanıtı üretmiş olmalı.
- [SHHH-017](SHHH-017.md) tamamlanmış veya gerekli kanıtı üretmiş olmalı.
- [SHHH-020](SHHH-020.md) tamamlanmış veya gerekli kanıtı üretmiş olmalı.

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
- [09-SOURCES-AND-LICENSES.md](../../docs/09-SOURCES-AND-LICENSES.md)

