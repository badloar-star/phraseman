/**
 * Флаг «онбординг пройден», уже прочитанный корнем при старте, — для мгновенного первого кадра Главной.
 *
 * зачем (Сверка 01:40, HOME-COLD_cold1: video:start через 5 998 мс после первого кадра, homeOnboardingDone:false):
 * Главная читала `onboarding_done` своим multiGet из перегруженного на старте хранилища, и вся её работа, гейтнутая
 * homeRuntimeActive, ждала ~6 с. Корень `_layout` читает тот же ключ ДО показа приложения — значение передаётся через
 * память. Хранилище остаётся источником правды: multiGet Главной по-прежнему выставляет флаг.
 */
let onboardingDonePeek: boolean | null = null;

/** Корень запоминает прочитанное значение (`'1'` — пройден). */
export function rememberOnboardingDonePeek(done: boolean): void {
  onboardingDonePeek = done;
}

/**
 * Забрать значение ОДИН раз. null — корень ещё не читал или значение уже забрано (Главная ждёт своё чтение хранилища).
 * зачем одноразово: онбординг могут сбросить в том же запуске (удаление аккаунта, покупка) — повторно смонтированная
 * Главная не должна взять устаревшее «пройден» и ожить за онбордингом.
 */
export function takeOnboardingDonePeek(): boolean | null {
  const value = onboardingDonePeek;
  onboardingDonePeek = null;
  return value;
}

/** Только для тестов. */
export function resetOnboardingDonePeekForTests(): void {
  onboardingDonePeek = null;
}
