# shhh. — Ekran akışı ve geçişler

Tarih: 2026-11-16 · Hedef: v1.0 · Durum: planlama; uygulama geliştirilmedi.


## Açılış sırası

Önce yerel oturum ve şema kontrol edilir; süresi dolan/yetim veriler temizlenir. Cleanup başarısızsa eski oturum işleme açılmaz. Geçerli oturum varsa kartlar geri yüklenir; otomatik ağır işlem başlamadan görünürlük ve sahiplik kilidi denetlenir. Kurulum önerisi engelleyici değildir; normal web kullanılabilir.

| Başlangıç | Olay | Sonuç ve veri davranışı |
|---|---|---|
| empty/completed | picker veya paylaşım | validating; yeni transfer kimliği, önceki sonuçlar korunur |
| validating | geçerli metadata | preparing; sıra atanır |
| validating | ret | anlaşılır hata; diğer sesler etkilenmez |
| preparing | model yok | model-loading; bayt ilerlemesi |
| model-loading | hash doğrulandı | transcribing; tek Worker sahibi |
| model-loading | ağ/kota/hash hatası | error; bozuk model aktif olmaz |
| transcribing | segment tamam | atomik commit, metin artar; sonraki segment |
| transcribing | hidden veya pause | paused; yeni segment başlamaz, yarım iş iptal edilebilir |
| paused | görünür + devam | son güvenli checkpoint ve aynı config ile resume |
| transcribing | tüm segmentler | completed; gereksiz ham ses kaldırılır |
| completed | kopyala | clipboard sonucu bildirilir; oturum devam eder |
| completed/paused | başka ses ekle | oturum korunur; kullanıcı başka uygulamaya döner |
| error | retry | hata tipine göre doğrulama/model/checkpoint aşaması |
| herhangi | bitir | cleaning; giriş ve stale Worker yazımları kapalı |
| cleaning | silme doğrulandı | empty; başarı |
| cleaning | silme başarısız | cleaning-error; retry |
| açılış | son etkinlik >=12 saat | cleaning; süre sonu açıklaması |

## Kesintiler ve çoklu kayıt

Share teslim ACK'i kaybolursa transferId ile tekrar alınır; ses ikinci kez eklenmez. Bilinçli yeniden dosya seçimi ayrı giriş sayılabilir. Başka pencere işliyorsa bu pencerede sahiplik durumu gösterilir; ikinci inference başlatılmaz. OS process öldürürse yalnız kalıcılaşmış checkpoint garanti edilir.

## Dil, iptal ve hata

Auto/manüel dil her audio için kaydedilir. Sonuç üretilmiş kayıtta dil/config değişirse eski checkpoint karıştırılmaz; yeniden işleme açık bir eylem olmalıdır. Aktif sesi iptal etmek diğer tamamlanmış metinleri silmez. Codec, kota, model ve SW hatalarının teknik nedenleri açıklanır; unsupported share için picker gösterilir.

## Alt bölüm

Menü veya ek sayfa gerekmez. Aynı ekran sonunda ürün açıklaması, yerel işleme/gizlilik sınırları, teknoloji ve kaynak bağlantıları ile sahiplik footer'ı bulunur.

## İlgili belgeler

- [01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md)
- [02-PRD.md](02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](04-LOCAL-DATA-AND-PRIVACY.md)
- [05-UI-DESIGN-SYSTEM.md](05-UI-DESIGN-SYSTEM.md)
- [07-CODING-STANDARDS.md](07-CODING-STANDARDS.md)
- [08-TEST-PLAN.md](08-TEST-PLAN.md)
- [09-SOURCES-AND-LICENSES.md](09-SOURCES-AND-LICENSES.md)

by cerenkurucu · Built with AI assistance

