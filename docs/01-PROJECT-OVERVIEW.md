# shhh. — Proje genel bakışı

Tarih: 2026-11-16 · Hedef: v1.0 · Durum: planlama; uygulama geliştirilmedi.

## Sahiplik

- Project Creator / Owner: Ceren Kurucu
- Product Concept & Direction: Ceren Kurucu
- Algorithmic Approach & Research Direction: Ceren Kurucu
- Project Management & Final Approval: Ceren Kurucu
- Code Implementation: AI coding agent, under Ceren Kurucu's direction.

Ürün fikri, araştırma yönü ve algoritmik yaklaşım kararları proje sahibine aittir. Agent teknik uygulama ve kod yazımını üstlenir.

## Problem ve hedef kitle

Sesli mesaj dinleyemeyen veya metin olarak okumayı tercih eden, öncelikle Türkçe konuşan mobil kullanıcılar hedeflenir. WhatsApp ve diğer uygulamalardan kullanıcı tarafından paylaşılan sesler veya elle seçilen dosyalar cihazda metne çevrilir. Sohbetler doğrudan okunmaz.

## Çözüm ve kullanım

Tek sayfada ses ekle → doğrula → modeli hazırla → yerel transkripsiyon → metni kopyala. “Başka ses ekle” oturumu korur; kullanıcı WhatsApp'a kendisi döner, arka planda inference çalışmaz. “İşlemi bitir ve temizle” geçici sesleri, metinleri ve iş kayıtlarını siler; başarı silme doğrulamasından sonra gösterilir.

## v1.0 kapsamı

Android PWA ve kurulumsuz normal web, Türkçe öncelikli çok dilli Whisper, otomatik/manüel dil seçimi, sıralı çoklu ses, duraklatma/checkpoint ve geçici yerel oturum. Sistem teması, erişilebilir mobil arayüz ve gerçek ilerleme. İlk sürümde dosya en fazla 50 MB ve ses en fazla 600 saniye (10 dakika) olabilir; 600 saniye kabul, 601 saniye ret edilir. Bu ürün sınırları hedef cihazlarda performans garantisi vermez. Kullanıcı sesleri elle bölmez; ileride otomatik segmentleme değerlendirilir.

## Ücretsiz çalışma ilkesi

Hesap, backend, sunucu veritabanı, ücretli veya harici AI çıkarım API'si, reklam ve analitik yoktur. Statik barındırma ve model indirme bant genişliğinin işletme maliyeti ayrıca değerlendirilir; ücretsiz yazılım lisansı sınırsız ücretsiz hosting anlamına gelmez. İlk model indirmesi ağ gerektirir; doğrulanmış model daha sonra yerel kullanılır.

## Kapsam dışı

Özetleme, tercüme, konuşmacı tanıma, profil/dashboard, WhatsApp sohbetlerini okuma, şarkı sözü doğruluk garantisi, 90 dakika veya 40 GB zorunlu desteği.

## Başarı ölçütleri ve tamamlanma

İzinli Türkçe/İngilizce veri setinde WER/CER ve yanlış no-speech oranı; hedef cihazlarda peak RAM, süre ve UI tepkisi ölçülür. Sayısal yayın eşikleri fizibilite kanıtıyla Ceren Kurucu tarafından kesinleştirilir; şu an garanti yoktur. Manuel seçim, temizleme, atomik checkpoint, erişilebilirlik ve gerçek Android ağ güvenliği testleri geçmeden v1 yayınlanmaz. Paylaşım güvenliği doğrulanamazsa yalnız o entegrasyon kapalı kalır.

## Gizlilik ve yayın hedefi

Konuşmalar sunucumuzda saklanmaz. Devam eden oturum verileri cihazda geçici tutulur ve oturum bitirildiğinde temizlenir. Web Share Target POST fallback riski gerçek cihaz/ağ/sunucu testleriyle çözülmeden “sesler asla sunucuya gitmez” garantisi verilmez. Fiziksel olarak geri getirilemez silme vaat edilmez. Yayın tarihi GO/NO-GO, test ve proje sahibi son onayına bağlıdır.

## İlgili belgeler

- [02-PRD.md](02-PRD.md)
- [03-SOFTWARE-ARCHITECTURE.md](03-SOFTWARE-ARCHITECTURE.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](04-LOCAL-DATA-AND-PRIVACY.md)
- [05-UI-DESIGN-SYSTEM.md](05-UI-DESIGN-SYSTEM.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](06-NAVIGATION-AND-SCREEN-FLOW.md)
- [07-CODING-STANDARDS.md](07-CODING-STANDARDS.md)
- [08-TEST-PLAN.md](08-TEST-PLAN.md)
- [09-SOURCES-AND-LICENSES.md](09-SOURCES-AND-LICENSES.md)

by cerenkurucu · Built with AI assistance

