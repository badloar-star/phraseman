/**
 * DEV-подмена прогресса курса Learning V2 для робот-съёмки: `dev_state?lv2progress=N` — «пройдено N первых занятий».
 *
 * зачем (Макеты 15.10, SHOT_LIST_V2): кадры «Проверка главы», «Пройденное — Повторить», словарь открываются только после
 * пройденных занятий; робот не проходит 8 занятий руками. Только память процесса и только в dev: на диске прогресс не меняется,
 * перезапуск снимает подмену; в стор-сборке сеттер ничего не делает.
 */
let devCompletedCount: number | null = null;

export function setLearningV2DevProgressOverrideV1(count: number | null): boolean {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return false;
  devCompletedCount = count === null ? null : Math.max(0, Math.floor(count));
  console.log(`[DEV-STATE] lv2progress=${devCompletedCount === null ? 'off' : devCompletedCount}`); // guard-ok: dev-ветка
  return true;
}

export function peekLearningV2DevProgressOverrideV1(): number | null {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return null;
  return devCompletedCount;
}

/** `dev_state?lv2save=fail` — сохранение нового слова курса в карточки отвечает отказом (кадр «Не сохранилось», Макеты 15.10). */
let devWordSaveFail = false;

export function setLearningV2DevWordSaveFailV1(fail: boolean): boolean {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return false;
  devWordSaveFail = fail;
  console.log(`[DEV-STATE] lv2save=${fail ? 'fail' : 'off'}`); // guard-ok: dev-ветка
  return true;
}

export function peekLearningV2DevWordSaveFailV1(): boolean {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return false;
  return devWordSaveFail;
}
