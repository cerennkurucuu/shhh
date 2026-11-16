# SHHH-042 — Bağımlılık ve tedarik zinciri güvenliği

Labels: `type:security`, `priority:P0`, `phase:06-security`, `status:blocked`

## 1. Amaç
Runtime, WASM, model, decoder ve test araçlarının kaynağını, sabit sürümünü, bütünlüğünü, lisansını ve bakım risklerini doğrula.

## 2. Teknik kapsam
Doğrudan/transitif paketler, lockfile, model/WASM artifact'ları, notices/advisory kayıtları ve indirme bütünlüğü kapsanır.

## 3. Uygulanacak yaklaşım ve algoritmalar
Seçilen exact package/tag/commit+lockfile+model SHA-256 envanteri; transitif bağımlılık ve advisory taraması; build script yetkileri ve dağıtım kaynağı. Model indirme staging→hash→active. Ücretsiz hosting kotası ile lisans maliyeti ayrı.

## 4. Kontrol edilebilir kabul kriterleri
- [ ] Her dağıtılan artifact için immutable kaynak/lisans/hash kaydı var.
- [ ] Lockfile izleniyor; .gitignore engeli giderilmiş.
- [ ] Bozuk model/artefact aktif cache'e alınmıyor.
- [ ] Advisory bulgularının tarihli triage/kararı var; kritik çözülmemiş risk yayın engeli.

## 5. Pozitif ve negatif test senaryoları
Pozitif: Temiz kurulumda aynı kilit sürümleri ve hash'leri üret; lisans notices paketini doğrula.

Negatif: Hash uyuşmazlığı, tag değişimi, kilit dışı paket, terk edilmiş bağımlılık, model CORS ve kota; bilinmeyen artifact reddedilir.

Kanıt: fixture/ayar, cihaz ve sürüm, beklenen/gerçek sonuç, tarih ve ilgili test kimliği kaydedilir. Gizli konuşma fixture veya rapora eklenmez.

## 6. Bağımlılıklar ve Epic
Parent: [EPIC-06](EPIC-06.md).

- [SHHH-002](SHHH-002.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-019](SHHH-019.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-020](SHHH-020.md): ilgili altyapı veya doğrulama kanıtı gereklidir.
- [SHHH-038](SHHH-038.md): ilgili altyapı veya doğrulama kanıtı gereklidir.

Bu liste teknik önkoşulları belirtir; Issue'nun OPEN olması plan oluşturmayı engellemez. Araştırma ve ön tasarım paralel ilerleyebilir; tamamlanma ilgili kanıta bağlıdır.

## 7. Kapsam dışı
Yeni paket ekleyerek özellik genişletme veya ücretsiz lisansı sınırsız hosting sayma.

## 8. Definition of Done
- [ ] SBOM/bağımlılık tablosu, notices, tarihli güvenlik taraması ve Ceren Kurucu lisans/dağıtım kararı mevcut.
- [ ] Yukarıdaki kabul maddeleri ve pozitif/negatif testlerin gerçek sonuçları kayıtlı.
- [ ] İlgili belge ve bağımlılık bağlantıları güncel; kalan risk varsa açıkça yazılmış.

shhh. ürün fikri, araştırma yönü, algoritmik yaklaşım ve ürün yönetimi Ceren Kurucu'ya aittir. AI agent Ceren Kurucu'nun yönlendirmesiyle teknik kod uygulamasını üstlenir. Bu tur yalnız plan hazırlığıdır; uygulama geliştirme veya yayın değildir.

## İlgili belgeler
- [02-PRD.md](../../docs/02-PRD.md)
- [07-CODING-STANDARDS.md](../../docs/07-CODING-STANDARDS.md)
- [09-SOURCES-AND-LICENSES.md](../../docs/09-SOURCES-AND-LICENSES.md)

