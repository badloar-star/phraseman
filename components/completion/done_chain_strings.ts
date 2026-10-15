// ═══════════════════════════════════════════════════════════════════════════
// done_chain_strings.ts — тексты m10 «Итог урока — цепная реакция», 9 языков.
//
// зачем (координатор 15.10; эталон engagement-moments-v3-all.html `result3`): строка серии «Серия — 6 дней» с подписью «сегодня засчитан» / «сегодня ещё нет».
// «Урок пройден», «верно/ошибок/точность», «+N монет», кнопки и «Пройти урок» — уже существующие строки итога и «Сегодня», здесь не дублируются.
// TODO-i18n: всё кроме RU — предложение, носителем не проверено; список — docs/work/tasks/moments-v3-m10-strings.md.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../constants/i18n';
import { streakDayWord } from '../streak/moments/streak_moments_strings';

type Nine = Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;

const S = {
  streak: { ru: 'Серия — {n} {dn}', uk: 'Серія — {n} {dn}', en: 'Streak — {n} {dn}', es: 'Racha — {n} {dn}', 'pt-BR': 'Sequência — {n} {dn}', vi: 'Chuỗi — {n} {dn}', id: 'Runtunan — {n} {dn}', tr: 'Seri — {n} {dn}', pl: 'Seria — {n} {dn}' },
  counted: { ru: 'сегодня засчитан', uk: 'сьогодні зараховано', en: 'today counts', es: 'hoy cuenta', 'pt-BR': 'hoje contou', vi: 'hôm nay đã tính', id: 'hari ini dihitung', tr: 'bugün sayıldı', pl: 'dziś zaliczony' },
  pending: { ru: 'сегодня ещё нет', uk: 'сьогодні ще ні', en: 'not yet today', es: 'hoy aún no', 'pt-BR': 'hoje ainda não', vi: 'hôm nay chưa', id: 'hari ini belum', tr: 'bugün henüz yok', pl: 'dziś jeszcze nie' },
} as const satisfies Readonly<Record<string, Nine>>;

export type DoneChainStringKey = keyof typeof S;
export const DONE_CHAIN_STRING_KEYS = Object.keys(S) as readonly DoneChainStringKey[];
export const DONE_CHAIN_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

/** Текст на языке интерфейса; `{n}` — число, `{dn}` — слово «день» в нужной форме. Неизвестный язык — английский. */
export function doneChainText(lang: Lang, key: DoneChainStringKey, n?: number): string {
  const table = S[key] as Nine;
  const raw = (table as Record<string, string>)[lang] ?? table.en;
  if (n == null) return raw;
  return raw.replace('{n}', String(n)).replace('{dn}', streakDayWord(lang, n));
}
