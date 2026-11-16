# shhh. — Parça 1 Issue taslakları

2026-11-16. GitHub Issue oluşturma API'si 403 Resource not accessible by integration döndürdü; hiçbir Issue oluşturulmadı. Bunlar yayımlanmamış yerel taslaklardır; gerçek GitHub numarası içermez.

GitHub'a aktarırken önce tüm durumlarda mevcut Issue başlıklarında tam SHHH/EPIC kodu aranmalı; bir eşleşme varsa güncellenmeli, birden fazla varsa durulmalı. İlk yazma öncesi labels listelenip eksikler oluşturulmalı. Native sub-issue desteği API erişimiyle doğrulanmalı; yoksa gerçek numaralar kullanılarak çift yönlü bağlantılar kurulmalı. Yerel taslak göreli bağlantıları GitHub Issue gövdesinde kullanılmadan gerçek Issue URL'lerine ve docs için ../blob/main/docs/... URL'lerine dönüştürülmeli. Belgeler commit/push yapılmadığından repo bağlantıları henüz yayımlanmış belge anlamına gelmez.

## Taslaklar

- [EPIC-00 — Proje Temeli ve Teknik Fizibilite](EPIC-00.md)
- [EPIC-01 — Angular ve Android PWA](EPIC-01.md)
- [EPIC-02 — Ses Dosyası ve İşleme Altyapısı](EPIC-02.md)
- [EPIC-03 — Yerel Whisper Yapay Zekâ Motoru](EPIC-03.md)
- [EPIC-04 — Geçici Oturum, Sıra ve Kontrol Noktaları](EPIC-04.md)
- [EPIC-05 — Tek Sayfalık Arayüz ve Kullanıcı Deneyimi](EPIC-05.md)
- [EPIC-06 — Güvenlik, Gizlilik ve Veri Koruması](EPIC-06.md)
- [EPIC-07 — Testler, Performans ve Yayına Hazırlık](EPIC-07.md)
- [SHHH-001 — Dokuz proje dokümanının hazırlanması ve tutarlılık kontrolü](SHHH-001.md)
- [SHHH-002 — Güncel teknoloji, sürüm ve ücretsiz kullanım doğrulaması](SHHH-002.md)
- [SHHH-003 — Android Web Share Target fizibilitesi ve ağ güvenliği araştırması](SHHH-003.md)
- [SHHH-004 — Whisper Tiny/Base çok dilli model fizibilitesi](SHHH-004.md)
- [SHHH-005 — Ses biçimleri ve kodek uyumluluk matrisi](SHHH-005.md)
- [SHHH-006 — Teknik risk değerlendirmesi ve GO/NO-GO kararı](SHHH-006.md)
- [SHHH-007 — Angular proje altyapısının oluşturulması](SHHH-007.md)
- [SHHH-008 — PWA manifesti, kurulum ve uygulama kabuğu](SHHH-008.md)
- [SHHH-009 — Service Worker ve Web Share Target alıcısı](SHHH-009.md)
- [SHHH-010 — Paylaşılan dosyanın güvenli geçici aktarımı](SHHH-010.md)
- [SHHH-011 — Tekrarlanan paylaşım ve çoklu pencere güvenliği](SHHH-011.md)
- [SHHH-012 — Manuel dosya seçimi ve paylaşım alternatifi](SHHH-012.md)
- [SHHH-013 — Güvenli ses dosyası doğrulama algoritması](SHHH-013.md)
- [SHHH-014 — Ses süresi ve kodek tespiti](SHHH-014.md)
- [SHHH-015 — Ses çözme, mono dönüştürme ve yeniden örnekleme](SHHH-015.md)
- [SHHH-016 — Ses bölümlendirme algoritması](SHHH-016.md)
- [SHHH-017 — Ses buffer yönetimi ve kaynak temizliği](SHHH-017.md)
- [SHHH-018 — Sessizlik, müzik ve konuşma bulunamaması yönetimi](SHHH-018.md)
- [SHHH-019 — Whisper model seçimi ve versiyon sabitleme](SHHH-019.md)
- [SHHH-020 — Model indirme, doğrulama ve önbellek yönetimi](SHHH-020.md)
- [SHHH-021 — Web Worker içinde Whisper çalıştırma](SHHH-021.md)
- [SHHH-022 — Çok dilli konuşma tanıma](SHHH-022.md)
- [SHHH-023 — Parçalı transkripsiyon ve zaman damgası birleştirme](SHHH-023.md)
- [SHHH-024 — Transkripsiyon doğruluğu ve hatalı üretim kontrolü](SHHH-024.md)

## Label planı

- type:epic
- type:documentation
- type:research
- type:feature
- type:security
- type:test
- type:release
- priority:P0
- priority:P1
- priority:P2
- phase:00-discovery
- phase:01-pwa
- phase:02-audio
- phase:03-ai
- phase:04-session
- phase:05-ui
- phase:06-security
- phase:07-release
- status:blocked
- status:ready

32 taslağın tamamı açık Issue olarak yayımlanmayı bekler; SHHH-025 ve sonrası bu plana eklenmemiştir.

