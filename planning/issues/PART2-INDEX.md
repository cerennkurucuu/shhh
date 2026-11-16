# shhh. — Parça 2 taslakları

Bu dosyalar yerel hazırlıktır; SHHH-025–048 henüz bu turda GitHub'a gönderilmedi. Mevcut part1-result.json raporu verified durumundadır. Parça 1'in README, dokuz belgesi, otomasyonu ve 32 taslağı korunmuştur.

## Çalıştırma

GH_TOKEN tanımlı PowerShell oturumunda:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\Github\shhh\scripts\create-issues-part2.ps1"
```

Script sabit cerennkurucuu/shhh deposundaki bütün açık/kapalı Issue'ları sayfalayarak tarar. Parça 1 raporunu gerçek sunucu kimlikleriyle eşleştirmeden yazmaz. Yalnız SHHH-025–048 oluşturur; EPIC-04–07 açıklamalarındaki bilinen boş alt görev alanını gerçek numaralı bağlantılarla doldurur. İnsan notları korunur. Native sub-issue yerine çift yönlü Markdown bağlantısı kullanır.

## Taslaklar

- [SHHH-025 — IndexedDB geçici oturum veri modeli](SHHH-025.md)
- [SHHH-026 — Atomik checkpoint ve tamamlanan segmentlerin korunması](SHHH-026.md)
- [SHHH-027 — Sıralı işlem kuyruğu](SHHH-027.md)
- [SHHH-028 — WhatsApp'tan arka arkaya ses paylaşımı](SHHH-028.md)
- [SHHH-029 — Arka plan duraklatma ve devam ettirme](SHHH-029.md)
- [SHHH-030 — 12 saatlik zaman aşımı ve manuel güvenli temizleme](SHHH-030.md)
- [SHHH-031 — Responsive tek sayfa ve sistem teması](SHHH-031.md)
- [SHHH-032 — Ses yükleme ve paylaşım karşılama arayüzü](SHHH-032.md)
- [SHHH-033 — Gerçek ilerleme ve işlem durumu bileşenleri](SHHH-033.md)
- [SHHH-034 — Transkript kartları ve kopyalama](SHHH-034.md)
- [SHHH-035 — Yeni ses bekleme, bitirme ve hata deneyimi](SHHH-035.md)
- [SHHH-036 — shhh. nedir açıklaması, kaynaklar ve footer](SHHH-036.md)
- [SHHH-037 — Tehdit modeli ve Web Share Target güvenliği](SHHH-037.md)
- [SHHH-038 — CSP, HTTPS ve ağ erişim politikası](SHHH-038.md)
- [SHHH-039 — Güvenilmeyen ses dosyalarının güvenli işlenmesi](SHHH-039.md)
- [SHHH-040 — Veri sızıntısı, log ve temizleme testleri](SHHH-040.md)
- [SHHH-041 — Kullanıcı gizlilik bilgilendirmesi](SHHH-041.md)
- [SHHH-042 — Bağımlılık ve tedarik zinciri güvenliği](SHHH-042.md)
- [SHHH-043 — Algoritma ve servis birim testleri](SHHH-043.md)
- [SHHH-044 — Entegrasyon ve E2E kullanıcı senaryoları](SHHH-044.md)
- [SHHH-045 — Gerçek Android PWA ve WhatsApp paylaşım testleri](SHHH-045.md)
- [SHHH-046 — Performans, bellek, CPU ve pil davranışı](SHHH-046.md)
- [SHHH-047 — Responsive, erişilebilirlik, offline ve regresyon testleri](SHHH-047.md)
- [SHHH-048 — Ücretsiz yayın hazırlığı ve v1.0 GO/NO-GO kontrolü](SHHH-048.md)

## Bağımlılık ve güvenlik kontrolleri

SHHH-001–048'in yalnız 6. bölümündeki teknik önkoşullar yönlü grafiğe alınır; Epic parent ve yayın testlerinin kabul metinlerindeki referanslar dependency edge sayılmaz. Bilinmeyen düğüm veya döngü varsa ilk yazmadan önce durur. OPEN önkoşullar plan oluşturmayı engellemez. Sunucudaki Parça 1 bağımlılıkları yerel taslakla farklıysa sessizce değiştirmez; durur.

Mükerrer/kapalı Issue, eksik upstream, yetki/kota/ağ hatası ve bozuk managed block işlemeyi durdurur. POST otomatik retry edilmez; yanıtsız POST başarıyla tamamlanmış olabilir, tekrar çalıştırma önce sunucuyu tarar. Aynı checkout'ta Parça 1/2 ortak dosya kilidi kullanır; farklı checkout'lardan otomasyonları eşzamanlı çalıştırmayın.

Her yeni kaydın tamamlanan adımı ve kod/numara eşleşmesi planning/issues/part2-result.json dosyasına kaydedilir; son verified durumu yalnız 56 farklı OPEN kayıt, yeni bağımlılık URL'leri, çift yönlü parent bağlantıları ve 48 düğümlü sunucu grafiği doğrulandıktan sonra yazılır. Diğer repo Issue'larına dokunulmaz.

Token yalnız gh tarafından mevcut ortamdan kullanılır; oluşturulmaz veya dosyaya yazılmaz. Ham CLI hata çıktısı bellekte tutulur, rapor/konsol öncesi token maskelenir. Kullanıcı konuşmaları/tanıtıcı veriler örnek dosyalara eklenmez.

Bu otomasyon git commit/push/PR/merge/deploy, uygulama kodu veya Issue kapatma yapmaz. Belgeler henüz push edilmemişse GitHub belge URL'leri yayımlanmış içerik olarak yorumlanmamalıdır.

