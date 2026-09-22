// ════════════════════════════════════════════════════════════════════════════
// survey_followups.ts — «что человек обещал посмотреть» → список кнопок финала.
//
// зачем (владелец, 2026-09-22: «кнопки типа открыть видео не работают! убери
// эти кнопки и сделай так чтобы кнопка появлялась после того как ответ
// отправлен»): раньше кнопка-действие висела прямо под выбранным вариантом и
// дёргала router.push ИЗ-ПОД нативной шторки — экран менялся невидимо, тап
// выглядел мёртвым. Теперь действия копятся по ответам и показываются одним
// списком на финальном экране, когда опрос уже отправлен и уходить безопасно.
// ════════════════════════════════════════════════════════════════════════════
import type { AnswersState } from './survey_flow_controller';
import type { SurveyAppRoute, SurveyQuestionClient } from './survey_client';

export type SurveyFollowUp =
  | { key: string; kind: 'app_route'; route: SurveyAppRoute; cta: string }
  | { key: string; kind: 'store_review'; cta: string };

/**
 * Собирает действия выбранных вариантов в порядке вопросов.
 * Дедуп по цели: два вопроса, ведущие в один и тот же экран (или оба в стор),
 * дают ОДНУ кнопку — иначе на финале вырастает частокол из одинаковых строк.
 * Первая встреченная подпись выигрывает: она ближе к началу опроса и человек
 * её уже читал.
 */
export function collectSurveyFollowUps(input: {
  questions: readonly SurveyQuestionClient[];
  answers: AnswersState;
}): SurveyFollowUp[] {
  const out: SurveyFollowUp[] = [];
  const seen = new Set<string>();
  for (const question of input.questions) {
    const optionId = input.answers[question.id]?.optionId;
    if (!optionId) continue;
    const action = question.options.find((option) => option.id === optionId)?.action;
    if (!action) continue;
    const cta = action.cta.trim();
    if (!cta) continue; // без подписи кнопка была бы безымянной — пропускаем
    const key = action.kind === 'app_route' ? `route:${action.route}` : 'store_review';
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(action.kind === 'app_route'
      ? { key, kind: 'app_route', route: action.route, cta }
      : { key, kind: 'store_review', cta });
  }
  return out;
}

export default function __RouteShim() { return null; }
