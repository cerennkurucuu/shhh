# shhh. — Yerel veri ve gizlilik

Tarih: 2026-11-16 · Hedef: v1.0 · Durum: planlama; uygulama geliştirilmedi.


## Veri modeli

| Object store | Anahtar | İçerik ve ömür |
|---|---|---|
| sessions | sessionId | createdAt, lastActivityAt, status, epoch; tek etkin oturum |
| audios | sessionId/audioId | güvenli ad, sıra, dil, durum, metadata; oturum sonuna kadar |
| segments | sessionId/audioId/segmentIndex | zaman aralığı, sonuç, durum; oturum sonuna kadar |
| checkpoints | sessionId/audioId | son committed segment, model/config hash; segmentle atomik |
| transfers | transferId | kısa ömürlü Blob, teslim durumu ve expiry; ACK sonrası silinir |
| leases | lockName | ownerId, expiry, fencing token; iş sahipliği bitince bırakılır |

Şema tasarımdır; bu turda veritabanı oluşturulmaz. Ham ses yeniden işleme için gerektiği kadar tutulur. Yarım segmentin yeniden üretimi gerekiyorsa kaynak erken silinmez; tamamlanmış ve artık gereksiz ham veri kaldırılır. Model cache'i kullanıcı verisinden ayrı ve sürümlüdür.

## Atomiklik ve yarışlar

Segment sonucu ve checkpoint aynı readwrite transaction içindedir; oncomplete gelmeden kalıcı başarı yoktur. Unique anahtar tekrar sonucu engeller. Commit öncesi çökmede segment tekrar çalışabilir; commit sonrası checkpoint nedeniyle atlanır. Oturum epoch ve fencing token geçersiz sonuçları reddeder. Cleanup önce lease/epoch ile yeni girişleri durdurur. Başka pencere cleanup bitmeden yazamaz.

## 12 saat kuralı

Son gerçek kullanıcı etkinliği transaction ile güncellenir; heartbeat, inference progress veya background timer TTL'yi uzatmaz. Yeni açılışta now-lastActivityAt >= 12 saat ise işlem başlamadan temizlenir. Saat geriye/ileri alınması ve belirsiz tarih test edilir; belirsiz eski kayıtta kullanıcı verisini sınırsız tutmak yerine açıklamalı güvenli temizleme uygulanır. Sürekli background timer yoktur.

## Temizlik protokolü

1. Yeni kabulü durdur, oturum epoch artır, Worker/decoder iptal et.
2. Oturuma bağlı audio, segment, checkpoint, transfer ve lease kayıtlarını sil.
3. Geçici cache varsa yalnız kullanıcı verisi namespace'ini kaldır; model/statik cache korunabilir.
4. Object URL ve RAM referanslarını bırak.
5. Tüm ilgili store/cache'lerden geri okuyarak kayıt kalmadığını doğrula.
6. Başarı yalnız doğrulama sonrası; kota/blocked DB hatasında hata ve tekrar deneme göster.

Tarayıcı kapanması background cleanup garantisi değildir; sonraki açılış yetim kayıt ve TTL denetler. Tarayıcı/OS diskinde fiziksel olarak geri getirilemez silme garantisi verilmez.

## Tehdit modeli ve ağ sınırı

Riskler: XSS, aynı origin başka script, kötü dosya metadata'sı, bozuk model, SW POST fallback, kullanıcı cihazına erişim, quota eviction ve çoklu pencere yarışları. CSP, metni textContent/Angular escaping ile gösterme, üçüncü taraf script/analitik kullanmama ve immutable hash azaltımlardır. Model/statik indirme için açık allowlist; transkript/ses/dosya adı telemetri veya sunucu loguna gönderilmez. Paylaşım güvenliği kanıtlanmadan mutlak ağ gizliliği iddiası yoktur.

## Clipboard, log ve kota

Clipboard yalnız kullanıcının kopyalama eyleminde yazılır; sonradan sistem clipboard'unun otomatik temizleneceği söylenmez. Loglarda ham ses, metin, dosya adı ve kimlikli URL yok; sadece yerel teknik hata kodu/süre. Storage estimate tavsiyedir, kota garantisi değildir; QuotaExceeded transaction rollback ve anlaşılır hata üretir. Başka uygulamaların verisi silinmez.

## Kullanıcıya gösterilecek açıklama

Konuşmalar sunucumuzda saklanmaz. Devam eden oturum verileri cihazda geçici tutulur ve oturum bitirildiğinde temizlenir.

## İlgili belgeler

- [01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md)
- [02-PRD.md](02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](03-SOFTWARE-ARCHITECTURE.md)
- [05-UI-DESIGN-SYSTEM.md](05-UI-DESIGN-SYSTEM.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](06-NAVIGATION-AND-SCREEN-FLOW.md)
- [07-CODING-STANDARDS.md](07-CODING-STANDARDS.md)
- [08-TEST-PLAN.md](08-TEST-PLAN.md)
- [09-SOURCES-AND-LICENSES.md](09-SOURCES-AND-LICENSES.md)

by cerenkurucu · Built with AI assistance

