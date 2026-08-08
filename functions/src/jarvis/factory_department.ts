import type { AppTier } from './app_tier';
import { buildDecision, normalizeEvidence, type Decision, type DecisionTrigger, type Evidence } from './decision';
import type { ContentLessonRow, FetchContentSourceResult } from './content_firestore_fetcher';
import type { ContentStudyTarget } from './content_lesson_stats_write';

/**
 * Департамент «Фабрика контента» — отвечает на вопрос «чего НЕ ХВАТАЕТ», в
 * отличие от департамента «Контент», который ищет СЛОМАННЫЕ уроки (низкий балл).
 *
 * зачем на тех же lesson_stats: поле sampleCount растёт на единицу за каждое
 * прохождение, поэтому падение sampleCount от урока к уроку показывает, где
 * обрывается путь ученика. Прогресс лежит внутри каждого пользователя, и
 * честный подсчёт «докуда дошли все» требовал бы дорогого collectionGroup-скана —
 * здесь та же информация берётся из уже существующего агрегата, без единого
 * лишнего чтения.
 *
 * Департамент только НАБЛЮДАЕТ. Уроки пишет владелец: план запрещает
 * автоматическую генерацию учебного контента.
 */

/** Доля дошедших, ниже которой это обрыв пути, а не обычный отсев. */
export const FACTORY_DROPOFF_RATIO = 0.5;

/** Меньше этого — шум выборки, а не сигнал о контенте. */
export const FACTORY_MIN_SAMPLES = 20;

const TARGET_LABEL: Record<ContentStudyTarget, string> = { en: 'английский', fr: 'французский' };

export interface RunFactoryDepartmentInput {
  readonly fetches: readonly FetchContentSourceResult[];
  readonly trigger: DecisionTrigger;
  readonly question?: string;
  readonly nowMs: number;
  /** Принимается для единообразия API; пороги здесь относительные и от тира не зависят. */
  readonly appTier?: AppTier;
}

export interface RunFactoryDepartmentResult {
  readonly decisions: readonly Decision[];
}

interface Cliff {
  readonly target: ContentStudyTarget;
  readonly lessonId: number;
  readonly reachedBefore: number;
  readonly reachedHere: number;
}

interface Gap {
  readonly target: ContentStudyTarget;
  readonly missingLessonId: number;
}

interface Wall {
  readonly target: ContentStudyTarget;
  readonly lastLessonId: number;
  readonly reached: number;
}

function rowsByTarget(fetches: readonly FetchContentSourceResult[]): Map<ContentStudyTarget, ContentLessonRow[]> {
  const map = new Map<ContentStudyTarget, ContentLessonRow[]>();
  // guard-ok: раскладка уже полученных строк в памяти — Firestore здесь не
  // трогается вовсе, чтение произошло раньше, в content_firestore_fetcher.
  for (const fetch of fetches) {
    for (const row of fetch.rows) {
      const list = map.get(row.target) ?? [];
      list.push(row);
      map.set(row.target, list);
    }
  }
  // зачем по языкам отдельно: ровный английский усреднил бы обрыв во
  // французском, и заказ на недостающий урок потерялся бы.
  for (const list of map.values()) list.sort((a, b) => a.lessonId - b.lessonId);
  return map;
}

/** Самый резкий обрыв: где доля дошедших упала ниже порога. */
function findWorstCliff(byTarget: Map<ContentStudyTarget, ContentLessonRow[]>): Cliff | null {
  let worst: Cliff | null = null;
  for (const [target, rows] of byTarget) {
    for (let i = 1; i < rows.length; i += 1) {
      const before = rows[i - 1];
      const here = rows[i];
      if (before.sampleCount < FACTORY_MIN_SAMPLES) continue;
      const ratio = here.sampleCount / before.sampleCount;
      if (ratio > FACTORY_DROPOFF_RATIO) continue;
      const candidate: Cliff = {
        target, lessonId: here.lessonId,
        reachedBefore: before.sampleCount, reachedHere: here.sampleCount,
      };
      if (!worst || ratio < worst.reachedHere / worst.reachedBefore) worst = candidate;
    }
  }
  return worst;
}

/** Дыра в нумерации: урок между соседями не выпущен. */
function findGap(byTarget: Map<ContentStudyTarget, ContentLessonRow[]>): Gap | null {
  for (const [target, rows] of byTarget) {
    for (let i = 1; i < rows.length; i += 1) {
      const expected = rows[i - 1].lessonId + 1;
      if (rows[i].lessonId > expected) return { target, missingLessonId: expected };
    }
  }
  return null;
}

/** Стена: последний урок курса, до которого дошли — контента дальше нет. */
function findWall(byTarget: Map<ContentStudyTarget, ContentLessonRow[]>): Wall | null {
  let best: Wall | null = null;
  for (const [target, rows] of byTarget) {
    const last = rows[rows.length - 1];
    if (!last || last.sampleCount < FACTORY_MIN_SAMPLES) continue;
    if (!best || last.sampleCount > best.reached) {
      best = { target, lastLessonId: last.lessonId, reached: last.sampleCount };
    }
  }
  return best;
}

/** Только номера уроков и количества — ни имён учеников, ни их ответов. */
function buildFactoryEvidence(fetch: FetchContentSourceResult): Evidence {
  return normalizeEvidence({
    sourceId: fetch.sourceId,
    state: fetch.state,
    count: fetch.rows.length,
    truncated: fetch.truncated,
    droppedCount: fetch.droppedCount,
    observedAtMs: fetch.observedAtMs,
    digest: JSON.stringify({ lessons: fetch.rows.length }),
  });
}

export function runFactoryDepartment(input: RunFactoryDepartmentInput): RunFactoryDepartmentResult {
  const evidence = input.fetches.map(buildFactoryEvidence);
  const trustworthy = evidence.some((item) => item.trustworthy);

  const byTarget = rowsByTarget(input.fetches);
  const cliff = trustworthy ? findWorstCliff(byTarget) : null;
  const gap = trustworthy ? findGap(byTarget) : null;
  const wall = trustworthy ? findWall(byTarget) : null;

  const shouldDecide = input.trigger === 'owner_request' || Boolean(cliff) || Boolean(gap) || !trustworthy;
  if (!shouldDecide) return { decisions: [] };

  // Порядок: обрыв важнее дыры, дыра важнее упора в конец курса.
  const finding = !trustworthy
    ? 'Не удалось прочитать статистику уроков — источник недоступен, полнота курса неизвестна.'
    : cliff
      ? `На уроке ${cliff.lessonId} (${TARGET_LABEL[cliff.target]}) путь обрывается: до предыдущего дошли ${cliff.reachedBefore} чел., до этого — только ${cliff.reachedHere}.`
      : gap
        ? `В курсе ${TARGET_LABEL[gap.target]} пропущен урок ${gap.missingLessonId} — между соседними номерами дыра.`
        : wall
          ? `${wall.reached} чел. дошли до урока ${wall.lastLessonId} (${TARGET_LABEL[wall.target]}) — это последний, дальше учить нечему.`
          : 'Данных об уроках пока недостаточно, чтобы судить о полноте курса.';

  const question = input.question ?? (cliff
    ? `Почему на уроке ${cliff.lessonId} обрывается путь?`
    : gap
      ? 'Какого урока не хватает в курсе?'
      : 'Хватает ли ученикам контента?');

  const decision = buildDecision({
    department: 'factory',
    mode: 'observe',
    trigger: input.trigger,
    question,
    finding,
    hypothesis: cliff
      ? 'Вероятная причина — урок заметно сложнее предыдущего либо в нём что-то мешает пройти до конца.'
      : gap
        ? 'Вероятная причина — урок не выпущен, а нумерация уже пропустила его.'
        : wall
          ? 'Ученики исчерпали курс: следующий урок ещё не написан.'
          : 'Недостаточно данных для гипотезы.',
    options: cliff
      ? [
        { title: `Пройти урок ${cliff.lessonId} самому и найти, где спотыкаются`, cost: 0, risk: 'low' },
        { title: 'Сравнить его сложность с соседними уроками', cost: 0, risk: 'low' },
      ]
      : gap
        ? [
          { title: `Написать недостающий урок ${gap.missingLessonId}`, cost: 0, risk: 'low' },
          { title: 'Перенумеровать курс, закрыв пропуск', cost: 0, risk: 'high' },
        ]
        : [
          { title: 'Написать следующий урок курса', cost: 0, risk: 'low' },
          { title: 'Продолжить наблюдение без вмешательства', cost: 0, risk: 'medium' },
        ],
    recommendation: cliff
      ? `Пройти урок ${cliff.lessonId} самому и найти, где спотыкаются`
      : gap
        ? `Написать недостающий урок ${gap.missingLessonId}`
        : 'Написать следующий урок курса',
    risk: cliff
      ? 'Каждый день обрыва — это ученики, которые дошли до этого места и бросили'
      : gap
        ? 'Пропуск в нумерации выглядит как недоделка и подрывает доверие к курсу'
        : 'Дошедшие до конца перестают возвращаться — учить их больше нечему',
    cost: 0,
    successMetric: cliff
      ? `Доля дошедших до урока ${cliff.lessonId} перестаёт падать более чем вдвое`
      : gap
        ? `Урок ${gap.missingLessonId} появляется в статистике`
        : 'Появляется следующий урок, и до него начинают доходить',
    rollback: 'Не применимо — департамент только наблюдает, уроки пишет владелец',
    evidence,
    nowMs: input.nowMs,
  });

  return { decisions: [decision] };
}
