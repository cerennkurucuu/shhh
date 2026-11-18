# shhh. — Yazılım mimarisi

Tarih: 2026-11-16 · Hedef: v1.0 · Durum: planlama; uygulama geliştirilmedi.


## Bileşenler ve sınırlar

Angular standalone UI yalnız durum ve kullanıcı etkileşimini yönetir. ImportCoordinator picker ve share girişlerini tek doğrulama akışına bağlar. AudioInspector metadata/imza denetler; Decoder, Resampler ve Segmenter bounded PCM üretir. ModelManager yalnız model indirme/hash/cache yönetir. Whisper Worker WASM inference çalıştırır. QueueCoordinator tek ağır iş kilidini; SessionRepository IDB transaction ve checkpoint'leri yönetir. Backend yoktur.

## Veri akışı

Dosya → erken boyut/imza kontrolü → metadata/codec → decoder → mono/16 kHz → yaklaşık 20-30 saniyelik segment → Worker → zaman damgalı sonuç → atomik sonuç/checkpoint → UI. SHHH-015 sınırı 600 saniyedir (600 dahil, 601 ret); gerçek AudioBuffer süresi decode sonrasında yeniden kontrol edilir. Süresi bilinmeyen girdi otomatik geçerli sayılmaz; çalışma kümesi tahmini güvenli değilse dönüşüm başlamaz. Kullanıcı sesleri elle bölmez; otomatik segmentleme ileride ele alınır. Segment kimliği sessionId/audioId/segmentIndex ile stabildir. Kuyruk sırası transaction içinde atanır. İlerleme kaynağı bayt veya işlenen ses süresidir.

SHHH-016 segment planlayıcısı bu akışta yalnızca 16 kHz PCM örnek sayısından core/context sample index aralıkları üretir; PCM tamponunu kopyalamaz. Core aralıkları yarı açık `[start, end)` aralıklarıdır ve tüm timeline'ı boşluksuz, çakışmasız böler. Context overlap model girdisine çevre sağlar; gelecekteki transcript birleştirme, kesilen kelimeleri bağlamla değerlendirmeli ve yalnızca core'a ait metni yayımlayarak örtüşme tekrarlarını engellemelidir. Bu parçada transkripsiyon veya metin birleştirme yapılmaz.

`createAudioSegmentViews(pcm, plan)` her plan öğesinin context aralığı için `Float32Array.subarray()` görünümü üretir; segment ID/sırası ve core/context metadata'sı korunur. Görünümler aynı ArrayBuffer'ı paylaşır, bu nedenle salt okunur tüketim sözleşmesi geçerlidir: bir görünümde yazma ana PCM'i değiştirir. Her görünüm referansı kaynak tamponu bellekte tutar. Bu aşamada tampon Worker'a transfer edilmez; ileride Worker için yalnız gerekli aralığın kontrollü kopyalanması ayrıca tasarlanmalıdır.

`AudioSegmentPreparationService.prepareSegments(file, audioId)` AudioPipelineService sonucunu doğrular, varsayılan 25 saniye core/1 saniye context overlap ile deterministik plan üretir ve context görünümüne göre core başlangıç/bitiş offset'lerini döndürür. Overlap örnek sayıları ve `overlapMayRepeatWords` sonraki metin katmanına tekrar olasılığını bildirir; bu servis transkripsiyon veya deduplikasyon yapmaz. Başarısız/iptal edilmiş pipeline sonucu için plan oluşturulmaz. Başarılı segment görünümleri PCM ArrayBuffer'ını canlı tutar; Worker transferi, segment kopyası ve explicit cleanup SHHH-017 kapsamındadır.

`copySegmentForTransfer(segment)` yalnızca çağıranın seçtiği tek context görünümünü, gerçek örnek sayısı × 4 bayt hesabıyla sınır doğrulamasından sonra bağımsız `Float32Array`'e kopyalar; 8 MiB varsayılan tek-segment bütçesi planner'ın en uzun (30 saniye core + her iki yanda 30 saniyeden az overlap) penceresini kapsar. Sonuçtaki PCM ve `transferableBuffer` aynı yeni tahsistir; ana PCM ve kardeş görünümler değişmez. Gelecekte bu buffer transfer listesine verildikten sonra gönderici tarafında PCM view/buffer okunmamalıdır; bu yardımcı Worker oluşturmaz ve bütün planı önceden kopyalamaz.

## Worker sözleşmesi

Versioned discriminated union mesajlar: init, start, progress, result, error, pause/cancel ve ack. Her mesaj requestId, jobId, epoch/fencing token taşır. Yanlış tip veya eski epoch reddedilir. PCM ownership transferable ile aktarılır; ihtiyaç yoksa kopya tutulmaz. İşbirlikçi iptal mümkün değilse Worker terminate edilip yeniden oluşturulur; yarım segment commit edilmez.

## Service Worker ve paylaşım

Manifest share_target multipart POST alabilir. Özel route fetch handler'ı dosyayı yerelde staging'e kaydeder; client'e transferId gönderir veya ID içeren yerel yönlendirme yapar. Dosya/metin URL query'sine konmaz. Dosyalı POST ağ fallback'ine forward edilmez. Angular SW ile özel handler sırası ve scope fizibilitede kanıtlanır; iki kayıtla kontrol çakışması varsayılmaz. SW bulunmadığı anda POST sunucuya ulaşabilir; statik sunucu reddi tek başına “bayt hiç gönderilmedi” kanıtı değildir. Risk çözülmezse share_target yayın manifestine eklenmez.

## Model ve cache

Runtime, WASM ve model sürümleri uyumlu sabitlenir. Model SHA-256 sonrası aktif olur. Cache Storage uygulama/model kaynaklarına ayrılır; geçici sesler bu namespace'lere girmez. COOP/COEP, SharedArrayBuffer, WASM SIMD/threads desteği ölçülür; ihtiyaç halinde single-thread fallback cihazda test edilir. WebGPU zorunlu değildir.

## Durum makinesi

empty → validating → preparing → model-loading → transcribing → completed. Aktif durumlar hidden/pause ile paused'a; retry edilebilir hata error'a gider. paused → güvenli checkpoint → transcribing. Her durumdan finish → cleaning → empty; temizleme başarısızsa cleaning-error kalır, başarı verilmez. Expired açılış cleaning'i import/model işleminden önce çalıştırır.

## Kuyruk, bellek ve hata toparlama

### Ses kaynağı yaşam döngüsü (SHHH-017)

| Kaynak | Sahiplik ve bırakılma noktası | Başarı / hata / iptal / yeniden başlatma |
| --- | --- | --- |
| `File` | Girdi çağıranın sahipliğindedir; servis saklamaz. | Pipeline çağrısı ve metadata probu tamamlanınca servis referansı stack'ten çıkar; çağıran veya tarayıcı başka referans tutabilir. |
| Dosya `ArrayBuffer` | Decode çağrısında yerel değişkendir; WebAudio decode işlemi giriş buffer'ını tüketebilir/detach edebilir. | Decode settle olduğunda veya iptal yarışı döndüğünde servis stack'i biter. İptal, tarayıcı içindeki decode işini zorla durdurmaz; decoder iç referansları geçici olarak sürdürebilir. |
| `AudioBuffer` ve kanal `Float32Array`'leri | `AudioBuffer` decoder fonksiyonu içinde yereldir; `getChannelData()` kopyasız view'ları decode sonucu ile pipeline'a çıkar. | Decode hatasında/iptalde başarılı PCM sonucu yoktur ve yerel referanslar stack bitince bırakılır. Başarıda kanal view'ları pipeline downmix'i bitene kadar tutulur; sonra pipeline stack'i biter. |
| Mono PCM | Pipeline içindeki ara tampon. | Resampling ve dönüş sonucu/hatada pipeline stack'i bittiğinde servis referansı bırakılır; GC zamanı garanti edilmez. |
| 16 kHz PCM | Başarılı pipeline sonucunun çağırana verdiği PCM. | Segment görünüm servisi bunu kalıcı alanda saklamaz; sonuç sahibi bırakana kadar yaşar. Yeni çağrı eski sonucu servis içinden tutmaz. |
| Segment `subarray()` view'ları | Context sample aralığı için sıfır kopyalı view; ana PCM ile aynı buffer. | View tutulduğu sürece ana ArrayBuffer yaşar. View yazılabilir olduğundan tüketici salt okunur kullanmalıdır. Başarı sonucunu çağıran bırakınca bu referanslar düşebilir; fiziksel bellek boşalması GC'ye bağlıdır. |
| `AudioContext` | Her decode çağrısında oluşturulur; tek `finally` cleanup'ında `close()` çağrısı beklenir. | Başarı, decoder hatası ve abort aynı finally yolunu kullanır. Geç gelen decode sonucu yarış helper'ı tarafından tüketilmez; context kapanışı decode API'sini zorla iptal etmez. |
| Blob/Object URL ve metadata `Audio` | Yalnız yerel metadata probe gerektiğinde oluşturulur. Audio elemanının `src` değeri kaldırılıp `load()` ile bırakılır; URL probe `finally` içinde revoke edilir. | Metadata başarı/hatası, probe exception ve abort sonrası bu cleanup yolu çalışır; URL revoke idempotent/sessiz hata toleranslıdır. |
| `AbortController` / `AbortSignal` | Controller çağıranın sahipliğindedir; decode helper yalnız geçici listener ekler. | Decode settle veya abort'ta listener kaldırılır/once tüketilir. Servis controller saklamaz; tekrar çağrı yeni sinyal/işlem kullanır. |

Buradaki cleanup, servislerin kendi referanslarını ve yönetilebilir tarayıcı kaynaklarını bırakması demektir; dosya silme, fiziksel bellek temizleme veya belirli zamanda GC garantisi değildir. `AudioBuffer`, mono tampon ve dosya girdisi için tarayıcı içi peak bellek tam ölçülemez. Segment view'ları bilerek buffer'ı canlı tutar; Worker transferi ve sınırlı segment kopyası bu aşamada yoktur.

OGG/Opus STREAMINFO süresi ilk sayfa başlığından bilinmediğinde pipeline mevcut yerel HTMLAudioElement metadata probunu Blob URL üzerinde dener ve URL'yi her sonuçta revoke eder. Probe başarısızsa 600 saniyelik üst sınırla tahmin yapar; 600 saniye gerçek süre varsayılmaz ve decode sonrası örnek sayısı/süre sınırı yeniden doğrulanır. SHHH-015 pipeline decode edilmiş çok kanallı PCM, mono ara tamponu, 16 kHz çıktı, dosya baytlarının olası iki kopyası ve 64 MiB decoder çalışma payını içeren ayrı bir 512 MiB tahmini çalışma kümesi bütçesi uygular. Bu tahmin tarayıcı içindeki decoder scratch alanını ölçemez ve fiziksel bellek garantisi değildir; bütçe aşımı önceden `memory-limit` ile reddedilir, decode sonrası gerçek örnek sayılarıyla tekrar hesaplanır. Decoder'ın kendi 512 MiB PCM tavanı toplam pipeline belleği yerine kullanılamaz.

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

