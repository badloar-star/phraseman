import type Ionicons from '@expo/vector-icons/Ionicons';
import { triLang, type Lang } from '../constants/i18n';

/**
 * shop_catalog.ts — витрина магазина: категории и товары.
 *
 * зачем (владелец, 24.08): каталог вынесен из экрана отдельным модулем, потому
 * что цены и состав — предмет решений владельца, а не вёрстки. Здесь его правят,
 * не трогая экран, и отсюда же его увидит будущая серверная доставка контента.
 *
 * ЦЕНЫ. Руна зарабатывается и должна ощущаться весомее покупаемой жемчужины,
 * поэтому в рунах всё стоит дороже (решение владельца 24.08). Соответствие
 * живущим в коде механикам и фактический курс к жемчужной цене:
 *   • «Опыт ×2 · 1 час»    ← LEAGUE_PERSONAL_BOOSTS x2_30m/x2_1h
 *   • «Клубный буст ×2»    ← LEAGUE_GROUP_BOOST_COST_SHARDS (50 жемчужин → 100 рун, ×2)
 *   • «Полная энергия»     ← energyRefillShardCost      (5 жемчужин → 50 рун,  ×10)
 *   • «Щит серии»          ← streak_freeze_cost_shards  (10 жемчужин → 90 рун, ×9)
 *
 * зачем эта таблица (аудит экономики 2026-08-24): единый множитель «вдвое»
 * держится только на клубном бусте — дешёвые товары в рунах намеренно дороже,
 * иначе бесплатно заработанные руны обесценили бы покупку жемчужин. Владелец
 * подтвердил расхождение как ЗАДУМАННОЕ. Не «выравнивать» эти цены под ×2,
 * приняв разнобой за ошибку: правило звучит «дороже», а не «ровно вдвое».
 *
 * Подсказки в витрину НЕ выведены — прямое указание владельца.
 *
 * Тексты сразу на всех языках интерфейса: витрину видят все, а дописывать
 * переводы задним числом — как раз тот случай, когда часть строк остаётся
 * русской в чужой локали.
 *
 * Макет: docs/v2/mockups/28-shop.html
 */

/** Строка витрины на всех языках интерфейса. */
export type ShopCopy = Readonly<{
  ru: string; uk: string; es: string;
  'pt-BR': string; vi: string; id: string; tr: string; pl: string;
}>;

export const shopText = (lang: Lang, copy: ShopCopy): string => triLang(lang, copy);

export type ShopCategoryId = 'all' | 'boost' | 'spin' | 'look' | 'cards' | 'pearls';

export type ShopCurrency = 'runes' | 'pearls';

export type ShopItemTone = 'xp' | 'shield' | 'energy' | 'spin' | 'theme' | 'cards' | 'plus' | 'aura';

export type ShopItem = Readonly<{
  id: string;
  category: Exclude<ShopCategoryId, 'all' | 'pearls'>;
  currency: ShopCurrency;
  price: number;
  title: ShopCopy;
  detail: ShopCopy;
  tone: ShopItemTone;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: 'hot' | 'best';
  /**
   * Товар выдаёт СЛУЧАЙНЫЙ предмет из набора (как спин). Экран обязан назвать
   * выпавшее — иначе покупка ощущается списанием в никуда.
   */
  randomPool?: readonly ShopCopy[];
}>;

export type ShopCategory = Readonly<{
  id: ShopCategoryId;
  title: ShopCopy;
  icon: keyof typeof Ionicons.glyphMap;
}>;

export const SHOP_CATEGORIES: readonly ShopCategory[] = Object.freeze([
  {
    id: 'all', icon: 'grid-outline',
    title: { ru: 'Всё', uk: 'Усе', es: 'Todo', 'pt-BR': 'Tudo', vi: 'Tất cả', id: 'Semua', tr: 'Tümü', pl: 'Wszystko' },
  },
  {
    id: 'boost', icon: 'flash-outline',
    title: { ru: 'Усиления', uk: 'Підсилення', es: 'Mejoras', 'pt-BR': 'Reforços', vi: 'Tăng cường', id: 'Penguat', tr: 'Güçlendirmeler', pl: 'Wzmocnienia' },
  },
  {
    id: 'spin', icon: 'disc-outline',
    title: { ru: 'Спины', uk: 'Спіни', es: 'Giros', 'pt-BR': 'Giros', vi: 'Lượt quay', id: 'Putaran', tr: 'Çevirmeler', pl: 'Losowania' },
  },
  {
    id: 'look', icon: 'sparkles-outline',
    title: { ru: 'Внешний вид', uk: 'Зовнішній вигляд', es: 'Apariencia', 'pt-BR': 'Aparência', vi: 'Giao diện', id: 'Tampilan', tr: 'Görünüm', pl: 'Wygląd' },
  },
  {
    id: 'cards', icon: 'albums-outline',
    title: { ru: 'Наборы', uk: 'Набори', es: 'Paquetes', 'pt-BR': 'Pacotes', vi: 'Bộ thẻ', id: 'Paket', tr: 'Setler', pl: 'Zestawy' },
  },
  {
    id: 'pearls', icon: 'diamond-outline',
    title: { ru: 'Пополнить жемчуг', uk: 'Поповнити перлини', es: 'Recargar perlas', 'pt-BR': 'Recarregar pérolas', vi: 'Nạp ngọc trai', id: 'Isi mutiara', tr: 'İnci yükle', pl: 'Doładuj perły' },
  },
]);

/**
 * Ауры выпадают случайно; иконка уже существует в наградах спина
 * (`assets/images/level-spin-rewards/cosmetic_avatar_aura.webp`).
 */
const AURA_POOL: readonly ShopCopy[] = Object.freeze([
  { ru: 'Пламя', uk: 'Полум’я', es: 'Llama', 'pt-BR': 'Chama', vi: 'Ngọn lửa', id: 'Nyala', tr: 'Alev', pl: 'Płomień' },
  { ru: 'Иней', uk: 'Іній', es: 'Escarcha', 'pt-BR': 'Geada', vi: 'Sương giá', id: 'Embun beku', tr: 'Kırağı', pl: 'Szron' },
  { ru: 'Гроза', uk: 'Гроза', es: 'Tormenta', 'pt-BR': 'Tempestade', vi: 'Giông bão', id: 'Badai', tr: 'Fırtına', pl: 'Burza' },
  { ru: 'Сакура', uk: 'Сакура', es: 'Sakura', 'pt-BR': 'Sakura', vi: 'Hoa anh đào', id: 'Sakura', tr: 'Sakura', pl: 'Sakura' },
  { ru: 'Бездна', uk: 'Безодня', es: 'Abismo', 'pt-BR': 'Abismo', vi: 'Vực thẳm', id: 'Jurang', tr: 'Uçurum', pl: 'Otchłań' },
  { ru: 'Рассвет', uk: 'Світанок', es: 'Alba', 'pt-BR': 'Alvorada', vi: 'Bình minh', id: 'Fajar', tr: 'Şafak', pl: 'Świt' },
]);

export const SHOP_ITEMS: readonly ShopItem[] = Object.freeze([
  // ── За руны: усиления прогресса ────────────────────────────────
  {
    id: 'xp-x2-1h', category: 'boost', currency: 'runes', price: 60,
    tone: 'xp', icon: 'flash-outline',
    title: { ru: 'Опыт ×2 · час', uk: 'Досвід ×2 · година', es: 'XP ×2 · 1 hora', 'pt-BR': 'XP ×2 · 1 hora', vi: 'XP ×2 · 1 giờ', id: 'XP ×2 · 1 jam', tr: 'XP ×2 · 1 saat', pl: 'XP ×2 · godzina' },
    detail: { ru: 'Весь опыт за уроки, тренировки и Арену удваивается на 60 минут.', uk: 'Увесь досвід за уроки, тренування та Арену подвоюється на 60 хвилин.', es: 'Todo el XP de lecciones, práctica y Arena se duplica durante 60 minutos.', 'pt-BR': 'Todo o XP de lições, treinos e Arena dobra por 60 minutos.', vi: 'Mọi XP từ bài học, luyện tập và Đấu trường nhân đôi trong 60 phút.', id: 'Semua XP dari pelajaran, latihan, dan Arena berlipat ganda selama 60 menit.', tr: 'Dersler, pratik ve Arena’dan gelen tüm XP 60 dakika boyunca ikiye katlanır.', pl: 'Całe XP z lekcji, ćwiczeń i Areny podwaja się na 60 minut.' },
  },
  {
    id: 'xp-x2-2h', category: 'boost', currency: 'runes', price: 90,
    tone: 'xp', icon: 'flash-outline',
    title: { ru: 'Опыт ×2 · 2 часа', uk: 'Досвід ×2 · 2 години', es: 'XP ×2 · 2 horas', 'pt-BR': 'XP ×2 · 2 horas', vi: 'XP ×2 · 2 giờ', id: 'XP ×2 · 2 jam', tr: 'XP ×2 · 2 saat', pl: 'XP ×2 · 2 godziny' },
    detail: { ru: 'Тот же множитель, вдвое дольше. Выгоднее часового.', uk: 'Той самий множник, удвічі довше. Вигідніше за годинний.', es: 'El mismo multiplicador, el doble de tiempo. Sale mejor que el de una hora.', 'pt-BR': 'O mesmo multiplicador, o dobro do tempo. Mais vantajoso que o de uma hora.', vi: 'Cùng hệ số, thời gian gấp đôi. Lợi hơn gói một giờ.', id: 'Pengali yang sama, dua kali lebih lama. Lebih hemat dari yang satu jam.', tr: 'Aynı çarpan, iki kat süre. Bir saatlikten daha avantajlı.', pl: 'Ten sam mnożnik, dwa razy dłużej. Korzystniej niż godzinny.' },
  },
  {
    id: 'xp-x3-15m', category: 'boost', currency: 'runes', price: 80,
    tone: 'xp', icon: 'flame-outline',
    title: { ru: 'Опыт ×3 · 15 мин', uk: 'Досвід ×3 · 15 хв', es: 'XP ×3 · 15 min', 'pt-BR': 'XP ×3 · 15 min', vi: 'XP ×3 · 15 phút', id: 'XP ×3 · 15 mnt', tr: 'XP ×3 · 15 dk', pl: 'XP ×3 · 15 min' },
    detail: { ru: 'Короткий рывок — успей закрыть неделю лиги.', uk: 'Короткий ривок — устигни закрити тиждень ліги.', es: 'Un empujón corto: cierra la semana de liga a tiempo.', 'pt-BR': 'Um impulso curto: feche a semana da liga a tempo.', vi: 'Bứt tốc ngắn — kịp khép lại tuần giải đấu.', id: 'Dorongan singkat — tutup pekan liga tepat waktu.', tr: 'Kısa bir atak — lig haftasını zamanında kapat.', pl: 'Krótki zryw — zdąż zamknąć tydzień ligi.' },
  },
  {
    id: 'streak-shield', category: 'boost', currency: 'runes', price: 90,
    tone: 'shield', icon: 'shield-checkmark-outline',
    title: { ru: 'Щит серии', uk: 'Щит серії', es: 'Escudo de racha', 'pt-BR': 'Escudo de sequência', vi: 'Khiên chuỗi ngày', id: 'Perisai rangkaian', tr: 'Seri kalkanı', pl: 'Tarcza serii' },
    detail: { ru: 'Пропущенный день не обнулит серию. Сработает сам.', uk: 'Пропущений день не обнулить серію. Спрацює сам.', es: 'Un día perdido no reiniciará tu racha. Se activa solo.', 'pt-BR': 'Um dia perdido não zera sua sequência. Ativa sozinho.', vi: 'Một ngày bỏ lỡ không làm mất chuỗi. Tự động kích hoạt.', id: 'Sehari terlewat tidak menghapus rangkaian. Aktif otomatis.', tr: 'Kaçırılan bir gün seriyi sıfırlamaz. Kendi kendine devreye girer.', pl: 'Opuszczony dzień nie wyzeruje serii. Zadziała sam.' },
  },
  {
    id: 'energy-full', category: 'boost', currency: 'runes', price: 50,
    tone: 'energy', icon: 'battery-charging-outline',
    title: { ru: 'Полная энергия', uk: 'Повна енергія', es: 'Energía llena', 'pt-BR': 'Energia cheia', vi: 'Đầy năng lượng', id: 'Energi penuh', tr: 'Tam enerji', pl: 'Pełna energia' },
    detail: { ru: 'Мгновенно заполняет шкалу — не ждать полчаса.', uk: 'Миттєво заповнює шкалу — не чекати півгодини.', es: 'Llena la barra al instante: sin esperar media hora.', 'pt-BR': 'Enche a barra na hora: sem esperar meia hora.', vi: 'Làm đầy thanh ngay lập tức — khỏi chờ nửa tiếng.', id: 'Mengisi bilah seketika — tanpa menunggu setengah jam.', tr: 'Çubuğu anında doldurur — yarım saat beklemek yok.', pl: 'Natychmiast wypełnia pasek — bez czekania pół godziny.' },
  },
  {
    id: 'club-boost', category: 'boost', currency: 'runes', price: 100,
    tone: 'xp', icon: 'people-outline', badge: 'hot',
    title: { ru: 'Клубный буст ×2', uk: 'Клубний буст ×2', es: 'Impulso de club ×2', 'pt-BR': 'Impulso do clube ×2', vi: 'Tăng tốc câu lạc bộ ×2', id: 'Penguat klub ×2', tr: 'Kulüp güçlendirmesi ×2', pl: 'Boost klubu ×2' },
    detail: { ru: 'Множитель на всю комнату лиги. Спасибо скажут все.', uk: 'Множник на всю кімнату ліги. Подякують усі.', es: 'Multiplicador para toda la sala de liga. Todos lo agradecerán.', 'pt-BR': 'Multiplicador para toda a sala da liga. Todos vão agradecer.', vi: 'Hệ số cho cả phòng giải đấu. Ai cũng sẽ cảm ơn.', id: 'Pengali untuk seluruh ruang liga. Semua akan berterima kasih.', tr: 'Tüm lig odası için çarpan. Herkes teşekkür eder.', pl: 'Mnożnik dla całego pokoju ligi. Wszyscy podziękują.' },
  },
  {
    id: 'xp-bank-600', category: 'boost', currency: 'runes', price: 120,
    tone: 'xp', icon: 'wallet-outline',
    title: { ru: 'Банк опыта · 600', uk: 'Банк досвіду · 600', es: 'Banco de XP · 600', 'pt-BR': 'Banco de XP · 600', vi: 'Kho XP · 600', id: 'Bank XP · 600', tr: 'XP bankası · 600', pl: 'Bank XP · 600' },
    detail: { ru: 'Разовая выдача 600 опыта прямо сейчас.', uk: 'Разова видача 600 досвіду просто зараз.', es: 'Entrega única de 600 XP ahora mismo.', 'pt-BR': 'Entrega única de 600 XP agora mesmo.', vi: 'Nhận ngay 600 XP một lần.', id: 'Pemberian sekali 600 XP sekarang juga.', tr: 'Şimdi tek seferde 600 XP.', pl: 'Jednorazowe 600 XP od razu.' },
  },
  {
    id: 'xp-x2-eod', category: 'boost', currency: 'runes', price: 180,
    tone: 'xp', icon: 'moon-outline', badge: 'best',
    title: { ru: 'Опыт ×2 до ночи', uk: 'Досвід ×2 до ночі', es: 'XP ×2 hasta medianoche', 'pt-BR': 'XP ×2 até a meia-noite', vi: 'XP ×2 đến nửa đêm', id: 'XP ×2 sampai tengah malam', tr: 'Gece yarısına kadar XP ×2', pl: 'XP ×2 do północy' },
    detail: { ru: 'Множитель работает до полуночи по твоему времени.', uk: 'Множник працює до опівночі за твоїм часом.', es: 'El multiplicador dura hasta la medianoche en tu horario.', 'pt-BR': 'O multiplicador vale até a meia-noite no seu horário.', vi: 'Hệ số hoạt động đến nửa đêm theo giờ của bạn.', id: 'Pengali berlaku sampai tengah malam waktu kamu.', tr: 'Çarpan senin saatinle gece yarısına kadar geçerli.', pl: 'Mnożnik działa do północy twojego czasu.' },
  },

  // ── За жемчуг: спины ───────────────────────────────────────────
  {
    id: 'spin-1', category: 'spin', currency: 'pearls', price: 40,
    tone: 'spin', icon: 'disc-outline',
    title: { ru: 'Спин рулетки', uk: 'Спін рулетки', es: 'Giro de ruleta', 'pt-BR': 'Giro da roleta', vi: 'Lượt quay', id: 'Putaran roda', tr: 'Çark çevirme', pl: 'Losowanie' },
    detail: { ru: 'Один прокрут: опыт, жемчуг, руны, косметика или дни Plus.', uk: 'Один прокрут: досвід, перлини, руни, косметика або дні Plus.', es: 'Un giro: XP, perlas, runas, cosméticos o días de Plus.', 'pt-BR': 'Um giro: XP, pérolas, runas, cosméticos ou dias de Plus.', vi: 'Một lượt quay: XP, ngọc trai, rune, trang trí hoặc ngày Plus.', id: 'Satu putaran: XP, mutiara, rune, kosmetik, atau hari Plus.', tr: 'Bir çevirme: XP, inci, rün, kozmetik ya da Plus günleri.', pl: 'Jedno losowanie: XP, perły, runy, kosmetyki lub dni Plus.' },
  },
  {
    id: 'spin-3', category: 'spin', currency: 'pearls', price: 100,
    tone: 'spin', icon: 'disc-outline', badge: 'best',
    title: { ru: '3 спина', uk: '3 спіни', es: '3 giros', 'pt-BR': '3 giros', vi: '3 lượt quay', id: '3 putaran', tr: '3 çevirme', pl: '3 losowania' },
    detail: { ru: 'Три прокрута по цене двух с половиной.', uk: 'Три прокрути за ціною двох з половиною.', es: 'Tres giros al precio de dos y medio.', 'pt-BR': 'Três giros pelo preço de dois e meio.', vi: 'Ba lượt quay với giá hai lượt rưỡi.', id: 'Tiga putaran seharga dua setengah.', tr: 'İki buçuk fiyatına üç çevirme.', pl: 'Trzy losowania w cenie dwóch i pół.' },
  },
  {
    id: 'spin-10', category: 'spin', currency: 'pearls', price: 300,
    tone: 'spin', icon: 'disc-outline',
    title: { ru: '10 спинов', uk: '10 спінів', es: '10 giros', 'pt-BR': '10 giros', vi: '10 lượt quay', id: '10 putaran', tr: '10 çevirme', pl: '10 losowań' },
    detail: { ru: 'Лучшая цена за прокрут. Для охоты за редким.', uk: 'Найкраща ціна за прокрут. Для полювання на рідкісне.', es: 'El mejor precio por giro. Para cazar lo raro.', 'pt-BR': 'O melhor preço por giro. Para caçar o raro.', vi: 'Giá tốt nhất mỗi lượt. Dành cho săn đồ hiếm.', id: 'Harga terbaik per putaran. Untuk berburu yang langka.', tr: 'Çevirme başına en iyi fiyat. Nadir olanı avlamak için.', pl: 'Najlepsza cena za losowanie. Na polowanie na rzadkie.' },
  },

  // ── За жемчуг: внешний вид ─────────────────────────────────────
  {
    id: 'theme', category: 'look', currency: 'pearls', price: 200,
    tone: 'theme', icon: 'color-palette-outline',
    title: { ru: 'Тема оформления', uk: 'Тема оформлення', es: 'Tema visual', 'pt-BR': 'Tema visual', vi: 'Chủ đề giao diện', id: 'Tema tampilan', tr: 'Görsel tema', pl: 'Motyw wyglądu' },
    detail: { ru: 'Премиальная тема приложения навсегда.', uk: 'Преміальна тема застосунку назавжди.', es: 'Tema premium de la app para siempre.', 'pt-BR': 'Tema premium do app para sempre.', vi: 'Chủ đề cao cấp của ứng dụng, vĩnh viễn.', id: 'Tema premium aplikasi selamanya.', tr: 'Uygulamanın premium teması, kalıcı.', pl: 'Motyw premium aplikacji na zawsze.' },
  },
  {
    id: 'aura-random', category: 'look', currency: 'pearls', price: 150,
    tone: 'aura', icon: 'sparkles-outline', badge: 'hot', randomPool: AURA_POOL,
    title: { ru: 'Случайная аура', uk: 'Випадкова аура', es: 'Aura aleatoria', 'pt-BR': 'Aura aleatória', vi: 'Hào quang ngẫu nhiên', id: 'Aura acak', tr: 'Rastgele aura', pl: 'Losowa aura' },
    detail: { ru: 'Выпадет одна из аур аватара. Какая — узнаешь при открытии.', uk: 'Випаде одна з аур аватара. Яка — дізнаєшся при відкритті.', es: 'Saldrá una de las auras del avatar. Cuál, lo sabrás al abrirla.', 'pt-BR': 'Sairá uma das auras do avatar. Qual, você descobre ao abrir.', vi: 'Sẽ ra một trong các hào quang avatar. Cái nào — mở ra mới biết.', id: 'Akan keluar salah satu aura avatar. Yang mana — ketahuan saat dibuka.', tr: 'Avatar auralarından biri çıkar. Hangisi olduğunu açınca görürsün.', pl: 'Wypadnie jedna z aur awatara. Która — dowiesz się przy otwarciu.' },
  },
  {
    id: 'plus-3d', category: 'look', currency: 'pearls', price: 180,
    tone: 'plus', icon: 'ribbon-outline',
    title: { ru: 'Plus · 3 дня', uk: 'Plus · 3 дні', es: 'Plus · 3 días', 'pt-BR': 'Plus · 3 dias', vi: 'Plus · 3 ngày', id: 'Plus · 3 hari', tr: 'Plus · 3 gün', pl: 'Plus · 3 dni' },
    detail: { ru: 'Безлимит энергии и все премиальные разделы.', uk: 'Безліміт енергії та всі преміальні розділи.', es: 'Energía ilimitada y todas las secciones premium.', 'pt-BR': 'Energia ilimitada e todas as seções premium.', vi: 'Năng lượng không giới hạn và mọi mục cao cấp.', id: 'Energi tanpa batas dan semua bagian premium.', tr: 'Sınırsız enerji ve tüm premium bölümler.', pl: 'Nielimitowana energia i wszystkie sekcje premium.' },
  },
  {
    id: 'plus-7d', category: 'look', currency: 'pearls', price: 350,
    tone: 'plus', icon: 'ribbon-outline', badge: 'best',
    title: { ru: 'Plus · 7 дней', uk: 'Plus · 7 днів', es: 'Plus · 7 días', 'pt-BR': 'Plus · 7 dias', vi: 'Plus · 7 ngày', id: 'Plus · 7 hari', tr: 'Plus · 7 gün', pl: 'Plus · 7 dni' },
    detail: { ru: 'Неделя без ограничений. Выгоднее трёхдневного.', uk: 'Тиждень без обмежень. Вигідніше за триденний.', es: 'Una semana sin límites. Mejor que el de tres días.', 'pt-BR': 'Uma semana sem limites. Melhor que o de três dias.', vi: 'Một tuần không giới hạn. Lợi hơn gói ba ngày.', id: 'Seminggu tanpa batas. Lebih hemat dari yang tiga hari.', tr: 'Sınırsız bir hafta. Üç günlükten daha avantajlı.', pl: 'Tydzień bez ograniczeń. Korzystniej niż trzydniowy.' },
  },

  // ── За жемчуг: наборы карточек ─────────────────────────────────
  {
    id: 'cards-basic', category: 'cards', currency: 'pearls', price: 80,
    tone: 'cards', icon: 'albums-outline',
    title: { ru: 'Набор карточек', uk: 'Набір карток', es: 'Paquete de tarjetas', 'pt-BR': 'Pacote de cartões', vi: 'Bộ thẻ', id: 'Paket kartu', tr: 'Kart seti', pl: 'Zestaw fiszek' },
    detail: { ru: 'Тематический набор фраз в твою коллекцию.', uk: 'Тематичний набір фраз до твоєї колекції.', es: 'Un set temático de frases para tu colección.', 'pt-BR': 'Um conjunto temático de frases para sua coleção.', vi: 'Bộ cụm từ theo chủ đề cho bộ sưu tập của bạn.', id: 'Set frasa bertema untuk koleksimu.', tr: 'Koleksiyonun için temalı ifade seti.', pl: 'Tematyczny zestaw zwrotów do twojej kolekcji.' },
  },
  {
    id: 'cards-travel', category: 'cards', currency: 'pearls', price: 80,
    tone: 'cards', icon: 'airplane-outline',
    title: { ru: 'Набор «Поездка»', uk: 'Набір «Подорож»', es: 'Paquete «Viaje»', 'pt-BR': 'Pacote «Viagem»', vi: 'Bộ «Du lịch»', id: 'Paket «Perjalanan»', tr: '«Seyahat» seti', pl: 'Zestaw «Podróż»' },
    detail: { ru: 'Фразы для аэропорта, отеля и такси.', uk: 'Фрази для аеропорту, готелю й таксі.', es: 'Frases para el aeropuerto, el hotel y el taxi.', 'pt-BR': 'Frases para aeroporto, hotel e táxi.', vi: 'Cụm từ cho sân bay, khách sạn và taxi.', id: 'Frasa untuk bandara, hotel, dan taksi.', tr: 'Havaalanı, otel ve taksi için ifadeler.', pl: 'Zwroty na lotnisko, do hotelu i taksówki.' },
  },
  {
    id: 'cards-work', category: 'cards', currency: 'pearls', price: 80,
    tone: 'cards', icon: 'briefcase-outline',
    title: { ru: 'Набор «Работа»', uk: 'Набір «Робота»', es: 'Paquete «Trabajo»', 'pt-BR': 'Pacote «Trabalho»', vi: 'Bộ «Công việc»', id: 'Paket «Kerja»', tr: '«İş» seti', pl: 'Zestaw «Praca»' },
    detail: { ru: 'Созвоны, письма и переговоры на английском.', uk: 'Дзвінки, листи та перемовини англійською.', es: 'Llamadas, correos y negociaciones en inglés.', 'pt-BR': 'Chamadas, e-mails e negociações em inglês.', vi: 'Cuộc gọi, email và đàm phán bằng tiếng Anh.', id: 'Panggilan, email, dan negosiasi dalam bahasa Inggris.', tr: 'İngilizce toplantılar, e-postalar ve müzakereler.', pl: 'Rozmowy, maile i negocjacje po angielsku.' },
  },
]);

/**
 * Товары категории. `all` отдаёт весь список, `pearls` — пусто: пополнение
 * жемчуга это не товар за валюту, а покупка за деньги, у неё свой блок.
 */
export function shopItemsForCategory(category: ShopCategoryId): readonly ShopItem[] {
  if (category === 'all') return SHOP_ITEMS;
  if (category === 'pearls') return [];
  return SHOP_ITEMS.filter((item) => item.category === category);
}
