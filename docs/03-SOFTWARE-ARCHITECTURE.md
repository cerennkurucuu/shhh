# shhh. — Yazılım mimarisi

Tarih: 2026-11-16 · Hedef: v1.0 · Durum: planlama; uygulama geliştirilmedi.


## Bileşenler ve sınırlar

Angular standalone UI yalnız durum ve kullanıcı etkileşimini yönetir. ImportCoordinator picker ve share girişlerini tek doğrulama akışına bağlar. AudioInspector metadata/imza denetler; Decoder, Resampler ve Segmenter bounded PCM üretir. ModelManager yalnız model indirme/hash/cache yönetir. Whisper Worker WASM inference çalıştırır. QueueCoordinator tek ağır iş kilidini; SessionRepository IDB transaction ve checkpoint'leri yönetir. Backend yoktur.

## Veri akışı

Dosya → erken boyut/imza kontrolü → metadata/codec → decoder → mono/16 kHz → yaklaşık 20–30 saniyelik segment → Worker → zaman damgalı sonuç → atomik sonuç/checkpoint → UI. Segment kimliği sessionId/audioId/segmentIndex ile stabildir. Kuyruk sırası transaction içinde atanır. İlerleme kaynağı bayt veya işlenen ses süresidir.

## Worker sözleşmesi

Versioned discriminated union mesajlar: init, start, progress, result, error, pause/cancel ve ack. Her mesaj requestId, jobId, epoch/fencing token taşır. Yanlış tip veya eski epoch reddedilir. PCM ownership transferable ile aktarılır; ihtiyaç yoksa kopya tutulmaz. İşbirlikçi iptal mümkün değilse Worker terminate edilip yeniden oluşturulur; yarım segment commit edilmez.

## Service Worker ve paylaşım

Manifest share_target multipart POST alabilir. Özel route fetch handler'ı dosyayı yerelde staging'e kaydeder; client'e transferId gönderir veya ID içeren yerel yönlendirme yapar. Dosya/metin URL query'sine konmaz. Dosyalı POST ağ fallback'ine forward edilmez. Angular SW ile özel handler sırası ve scope fizibilitede kanıtlanır; iki kayıtla kontrol çakışması varsayılmaz. SW bulunmadığı anda POST sunucuya ulaşabilir; statik sunucu reddi tek başına “bayt hiç gönderilmedi” kanıtı değildir. Risk çözülmezse share_target yayın manifestine eklenmez.

## Model ve cache

Runtime, WASM ve model sürümleri uyumlu sabitlenir. Model SHA-256 sonrası aktif olur. Cache Storage uygulama/model kaynaklarına ayrılır; geçici sesler bu namespace'lere girmez. COOP/COEP, SharedArrayBuffer, WASM SIMD/threads desteği ölçülür; ihtiyaç halinde single-thread fallback cihazda test edilir. WebGPU zorunlu değildir.

## Durum makinesi

empty → validating → preparing → model-loading → transcribing → completed. Aktif durumlar hidden/pause ile paused'a; retry edilebilir hata error'a gider. paused → güvenli checkpoint → transcribing. Her durumdan finish → cleaning → empty; temizleme başarısızsa cleaning-error kalır, başarı verilmez. Expired açılış cleaning'i import/model işleminden önce çalıştırır.

## Kuyruk, bellek ve hata toparlama

Web Locks tercih adayıdır; destek yoksa IDB lease ve monoton fencing token gerekir. BroadcastChannel doğruluk kaynağı değildir. Sadece bir ağır AI işi, sınırlı decode prefetch; decoder tüm dosyayı RAM'e alıyorsa daha düşük limit veya alternatif decoder kararı gerekir. finally ile URL revoke, AudioContext close, decoder release ve Worker cleanup yapılır. Sonuç/checkpoint transaction başarısızsa UI kalıcı başarı göstermez. Stale Worker sonuçları cleanup sonrası oturumu diriltemez.

## Teknik alternatifler

Native Web Audio yeterliyse ek decoder yok. Mediabunny ancak codec/streaming matrisi ve lisans kanıtı sonrası. whisper.cpp WASM birincil adaydır; başka runtime otomatik seçilmez. Model tiny/base seçimi ölçüme bağlıdır. Gizlilik ya da lisansı bozan fallback bulut API'si olamaz.

## İlgili belgeler

- [01-PROJECT-OVERVIEW.md](01-PROJECT-OVERVIEW.md)
- [02-PRD.md](02-PRD.md)
- [04-LOCAL-DATA-AND-PRIVACY.md](04-LOCAL-DATA-AND-PRIVACY.md)
- [05-UI-DESIGN-SYSTEM.md](05-UI-DESIGN-SYSTEM.md)
- [06-NAVIGATION-AND-SCREEN-FLOW.md](06-NAVIGATION-AND-SCREEN-FLOW.md)
- [07-CODING-STANDARDS.md](07-CODING-STANDARDS.md)
- [08-TEST-PLAN.md](08-TEST-PLAN.md)
- [09-SOURCES-AND-LICENSES.md](09-SOURCES-AND-LICENSES.md)

by cerenkurucu · Built with AI assistance

