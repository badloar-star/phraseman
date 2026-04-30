import type { ShareCardLang } from './streakCardCopy';

export type ResultCardMode = 'quiz' | 'exam';

export function getQuizCardCopy(lang: ShareCardLang, mode: ResultCardMode = 'quiz') {
  if (lang === 'uk') {
    return {
      headline: mode === 'exam' ? 'Іспит' : 'Квіз',
      scoreLine: (right: number, total: number) => `${right} з ${total} правильних`,
    };
  }
  if (lang === 'es') {
    return {
      headline: mode === 'exam' ? 'Examen' : 'Cuestionario',
      scoreLine: (right: number, total: number) =>
        `${right} de ${total} correctas`,
    };
  }
  return {
    headline: mode === 'exam' ? 'Экзамен' : 'Квиз',
    scoreLine: (right: number, total: number) => `${right} из ${total} верных`,
  };
}
