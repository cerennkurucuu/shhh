# SHHH-005 — Ses biçimleri ve kodek uyumluluk matrisi

Labels: `type:research`, `priority:P0`, `phase:00-discovery`, `status:blocked`

## 1. Amaç
Ses biçimleri ve kodek uyumluluk matrisi ile shhh. v1.0 akışının güvenilirliğini sağlamak. Bu kayıt gelecekte yapılacak işi tanımlar; bu organizasyon turunda uygulama geliştirilmez.

## 2. Teknik kapsam
OGG/OPUS, MP3, M4A/AAC, WAV ve WebM container/codec kombinasyonları.

## 3. Uygulanacak yaklaşım ve algoritmalar
Gerçek fixture metadata ve decode sonuçlarını Android/masaüstü üzerinde kaydet; Web Audio ve gerekirse Mediabunny fallback karşılaştır.

## 4. Kabul kriterleri
- [ ] Dosya uzantısından bağımsız container/codec matrisi
- [ ] desteklenmeyen yol ve kullanıcı mesajı
- [ ] lisanslı fallback kararı.
- [ ] Başarı, hata, iptal ve kesinti davranışları kapsam açısından incelenmiş; uygulanmayan dal gerekçelendirilmiş.
- [ ] İlgili gereksinim ve test kanıtları belgelerde izlenebilir; ölçülmeyen başarı iddiası yok.

## 5. Pozitif ve negatif test senaryoları
Pozitif: OGG/OPUS, MP3, M4A/AAC, WAV ve WebM container/codec kombinasyonları. için desteklenen en küçük geçerli girdiyle beklenen çıkış üretilir ve ilgili kabul kriteri doğrulanır.

Negatif ve sınır: Yanlış uzantı, boş MIME, bozuk metadata, eksik audio track ve tarayıcıda bulunmayan codec güvenli hata vermeli.

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

