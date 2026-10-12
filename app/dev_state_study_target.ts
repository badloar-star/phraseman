/**
 * DEV-подмена языка изучения: `dev_state?studyTarget=en|es|de|fr` (координатор 12.10, cards-v2-029).
 *
 * зачем: у гостя с языком изучения en в настройке тренировки всегда есть стартовая колода «Первые 50» (app/flashcards/deck_options.ts), поэтому состояние «Нет карточек»
 * (TrainingSetupV2, status 'empty') недостижимо; у es/de/fr колоды нет — состояние достижимо. Только dev-сборка и только одноразовый гость (assertDisposableGuest — на
 * настоящем аккаунте отказ, fail-closed); ключ языка изучения пишется локально и вырезается из выгрузки в облако, пока на госте применена фикстура
 * (isDevFixtureCardSyncKey). В стор-сборке — отказ. Лог: [DEV-STATE] studyTarget.
 */
import { IS_STORE_RELEASE } from './config';

export const DEV_STUDY_TARGETS = ['en', 'es', 'de', 'fr'] as const;
export type DevStudyTarget = (typeof DEV_STUDY_TARGETS)[number];

export async function applyDevStudyTarget(target: DevStudyTarget): Promise<string> {
  if (typeof __DEV__ === 'undefined' || __DEV__ !== true || IS_STORE_RELEASE) {
    console.warn('[DEV-STATE] studyTarget: отклонено — не dev-сборка', { target }); // guard-ok: ранний выход логируется
    throw new Error('dev_state: not a dev build');
  }
  const { assertDisposableGuest } = await import('./dev_state_account_guard');
  assertDisposableGuest(`studyTarget=${target}`);
  const { setStoredStudyTarget } = await import('./study_target');
  const applied = await setStoredStudyTarget(target, 'ru');
  console.log(`[DEV-STATE] studyTarget: язык изучения гостя → ${applied} (локально, в облако не выгружается)`); // guard-ok: единичный лог на ссылку
  return applied;
}
