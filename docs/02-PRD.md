# shhh. — Ürün gereksinimleri

Tarih: 2026-11-16 · Hedef: v1.0 · Durum: planlama; uygulama geliştirilmedi.


## Kullanıcı hikâyeleri

Kullanıcı dinlemek yerine okumak için ses paylaşır/seçer; önceki metinlerini kaybetmeden yeni ses ekler; başka uygulamaya geçince cihazın ağır iş yapmamasını ister; metni kopyalar ve istediğinde tüm oturumu bitirir.

## Gereksinimler ve kabul kriterleri

| Kimlik | Davranış | Doğrulama |
|---|---|---|
| R01 | Kurulu Android PWA paylaşımı; normal web dosya seçimi | Gerçek WhatsApp paylaşımı ve picker; güvenlik kanıtı yoksa paylaşım kapalı |
| R02 | Boyut, imza, container/codec ve süre doğrulama | Sahte uzantı/bozuk/boş dosya reddi; büyük dosyada tam okumadan uyarı |
| R03 | Yerel model ve 16 kHz mono pipeline | Dış inference isteği yok; model hash doğrulanır |
| R04 | Auto/manüel dil, aynı dilde çıktı | Türkçe/İngilizce fixture; translate devre dışı |
| R05 | Çoklu ses ve tek ağır işlem | İki pencere/yeni paylaşımda sıra ve transfer idempotency |
| R06 | Gizlenince duraklatma, checkpoint'ten devam | Commit edilmiş segment yeniden işlenmez; yarım segment yeniden denenebilir |
| R07 | Gerçek ilerleme | Bayt veya işlenen süre; bilinmeyen toplamda yüzde yok |
| R08 | Ses kartında metin kopyalama | Clipboard başarı/hata ve güvenli fallback; izin hatasında başarı gösterilmez |
| R09 | Başka ses ekle | Oturum korunur, arka planda inference başlamaz |
| R10 | İşlemi bitir ve temizle | Worker durur; IDB ve geçici cache kayıtları silinir; geri okuma sıfır |
| R11 | 12 saat son etkinlik TTL | Eşikte sonraki açılışta temizleme; sürekli timer yok |
| R12 | Hata ve toparlama | Codec/ağ/model/kota/worker hatası ayrılır; teknik neden anlaşılır verilir |
| R13 | Tek sayfa sistem teması ve erişilebilirlik | Klavye, ekran okuyucu, açık/koyu, mobil ve uzun transkript |
| R14 | Local-first, hesap/backend/takip yok | Ağ allowlist incelemesi; metin/log sızıntısı yok |

## İşlevsel olmayan gereksinimler

Bellek bounded decode/segment penceresiyle sınırlanır; çözümleyici streaming sağlayamıyorsa cihaz bütçesi kontrol edilir veya kayıt reddedilir. Uzun transkriptlerde sanallaştırma/artan render ile düşük DOM maliyeti hedeflenir. Tahmini süre ve sahte doğruluk yüzdesi yoktur. Tamamlanan segment sonucu ve checkpoint tek transaction'da kalıcılaşır. İptal ve hata cleanup yolları başarı yolu kadar test edilir.

## Ön limit ve ret politikası

50 MB ve 20 dakika ölçüm bekleyen önerilerdir. Byte sınırı tam dosya açılmadan, süre sınırı güvenli metadata sonrası kontrol edilir. Bilinmeyen süre destek garantisi değildir. Çok büyük dosya zorla decode edilmez. 90 dakika/40 GB v1 kabul kriteri değildir.

## İzlenebilirlik

R01: SHHH-003,009–012; R02: 005,013–014; R03: 004,015–021; R04: 022; R05: 011; R06: 021,023; R07: 020–021; R12: 013–024. R08–R11 ve R13–R14 ilgili sonraki Epic kapsamındadır; bu turda bunlar için SHHH-025 ve sonrası oluşturulmaz.

## Definition of Done

Gereksinimin pozitif/negatif testi, gerçek cihaz kanıtı gereken yerlerde cihaz kaydı, lisans kaydı ve doküman güncellemesi bulunur. Test edilmemiş şey tamamlandı sayılmaz; yayın kararı Ceren Kurucu'dadır.

## İlgili belgeler

- [01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md)
- [03-SOFTWARE-ARCHITECTURE.md](03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](04-LOCAL-DATA-AND-PRIVACY.md)
- [05-UI-DESIGN-SYSTEM.md](05-UI-DESIGN-SYSTEM.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](06-NAVIGATION-AND-SCREEN-FLOW.md)
- [07-CODING-STANDARDS.md](07-CODING-STANDARDS.md)
- [08-TEST-PLAN.md](08-TEST-PLAN.md)
- [09-SOURCES-AND-LICENSES.md](09-SOURCES-AND-LICENSES.md)

by cerenkurucu · Built with AI assistance

