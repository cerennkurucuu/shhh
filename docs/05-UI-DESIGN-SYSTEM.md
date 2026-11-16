# shhh. — UI tasarım sistemi

Tarih: 2026-11-16 · Hedef: v1.0 · Durum: planlama; uygulama geliştirilmedi.


## Yerleşim ve tema

Tek sayfa, menüsüz; mobilde 16 px kenar boşluğu, masaüstünde yaklaşık 760 px ortalanmış çalışma alanı. prefers-color-scheme sistem temasını izler; açılır dashboard veya profil yoktur. En altta yalnız “shhh. nedir?”, teknoloji/gizlilik açıklamaları, kaynaklar ve footer yer alır.

| Token | Açık | Koyu |
|---|---|---|
| background | #F8FAFC | #0F172A |
| surface | #FFFFFF | #1E293B |
| text | #0F172A | #F8FAFC |
| secondary | #475569 | #CBD5E1 |
| focus | #1D4ED8 | #93C5FD |
| pending | #475569 | #CBD5E1 |
| processing | #92400E | #FCD34D |
| success | #166534 | #86EFAC |
| error | #991B1B | #FCA5A5 |

Renkler tasarım adaylarıdır; gerçek kombinasyonların WCAG AA kontrastı test edilmeden uygunluk ilan edilmez. Durum her zaman simge ve yazıyla da ifade edilir.

## Tipografi, spacing ve kontroller

Sistem fontu, gövdede 16 px/1.5, başlıkta 24–32 px; 4/8/12/16/24/32 px spacing ölçeği. Dokunma hedefi en az 44×44 CSS px hedeflenir. Butonlarda görünür focus, disabled ve loading açıklaması bulunur. İkon tek başına anlam taşımaz. Yerel font tercihi üçüncü taraf ağ isteğini önler.

## Bileşenler

Dosya yükleme alanı tıklama/klavye/picker ile çalışır, drag-drop ek seçenektir. Ses kartı güvenli dosya adı, süre/dil/durum, transkript ve kopyala düğmesi içerir. Uzun kelimeler wrap edilir; uzun metinlerde lazy render/sanallaştırma odak ve ekran okuyucu kullanımını bozmamalıdır. Kullanıcı metni HTML olarak yorumlanmaz.

## İlerleme ve eylemler

İndirmede loaded/total bayt, inference'da işlenen ses süresi gösterilir. Toplam bilinmiyorsa indeterminate açıklaması; sahte yüzde yoktur. “Başka ses ekle” oturumu korur, “İşlemi bitir ve temizle” doğrulanmış temizleme ile boş ekrana döner. Hata durumunda teknik hata kodu ve uygulanabilir retry yolu bulunur.

## Erişilebilirlik ve responsive

320 CSS px genişlik, 200% zoom, açık/koyu ve reduced-motion denenir. Canlı durumlar polite aria-live ile seyrek duyurulur; hata gerektiğinde alert. Metin seçimi/kopyalama klavyeyle mümkün; durum değişimi odağı gereksiz taşımaz. Mobil klavye ve landscape ana eylemleri örtmez.

## Mesaj tonu

“Sesin geldi, hemen hazırlıyorum.” · “Bu kayıt biraz uzunmuş. Küçük bölümler hâlinde işleyeceğim.” · “Konuşmayı yazıya dönüştürüyorum.” · “Hazır! Artık dinlemek yerine okuyabilirsin.” · “Diğer sesini gönderebilirsin. Öncekiler burada.” · “İşlemi duraklattım. Döndüğünde devam edebiliriz.”

Hafif eğlenceli dil hata nedenini gizlemez. Footer tam metni: by cerenkurucu · Built with AI assistance

## İlgili belgeler

- [01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md)
- [02-PRD.md](02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](04-LOCAL-DATA-AND-PRIVACY.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](06-NAVIGATION-AND-SCREEN-FLOW.md)
- [07-CODING-STANDARDS.md](07-CODING-STANDARDS.md)
- [08-TEST-PLAN.md](08-TEST-PLAN.md)
- [09-SOURCES-AND-LICENSES.md](09-SOURCES-AND-LICENSES.md)

by cerenkurucu · Built with AI assistance

