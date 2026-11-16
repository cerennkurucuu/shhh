# SHHH-017 — Ses buffer yönetimi ve kaynak temizliği

Labels: `type:feature`, `priority:P0`, `phase:02-audio`, `status:blocked`

## 1. Amaç
Ses buffer yönetimi ve kaynak temizliği ile shhh. v1.0 akışının güvenilirliğini sağlamak. Bu kayıt gelecekte yapılacak işi tanımlar; bu organizasyon turunda uygulama geliştirilmez.

## 2. Teknik kapsam
ArrayBuffer/PCM/Worker/Object URL/decoder yaşam döngüsü.

## 3. Uygulanacak yaklaşım ve algoritmalar
Transferable ownership; sınırlı prefetch; finally cleanup; audio context kapama; object URL revoke; referans bırakma.

## 4. Kabul kriterleri
- [ ] Biten/iptal/hata yollarında kaynaklar serbest
- [ ] ardışık seslerde heap trendi raporlu
- [ ] tüm ses gereksiz RAM'e alınmıyor.
- [ ] Başarı, hata, iptal ve kesinti davranışları kapsam açısından incelenmiş; uygulanmayan dal gerekçelendirilmiş.
- [ ] İlgili gereksinim ve test kanıtları belgelerde izlenebilir; ölçülmeyen başarı iddiası yok.

## 5. Pozitif ve negatif test senaryoları
Pozitif: ArrayBuffer/PCM/Worker/Object URL/decoder yaşam döngüsü. için desteklenen en küçük geçerli girdiyle beklenen çıkış üretilir ve ilgili kabul kriteri doğrulanır.

Negatif ve sınır: Decoder throw, worker crash, peş peşe kayıt, iptal ve tekrar başlat; GC fiziksel silme garantisi sayılmaz.

Her senaryoda beklenen/gerçek çıktı, cihaz ve sürüm, model/config hash (uygunsa), kaynak ve tarih kaydedilir. Hata senaryosu mevcut tamamlanmış oturum kayıtlarını bozmamalı ve gizli veri loglamamalıdır.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-02](EPIC-02.md).

- [SHHH-015](SHHH-015.md) tamamlanmış veya gerekli kanıtı üretmiş olmalı.
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

