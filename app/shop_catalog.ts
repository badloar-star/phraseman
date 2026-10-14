import type Ionicons from '@expo/vector-icons/Ionicons';
import { triLang, type Lang } from '../constants/i18n';

/**
 * shop_catalog.ts — витрина магазина: категории и товары.
 *
 * зачем (владелец, 24.08): каталог вынесен из экрана отдельным модулем, потому
 * что цены и состав — предмет решений владельца, а не вёрстки. Здесь его правят,
 * не трогая экран, и отсюда же его увидит будущая серверная доставка контента.
 *
 * ЦЕНЫ. Руна зарабатывается и должна ощущаться весомее покупаемой жемчужины;
 * состав каталога содержит только действующие спины, косметику, наборы и Plus.
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

// зачем (D70/D78): жемчуг удалён владельцем — ни категории, ни валюты «жемчуг».
export type ShopCategoryId = 'all' | 'spin' | 'look' | 'cards';

export type ShopCurrency = 'runes';

export type ShopItemTone = 'spin' | 'theme' | 'cards' | 'plus' | 'aura';

export type ShopItem = Readonly<{
  id: string;
  category: Exclude<ShopCategoryId, 'all'>;
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
    title: { ru: 'Всё', uk: 'Усе', es: 'Todo', en: 'All', 'pt-BR': 'Tudo', vi: 'Tất cả', id: 'Semua', tr: 'Tümü', pl: 'Wszystko' },
  },
  {
    id: 'spin', icon: 'disc-outline',
    title: { ru: 'Спины', uk: 'Спіни', es: 'Giros', en: 'Spins', 'pt-BR': 'Giros', vi: 'Lượt quay', id: 'Putaran', tr: 'Çevirmeler', pl: 'Losowania' },
  },
  {
    id: 'look', icon: 'sparkles-outline',
    title: { ru: 'Внешний вид', uk: 'Зовнішній вигляд', es: 'Apariencia', en: 'Appearance', 'pt-BR': 'Aparência', vi: 'Giao diện', id: 'Tampilan', tr: 'Görünüm', pl: 'Wygląd' },
  },
  {
    id: 'cards', icon: 'albums-outline',
    title: { ru: 'Наборы', uk: 'Набори', es: 'Paquetes', en: 'Packs', 'pt-BR': 'Pacotes', vi: 'Bộ thẻ', id: 'Paket', tr: 'Setler', pl: 'Zestawy' },
  },
]);

/**
 * Ауры выпадают случайно; иконка уже существует в наградах спина
 * (`assets/images/level-spin-rewards/cosmetic_avatar_aura.webp`).
 */
const AURA_POOL: readonly ShopCopy[] = Object.freeze([
  { ru: 'Пламя', uk: 'Полум’я', es: 'Llama', en: 'Flame', 'pt-BR': 'Chama', vi: 'Ngọn lửa', id: 'Nyala', tr: 'Alev', pl: 'Płomień' },
  { ru: 'Иней', uk: 'Іній', es: 'Escarcha', en: 'Frost', 'pt-BR': 'Geada', vi: 'Sương giá', id: 'Embun beku', tr: 'Kırağı', pl: 'Szron' },
  { ru: 'Гроза', uk: 'Гроза', es: 'Tormenta', en: 'Storm', 'pt-BR': 'Tempestade', vi: 'Giông bão', id: 'Badai', tr: 'Fırtına', pl: 'Burza' },
  { ru: 'Сакура', uk: 'Сакура', es: 'Sakura', en: 'Sakura', 'pt-BR': 'Sakura', vi: 'Hoa anh đào', id: 'Sakura', tr: 'Sakura', pl: 'Sakura' },
  { ru: 'Бездна', uk: 'Безодня', es: 'Abismo', en: 'Abyss', 'pt-BR': 'Abismo', vi: 'Vực thẳm', id: 'Jurang', tr: 'Uçurum', pl: 'Otchłań' },
  { ru: 'Рассвет', uk: 'Світанок', es: 'Alba', en: 'Dawn', 'pt-BR': 'Alvorada', vi: 'Bình minh', id: 'Fajar', tr: 'Şafak', pl: 'Świt' },
]);

export const SHOP_ITEMS: readonly ShopItem[] = Object.freeze([
  // ── За жемчуг: спины ───────────────────────────────────────────
  {
    id: 'spin-1', category: 'spin', currency: 'runes', price: 40,
    tone: 'spin', icon: 'disc-outline',
    title: { ru: 'Спин рулетки', uk: 'Спін рулетки', es: 'Giro de ruleta', en: 'Roulette spin', 'pt-BR': 'Giro da roleta', vi: 'Lượt quay', id: 'Putaran roda', tr: 'Çark çevirme', pl: 'Losowanie' },
    detail: { ru: 'Один прокрут: монеты, косметика или дни Plus.', uk: 'Один прокрут: монети, косметика або дні Plus.', es: 'Un giro: monedas, cosméticos o días de Plus.', en: 'One spin: coins, cosmetics or Plus days.', 'pt-BR': 'Um giro: moedas, cosméticos ou dias de Plus.', vi: 'Một lượt quay: xu, trang trí hoặc ngày Plus.', id: 'Satu putaran: koin, kosmetik, atau hari Plus.', tr: 'Bir çevirme: jeton, kozmetik ya da Plus günleri.', pl: 'Jedno losowanie: monety, kosmetyki lub dni Plus.' },
  },
  {
    id: 'spin-3', category: 'spin', currency: 'runes', price: 100,
    tone: 'spin', icon: 'disc-outline', badge: 'best',
    title: { ru: '3 спина', uk: '3 спіни', es: '3 giros', en: '3 spins', 'pt-BR': '3 giros', vi: '3 lượt quay', id: '3 putaran', tr: '3 çevirme', pl: '3 losowania' },
    detail: { ru: 'Три прокрута по цене двух с половиной.', uk: 'Три прокрути за ціною двох з половиною.', es: 'Tres giros al precio de dos y medio.', en: 'Three spins for the price of two and a half.', 'pt-BR': 'Três giros pelo preço de dois e meio.', vi: 'Ba lượt quay với giá hai lượt rưỡi.', id: 'Tiga putaran seharga dua setengah.', tr: 'İki buçuk fiyatına üç çevirme.', pl: 'Trzy losowania w cenie dwóch i pół.' },
  },
  {
    id: 'spin-10', category: 'spin', currency: 'runes', price: 300,
    tone: 'spin', icon: 'disc-outline',
    title: { ru: '10 спинов', uk: '10 спінів', es: '10 giros', en: '10 spins', 'pt-BR': '10 giros', vi: '10 lượt quay', id: '10 putaran', tr: '10 çevirme', pl: '10 losowań' },
    detail: { ru: 'Лучшая цена за прокрут. Для охоты за редким.', uk: 'Найкраща ціна за прокрут. Для полювання на рідкісне.', es: 'El mejor precio por giro. Para cazar lo raro.', en: 'The best price per spin. For hunting the rare.', 'pt-BR': 'O melhor preço por giro. Para caçar o raro.', vi: 'Giá tốt nhất mỗi lượt. Dành cho săn đồ hiếm.', id: 'Harga terbaik per putaran. Untuk berburu yang langka.', tr: 'Çevirme başına en iyi fiyat. Nadir olanı avlamak için.', pl: 'Najlepsza cena za losowanie. Na polowanie na rzadkie.' },
  },

  // ── За жемчуг: внешний вид ─────────────────────────────────────
  {
    id: 'theme', category: 'look', currency: 'runes', price: 200,
    tone: 'theme', icon: 'color-palette-outline',
    title: { ru: 'Тема оформления', uk: 'Тема оформлення', es: 'Tema visual', en: 'Theme', 'pt-BR': 'Tema visual', vi: 'Chủ đề giao diện', id: 'Tema tampilan', tr: 'Görsel tema', pl: 'Motyw wyglądu' },
    detail: { ru: 'Премиальная тема приложения навсегда.', uk: 'Преміальна тема застосунку назавжди.', es: 'Tema premium de la app para siempre.', en: 'A premium app theme, forever.', 'pt-BR': 'Tema premium do app para sempre.', vi: 'Chủ đề cao cấp của ứng dụng, vĩnh viễn.', id: 'Tema premium aplikasi selamanya.', tr: 'Uygulamanın premium teması, kalıcı.', pl: 'Motyw premium aplikacji na zawsze.' },
  },
  {
    id: 'aura-random', category: 'look', currency: 'runes', price: 150,
    tone: 'aura', icon: 'sparkles-outline', badge: 'hot', randomPool: AURA_POOL,
    title: { ru: 'Случайная аура', uk: 'Випадкова аура', es: 'Aura aleatoria', en: 'Random aura', 'pt-BR': 'Aura aleatória', vi: 'Hào quang ngẫu nhiên', id: 'Aura acak', tr: 'Rastgele aura', pl: 'Losowa aura' },
    detail: { ru: 'Выпадет одна из аур аватара. Какая — узнаешь при открытии.', uk: 'Випаде одна з аур аватара. Яка — дізнаєшся при відкритті.', es: 'Saldrá una de las auras del avatar. Cuál, lo sabrás al abrirla.', en: 'One of the avatar auras drops. You find out which when you open it.', 'pt-BR': 'Sairá uma das auras do avatar. Qual, você descobre ao abrir.', vi: 'Sẽ ra một trong các hào quang avatar. Cái nào — mở ra mới biết.', id: 'Akan keluar salah satu aura avatar. Yang mana — ketahuan saat dibuka.', tr: 'Avatar auralarından biri çıkar. Hangisi olduğunu açınca görürsün.', pl: 'Wypadnie jedna z aur awatara. Która — dowiesz się przy otwarciu.' },
  },
  {
    id: 'plus-3d', category: 'look', currency: 'runes', price: 180,
    tone: 'plus', icon: 'ribbon-outline',
    title: { ru: 'Plus · 3 дня', uk: 'Plus · 3 дні', es: 'Plus · 3 días', en: 'Plus · 3 days', 'pt-BR': 'Plus · 3 dias', vi: 'Plus · 3 ngày', id: 'Plus · 3 hari', tr: 'Plus · 3 gün', pl: 'Plus · 3 dni' },
    detail: { ru: 'Безлимит энергии и все премиальные разделы.', uk: 'Безліміт енергії та всі преміальні розділи.', es: 'Energía ilimitada y todas las secciones premium.', en: 'Unlimited energy and all premium sections.', 'pt-BR': 'Energia ilimitada e todas as seções premium.', vi: 'Năng lượng không giới hạn và mọi mục cao cấp.', id: 'Energi tanpa batas dan semua bagian premium.', tr: 'Sınırsız enerji ve tüm premium bölümler.', pl: 'Nielimitowana energia i wszystkie sekcje premium.' },
  },
  {
    id: 'plus-7d', category: 'look', currency: 'runes', price: 350,
    tone: 'plus', icon: 'ribbon-outline', badge: 'best',
    title: { ru: 'Plus · 7 дней', uk: 'Plus · 7 днів', es: 'Plus · 7 días', en: 'Plus · 7 days', 'pt-BR': 'Plus · 7 dias', vi: 'Plus · 7 ngày', id: 'Plus · 7 hari', tr: 'Plus · 7 gün', pl: 'Plus · 7 dni' },
    detail: { ru: 'Неделя без ограничений. Выгоднее трёхдневного.', uk: 'Тиждень без обмежень. Вигідніше за триденний.', es: 'Una semana sin límites. Mejor que el de tres días.', en: 'A week without limits. Better value than three days.', 'pt-BR': 'Uma semana sem limites. Melhor que o de três dias.', vi: 'Một tuần không giới hạn. Lợi hơn gói ba ngày.', id: 'Seminggu tanpa batas. Lebih hemat dari yang tiga hari.', tr: 'Sınırsız bir hafta. Üç günlükten daha avantajlı.', pl: 'Tydzień bez ograniczeń. Korzystniej niż trzydniowy.' },
  },

  // ── За жемчуг: наборы карточек ─────────────────────────────────
  {
    id: 'cards-basic', category: 'cards', currency: 'runes', price: 80,
    tone: 'cards', icon: 'albums-outline',
    title: { ru: 'Набор карточек', uk: 'Набір карток', es: 'Paquete de tarjetas', en: 'Card pack', 'pt-BR': 'Pacote de cartões', vi: 'Bộ thẻ', id: 'Paket kartu', tr: 'Kart seti', pl: 'Zestaw fiszek' },
    detail: { ru: 'Тематический набор фраз в твою коллекцию.', uk: 'Тематичний набір висловів до твоєї колекції.', es: 'Un set temático de frases para tu colección.', en: 'A themed set of phrases for your collection.', 'pt-BR': 'Um conjunto temático de frases para sua coleção.', vi: 'Bộ cụm từ theo chủ đề cho bộ sưu tập của bạn.', id: 'Set frasa bertema untuk koleksimu.', tr: 'Koleksiyonun için temalı ifade seti.', pl: 'Tematyczny zestaw zwrotów do twojej kolekcji.' },
  },
  {
    id: 'cards-travel', category: 'cards', currency: 'runes', price: 80,
    tone: 'cards', icon: 'airplane-outline',
    title: { ru: 'Набор «Поездка»', uk: 'Набір «Подорож»', es: 'Paquete «Viaje»', en: '“Trip” pack', 'pt-BR': 'Pacote «Viagem»', vi: 'Bộ «Du lịch»', id: 'Paket «Perjalanan»', tr: '«Seyahat» seti', pl: 'Zestaw «Podróż»' },
    detail: { ru: 'Фразы для аэропорта, отеля и такси.', uk: 'Вислови для аеропорту, готелю й таксі.', es: 'Frases para el aeropuerto, el hotel y el taxi.', en: 'Phrases for the airport, hotel and taxi.', 'pt-BR': 'Frases para aeroporto, hotel e táxi.', vi: 'Cụm từ cho sân bay, khách sạn và taxi.', id: 'Frasa untuk bandara, hotel, dan taksi.', tr: 'Havaalanı, otel ve taksi için ifadeler.', pl: 'Zwroty na lotnisko, do hotelu i taksówki.' },
  },
  {
    id: 'cards-work', category: 'cards', currency: 'runes', price: 80,
    tone: 'cards', icon: 'briefcase-outline',
    title: { ru: 'Набор «Работа»', uk: 'Набір «Робота»', es: 'Paquete «Trabajo»', en: '“Work” pack', 'pt-BR': 'Pacote «Trabalho»', vi: 'Bộ «Công việc»', id: 'Paket «Kerja»', tr: '«İş» seti', pl: 'Zestaw «Praca»' },
    // зачем (D188, 14.10): язык изучения не только английский — описание без названия языка.
    detail: { ru: 'Фразы для созвонов, писем и переговоров.', uk: 'Вислови для дзвінків, листів і перемовин.', es: 'Frases para llamadas, correos y negociaciones.', en: 'Phrases for calls, emails and negotiations.', 'pt-BR': 'Frases para chamadas, e-mails e negociações.', vi: 'Cụm từ cho cuộc gọi, email và đàm phán.', id: 'Frasa untuk panggilan, email, dan negosiasi.', tr: 'Toplantılar, e-postalar ve müzakereler için ifadeler.', pl: 'Zwroty do rozmów, maili i negocjacji.' },
  },
]);

/**
 * Товары категории. `all` отдаёт весь список.
 */
export function shopItemsForCategory(category: ShopCategoryId): readonly ShopItem[] {
  if (category === 'all') return SHOP_ITEMS;
  return SHOP_ITEMS.filter((item) => item.category === category);
}
