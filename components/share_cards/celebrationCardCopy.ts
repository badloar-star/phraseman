import type { ShareCardLang } from './streakCardCopy';
import type { MedalTier } from '../../app/medal_utils';

export type CelebrationShareTone = 'gold' | 'silver' | 'bronze' | 'emerald' | 'blue' | 'violet';

export type CelebrationNotifKind = 'medal' | 'lesson_unlock' | 'level_exam_unlock' | 'lingman_exam_unlock';

export function getCelebrationMicroHeadline(kind: CelebrationNotifKind, lang: ShareCardLang): string {
  if (lang === 'uk') {
    switch (kind) {
      case 'medal':
        return 'Нагорода за урок';
      case 'lesson_unlock':
        return 'Новий урок';
      case 'level_exam_unlock':
        return 'Залік рівня';
      case 'lingman_exam_unlock':
        return 'Фінальний іспит';
    }
  }
  if (lang === 'es') {
    switch (kind) {
      case 'medal':
        return 'Premio por la lección';
      case 'lesson_unlock':
        return 'Lección nueva';
      case 'level_exam_unlock':
        return 'Examen de nivel';
      case 'lingman_exam_unlock':
        return 'Examen final';
    }
  }
  switch (kind) {
    case 'medal':
      return 'Награда за урок';
    case 'lesson_unlock':
      return 'Новый урок';
    case 'level_exam_unlock':
      return 'Зачёт уровня';
    case 'lingman_exam_unlock':
      return 'Финальный экзамен';
  }
}

export function clipCelebrationLine(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '\u2026';
}

export function getCelebrationVisual(params: {
  kind: CelebrationNotifKind;
  medalTier?: MedalTier;
}): { tone: CelebrationShareTone; centerEmoji: string } {
  if (params.kind === 'medal' && params.medalTier && params.medalTier !== 'none') {
    if (params.medalTier === 'gold') return { tone: 'gold', centerEmoji: '🥇' };
    if (params.medalTier === 'silver') return { tone: 'silver', centerEmoji: '🥈' };
    return { tone: 'bronze', centerEmoji: '🥉' };
  }
  if (params.kind === 'lesson_unlock') return { tone: 'emerald', centerEmoji: '🔓' };
  if (params.kind === 'level_exam_unlock') return { tone: 'blue', centerEmoji: '📋' };
  return { tone: 'violet', centerEmoji: '🎓' };
}
