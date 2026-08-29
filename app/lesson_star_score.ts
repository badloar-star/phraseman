import { DebugLogger } from './debug-logger';
/**
 * «Звёздная» оценка урока для гейтов (зачёт, Лингман) и вкладки «Уроки».
 * max(best_score, оценка из текущего progress) — чтобы устаревший best_score
 * не блокировал залік, когда в меню уже 50/50 и ★5.0.
 */
export function effectiveLessonStarScore(
  bestScoreRaw: string | null | undefined,
  progressJson: string | null | undefined,
): { score: number; correctCount: number } {
  const best = parseFloat(String(bestScoreRaw ?? '').trim()) || 0;
  let correct = 0;
  if (progressJson) {
    try {
      const p = JSON.parse(progressJson) as unknown;
      if (Array.isArray(p) && p.length > 0) {
        const denominator = Math.min(p.length, 50);
        correct = Math.min(
          p.filter((x: string) => x === 'correct' || x === 'replay_correct').length,
          denominator,
        );
        const fromProgress = (correct / denominator) * 5;
        return { score: Math.max(best, fromProgress), correctCount: correct };
      }
    } catch (e) {
      // ignore
      DebugLogger.error('lesson_star_score:fromProgress', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
  }
  return { score: best, correctCount: correct };
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
