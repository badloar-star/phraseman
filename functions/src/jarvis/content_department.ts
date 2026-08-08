import type { AppTier } from './app_tier';
import { tierAbsoluteThresholdMultiplier } from './app_tier';
import { buildDecision, normalizeEvidence, type Decision, type DecisionTrigger, type Evidence } from './decision';
import { MIN_SAMPLES_FOR_VERDICT, type ContentLessonRow, type FetchContentSourceResult } from './content_firestore_fetcher';

/**
 * Департамент «Контент» — четвёртый департамент Джарвиса, завершает Р5.
 * Читает агрегат lesson_stats и находит урок, который стабильно проходят
 * хуже остальных. Департаменты не общаются между собой: только пишут Decision.
 *
 * зачем средний балл, а не «доля ошибок»: владелец 2026-08-02 выбрал score —
 * он уже есть в каждом событии lesson_complete, отдельное понятие
 * «правильно/неправильно» вводить не пришлось.
 */

/** Балл ниже этого (из 5) — урок проходят заметно хуже нормы. */
export const LOW_SCORE_THRESHOLD = 2.5;

export interface RunContentDepartmentInput {
  readonly fetches: readonly FetchContentSourceResult[];
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  readonly appTier?: AppTier;
}

export interface RunContentDepartmentResult {
  readonly decisions: readonly Decision[];
}

/** Только счётчики — ни текста урока, ни UID: в модель и Telegram уходит лишь это. */
function buildContentEvidence(fetch: FetchContentSourceResult): Evidence {
  const weakCount = fetch.rows.filter(
    (row) => row.sampleCount >= MIN_SAMPLES_FOR_VERDICT && row.averageScore < LOW_SCORE_THRESHOLD,
  ).length;
  return normalizeEvidence({
    sourceId: fetch.sourceId,
    state: fetch.state,
    count: fetch.rows.length,
    truncated: fetch.truncated,
    droppedCount: fetch.droppedCount,
    observedAtMs: fetch.observedAtMs,
    digest: JSON.stringify({ lessonsWithStats: fetch.rows.length, weakLessons: weakCount }),
  });
}

/**
 * Самый слабый урок среди тех, у кого хватает выборки. Порог выборки растёт
 * с тиром: на большой базе 20 попыток — это уже почти ничто, и вердикт по
 * ним был бы шумом (та же логика, что у абсолютных порогов «Качества»).
 */
function findWorstLesson(fetches: readonly FetchContentSourceResult[], appTier: AppTier): ContentLessonRow | null {
  const minSamples = MIN_SAMPLES_FOR_VERDICT * tierAbsoluteThresholdMultiplier(appTier);
  let worst: ContentLessonRow | null = null;
  for (const fetch of fetches) {
    for (const row of fetch.rows) {
      if (row.sampleCount < minSamples) continue;
      if (row.averageScore >= LOW_SCORE_THRESHOLD) continue;
      if (worst && row.averageScore >= worst.averageScore) continue;
      worst = row;
    }
  }
  return worst;
}

function buildFindingText(worst: ContentLessonRow | null, fetches: readonly FetchContentSourceResult[]): string {
  if (worst) {
    return `Урок ${worst.lessonId} (${worst.target}) проходят в среднем на ${worst.averageScore} из 5 по ${worst.sampleCount} попыткам — заметно ниже остальных.`;
  }
  const total = fetches.reduce((sum, fetch) => sum + fetch.rows.length, 0);
  return total > 0
    ? `Статистика собрана по ${total} урокам, ни один не проходят стабильно плохо.`
    : 'Статистики по урокам пока нет — ученики ещё не проходили уроки после включения сбора.';
}

export function runContentDepartment(input: RunContentDepartmentInput): RunContentDepartmentResult {
  const evidence = input.fetches.map(buildContentEvidence);
  const appTier: AppTier = input.appTier ?? 'seed';
  const worst = findWorstLesson(input.fetches, appTier);
  const anyTrustworthy = evidence.some((item) => item.trustworthy);

  const shouldDecide = input.trigger === 'owner_request' || Boolean(worst) || !anyTrustworthy;
  if (!shouldDecide) return { decisions: [] };

  const finding = buildFindingText(worst, input.fetches);
  const question = input.question ?? (worst
    ? `Почему урок ${worst.lessonId} (${worst.target}) проходят хуже остальных?`
    : 'Есть ли уроки, которые проходят заметно хуже остальных?');

  const decision = buildDecision({
    department: 'content',
    mode: 'observe',
    trigger: input.trigger,
    question,
    finding,
    hypothesis: worst
      ? 'Вероятная причина — слишком сложные или неоднозначные задания в этом уроке, либо ошибка в правильных ответах.'
      : 'Недостаточно данных для гипотезы.',
    options: worst
      ? [
        { title: 'Проверить задания урока на неоднозначность и ошибки', cost: 0, risk: 'low' },
        { title: 'Упростить самые проваливаемые задания урока', cost: 3, risk: 'medium' },
      ]
      : [
        { title: 'Продолжить наблюдение без вмешательства', cost: 0, risk: 'low' },
        { title: 'Запросить у владельца дополнительный контекст', cost: 0, risk: 'low' },
      ],
    recommendation: worst ? 'Проверить задания урока на неоднозначность и ошибки' : 'Продолжить наблюдение без вмешательства',
    risk: worst
      ? 'Упрощение может снизить обучающую ценность урока, если реальная причина не в сложности'
      : 'Пропустить проблемный урок, если он проявится позже',
    cost: 0,
    successMetric: worst
      ? `Средний балл урока ${worst.lessonId} (${worst.target}) поднимается выше ${LOW_SCORE_THRESHOLD}`
      : 'Средние баллы уроков остаются в норме в следующем суточном снапшоте',
    rollback: 'Вернуть предыдущую версию заданий урока',
    evidence,
    nowMs: input.nowMs,
  });

  return { decisions: [decision] };
}
