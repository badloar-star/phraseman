/**
 * Замок сценариев ИИ-диалогов по уровню (CEFR).
 *
 * Идея (запрос пользователя): сценарии открываются по мере прохождения курса —
 * как и уроки. Сценарий уровня A2 доступен, если ученик ДОШЁЛ до A2 в курсе
 * ИЛИ у него есть Premium (Premium открывает все уровни сразу).
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
import { isFeaturePremiumGated } from './feature_gates';
import { getVerifiedPremiumAccessStatus } from './premium_guard';

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
 * Сценарии, открытые обычному аккаунту. Ровно три, по прямому указанию
 * владельца (2026-09-14): «диалоги открой для фри юзера только закажи кофе,
 * в продуктовом и магазин одежды. Все остальные это плюс или уровень.
 * (те что уровень тоже плюс нужен)».
 *
 * зачем СПИСОК ID, а не уровень курса: прежнее правило открывало сценарий, как
 * только человек доходил до его уровня (`isScenarioLevelUnlocked`), поэтому
 * каталог постепенно раздавался бесплатно сам собой. Теперь граница жёсткая и
 * не зависит ни от прогресса курса, ни от уровня аккаунта — их замки тоже
 * перекрыты Plus, как и просил владелец второй фразой.
 */
export const FREE_DIALOG_SCENARIO_IDS: readonly string[] = Object.freeze([
  'coffee',
  'grocery',
  'clothes_shop',
]);

/**
 * Открыт ли сценарий.
 *
 * ДВА ВИДА ДОСТУПА (владелец, 2026-09-17, макет экономики рун):
 *  • купленный за руны — неотчуждаемый, переживает окончание подписки;
 *  • открытый по Plus — временный, исчезает вместе с подпиской.
 * Именно поэтому в списке НЕТ слова «навсегда»: оно врало бы про второй вид.
 *
 * Роли валют после перехода на руны: руны дают ДОСТУП (какие диалоги
 * существуют для человека), Plus даёт ОБЪЁМ (сколько реплик в день). До этого
 * Plus и руны продавали бы одно и то же, и руны всегда проигрывали бы деньгам.
 *
 * Единственное правило доступа к сценарию: оба места в каталоге (тап по плитке
 * и расчёт её статуса) обязаны спрашивать именно эту функцию, иначе плитка
 * покажет одно, а тап сделает другое.
 */
export function isScenarioUnlockedForAccount(
  scenarioId: string,
  hasPremiumAccess: boolean,
  ownedScenarioIds?: ReadonlySet<string> | null,
): boolean {
  // Куплено за руны — открыто всегда, независимо от подписки.
  if (ownedScenarioIds?.has(scenarioId)) return true;
  if (hasPremiumAccess) return true;
  return FREE_DIALOG_SCENARIO_IDS.includes(scenarioId);
}

/**
 * Тот же замок, но для экранов БЕЗ React-контекста премиума (брифинг диалога).
 *
 * зачем (аудит 2026-09-14): каталог спрашивал `useFeatureAccess('ai_dialog')`,
 * а экран брифинга не спрашивал ничего — и прямой роут открывал любой платный
 * сценарий. Здесь та же связка «фича за замком? + есть ли премиум?», что и в
 * хуке, но в асинхронной форме, пригодной для эффекта экрана.
 *
 * Правило доступа при этом НЕ дублируется: решение по-прежнему принимает
 * `isScenarioUnlockedForAccount`.
 */
export async function resolveDialogScenarioAccess(
  scenarioId: string,
  ownedScenarioIds?: ReadonlySet<string> | null,
): Promise<boolean> {
  // Куплено за руны — решаем сразу, не спрашивая ни «Пульт», ни премиум:
  // оплаченный доступ не может зависеть от состояния подписки.
  if (ownedScenarioIds?.has(scenarioId)) return true;
  // Фича снята с замка админом в «Пульте» → открыто всем, премиум не спрашиваем.
  if (!isFeaturePremiumGated('ai_dialog')) return true;
  const hasPremiumAccess = await getVerifiedPremiumAccessStatus();
  return isScenarioUnlockedForAccount(scenarioId, hasPremiumAccess, ownedScenarioIds);
}

/**
 * Все уровни, встречающиеся в каталоге, в каноничном порядке A1→B2.
 * Используется для группировки списка по уровню.
 */
export function dialogLevelsInOrder(): readonly CourseLevel[] {
  return COURSE_LEVELS;
}
