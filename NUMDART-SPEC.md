# Numdart: Ürün ve Teknik Şartname (v1)

*Claude ve Gemini'nin ortak kararı, 15 Ekim 2026. Kodlamaya başlarken bu dosya projenin kök dizinine konacak ve tek doğru kaynak olarak kullanılacak.*

---

## 1. Ürün özeti

| | |
|---|---|
| **Ad** | **Numdart** ("number + dart", yani sayıyla hedefi vur) |
| **Mağaza başlığı (TR)** | Numdart: Sayı Bulmaca Oyunu |
| **Mağaza başlığı (EN)** | Numdart: Number Puzzle Game |
| **Tür** | Rahat, seviyeli sayı bulmacası. **Ana mod: Tahta Temizleme** (para ve indirme buradan gelir). **İkinci sekme: Günlük Klasik** (6 sayı ve hedef sayı; paylaşım ve sadakat buradan gelir). |
| **Platform** | Önce Android (Google Play, yundnz@gmail.com hesabındaki kişisel geliştirici hesabı). iOS sonra |
| **Pazar** | Bütün dünya. İlk gün Türkçe ve İngilizce, sonra Arapça, Almanca, İspanyolca, Fransızca |
| **Paket adı** | `com.yunusdeniz.numdart` |
| **Gelir** | Ödüllü reklam, sınırlı geçiş reklamı ve tek seferlik "Reklamsız" paketi |

**Neden bu ad:** "Targeto" adında bir uygulama Play'de zaten var ("Targeto: Math Puzzle Game"), "Numera" adı da onlarca uygulamada kullanılıyor. Play'de "Numdart" aramasında çakışan bir uygulama çıkmadı. *Resmi marka araştırması yapılmadı.*

**Rakipler:** Türkiye'de "Bir Kelime Bir İşlem" (Eagle) 100 binden fazla indirmeyle lider. Diğerleri 1–5 bin indirmede. Dünyada "Countdown Numbers" ve "Digits: Countdown Numbers Game" gibi küçük uygulamalar var. Günlük, paylaşılabilir ve kaliteli bir sürümünü yapan kimse yok.

**Yasak:** "Bir Kelime Bir İşlem", "Countdown", "Le Compte est Bon" gibi TV programı adları, logoları ve müzikleri hiçbir yerde kullanılmayacak: ne uygulamada, ne mağaza metninde, ne de görsellerde.

---

## 2A. Ana mod: Tahta Temizleme

*Bu mod 15 Ekim'de eklendi. Neden: Klasik hedef sayı oyunlarının hiçbiri 100 bin indirmeyi geçememiş. Easybrain'in rahat oynanan sayı bulmacaları ise 5–50 milyon indirmede (Number Sums 5 milyon+, Number Match 50 milyon+). Ana modu bu büyük kitleye göre tasarladık.*

**Nasıl oynanır:**

- Tahtada sayı taşları var. Üstte bir **hedef kuyruğu** duruyor: aktif hedef büyük, sıradaki 2 hedef küçük ve soluk.
- Oyuncu 2 ya da 3 taşa dokunur. Taşların sonucu aktif hedefe eşitse taşlar patlar ve tahtadan kalkar. Yerlerine yeni taş düşmez, ızgara sabit kalır.
- **Amaç tahtayı tamamen temizlemek.**
- **İşlem tuşu yok**, oyun sadece taşlara dokunarak oynanır. İşlemi hedef kutusu belirler:
  - `[ 18 ]` seçilen taşları toplar (seviye 1'den itibaren).
  - `[ ×24 ]` seçilen taşları çarpar (seviye 31'den itibaren).
  - `[ −5 ]` iki taş seçilir, büyükten küçük çıkarılır (seviye 51'den itibaren).
- **Canlı toplam:** Hedefin altında küçük bir kapsül anlık sonucu gösterir, örneğin "7 + 4 = 11 / 18".
- **Fazla gelirse:** Seçilen taşlar mercan rengine döner, sallanır, telefon hata titreşimi verir ve seçim sıfırlanır.
- **Hamle kalmazsa:** Küçük bir çözücü (geri izleme ile, 16 taşta milisaniyeler sürer) her hamleden sonra çalışır. Tahta kilitlenince "Hamle kalmadı" der ve iki seçenek sunar:
  - "↺ 3 hamle geri al": Her seviyede 1 kez ücretsiz.
  - "Karıştır / İpucu": Ödüllü reklamla.

**Seviyeler:**

- Sunucu yok, seviye sayısı sınırsız. Seviye numarası aynı zamanda seed, yani herkes aynı Seviye 57'yi görür.
- Tahtalar **tersten üretilir**: Önce taş grupları seçilir (örneğin 8×3 = 24, 9+5 = 14), sonra taşlar tahtaya karıştırılarak dağıtılır ve sonuçlar hedef kuyruğuna dizilir. Böylece her seviyenin **en az bir çözümü olduğu garanti** olur.
- İlk 30 seviyenin zorluk eğrisi elle ayarlanır.

| Seviye | Tahta | İşlem | Hedef aralığı |
|---|---|---|---|
| 1 | 2×2 (4 taş), 2 hedef | toplama | 10'a kadar |
| 2 | 3×2 (6 taş) | toplama, 3 taşlı hedefler başlar | 10–20 |
| 3–10 | 4×2 (8 taş), 3 hedef | toplama | 10–30 |
| 11–30 | 3×3 – 4×3 | toplama | 15–80 |
| 31–50 | 4×3 – 4×4 | çarpma hedefleri de var | 15–100 |
| 51+ | 4×4 | çıkarma hedefleri de var, bazı taşlar "buzlu" (yanındaki taş patlayınca açılır) | değişken |

**İlk 5 dakika (eğitim ayrı bir ekranda değil, ilk seviyelerin içinde):**

- **Seviye 1:** Hedefler 10 → 9, taşlar 6, 4, 7, 2. 6 ile 4 nabız gibi yanıp söner. Oyuncu ikisine dokunur, taşlar patlar. Sonra kalanlarla 9'u yapar ve tahta temizlenir. Kısa bir konfeti çıkar, arada pencere açılmadan Seviye 2'nin taşları gelir.
- **Seviye 2:** Tek cümlelik bir ipucu çıkar: "2 ya da 3 taş seçebilirsin."
- **Seviye 3:** Oyuncunun sıradaki hedeflere bakarak plan yapması gerektiğini anladığı seviye. Yanlış çifti seçerse tahta kilitlenir ve ücretsiz "3 hamle geri al" düğmesi öne çıkar.
- **Seviye 4'ün sonunda:** 🎯 Günlük sekmesinde bir bildirim noktası ve "Günün 6 sayılı bulmacası hazır!" balonu belirir.

**Taşların görünüşü** (bölüm 6'daki renkler ve kart stiliyle aynı):

- **Seçili taş:** 2dp aşağı iner, zemini indigo olur. Köşesinde kaçıncı seçildiğini gösteren noktalar (•, ••, •••) belirir. Tekrar dokunulunca seçim kalkar.
- **Hedef tutunca:** Taşlar turkuaz parlar, 1,08 kata kadar büyür, sonra küçülerek kaybolur.
- **Hedef kuyruğu:** Aktif hedef 88×64dp boyutunda ve 3dp turuncu çerçeveli. Sıradaki iki hedef 60×48dp boyutunda ve %60 opaklıkta.

### 2B. Ek mekanikler: Katman ve Tortu (v1.0.1, 27 Ekim)

*Gemini'nin önerdiği fikirlerden seçildi. Kuralları bükme gücü veren "tılsım / Macera modu" fikri, oyun tutarsa v1.2'den sonraya ertelendi.*

- **Katmanlı tahta:** Bazı taşların altında ikinci bir taş var. Alttaki taşın sayısı soluk görünür ama seçilemez. Üstteki taş patlayınca alttaki taş yaylanarak yukarı çıkar (0,8 → 1,0 ölçeğinde esnek animasyon). Katmanlar seviye 15'ten itibaren gelir.
- **Tortu (fazla vuruş):** Oyuncu hedeften büyük bir toplam seçebilir, örneğin hedef 12 iken 8 + 7 = 15. Hedef yine patlar. İlk taş kaybolur, son seçilen taşın yerinde aradaki fark kalır (burada **3**).
  - Her seviyede **3 tortu hakkı** var. Haklar bitince "Reklam izle, +2 hak kazan" seçeneği çıkar.
  - Tam vuruş ("bullseye") ekstra yıldız kazandırır.
- **Çözücüye etkisi:** Tortu hakkı kaldığı sürece çözücü kilitlenme tespitinde tortulu hamleleri de hesaba katar.

## 2. Günlük Klasik (🎯 sekmesi): kurallar

- Oyuncuya 6 sayı ve bir hedef sayı verilir.
- **Küçük sayılar** 1–10 arasındaki sayılardan oluşan bir desteden çekilir. Destede her sayıdan iki tane var, toplam 20 kart.
- **Büyük sayılar** {25, 50, 75, 100} arasından çekilir.
- Oyuncu iki sayı ve bir işlem seçer. İşlemin sonucu yeni bir kart olur ve sonraki işlemlerde kullanılabilir.
- Her kart en fazla bir kez kullanılır. Bütün kartları kullanmak zorunlu değil.
- **Bölme** yalnızca kalansızsa yapılabilir.
- **Çıkarma** yalnızca sonuç sıfırdan büyükse yapılabilir.
- **Etkisiz işlemler** (×1, ÷1) çözücü ve zorluk hesabında sayılmaz.
- **Puanlama:**
  - Hedef tam tutturulursa ⭐⭐⭐. Bu durumda zafer animasyonu 0,4 saniye sonra kendiliğinden başlar, "Gönder"e basmak gerekmez.
  - Hedefe 1–5 fark kalırsa ⭐⭐.
  - Hedefe 6–10 fark kalırsa ⭐.
  - Daha uzak kalırsa 0 yıldız.
  - Yıldızlar için oyuncu "Gönder (x★)" düğmesine basarak günü kapatır.
- **Seri:** Günün bulmacasını *bitiren* oyuncunun serisi devam eder, hedefi tam tutturamasa bile.

### Zorluk seviyeleri

*Klasik oyunun sınırsız modu (kolay, orta, zor) v1.1'e ertelendi. v1.0'da günlük klasik bulmaca orta zorlukta olacak. Sınırsız oyun ihtiyacını Tahta Temizleme seviyeleri karşılıyor.*

| Mod | Büyük sayı | Küçük sayı | Hedef aralığı |
|---|---|---|---|
| Kolay | 2 | 4 | 100–500 |
| Orta (günlük bulmaca da bu) | 1 | 5 | 101–999 |
| Zor | 0 | 6 | 300–999 |

**Günlük bulmacanın haftalık zorluk profili:**

- Pazartesi–Salı: en kısa çözüm en az 3 işlem, en az 5 farklı çözüm var.
- Çarşamba–Cuma: orta düzey.
- Cumartesi–Pazar: en kısa çözüm 5 işlem (6 sayının hepsi gerekli), en fazla 2 farklı çözüm var.

---

## 3. Bulmaca üretimi (sunucu yok)

- **Günlük bulmaca:** Cihazın **yerel tarihinden** türetilen bir sayıyla (seed) üretilir. Wordle da böyle çalışıyor. Aynı tarihte dünyadaki bütün cihazlarda aynı bulmaca çıkar.
  - PRNG: `mulberry32`. Seed `"YYYY-MM-DD"` metninden hash'lenir.
  - Bulmaca numarası = yerel tarih − lansman tarihi. Gün farkı **UTC gece yarısına normalize edilerek** hesaplanır, böylece yaz/kış saati geçişinde kayma olmaz.
- **Çözücü (cihazın içinde):** Bütün işlem ağaçlarını DFS ile tarar. Kabaca 30 bin dal var ve tarama birkaç onda bir saniyenin altında biter.
- **Üretim algoritması:**
  1. 6 sayıyı çek.
  2. Bu sayılarla ulaşılabilen bütün hedefleri çıkar. Her hedef için kaç farklı çözüm olduğunu (S) ve en kısa çözümün kaç işlem olduğunu (M) kaydet.
  3. O günün zorluk profiline uyan hedefleri filtrele.
  4. Aynı seed ile bunlardan birini seç. Uygun hedef yoksa seed'e +1 ekleyip baştan başla.
  - **Tam çözümü olmayan hedef asla verilmez.**
- **Sınırsız mod:** Aynı algoritma, cihazın rastgele seed'iyle çalışır.
- **Test:** Node'da önümüzdeki 1.000 günün bulmacası üretilir. Hepsinin tam çözümü olduğu ve aynı tarihte hep aynı bulmacanın çıktığı doğrulanır.

---

## 4. Kayıt, veri ve backend

- **Üyelik yok.** Oyuncu misafir olarak oynar. Uygulama açılınca doğrudan günün bulmacası gelir.
- **Yerel kayıt:** `react-native-mmkv`. Seri, istatistikler, ayarlar, `lastPlayedDateISO` ve reklam sayaçları burada tutulur.
- **Backend yok.** Vercel'de sadece statik dosyalar olacak:
  - Gizlilik politikası sayfası (TR ve EN).
  - Kök dizinde `app-ads.txt` (AdMob yayıncı kimliğiyle).
  - Basit bir tanıtım sayfası.
- **Satın alımları geri yükle** düğmesi Ayarlar'da olacak. RevenueCat bunu Google hesabı üzerinden yapar, üyelik gerekmez.
- **Analitik:** v1.0'da yok. Reklam SDK'sı geldiğinde Veri Güvenliği formu nasılsa güncelleneceği için Firebase o sürümle birlikte değerlendirilecek.

---

## 5. Ekranlar

0. **Tahta Temizleme (ana ekran).** Uygulama doğrudan son kalınan seviyede açılır, arada menü yok. Üst barda sırayla seviye numarası, 🎯 Günlük sekmesi, ⚙ ve 📊 var.
1. **Günlük Klasik oyun ekranı** (🎯 sekmesi). Aşağıdaki yerleşim bu ekran için.
2. **Sonuç ve paylaşım** (alttan açılan pencere):
   - Yıldızlar ve "Paylaş" düğmesi.
   - "En iyi çözümü gör" (ödüllü reklamla).
   - "Sınırsız modda devam et".
3. **İstatistikler:**
   - Oynanan gün sayısı ve başarı yüzdesi.
   - Mevcut ve en uzun seri.
   - Yıldız dağılımı, Wordle tarzı yatay çubuklarla.
4. **Ayarlar ve mağaza:**
   - Ses, titreşim, tema (açık / koyu / sistem), dil.
   - Reklamları kaldır ve satın alımları geri yükle.
   - Gizlilik politikası ve reklam onayı ayarları (UMP).

**Günlük Klasik'in eğitimi:** Oyuncu 🎯 sekmesini ilk açtığında gösterilir. Ana modun eğitimi ise Seviye 1–3'ün içinde (bkz. bölüm 2A). Günlük Klasik eğitimi yaklaşık 15 saniye sürer ve okutmadan oynatarak öğretir:

1. Hedef 150, ekranda sadece 100 ve 50 kartları açık. Oyuncu 100 → + → 50'ye basar.
2. Hedef 145. Oyuncu az önce çıkan 150 kartıyla 150 → − → 5 yapar. Mesaj: "Yeni sayıları tekrar kullanabilirsin."
3. Yıldız kuralları gösterilir, ardından "Günün bulmacasına başla" düğmesi gelir.

### Oyun ekranının yerleşimi (yukarıdan aşağıya, kaydırma yok)

```
[⚙]  Günlük #14 | Sınırsız        [🔥5] [📊]   ← üst bar 48dp
            HEDEF  ┌─────┐
                   │ 463 │                     ← hedef alanı 96dp
                   └─────┘
         En yakın: 460 (fark 3) ⭐⭐            ← canlı yakınlık göstergesi
 1. 75 × 6 = 450                          [✕]
 2. 450 + 10 = 460                        [✕]  ← işlem geçmişi, 4 satırlık sabit alan
 3. _
 [ 75 ] [ 6 ] [ 460 ]                          ← 3×2 sayı kartları
 [  8 ] [ 3 ] [  2  ]
 (  +  ) (  −  ) (  ×  ) (  ÷  )               ← işlem tuşları
 [↺ Geri al] [💡 İpucu] [✓ Gönder (2★)]       ← alt bar 56dp
```

---

## 6. Görsel kimlik

**Tasarım fikri:** "Dokunsal modernizm". Wordle'ın sadeliğiyle 2048 ve Duolingo'nun basılabilir kartlarının birleşimi.

### Renkler

| Rol | Açık tema | Koyu tema |
|---|---|---|
| Arka plan | `#F8F6F0` | `#0F172A` |
| Yüzey / kart | `#FFFFFF` (alt dudak `#E2DEC9`) | `#1E293B` (alt dudak `#090D16`) |
| Büyük sayı kartı | `#EEF2FF` (dudak `#C7D2FE`) | `#1E1B4B` (kenar `#4F46E5`) |
| Birincil / seçili | `#4F46E5` | `#6366F1` |
| Vurgu / işlemler / hedef çerçevesi | `#EA580C` | `#F97316` |
| ⭐⭐⭐ tam isabet | `#0D9488` | `#14B8A6` |
| ⭐⭐ yakın / uyarı | `#D97706` | `#F59E0B` |
| ⭐ uzak / hata | `#E11D48` | `#F43F5E` |
| Ana metin | `#1E293B` | `#F8FAFC` |
| İkincil metin | `#64748B` | `#94A3B8` |

Renk körlüğüne dikkat edildi: Yeşil yerine turkuaz, sarı yerine kehribar, kırmızı yerine mercan kullanılıyor. Durumlar sadece renkle değil, sembol ve şekille de ayrılıyor.

### Yazı tipleri (Google Fonts)

- **Sayılar, hedef ve işlem sembolleri:** Space Grotesk 600/700. Rakamlar sabit genişlikte (`tabular-nums`), böylece kartlar titremez.
- **Arayüz metinleri:** Plus Jakarta Sans 500/600/700. Türkçe karakterleri tam destekliyor.

### Kartlar ve tuşlar

**Sayı kartları:**

- 3 sütun, aralarda 12dp boşluk. Yükseklik 76dp, köşe yuvarlaklığı 16dp, sayı 28sp kalın.
- Bulanık gölge yerine kartın altında **4dp kalınlığında sert bir alt dudak** var.
- **Seçili kart:** 2dp aşağı iner, dudağı 2dp'ye düşer, zemini indigo, yazısı beyaz olur.
- **Kullanılmış kart:** Yerinde kalır, böylece ızgara kaymaz. Opaklığı %25'e düşer, dudağı kaybolur, tıklanamaz.
- **Ara sonuç kartı:** İnce turkuaz çerçeveli ve köşesinde küçük bir işaret var, oyuncu bunun kendi ürettiği sayı olduğunu anlar.

**İşlem tuşları:**

- 4 tane, her biri 64×56dp, köşe yuvarlaklığı 14dp, sembol 28sp.
- **Akıllı soluklaştırma:** Geçersiz sonuç verecek kartlar (kalanlı bölme, sıfır veya negatif çıkarma) kendiliğinden soluklaşır.

### Ses ve titreşim (`expo-haptics`, `expo-audio`)

| Olay | Ses | Titreşim / animasyon |
|---|---|---|
| Kart seçimi | Tok, ahşap bir tık | Hafif titreşim |
| İşlemin tamamlanması | "Pop" sesi | Orta titreşim, kart esnek bir animasyonla büyüyüp küçülür |
| Geri alma | Geri sarma sesi | |
| Üç yıldız | Do-mi-sol-do arpeji | Başarı titreşimi ve konfeti |

### Uygulama ikonu (512×512)

- Zemin: indigo gradyan (`#312E81` → `#4F46E5`).
- Ortada krem renkli (`#F8F6F0`), hafif üç boyutlu bir sayı taşı.
- Taşın üzerinde turuncu (`#F97316`) bir **dart hedefi**.
- İkonda yazı olmayacak.

### Paylaşım metni (çözüm sayılarını göstermez)

```
Numdart #14 🎯 463
⭐⭐⭐

🟦 × 🟦 = 🟢
🟢 + 🟦 = 🟢
🟢 × 🟦 = 🟢
🟢 − 🟦 = 🎯

🔥 Seri: 7
https://play.google.com/store/apps/details?id=com.yunusdeniz.numdart
```

🟦 başlangıç sayılarını, 🟢 oyuncunun ürettiği ara sonuçları, 🎯 hedefe ulaşan son adımı gösterir. Hedef tam tutturulmazsa son satırda 🟡 kullanılır ve yıldızlar "⭐⭐☆ (fark ±2)" şeklinde yazılır.

---

## 7. Para kazanma

| Kaynak | Kural |
|---|---|
| **Ödüllü reklam** | Tahta Temizleme'de: kilitlenince "Karıştır / İpucu" (en çok gelir buradan beklenir). Günlük Klasik'te: ipucu, serini kurtar, en iyi çözümü gör. |
| **Geçiş reklamı** | Sadece Tahta Temizleme'de seviye geçişlerinde: ilk 5 seviyede hiç yok, sonra her 5 seviyede bir, iki reklam arası en az 4 dakika. **Günlük bulmacanın sonuç ekranında asla yok**, çünkü orası paylaşım anı. |
| **Reklamsız paketi** (RevenueCat, tek seferlik) | Türkiye'de 79,99 TL, ABD'de 2,99 $, diğer ülkeler Play'in yerel fiyatlarıyla. Geçiş reklamlarını kaldırır, ipuçlarını reklamsız yapar (günde 3) ve geçmiş günlerin arşivini açar. |
| **İnternet yoksa** | Günde 1 ücretsiz ipucu hakkı. Bu hak MMKV'de tutulur, böylece uçak moduna alıp sınırsız ipucu almak mümkün olmaz. |

**İpucu iki kademeli:**

1. **İlk adımı göster:** Tahtayı sıfırlar ve doğru çözümün ilk işlemini otomatik yapar.
2. **Gereksiz sayıları sönükleştir:** Çözümde kullanılmayan sayıları soluklaştırır ve ikinci işlemi gösterir.

**Zorunlu ayarlar:**

- AdMob için **UMP onay penceresi** (Avrupa ve İngiltere'deki kullanıcılar için GDPR gereği) ilk günden olacak.
- `app-ads.txt` dosyası ilk günden Vercel'de olacak.
- Play'de hedef yaş grubu **13 ve üzeri**. 13 yaş altı işaretlenmeyecek, yoksa uygulama Aileler politikasına girer.

---

## 8. Teknik yapı

- **Temel:** Expo (güncel SDK) ve `expo-router`, TypeScript.
- **Paketler:**
  - Yerel kayıt: `react-native-mmkv`
  - Reklam ve onay: `react-native-google-mobile-ads` (AdMob + UMP)
  - Satın alma: `react-native-purchases` (RevenueCat)
  - Dil: `expo-localization` + `i18next`
  - Ses ve titreşim: `expo-haptics`, `expo-audio`
  - Animasyon: `react-native-reanimated`
  - Paylaşım: Expo Share API (ve v1.1'de görsel paylaşım için `react-native-view-shot`)
- **Expo Go ile çalışmaz.** Projede native modüller var, bu yüzden ilk günden development build kullanılacak (`npx expo run:android` ya da EAS Build). Bilgisayar Windows olduğu için EAS bulut derlemesi tercih edilecek.

**Dikkat edilecek özel durumlar:**

- **Arapça (sağdan sola):** Arayüz sağdan sola akacak, ama işlem geçmişi ve işlem tuşları **her zaman soldan sağa** (`direction: 'ltr'`) kalacak.
- **Büyük yazı tipi ayarı:** Sayı kartlarında, hedefte ve üst barda yazı büyütme 1,15 katla sınırlı (`maxFontSizeMultiplier={1.15}`).
- **Tablet ve katlanabilir ekranlar:** Oyun alanı en fazla 480dp genişlikte (`maxWidth: 480`) ve ortalanmış olacak.
- **Telefon tarihini geri alma hilesi:** Cihaz tarihi `lastPlayedDateISO`'dan eskiyse seri artmaz, sadece sınırsız mod açık kalır.
- **Erişilebilirlik:** Her kartın ve tuşun ekran okuyucu etiketi (`accessibilityLabel`) olacak.

---

## 9. Sürüm planı

| Sürüm | Tarih | Kapsam |
|---|---|---|
| **v1.0** (kapalı test) | 17 Ekim yükleme, 20 Ekim test başlangıcı | TR + EN, **Tahta Temizleme** (sınırsız seviye, kilitlenme tespiti, ücretsiz geri alma), **Günlük Klasik** sekmesi, istatistik, paylaşım, ses/titreşim, açık/koyu tema. **Reklam ve satın alma yok** (incelemeden hızlı geçmek için). |
| **v1.0.1** (kapalı test güncellemesi) | 27 Ekim | Testçi geri bildirimlerine göre düzeltmeler. **Katmanlı tahta + Tortu** (bölüm 2B). AdMob + UMP + RevenueCat "Reklamsız" paketi + app-ads.txt. Akşam 20:30 hatırlatma bildirimi (izin ikinci günden sonra istenir). |
| **v1.0.x** (yayın) | Başvuru 3–4 Kasım, yayın ~10–12 Kasım | Uygulama yayında. 14 Kasım'daki hesap kapanma tarihine 2 gün pay kalır. |
| **v1.1** | Kasım sonu | Arapça, Almanca, İspanyolca, Fransızca. Paylaşım için görsel kart. |
| **v1.2** | Aralık | Play Games Services ile dünya sıralaması ve başarımlar. |

**Kapalı test:**

- 18–20 gerçek Android kullanıcısı.
- Bir WhatsApp grubu: herkes günde bulmacayı çözüp emoji sonucunu gruba atar.
- En az 5–6 kişi Play'deki "geliştiriciye özel geri bildirim" alanına yorum yazar.
- Para karşılığı testçi bulma ve "sen benimkini kur, ben seninkini" grupları kesinlikle olmayacak.

---

## 10. Açık riskler

1. **Hesabın kurtulması:** Uygulamanın sadece kapalı testte olmasının hesabı kapanmaktan kurtarıp kurtarmadığı doğrulanamadı. Hedef, 14 Kasım'dan önce tam yayında olmak.
2. **İsim:** "Numdart" için resmi marka araştırması yapılmadı, `numdart.app` alan adının boşta olup olmadığı da kontrol edilmedi. Paylaşım linki şimdilik Play Store linki.
3. **Google'ın incelemeleri:** Kapalı test veya üretim incelemesi gecikebilir. B planı: Testçi sayısını yüksek tutmak, 27 Ekim'deki güncellemeyle geri bildirime göre değişiklik yapıldığını göstermek ve ilk derlemeyi erken yüklemek.
4. **Gelir tahmini garanti değil.** Günde 10.000 oyuncu ve kişi başı ortalama 3 reklamla ayda kabaca 500–1.500 $ eder. Bu sayıya ulaşmak aylar sürebilir.
