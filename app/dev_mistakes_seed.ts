/**
 * DEV: засев журнала ошибок одноразового гостя готовыми к практике ошибками (координатор 13.10, mistakes-panel-021).
 *
 * зачем: практика «Моих ошибок» читает настоящий журнал и требует ≥5 готовых ошибок (строка `minFive`), а демо-снимок хаба (dev_mistakes_demo) даёт две.
 * Облако: appendMistakeEvent кладёт событие в очередь фактов практики (phone_state_practice_bridge → triggerSync), поэтому засеянные записи МОГУТ уйти в облако гостя — допустимо ТОЛЬКО потому, что гость одноразовый (как фикстуры карточек).
 * Включается из setDevMistakesDemo(true) уже ПОСЛЕ проверки одноразового гостя; только `__DEV__ && !IS_STORE_RELEASE`. В стор-сборке dev_mistakes_demo — заглушка, этот модуль в бандл не попадает.
 */
import { IS_STORE_RELEASE } from './config';
import type { ObjectiveMistakeAttempt } from './mistake_practice_capture';

function devSeedAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

/** Язык журнала, в который засеваются ошибки практики. */
export const DEV_MISTAKES_SEED_TARGET = 'en' as const;

type DevSeedAttempt = Readonly<{
  attemptId: string;
  studyTarget: typeof DEV_MISTAKES_SEED_TARGET;
  verdict: 'wrong';
  objective: true;
  content: Readonly<{ sourceKind: 'lesson_phrase'; sourceId: string; canonicalTarget: string; sourceMeaning: string; lessonId: string; tokens: readonly string[] }>;
  facet: Readonly<{ kind: 'meaning' | 'word_order' }>;
}>;

/** Шесть фраз демо-хаба: как настоящие ошибки урока (lesson_phrase), свежая запись сразу «готова» (dueAt = момент записи). */
export const DEV_MISTAKES_SEED_ATTEMPTS: readonly DevSeedAttempt[] = Object.freeze(
  ([
    ['I am used to it', 'я к этому привык', 'word_order'],
    ['in the end', 'в конце концов', 'meaning'],
    ['How much is it?', 'сколько это стоит?', 'word_order'],
    ['I look forward to it', 'я с нетерпением жду этого', 'meaning'],
    ['take off', 'взлетать', 'meaning'],
    ['layover', 'пересадка', 'meaning'],
  ] as const).map(([phrase, meaning, facet], index): DevSeedAttempt => Object.freeze({
    attemptId: `dev-seed:mistakes-ready:${index + 1}`,
    studyTarget: DEV_MISTAKES_SEED_TARGET,
    verdict: 'wrong',
    objective: true,
    content: Object.freeze({
      sourceKind: 'lesson_phrase',
      sourceId: `lesson-1:phrase-dev-seed-${index + 1}`,
      canonicalTarget: phrase,
      sourceMeaning: meaning,
      lessonId: '1',
      tokens: Object.freeze(phrase.split(/\s+/)),
    }),
    facet: Object.freeze({ kind: facet }),
  })),
);

/**
 * Засев журнала одноразового гостя готовыми ошибками (≥5) для практики. Зависимости переданы снаружи, чтобы тест не трогал хранилище.
 * Идемпотентно: attemptId устойчивые, повторная запись возвращает appended=false. Лог: [DEV-STATE] mistakes seeded N ready (источник).
 */
export async function seedDevMistakesReady(deps: Readonly<{
  capture: (attempt: Omit<ObjectiveMistakeAttempt, 'accountScope'>) => Promise<Readonly<{ kind: string }>>;
  countReady: () => Promise<number>;
  /** pushed — мост синхронизации активен, записи поставлены в очередь (доставка не проверяется); local_only — только на устройстве. */
  cloudState?: () => Promise<'pushed' | 'local_only'>;
}>): Promise<number> {
  if (!devSeedAvailable()) {
    console.warn('[DEV-STATE] mistakes seed: отклонено — не dev-сборка'); // guard-ok: ранний выход логируется
    return 0;
  }
  let captured = 0;
  for (const attempt of DEV_MISTAKES_SEED_ATTEMPTS) {
    const result = await deps.capture({ ...attempt, content: { ...attempt.content, tokens: [...attempt.content.tokens] }, facet: { ...attempt.facet } });
    if (result.kind === 'captured') captured += 1;
    else console.warn(`[DEV-STATE] mistakes seed: ${attempt.attemptId} не записана (${result.kind})`); // guard-ok: причина пропуска
  }
  const ready = await deps.countReady();
  const cloud = deps.cloudState ? await deps.cloudState() : 'local_only';
  console.log(`[DEV-STATE] mistakes seeded ${ready} ready (источник: журнал lesson_phrase гостя, записано ${captured} из ${DEV_MISTAKES_SEED_ATTEMPTS.length}, cloud: ${cloud})`); // guard-ok: единичный лог засева
  return ready;
}


/** Боевая проводка засева для текущего гостя: запись через тот же путь, что пишет урок, и подсчёт готовых по проекции журнала. */
export async function seedDevMistakesReadyForCurrentGuest(): Promise<number> {
  const [{ captureCurrentAccountObjectiveAttempt }, { loadMistakeEventJournal }, { projectMistakes }, { getStableId }, { readPhoneStatePracticeFactProjection }] = await Promise.all([
    import('./mistake_practice_capture'),
    import('./mistake_practice_store'),
    import('../modules/mistake-practice/projection'),
    import('./stable_id'),
    import('./phone_state_practice_bridge'),
  ]);
  return seedDevMistakesReady({
    capture: (attempt) => captureCurrentAccountObjectiveAttempt(attempt),
    countReady: async () => {
      const accountScope = await getStableId();
      const journal = await loadMistakeEventJournal({ accountScope, studyTarget: DEV_MISTAKES_SEED_TARGET });
      const nowMs = Date.now();
      return [...projectMistakes(journal.events).items.values()].filter((item) => item.status === 'active' && item.dueAtMs <= nowMs).length;
    },
    // зачем: ответ на вопрос «уходят ли записи в облако» — активный мост = записи в очереди синхронизации гостя; иначе остались на устройстве.
    cloudState: async () => ((await readPhoneStatePracticeFactProjection('mistake')).status === 'available' ? 'pushed' : 'local_only'),
  });
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() { return null; }
