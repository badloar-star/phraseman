// combo_moment_strings.ts — тексты m08 «Молния»: плашка «N подряд» над кольцом серии и «серия сброшена» после ошибки, 9 языков.
// зачем (владелец 15.10; эталон engagement-moments-v3-all.html `comboInit`): ровно тексты образца. TODO-i18n: всё кроме RU — предложение, носителем не проверено
// (docs/work/tasks/moments-v3-m08-strings.md).
import type { Lang } from '../../constants/i18n';

type Nine = Readonly<{ ru: string; uk: string; en: string; es: string; 'pt-BR': string; vi: string; id: string; tr: string; pl: string }>;

const S = {
  inRow: { ru: '{n} подряд', uk: '{n} поспіль', en: '{n} in a row', es: '{n} seguidas', 'pt-BR': '{n} seguidas', vi: '{n} câu liền', id: '{n} beruntun', tr: 'Üst üste {n}', pl: '{n} z rzędu' },
  broken: { ru: 'серия сброшена', uk: 'серію скинуто', en: 'streak reset', es: 'racha reiniciada', 'pt-BR': 'sequência zerada', vi: 'chuỗi đã mất', id: 'rangkaian putus', tr: 'seri sıfırlandı', pl: 'seria przerwana' },
} as const satisfies Readonly<Record<string, Nine>>;

export type ComboMomentStringKey = keyof typeof S;
export const COMBO_MOMENT_STRING_KEYS = Object.keys(S) as readonly ComboMomentStringKey[];
export const COMBO_MOMENT_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

export function comboMomentText(lang: Lang, key: ComboMomentStringKey, n?: number): string {
  const table = S[key] as Nine;
  const raw = (table as Record<string, string>)[lang] ?? table.en;
  return n == null ? raw : raw.replace('{n}', String(n));
}
