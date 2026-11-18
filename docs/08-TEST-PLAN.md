# shhh. — Test planı

Tarih: 2026-11-16 · Hedef: v1.0 · Durum: planlama; uygulama geliştirilmedi.


## Kanıt formatı

Her test: kimlik, ilgili R gereksinimi/Issue, fixture lisansı, önkoşul, adımlar, beklenen/gerçek sonuç, cihaz/OS/tarayıcı sürümü, model/runtime hash, tarih ve kanıt dosyası. Bu plan test sonucu değildir; gerçek cihaz testleri henüz yapılmadı.

| Grup | Pozitif | Negatif / sınır | Kabul |
|---|---|---|---|
| T01 doğrulama | MP3/WAV/OGG-OPUS/M4A-AAC/WebM | boş, yanlış MIME, bozuk header, büyük boyut | güvenli erken ret, kontrollü tahsis |
| T02 metadata | VBR ve çok kanallı kayıt | süre yok/NaN, audio track yok | gerçek codec veya açık unsupported |
| T03 PCM | 8/44.1/48 kHz referans tone | clipping, ters faz, tail | 16 kHz mono, finite değer, süre toleransı |
| T04 chunk/merge | sınırda kelime | overlap tekrarı, doğal tekrar | kayıp yok; doğal tekrar silinmez |
| T05 model | soğuk indirme/sıcak offline | yanlış hash, kesinti, kota | sadece doğrulanmış artifact aktif |
| T06 Worker | responsive inference | abort/crash/OOM/stale result | tek aktif ağır iş, kaynak cleanup |
| T07 diller | Türkçe/İngilizce | kısa/karışık/yanlış manuel dil | aynı dilde çıktı; translate yok |
| T08 doğruluk | izinli konuşma ground truth | gürültü/sessizlik/müzik | WER/CER/no-speech oranı ve sınırlama raporu |
| T09 checkpoint | commit sonrası resume | commit öncesi/ortası crash | sonuç ve checkpoint atomik; çift ekleme yok |
| T10 görünürlük | hidden→visible | OS kill, askıda tab | background ağır iş durur; güvenli resume |
| T11 yarış | iki pencere/çoklu paylaşım | lease timeout, ACK kaybı | sıra korunur, stale sahip yazamaz |
| T12 TTL | 11:59:59 geçerli | tam 12 saat, ileri/geri saat | sonraki açılışta cleanup; timer yok |
| T13 temizleme | finish→empty | blocked DB, quota, stale Worker | silme geri okunur; hatada başarı yok |
| T14 Android paylaşım | gerçek WhatsApp→PWA | SW yok, cold start, scope hatası/update/offline | dosya baytları ağda yok; aksi halde share kapalı |
| T15 ağ | model/statik allowlist | POST fallback, log/analytics kontrolü | ses/metin dışa çıkmaz; kanıt yoksa garanti yok |
| T16 UI | açık/koyu, 320px, desktop | 200% zoom, uzun metin, reduced motion | AA kontrast, klavye/ekran okuyucu, odak |
| T17 clipboard | kullanıcı eylemi | permission denial/insecure context | gerçek başarı; fallback erişilebilir |
| T18 performans | kısa/orta seri kayıt | düşük RAM, termal, 50 MB/600 sn ürün sınırı, gerçek PCM working-set bütçesi | peak RAM/CPU/süre raporu; 600 sn kabul, 601 sn ret; bellek limitinde güvenli ret |

## Katmanlar

Vitest saf algoritma, Worker sözleşmesi, storage repository ve clock testleri; entegrasyon gerçek IndexedDB transaction/rollback ve cache geçişleri; Playwright picker, offline, responsive, UI akış ve erişilebilirlik. Gerçek Android ve WhatsApp sürümleriyle ağ proxy/server fallback denetimi ayrıca zorunludur. Test sesleri açık lisanslı veya izinli olmalı, gizli konuşmalar repo'ya eklenmemeli.

## Performans ve yayın kapıları

Tiny/base her hedef cihaz sınıfında aynı seslerle en az üç tekrar; cold/warm koşulları ayrı. Peak RAM, gerçek zaman oranı, indirme baytı, UI gecikmesi, quota ve termal koşul kaydedilir. Sayısal limitler SHHH-004/006 sonucunda kararlaştırılır; ölçümsüz destek ilan edilmez. P0 gizlilik, veri bütünlüğü, temizleme veya lisans hatası yayını engeller. Güvensiz share kapatılıp manuel picker yayını ancak diğer kapılar ve proje sahibi onayıyla değerlendirilir.

## İlgili belgeler

- [01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md)
- [02-PRD.md](02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](04-LOCAL-DATA-AND-PRIVACY.md)
- [05-UI-DESIGN-SYSTEM.md](05-UI-DESIGN-SYSTEM.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](06-NAVIGATION-AND-SCREEN-FLOW.md)
- [07-CODING-STANDARDS.md](07-CODING-STANDARDS.md)
- [09-SOURCES-AND-LICENSES.md](09-SOURCES-AND-LICENSES.md)

by cerenkurucu · Built with AI assistance

