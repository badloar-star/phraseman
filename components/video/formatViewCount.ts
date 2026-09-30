import type { Lang } from '../../constants/i18n';

// зачем: макет показывает «4,1 тыс.» (а не «4.1K»): сокращение и десятичный знак — по языку интерфейса.
const SUFFIXES: Record<string, { thousand: string; million: string; dot?: boolean }> = {
  ru: { thousand: ' тыс.', million: ' млн' },
  uk: { thousand: ' тис.', million: ' млн' },
  en: { thousand: 'K', million: 'M', dot: true },
  es: { thousand: ' mil', million: ' M' },
  'pt-BR': { thousand: ' mil', million: ' mi' },
  vi: { thousand: ' N', million: ' Tr' },
  id: { thousand: ' rb', million: ' jt' },
  tr: { thousand: ' B', million: ' Mn' },
  pl: { thousand: ' tys.', million: ' mln' },
};

/** Короткое число просмотров; неизвестный язык — как английский. Пустая строка, если числа нет. */
export function formatViewCount(count: number | undefined, lang: Lang | string): string {
  if (count == null || !Number.isFinite(count)) return '';
  const value = Number(count);
  const rule = SUFFIXES[lang as string] ?? SUFFIXES.en;
  const withDecimal = (scaled: number, limit: number, suffix: string) => {
    const text = scaled.toFixed(scaled >= limit ? 0 : 1).replace(/\.0$/, '');
    return `${rule.dot ? text : text.replace('.', ',')}${suffix}`;
  };
  if (value >= 1_000_000) return withDecimal(value / 1_000_000, 10, rule.million);
  if (value >= 1_000) return withDecimal(value / 1_000, 10, rule.thousand);
  return String(value);
}
