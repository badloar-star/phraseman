// ═══════════════════════════════════════════════════════════════════════════
// story_strings.ts — тексты кольца и просмотра сторис по аватару (D192), 9 языков.
//
// зачем (владелец 14.10: «на Главной иконка аватарки с кругом, как история в Instagram»): образец docs/design/v2-app/stories-avatar.html.
// Здесь только то, чего нет в уже готовых строках: заголовок просмотра, время события, подписи четырёх слайдов. Строки итога недели («Остаёшься в {лиге}», этаж),
// рубежей серии (название рубежа, «Серия · N дн.», «Новая стадия огня») берутся из строк моментов Пика и серии — один источник правды, без дублей.
// Переводы кроме RU — предложение, носителем не проверены (как у моментов Пика).
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  // ── шапка просмотра ──
  title: ['Твои события', 'Твої події', 'Your events', 'Tus eventos', 'Seus eventos', 'Sự kiện của bạn', 'Peristiwamu', 'Olayların', 'Twoje wydarzenia'],
  today: ['сегодня', 'сьогодні', 'today', 'hoy', 'hoje', 'hôm nay', 'hari ini', 'bugün', 'dzisiaj'],
  yesterday: ['вчера', 'вчора', 'yesterday', 'ayer', 'ontem', 'hôm qua', 'kemarin', 'dün', 'wczoraj'],
  daysAgo: ['{n} дн. назад', '{n} дн. тому', '{n} days ago', 'hace {n} días', 'há {n} dias', '{n} ngày trước', '{n} hari lalu', '{n} gün önce', '{n} dni temu'],
  next: ['Дальше', 'Далі', 'Next', 'Siguiente', 'Próximo', 'Tiếp', 'Lanjut', 'Devam', 'Dalej'],
  close: ['Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij'],
  // ── кольцо у аватара ──
  ringLabel: ['Мой профиль, есть новые события', 'Мій профіль, є нові події', 'My profile, new events', 'Mi perfil, hay eventos nuevos', 'Meu perfil, há eventos novos', 'Hồ sơ của tôi, có sự kiện mới', 'Profil saya, ada peristiwa baru', 'Profilim, yeni olaylar var', 'Mój profil, są nowe wydarzenia'],
  // ── слайд «итог недели» ──
  weekResult: ['Итог недели', 'Підсумок тижня', 'Week result', 'Resultado de la semana', 'Resultado da semana', 'Kết quả tuần', 'Hasil minggu', 'Hafta sonucu', 'Wynik tygodnia'],
  weekUp: ['Ты поднимаешься в {league}', 'Ти піднімаєшся в {league}', 'You move up to {league}', 'Subes a {league}', 'Você sobe para {league}', 'Bạn thăng lên {league}', 'Kamu naik ke {league}', '{league} ligine yükseliyorsun', 'Awansujesz do {league}'],
  weekDown: ['Ты спускаешься в {league}', 'Ти спускаєшся в {league}', 'You move down to {league}', 'Bajas a {league}', 'Você desce para {league}', 'Bạn xuống {league}', 'Kamu turun ke {league}', '{league} ligine iniyorsun', 'Schodzisz do {league}'],
  weekPlace: ['{place} место из {total}', '{place} місце з {total}', 'Place {place} of {total}', 'Puesto {place} de {total}', 'Posição {place} de {total}', 'Hạng {place}/{total}', 'Peringkat {place} dari {total}', '{total} kişi arasında {place}. sıra', '{place}. miejsce z {total}'],
  // ── слайд «ранг монеты» ──
  rankOverline: ['Ранг монеты', 'Ранг монети', 'Coin rank', 'Rango de la moneda', 'Rank da moeda', 'Hạng đồng xu', 'Peringkat koin', 'Jeton rütbesi', 'Ranga monety'],
  rankTitle: ['Ранг {n}', 'Ранг {n}', 'Rank {n}', 'Rango {n}', 'Rank {n}', 'Hạng {n}', 'Peringkat {n}', 'Rütbe {n}', 'Ranga {n}'],
  rankPaid: ['Куплен за {price} монет', 'Куплений за {price} монет', 'Bought for {price} coins', 'Comprado por {price} monedas', 'Comprado por {price} moedas', 'Mua với {price} xu', 'Dibeli seharga {price} koin', '{price} jetona satın alındı', 'Kupiona za {price} monet'],
  // ── слайд «ачивка» ──
  achOverline: ['Ачивка', 'Ачівка', 'Achievement', 'Logro', 'Conquista', 'Thành tích', 'Pencapaian', 'Başarım', 'Osiągnięcie'],
} as const satisfies Readonly<Record<string, Nine>>;

export type StoryStringKey = keyof typeof S;
export const STORY_STRING_KEYS = Object.keys(S) as readonly StoryStringKey[];
export const STORY_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

/** Текст на языке интерфейса; `{ключ}` заменяется значением из vars. Неизвестный язык — английский. */
export function storyText(lang: Lang, key: StoryStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const row = S[key] as Nine;
  const raw = row[LANG_INDEX[lang] ?? LANG_INDEX.en];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

/** «сегодня» / «вчера» / «N дн. назад» по возрасту события (календарные сутки по часам устройства). */
export function storyWhenLabel(lang: Lang, atMs: number, nowMs: number): string {
  const day = (ms: number): number => { const d = new Date(ms); return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000); };
  const ago = Math.max(0, day(nowMs) - day(atMs));
  if (ago === 0) return storyText(lang, 'today');
  if (ago === 1) return storyText(lang, 'yesterday');
  return storyText(lang, 'daysAgo', { n: ago });
}

/** Целое число с неразрывным пробелом тысяч («6 000»): цена ранга берётся из app/coin_rank_table_v1.ts (priceToReach). */
export function storyThousands(n: number): string {
  const value = Math.max(0, Math.trunc(Number(n)) || 0);
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
