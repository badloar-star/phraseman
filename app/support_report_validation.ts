import { ERROR_REPORT_COMMENT_MIN_LEN } from './error_report';

export const SUPPORT_REPORT_TEMPLATES = {
  ru: 'Что я делал(а):\nЧто ожидал(а):\nЧто произошло:\n',
  uk: 'Що я робив(ла):\nЩо очікував(ла):\nЩо сталося:\n',
  en: 'What I did:\nWhat I expected:\nWhat happened:\n',
  es: 'Lo que hice:\nLo que esperaba:\nLo que pasó:\n',
  'pt-BR': 'O que eu fiz:\nO que eu esperava:\nO que aconteceu:\n',
  vi: 'Tôi đã làm:\nTôi mong đợi:\nĐiều đã xảy ra:\n',
  id: 'Yang saya lakukan:\nYang saya harapkan:\nYang terjadi:\n',
  tr: 'Ne yaptım:\nNe bekliyordum:\nNe oldu:\n',
  pl: 'Co zrobiłem(am):\nCo oczekiwałem(am):\nCo się stało:\n',
} as const;

const normalizeHeadingForComparison = (line: string): string => line
  .normalize('NFC')
  .trim()
  .replace(/[\p{P}\p{S}\s]+$/u, '')
  .trim();

const TEMPLATE_HEADING_LINES = new Set(
  Object.values(SUPPORT_REPORT_TEMPLATES)
    .flatMap((template) => template.split('\n'))
    .map(normalizeHeadingForComparison)
    .filter(Boolean),
);

export const getSupportReportTemplate = (locale: string): string =>
  Object.prototype.hasOwnProperty.call(SUPPORT_REPORT_TEMPLATES, locale)
    ? SUPPORT_REPORT_TEMPLATES[locale as keyof typeof SUPPORT_REPORT_TEMPLATES]
    : SUPPORT_REPORT_TEMPLATES.en;

export const isSupportReportCommentValid = (comment: string): boolean => {
  if (comment.trim().length < ERROR_REPORT_COMMENT_MIN_LEN) return false;

  return comment
    .split(/\r?\n/)
    .some((line) => {
      const trimmed = line.trim();
      return /[\p{L}\p{N}]/u.test(trimmed)
        && !TEMPLATE_HEADING_LINES.has(normalizeHeadingForComparison(trimmed));
    });
};
