/**
 * Подтверждение стартового бонуса в окне результата занятия (владелец 30.10): «+500 монет за первое занятие».
 * Тексты — Переводчик (10), 9 языков; {coins} — плейсхолдер (500 фиксировано, форма без склонения).
 */
import { triLang, type Lang } from '../constants/i18n';

const TEXT = {
  ru: '+{coins} монет за первое занятие',
  uk: '+{coins} монет за перше заняття',
  en: '+{coins} coins for your first lesson',
  es: '+{coins} monedas por tu primera lección',
  'pt-BR': '+{coins} moedas pela sua primeira lição',
  vi: '+{coins} xu cho bài học đầu tiên',
  id: '+{coins} koin untuk pelajaran pertamamu',
  tr: 'İlk dersin için +{coins} koin',
  pl: '+{coins} monet za pierwszą lekcję',
} as const;

export function firstLessonBonusText(lang: Lang, coins: number): string {
  return String(triLang(lang, TEXT)).replace('{coins}', String(coins));
}
