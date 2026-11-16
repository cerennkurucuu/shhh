# SHHH-018 — Sessizlik, müzik ve konuşma bulunamaması yönetimi

Labels: `type:feature`, `priority:P0`, `phase:02-audio`, `status:blocked`

## 1. Amaç
Sessizlik, müzik ve konuşma bulunamaması yönetimi ile shhh. v1.0 akışının güvenilirliğini sağlamak. Bu kayıt gelecekte yapılacak işi tanımlar; bu organizasyon turunda uygulama geliştirilmez.

## 2. Teknik kapsam
Konuşma bölgesi kontrolü ve hallucination azaltımı.

## 3. Uygulanacak yaklaşım ve algoritmalar
Enerji/VAD adayını veriyle kalibre et; düşük güven/tekrar/no-speech sinyallerini birlikte değerlendir; müziği kesin teşhis iddiası yapma.

## 4. Kabul kriterleri
- [ ] Sessizlikte anlaşılır no-speech
- [ ] düşük sesli konuşma korunuyor
- [ ] eşikler ve yanlış red oranı belgeli.
- [ ] Başarı, hata, iptal ve kesinti davranışları kapsam açısından incelenmiş; uygulanmayan dal gerekçelendirilmiş.
- [ ] İlgili gereksinim ve test kanıtları belgelerde izlenebilir; ölçülmeyen başarı iddiası yok.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Konuşma bölgesi kontrolü ve hallucination azaltımı. için desteklenen en küçük geçerli girdiyle beklenen çıkış üretilir ve ilgili kabul kriteri doğrulanır.

Negatif ve sınır: Sessizlik, beyaz gürültü, enstrümantal, konuşmalı müzik, kısa fısıltı; şarkı sözü garantisi yok.

Her senaryoda beklenen/gerçek çıktı, cihaz ve sürüm, model/config hash (uygunsa), kaynak ve tarih kaydedilir. Hata senaryosu mevcut tamamlanmış oturum kayıtlarını bozmamalı ve gizli veri loglamamalıdır.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-02](EPIC-02.md).

- [SHHH-004](SHHH-004.md) tamamlanmış veya gerekli kanıtı üretmiş olmalı.
- [SHHH-016](SHHH-016.md) tamamlanmış veya gerekli kanıtı üretmiş olmalı.

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

