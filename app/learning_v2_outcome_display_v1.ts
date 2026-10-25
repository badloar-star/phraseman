// ═══════════════════════════════════════════════════════════════════════════
// learning_v2_outcome_display_v1.ts — что показать в окне занятия под «Чему научишься».
//
// зачем (владелец 25.10, снимок «ЗАНЯТИЕ 9 · ГЛАВА 2»: «бредово звучит „Что сможешь делать … как сказать, какой человек или
// предмет, используя he/she/it + is“»; выбран вариант A «умение + пример»): цели занятий в выпуске писались как служебные пометки
// фабрики (английские ярлыки, «+», формулы в кавычках). Пока фабрика не перепишет их в «умение + пример», служебную цель не
// показываем: вместо неё — название сцены занятия (заголовок первой страницы вступления). Формулы не показываем никогда.
// Каталог и вступления фабрики не меняются — только показ.
// ═══════════════════════════════════════════════════════════════════════════
import type { LearningV2CourseSessionOutcomeKindV1 } from '../modules/learning-v2/runtime/course_lesson_release_index_v1';

const SERVICE_MARKERS = /[A-Za-z]|\+|`|используя|^\s*как сказать/iu;

/** Цель — служебная пометка фабрики (латиница, «+», формула, «используя», «как сказать»), ученику её не показываем. */
export function isLearningV2ServiceOutcomeV1(outcome: string): boolean {
  return SERVICE_MARKERS.test(outcome);
}

/** Заголовок окна — всегда «Чему научишься» (вариант A владельца), независимо от вида цели. */
export function learningV2OutcomeHeadingKindV1(_kind: LearningV2CourseSessionOutcomeKindV1): 'learn' {
  return 'learn';
}

type AuthoredLocale = 'ru' | 'uk';

function sceneTitle(lessonOrdinal: number, sessionOrdinal: number, locale: AuthoredLocale): string | null {
  try {
    // зачем: манифест фабрики грузится лениво — экран «Обучения» не платит за него до открытия окна занятия
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { FACTORY_NATIVE_MANIFEST_V1 } = require('../modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated') as typeof import('../modules/learning-v2/content/factory_native/factory_native_manifest_v1.generated');
    /* eslint-enable @typescript-eslint/no-require-imports */
    const row = FACTORY_NATIVE_MANIFEST_V1.find((r) => r.lessonOrdinal === lessonOrdinal && r.sessionOrdinal === sessionOrdinal);
    const intro = row?.loadIntro() as { pages?: readonly { titleByLocale?: Partial<Record<AuthoredLocale, string>> }[] } | undefined;
    const title = intro?.pages?.[0]?.titleByLocale?.[locale]?.trim();
    return title ? title : null;
  } catch (error) {
    console.warn('[OUTCOME-SHOW] scene_unavailable', JSON.stringify({ lessonOrdinal, sessionOrdinal, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
    return null;
  }
}

// зачем: вызов идёт из рендера «Обучения» — считаем один раз на занятие и язык (без повторных чтений и строк журнала)
const displayCache = new Map<string, string>();

/** Текст под «Чему научишься»: хорошая цель как есть; служебная — название сцены; нет сцены — пусто (окно без строки). */
export function learningV2OutcomeDisplayV1(input: Readonly<{ lessonOrdinal: number; sessionOrdinal: number; outcome: string; lang: string }>): string {
  const key = `${input.lessonOrdinal}:${input.sessionOrdinal}:${input.lang}:${input.outcome}`;
  const cached = displayCache.get(key);
  if (cached !== undefined) return cached;
  const shown = computeOutcomeDisplay(input);
  displayCache.set(key, shown);
  return shown;
}

function computeOutcomeDisplay(input: Readonly<{ lessonOrdinal: number; sessionOrdinal: number; outcome: string; lang: string }>): string {
  const outcome = input.outcome.trim();
  if (outcome && !isLearningV2ServiceOutcomeV1(outcome)) {
    console.log('[OUTCOME-SHOW]', JSON.stringify({ lesson: input.lessonOrdinal, session: input.sessionOrdinal, shown: 'outcome' })); // guard-ok: какая ветка
    return outcome;
  }
  const locale: AuthoredLocale = input.lang === 'uk' ? 'uk' : 'ru';
  const scene = sceneTitle(input.lessonOrdinal, input.sessionOrdinal, locale);
  console.log('[OUTCOME-SHOW]', JSON.stringify({ lesson: input.lessonOrdinal, session: input.sessionOrdinal, shown: scene ? 'scene' : 'empty', why: outcome ? 'service_outcome' : 'no_outcome' })); // guard-ok: какая ветка и почему
  return scene ?? '';
}
