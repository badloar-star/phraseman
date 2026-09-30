/**
 * Замок сценариев ИИ-диалогов старого каталога.
 *
 * D124 (владелец 2026-09-30): доступ — только монетный ранг для всех, как у
 * Dialogue V2. Plus и покупки за руны сценарии больше не открывают.
 * reachedCourseLevel/isScenarioLevelUnlocked ниже остались для группировки и
 * аналитики каталога, доступ они не решают.
 *
 * Чистый модуль без React/Firestore — логика тривиально тестируется.
 * Источник прогресса (массив открытых уроков) передаётся снаружи: на клиенте —
 * из loadLessonsTabStateFromStorage().persistedUnlocked.
 */
import {
  COURSE_LEVELS,
  getCourseLevelForLesson,
  getCourseLevelIndex,
  type CourseLevel,
} from './course_levels';
import { DIALOGUE_V2_CEFR_SEQUENCE } from '../shared/dialogue_v2_contract';
import {
  decideDialogueV2ScenarioAccess,
  type DialogueV2ScenarioAccess,
} from '../shared/dialogue_v2_access_contract';

/**
 * Достигнутый уровень курса = уровень самого старшего открытого урока.
 * Урок 1 открыт всегда, поэтому минимум — A1. Пустой/битый ввод → A1.
 */
export function reachedCourseLevel(unlockedLessons: readonly number[] | null | undefined): CourseLevel {
  let maxLesson = 1;
  if (Array.isArray(unlockedLessons)) {
    for (const raw of unlockedLessons) {
      const n = Number(raw);
      if (Number.isFinite(n) && n > maxLesson) maxLesson = n;
    }
  }
  return getCourseLevelForLesson(maxLesson);
}

/**
 * Открыт ли уровень сценария.
 * Premium открывает всё. Иначе — только уровни не выше достигнутого в курсе.
 */
export function isScenarioLevelUnlocked(
  scenarioCefr: string,
  reached: CourseLevel,
  hasPremiumAccess: boolean,
): boolean {
  if (hasPremiumAccess) return true;
  const scenarioIdx = getCourseLevelIndex(scenarioCefr as CourseLevel);
  // Уровень сценария вне A1–B2 (например, C1) — индекс -1; такого в каталоге нет,
  // но на всякий случай считаем «не заблокирован», чтобы не спрятать контент молча.
  if (scenarioIdx < 0) return true;
  return scenarioIdx <= getCourseLevelIndex(reached);
}

/**
 * Порог ранга для сценария старого каталога.
 *
 * зачем (D124, владелец 2026-09-30): «Доступ к диалогам — только монетный ранг
 * для всех: Plus не открывает сценарии без ранга, старые покупки диалогов за
 * руны не учитываются. Там новые диалоги». У старых сценариев нет своего ранга,
 * поэтому берём ранг ПЕРВОГО сценария того же уровня в каталоге Dialogue V2
 * (DIALOGUE_V2_CEFR_SEQUENCE: A1 → 1, A2 → 6, B1 → 11, B2 → 14). Так старый
 * список и новые диалоги открываются одной лестницей рангов, а не двумя.
 */
export function legacyDialogScenarioRankRequired(cefr: string): number | null {
  const index = (DIALOGUE_V2_CEFR_SEQUENCE as readonly string[]).indexOf(cefr);
  return index >= 0 ? index + 1 : null;
}

/**
 * Открыт ли сценарий старого каталога — единственное правило для плитки,
 * тапа и прямого роута брифинга (иначе плитка покажет одно, а тап сделает другое).
 *
 * D124: решает ТОЛЬКО монетный ранг — то же правило, что у Dialogue V2
 * (decideDialogueV2ScenarioAccess). Подписка и владение за руны сюда больше
 * не передаются вовсе, чтобы их нельзя было случайно снова сделать ключом.
 * Месячную квоту реплик Free (D111) это не трогает — она живёт отдельно.
 */
export function isScenarioUnlockedForAccount(
  scenario: Readonly<{ id: string; cefr: string }>,
  coinRank: unknown,
): boolean {
  return dialogScenarioRankAccess(scenario, coinRank).status === 'unlocked';
}

export function dialogScenarioRankAccess(
  scenario: Readonly<{ id: string; cefr: string }>,
  coinRank: unknown,
): DialogueV2ScenarioAccess {
  return decideDialogueV2ScenarioAccess({
    // Контракт сам отбрасывает не-целые и ранги < 1; таблицу монет (с картинками)
    // сюда не тянем — модуль остаётся чистым и лёгким.
    achievedRank: coinRank,
    rankRequired: legacyDialogScenarioRankRequired(scenario.cefr),
  });
}

/**
 * Все уровни, встречающиеся в каталоге, в каноничном порядке A1→B2.
 * Используется для группировки списка по уровню.
 */
export function dialogLevelsInOrder(): readonly CourseLevel[] {
  return COURSE_LEVELS;
}
