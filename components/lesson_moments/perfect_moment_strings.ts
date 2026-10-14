// ═══════════════════════════════════════════════════════════════════════════
// perfect_moment_strings.ts — тексты момента m09 «Идеальный урок — чекан», 9 языков.
//
// зачем (владелец 14.10: «перенести точно по макетам»; ТЗ ETALON_MOMENTS_V3_TRANSFER m09; образец engagement-moments-v3-all.html `perfect3`): штамп «ИДЕАЛ» и строка «Ни одной ошибки · +N монет».
// «N из N» берётся из строки step_moment_strings.ofTasks. Переводы кроме RU — предложение, носителем не проверены.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../constants/i18n';

type Nine = readonly [string, string, string, string, string, string, string, string, string];
const LANG_INDEX: Readonly<Record<string, number>> = { ru: 0, uk: 1, en: 2, es: 3, 'pt-BR': 4, vi: 5, id: 6, tr: 7, pl: 8 };

const S = {
  stamp: ['ИДЕАЛ', 'ДОСКОНАЛО', 'PERFECT', 'PERFECTO', 'PERFEITO', 'HOÀN HẢO', 'SEMPURNA', 'KUSURSUZ', 'IDEALNIE'],
  noMistakes: ['Ни одной ошибки · +{n} монет', 'Жодної помилки · +{n} монет', 'No mistakes · +{n} coins', 'Ningún error · +{n} monedas', 'Nenhum erro · +{n} moedas', 'Không lỗi nào · +{n} xu', 'Tanpa kesalahan · +{n} koin', 'Hiç hata yok · +{n} jeton', 'Bez błędów · +{n} monet'],
} as const satisfies Readonly<Record<string, Nine>>;

export type PerfectMomentStringKey = keyof typeof S;
export const PERFECT_MOMENT_STRING_KEYS = Object.keys(S) as readonly PerfectMomentStringKey[];
export const PERFECT_MOMENT_LANGS = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;

/** Текст на языке интерфейса; `{ключ}` заменяется значением из vars. Неизвестный язык — английский. */
export function perfectMomentText(lang: Lang, key: PerfectMomentStringKey, vars?: Readonly<Record<string, string | number>>): string {
  const raw = (S[key] as Nine)[LANG_INDEX[lang] ?? LANG_INDEX.en];
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (whole, name: string) => (name in vars ? String(vars[name]) : whole));
}
