// ═══════════════════════════════════════════════════════════════════════════
// review_prompt_copy.ts — короткие надписи просьбы об оценке: строка над заголовком, строка серии и подпись кнопки магазина.
//
// зачем (владелец 11.11: «никаких модальных окон совсем, всё отображается только в историях»): просьба об оценке теперь
// приходит кадром истории, и кадр обязан говорить ТЕМИ ЖЕ словами, что окно. Раньше эти строки жили внутри окна
// (ReviewPromptModal) — вынесены сюда без изменения текста, окно и кадр читают одно место.
// ═══════════════════════════════════════════════════════════════════════════
import { Platform } from 'react-native';
import type { ReviewContext } from '../app/review_utils';
import { triLang, type Lang } from '../constants/i18n';
import { pluralWord } from '../constants/plural';

const KICKER: Record<ReviewContext, Record<Lang, string>> = {
  perfect_lesson: { ru: 'КСТАТИ, ПРО УРОК', uk: 'ДО РЕЧІ, ПРО УРОК', en: 'ABOUT THE LESSON', es: 'SOBRE LA LECCIÓN', 'pt-BR': 'SOBRE A LIÇÃO', vi: 'VỀ BÀI HỌC', id: 'TENTANG PELAJARAN', tr: 'DERS HAKKINDA', pl: 'O LEKCJI' },
  level_exam_pass: { ru: 'МАЛЕНЬКИЙ ВОПРОС', uk: 'МАЛЕНЬКЕ ЗАПИТАННЯ', en: 'A QUICK QUESTION', es: 'UNA PEQUEÑA PREGUNTA', 'pt-BR': 'UMA PEQUENA PERGUNTA', vi: 'MỘT CÂU HỎI NHỎ', id: 'PERTANYAAN SINGKAT', tr: 'KÜÇÜK BİR SORU', pl: 'MAŁE PYTANIE' },
  streak_milestone: { ru: 'СЕРИЯ', uk: 'СЕРІЯ', en: 'STREAK', es: 'RACHA', 'pt-BR': 'SEQUÊNCIA', vi: 'CHUỖI', id: 'RANGKAIAN', tr: 'SERİ', pl: 'SERIA' },
};

/** Строка над заголовком просьбы по её поводу. */
export function reviewKicker(context: ReviewContext, lang: Lang): string {
  return triLang(lang, KICKER[context]);
}

/** «7 дней подряд» — строка карточки серии. */
export function reviewStreakLine(days: number, lang: Lang): string {
  return triLang(lang, {
    ru: `${days} ${pluralWord('ru', days, { one: 'день', few: 'дня', many: 'дней' })} подряд`,
    uk: `${days} ${pluralWord('uk', days, { one: 'день', few: 'дні', many: 'днів' })} поспіль`,
    en: `${days} days in a row`,
    es: `${days} días seguidos`,
    'pt-BR': `${days} dias seguidos`,
    vi: `${days} ngày liên tiếp`,
    id: `${days} hari berturut-turut`,
    tr: `${days} gün üst üste`,
    pl: `${days} ${pluralWord('pl', days, { one: 'dzień', few: 'dni', many: 'dni' })} z rzędu`,
  });
}

/** Название магазина на этой платформе. */
export function reviewStoreName(): string {
  return Platform.OS === 'ios' ? 'App Store' : 'Google Play';
}

/** Подпись главной кнопки: «Оценить в App Store / Google Play». */
export function reviewStoreCta(lang: Lang): string {
  const storeName = reviewStoreName();
  return triLang(lang, {
    ru: `Оценить в ${storeName}`,
    uk: `Оцінити в ${storeName}`,
    en: `Rate in ${storeName}`,
    es: `Valorar en ${storeName}`,
    'pt-BR': `Avaliar na ${storeName}`,
    vi: `Đánh giá trên ${storeName}`,
    id: `Nilai di ${storeName}`,
    tr: `${storeName}'de değerlendir`,
    pl: `Oceń w ${storeName}`,
  });
}
