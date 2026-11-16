# SHHH-019 — Whisper model seçimi ve versiyon sabitleme

Labels: `type:feature`, `priority:P0`, `phase:03-ai`, `status:blocked`

## 1. Amaç
Whisper model seçimi ve versiyon sabitleme ile shhh. v1.0 akışının güvenilirliğini sağlamak. Bu kayıt gelecekte yapılacak işi tanımlar; bu organizasyon turunda uygulama geliştirilmez.

## 2. Teknik kapsam
Çok dilli model ve whisper.cpp artifact/sürüm/hash/lisans.

## 3. Uygulanacak yaklaşım ve algoritmalar
SHHH-004 ölçümleriyle tiny/base kararı; immutable URL veya vendored artifact; SHA-256 ve build flags kaydı.

## 4. Kabul kriterleri
- [ ] .en dışı uygun model
- [ ] runtime/model uyumu
- [ ] lisans bildirimleri
- [ ] kaynak ve hash sabit
- [ ] cihaz fallback politikası.
- [ ] Başarı, hata, iptal ve kesinti davranışları kapsam açısından incelenmiş; uygulanmayan dal gerekçelendirilmiş.
- [ ] İlgili gereksinim ve test kanıtları belgelerde izlenebilir; ölçülmeyen başarı iddiası yok.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Çok dilli model ve whisper.cpp artifact/sürüm/hash/lisans. için desteklenen en küçük geçerli girdiyle beklenen çıkış üretilir ve ilgili kabul kriteri doğrulanır.

Negatif ve sınır: Yanlış model, hash uyuşmazlığı ve desteklenmeyen WASM özelliği güvenli hata.

Her senaryoda beklenen/gerçek çıktı, cihaz ve sürüm, model/config hash (uygunsa), kaynak ve tarih kaydedilir. Hata senaryosu mevcut tamamlanmış oturum kayıtlarını bozmamalı ve gizli veri loglamamalıdır.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-03](EPIC-03.md).

- [SHHH-004](SHHH-004.md) tamamlanmış veya gerekli kanıtı üretmiş olmalı.
- [SHHH-006](SHHH-006.md) tamamlanmış veya gerekli kanıtı üretmiş olmalı.

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

