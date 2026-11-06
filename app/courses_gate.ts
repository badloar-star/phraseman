// Governance-ID: TG-CBC6EB9073FE
/**
 * Шлюз выбора курсов (слово владельца 05.11, через координатора): в сборке 150 английский виден всегда; es/fr/de/it включаются
 * ПО ОДНОМУ языку отдельной константой в коде (решение по замеру: курс рабочий и ≤15 % ошибок, слово владельца 779d869eb).
 * Сейчас (150) включены все четыре; выключить язык — вернуть false. Включить язык = сменить ОДНУ строку ниже по команде координатора. Пульт (remote) не используется.
 * зачем: данные курсов и прогресс НЕ удаляются и не меняются — гасится только ПРЕДЛОЖЕНИЕ курса в выборе (онбординг, «Язык изучения»,
 * язык нового набора). Тот, у кого активный курс уже не английский, не теряет доступ: его активный курс остаётся в списке.
 * Журнал: [COURSES-GATE] [COURSES-HIDDEN] (что скрыто, почему, у кого оставлен доступ), по одной строке на смену решения.
 */
export type HideableCourseLanguage = 'es' | 'fr' | 'de' | 'it';

/**
 * Единственное место, где язык включается. true = курс виден везде, где виден английский.
 * Менять по одной строке по команде координатора после замера (≤15 % ошибок и рабочий курс).
 */
export const COURSE_LANGUAGE_ENABLED: Readonly<Record<HideableCourseLanguage, boolean>> = Object.freeze({
  // зачем (слово владельца 05.11 через координатора: «тут должны быть все языки»; замер Ревизора: все ≤15 % ошибок, условие 779d869eb):
  // в 150 включены все четыре. Если Эмулятор найдёт, что урок 1 какого-то языка не проходится, выключить именно его одной строкой.
  // зачем (владелец 05.11 + вердикт Fable 06.11): в 150 только английский курс; es/fr/de/it гасятся ТОЛЬКО в предложении курса, данные и прогресс не трогаются,
  // активный не-английский курс человека остаётся (decideVisibleCourseTargets). Вернуть язык = одна строка true по команде координатора.
  es: false,
  fr: false,
  de: false,
  it: false,
});

const LOG = '[COURSE-GATE] [COURSES-GATE] [COURSES-HIDDEN]'; // зачем: два имени одной строкой — диспетчер просил [COURSES-GATE], координатор [COURSES-HIDDEN]
const ALWAYS_VISIBLE = 'en';
const COURSE_CODES = ['en', 'es', 'fr', 'de', 'it'] as const;

let lastLoggedSignature = '';

/** Включён ли язык константой. Английский — всегда; неизвестный код — нет (безопаснее скрыть, данные не страдают). */
export function isCourseLanguageEnabled(target: string, table: Readonly<Record<HideableCourseLanguage, boolean>> = COURSE_LANGUAGE_ENABLED): boolean {
  if (target === ALWAYS_VISIBLE) return true;
  return (table as Readonly<Record<string, boolean>>)[target] === true;
}

/** Чистая функция решения: какие курсы показать при данной таблице и активном курсе (его не отнимаем). */
export function decideVisibleCourseTargets<T extends string>(
  all: readonly T[],
  options: Readonly<{ table?: Readonly<Record<HideableCourseLanguage, boolean>>; activeTarget?: string | null }> = {},
): Readonly<{ visible: readonly T[]; hidden: readonly T[]; keptForActive: readonly T[] }> {
  const table = options.table ?? COURSE_LANGUAGE_ENABLED;
  const active = options.activeTarget ?? null;
  const visible = all.filter((target) => isCourseLanguageEnabled(target, table) || target === active);
  const hidden = all.filter((target) => !visible.includes(target));
  const keptForActive = visible.filter((target) => !isCourseLanguageEnabled(target, table));
  return { visible, hidden, keptForActive };
}

/** Список курсов для показа в выборе. Не бросает. */
export function visibleCourseTargets<T extends string>(all: readonly T[], activeTarget?: string | null, surface = 'unknown'): readonly T[] {
  const decision = decideVisibleCourseTargets(all, { activeTarget });
  const signature = `${surface}|${decision.visible.join(',')}|${String(activeTarget ?? '')}`;
  if (signature !== lastLoggedSignature) {
    lastLoggedSignature = signature;
    console.log(LOG, JSON.stringify({ surface, active: activeTarget ?? null, visible: decision.visible, hidden: decision.hidden, keptForActive: decision.keptForActive }));
  }
  return decision.visible;
}

/** Показывать ли этот курс на онбординге: активного курса там ещё нет, поэтому видны только включённые языки. */
export function isCourseVisibleOnOnboarding(target: string): boolean {
  const visible = isCourseLanguageEnabled(target);
  if (!visible) {
    const signature = `onboarding|hide|${target}`;
    if (signature !== lastLoggedSignature) {
      lastLoggedSignature = signature;
      console.log(LOG, JSON.stringify({ surface: 'onboarding', hidden: target, reason: 'language_not_enabled' }));
    }
  }
  return visible;
}

/**
 * Список языков для НОВОГО набора (экран создания): скрытые языки убраны; уже выбранный язык и «без языка» остаются.
 * Фильтры «Мои наборы» и чужие наборы НЕ гасим: это показ уже имеющихся данных, а не предложение нового курса.
 */
export function visiblePackChoicesForNewPack<T extends string>(all: readonly T[], current?: string | null): readonly T[] {
  const isCourse = (code: string): boolean => (COURSE_CODES as readonly string[]).includes(code);
  const shown = new Set<string>(visibleCourseTargets(all.filter(isCourse), current, 'new_pack_language'));
  return all.filter((code) => !isCourse(code) || shown.has(code));
}

export function __resetCoursesGateLogForTests(): void {
  lastLoggedSignature = '';
}
