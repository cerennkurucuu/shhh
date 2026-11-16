# SHHH-004 — Whisper Tiny/Base çok dilli model fizibilitesi

Labels: `type:research`, `priority:P0`, `phase:00-discovery`, `status:blocked`

## 1. Amaç
Whisper Tiny/Base çok dilli model fizibilitesi ile shhh. v1.0 akışının güvenilirliğini sağlamak. Bu kayıt gelecekte yapılacak işi tanımlar; bu organizasyon turunda uygulama geliştirilmez.

## 2. Teknik kapsam
Tiny ve Base çok dilli modelleri hedef Android cihazlarda Türkçe doğruluk, RAM, CPU, indirme ve çalışma süresi açısından karşılaştır.

## 3. Uygulanacak yaklaşım ve algoritmalar
İzinli etiketli ses setiyle WER/CER, gerçek zaman oranı, peak RAM ve soğuk/sıcak süre ölç; cihaz/OS/tarayıcı/model hash kaydet.

## 4. Kabul kriterleri
- [ ] Her model için ölçüm matrisi ve tekrar sayısı
- [ ] cihaz sınıfına göre karar
- [ ] ölçümsüz başarı veya performans garantisi yok.
- [ ] Başarı, hata, iptal ve kesinti davranışları kapsam açısından incelenmiş; uygulanmayan dal gerekçelendirilmiş.
- [ ] İlgili gereksinim ve test kanıtları belgelerde izlenebilir; ölçülmeyen başarı iddiası yok.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Tiny ve Base çok dilli modelleri hedef Android cihazlarda Türkçe doğruluk, RAM, CPU, indirme ve çalışma süresi açısından karşılaştır. için desteklenen en küçük geçerli girdiyle beklenen çıkış üretilir ve ilgili kabul kriteri doğrulanır.

Negatif ve sınır: Düşük RAM, termal yavaşlama, gürültü, aksan ve model yükleme hatası; .en modeli Türkçe adayı olarak seçilmemeli.

Her senaryoda beklenen/gerçek çıktı, cihaz ve sürüm, model/config hash (uygunsa), kaynak ve tarih kaydedilir. Hata senaryosu mevcut tamamlanmış oturum kayıtlarını bozmamalı ve gizli veri loglamamalıdır.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-00](EPIC-00.md).

- [SHHH-002](SHHH-002.md) tamamlanmış veya gerekli kanıtı üretmiş olmalı.

## 7. Kapsam dışı
Uygulama kurulumu ve ürün kodlaması; fizibilite verisini ölçülmüş gibi sunmak. Hesap, reklam, tercüme, özet, konuşmacı tanıma ve çok büyük dosya garantisi v1 dışındadır.

## 8. Definition of Done
- [ ] Tüm kabul kriterleri kanıtla karşılanmış.
- [ ] Pozitif ve negatif senaryoların sonuçları kayıtlı.
- [ ] Bağımlılıklar ve ilgili belgeler güncel; veri/lisans/ağ riskleri açıklanmış.
- [ ] Ceren Kurucu incelemesine hazır; bu turda commit/push/Issue kapatma yok.

## İlgili belgeler
- [01-PROJECT-OVERVIEW.md](../../docs/01-PROJECT-OVERVIEW.md)
- [09-SOURCES-AND-LICENSES.md](../../docs/09-SOURCES-AND-LICENSES.md)
- [08-TEST-PLAN.md](../../docs/08-TEST-PLAN.md)

