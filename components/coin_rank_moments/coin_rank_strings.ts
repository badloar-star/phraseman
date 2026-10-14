// ═══════════════════════════════════════════════════════════════════════════
// coin_rank_strings.ts — тексты окна «Хватает на ранг N» (m14, вариант A), 9 языков.
//
// зачем (владелец 14.10: «перенести точно по макетам»; ТЗ docs/phraseman-2.0/ETALON_MOMENTS_V3_TRANSFER.md, m14): ранг монеты покупается только за монеты (N × 1000), окно сообщает, что накоплено достаточно,
// а сама покупка — на своём экране (церемония чеканки). Тексты — из docs/design/v2-app/engagement-moments-v3-all.html (`rank3`). Переводы кроме RU — предложение, носителем не проверены.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  title: ['Хватает на ранг {n}', 'Вистачає на ранг {n}', 'You can afford rank {n}', 'Te alcanza para el rango {n}', 'Dá para o rank {n}', 'Đủ để lên hạng {n}', 'Cukup untuk peringkat {n}', '{n}. rütbe için yetiyor', 'Stać cię na rangę {n}'],
  body: ['{coins} монет — ранг {n} стоит {price}.', '{coins} монет — ранг {n} коштує {price}.', '{coins} coins — rank {n} costs {price}.', '{coins} monedas — el rango {n} cuesta {price}.', '{coins} moedas — o rank {n} custa {price}.', '{coins} xu — hạng {n} giá {price}.', '{coins} koin — peringkat {n} seharga {price}.', '{coins} jeton — {n}. rütbe {price} tutuyor.', '{coins} monet — ranga {n} kosztuje {price}.'],
  upgrade: ['Повысить за {price}', 'Підвищити за {price}', 'Upgrade for {price}', 'Subir por {price}', 'Subir por {price}', 'Nâng cấp với {price}', 'Naikkan seharga {price}', '{price} karşılığında yükselt', 'Awansuj za {price}'],
  later: ['Позже', 'Пізніше', 'Later', 'Más tarde', 'Depois', 'Để sau', 'Nanti', 'Sonra', 'Później'],
} as const satisfies Readonly<Record<string, Nine>>;

export type CoinRankStringKey = keyof typeof S;
export const COIN_RANK_STRING_KEYS = Object.keys(S) as readonly CoinRankStringKey[];
export const COIN_RANK_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

/** Текст на языке интерфейса; `{ключ}` заменяется значением из vars. Неизвестный язык — английский. */
export function coinRankText(lang: Lang, key: CoinRankStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const raw = (S[key] as Nine)[LANG_INDEX[lang] ?? LANG_INDEX.en];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}

/** Целое число с неразрывным пробелом тысяч («6 000»). */
export function coinRankNumber(n: number): string {
  const value = Math.max(0, Math.trunc(Number(n)) || 0);
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}
