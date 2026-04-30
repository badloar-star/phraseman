import type { ShareCardLang } from './streakCardCopy';

export function formatLessonScore(score: number): string {
  if (Number.isInteger(score) || Math.abs(score - Math.round(score)) < 0.01) {
    return String(Math.round(score));
  }
  return score.toFixed(1);
}

/** Short praise; deterministic from score. */
export function getLessonSharePraise(score: number, lang: ShareCardLang): string {
  if (lang === 'uk') {
    if (score >= 4.5) return 'Блискуче!';
    if (score >= 4) return 'Дуже добре!';
    if (score >= 3) return 'Класно!';
    return 'Тримаємося!';
  }
  if (lang === 'es') {
    if (score >= 4.5) return '¡Brillante!';
    if (score >= 4) return '¡Muy bien!';
    if (score >= 3) return '¡Genial!';
    return '¡Sigue así!';
  }
  if (score >= 4.5) return 'Блестяще!';
  if (score >= 4) return 'Очень хорошо!';
  if (score >= 3) return 'Классно!';
  return 'Так держать!';
}

export function getLessonLine(lessonId: number, lang: ShareCardLang): string {
  if (lang === 'uk') return `Урок ${lessonId}`;
  if (lang === 'es') return `Lección ${lessonId}`;
  return `Урок ${lessonId}`;
}

export function getCefrLine(cefr: string, lang: ShareCardLang): string {
  const c = cefr.trim() || '—';
  if (lang === 'uk') return `Рівень ${c}`;
  if (lang === 'es') return `Nivel ${c}`;
  return `Уровень ${c}`;
}
