/**
 * DEV-подмена фактов «Сцены» на БОЕВОЙ Главной: `dev_state?homefacts=<state>` / `homefacts=off`.
 *
 * зачем (координатор 25.10: владелец хочет «приложение = макет» на настоящем экране): 6 героев «Сцены» (серия под угрозой, день
 * выполнен, экзамен ждёт, серия прервалась, с возвращением, всё пройдено) на тестовом аккаунте честно не получаются — нужны часы
 * после 20:00, история дней, разрыв заходов, пройденный урок. Подмена задаёт ТОЛЬКО факты сцены: часы, разрыв заходов, историю
 * дней, прогресс урока, экзамен. Это числа эталона, тот же homeScenePreviewSetup, что у /dev_home_scene_preview. Героя выбирает
 * та же pickHomeSceneState, состояние не подменяется. Энергия, Plus, сеть и место продолжения остаются настоящими.
 * Только память: хранилище и облако не тронуты, перезапуск сбрасывает. Только `__DEV__ && !IS_STORE_RELEASE`; в стор-сборке
 * сборщик подменяет модуль заглушкой (store_release_stubs/dev_state/dev_home_scene_facts_stub.ts). Журнал: [DEV-HOME-FACTS].
 */
import { IS_STORE_RELEASE } from './config';

/** Герои «Сцены» — те же имена, что HOME_SCENE_STATES (сверяет tests/dev_home_scene_facts.test.ts). */
export const DEV_HOME_SCENE_FACT_STATES = [
  'newbie', 'continue', 'streak_risk', 'day_done', 'no_energy', 'offline', 'exam_ready', 'streak_lost', 'welcome_back', 'all_done',
] as const;
export type DevHomeSceneFactState = typeof DEV_HOME_SCENE_FACT_STATES[number];

let current: DevHomeSceneFactState | null = null;
const listeners = new Set<() => void>();

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

export function isDevHomeSceneFactState(value: unknown): value is DevHomeSceneFactState {
  return typeof value === 'string' && (DEV_HOME_SCENE_FACT_STATES as readonly string[]).includes(value);
}

/** Задать (или снять — null) факты героя. В стор-сборке — отказ с журналом. Возвращает true, если применено. */
export function setDevHomeSceneFacts(next: DevHomeSceneFactState | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-HOME-FACTS] отклонено — не dev-сборка', JSON.stringify({ next })); // guard-ok: ранний выход логируется
    return false;
  }
  const before = current;
  current = next;
  console.log('[DEV-HOME-FACTS] set', JSON.stringify({ before, next, scope: 'память процесса, Firestore и хранилище не тронуты' })); // guard-ok: единичный лог на ссылку
  listeners.forEach((listener) => listener());
  return true;
}

/** Заказанный герой; null — подмены нет (всегда null в стор-сборке). */
export function getDevHomeSceneFacts(): DevHomeSceneFactState | null {
  return devAvailable() ? current : null;
}

export function subscribeDevHomeSceneFacts(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export default function __RouteShim() { return null; }
