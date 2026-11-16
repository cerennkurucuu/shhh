# SHHH-002 — Güncel teknoloji, sürüm ve ücretsiz kullanım doğrulaması

Labels: `type:research`, `priority:P0`, `phase:00-discovery`, `status:blocked`

## 1. Amaç
Güncel teknoloji, sürüm ve ücretsiz kullanım doğrulaması ile shhh. v1.0 akışının güvenilirliğini sağlamak. Bu kayıt gelecekte yapılacak işi tanımlar; bu organizasyon turunda uygulama geliştirilmez.

## 2. Teknik kapsam
Angular/Node/TypeScript, whisper.cpp/WASM, ses araçları ve Vitest/Playwright için resmi sürüm, lisans, bakım ve güvenlik incelemesi.

## 3. Uygulanacak yaklaşım ve algoritmalar
Resmi sürüm ve uyumluluk kaynaklarından aday matrisi çıkar; ücretsiz çalışmayı barındırma/bant genişliği maliyetinden ayır.

## 4. Kabul kriterleri
- [ ] Her aday için tam sürüm, kaynak, tarih, lisans ve karar
- [ ] Node/TS eşleşmesi
- [ ] advisory kontrolü
- [ ] kilit dosyası politikası.
- [ ] Başarı, hata, iptal ve kesinti davranışları kapsam açısından incelenmiş; uygulanmayan dal gerekçelendirilmiş.
- [ ] İlgili gereksinim ve test kanıtları belgelerde izlenebilir; ölçülmeyen başarı iddiası yok.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Angular/Node/TypeScript, whisper.cpp/WASM, ses araçları ve Vitest/Playwright için resmi sürüm, lisans, bakım ve güvenlik incelemesi. için desteklenen en küçük geçerli girdiyle beklenen çıkış üretilir ve ilgili kabul kriteri doğrulanır.

Negatif ve sınır: Destek dışı Node ve lisansı doğrulanmamış decoder adayı reddedilmeli; sürüm yayın tarihi inceleme tarihinden ileri olamaz.

Her senaryoda beklenen/gerçek çıktı, cihaz ve sürüm, model/config hash (uygunsa), kaynak ve tarih kaydedilir. Hata senaryosu mevcut tamamlanmış oturum kayıtlarını bozmamalı ve gizli veri loglamamalıdır.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-00](EPIC-00.md).

- [SHHH-001](SHHH-001.md) tamamlanmış veya gerekli kanıtı üretmiş olmalı.

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

