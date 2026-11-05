// зачем (слово владельца через координатора 05.11): «Оформление» с ползунками Оттенок/Насыщенность внедряется ЗА ФЛАГОМ theme_sliders_v1, по умолчанию ВЫКЛ
// (версию выхода владелец ещё не назвал). Пока false: идентификаторы `tune:` не принимаются, экран «Оформление» не открывается, старые темы работают как раньше.
// Отдельный крошечный модуль (как home_scene_flag): его читают палитра тем и экран, грузится на старте. Включение — заменить на true одним коммитом.
//
// зачем (координатор 05.11, кадры «Оформление» для владельца): эмулятор должен снять экран с ползунками, не меняя боевой флаг. Dev-переопределение:
// переменная окружения EXPO_PUBLIC_DEV_THEME_SLIDERS=1 при запуске Metro. Работает ТОЛЬКО в dev-сборке (__DEV__) и никогда в стор-сборке
// (EXPO_PUBLIC_STORE_RELEASE=1 выключает безусловно) — то же правило, что у dev-подписки. config.ts не импортируем: модуль остаётся крошечным и безопасным для тестов.
const BASE_FLAG = false;
const IS_STORE = process.env.EXPO_PUBLIC_STORE_RELEASE === '1';
const IS_DEV_BUILD = typeof __DEV__ !== 'undefined' && __DEV__;
const DEV_FORCE_ON = IS_DEV_BUILD && !IS_STORE && process.env.EXPO_PUBLIC_DEV_THEME_SLIDERS === '1';

export const THEME_SLIDERS_V1_ENABLED: boolean = BASE_FLAG || DEV_FORCE_ON;
/** Откуда взято значение флага — для журнала [THEME-SLIDERS]. */
export const THEME_SLIDERS_V1_SOURCE: 'const' | 'dev' = DEV_FORCE_ON ? 'dev' : 'const';

if (IS_DEV_BUILD) {
  console.log('[THEME-SLIDERS]', JSON.stringify({ flag: THEME_SLIDERS_V1_ENABLED, source: THEME_SLIDERS_V1_SOURCE, store: IS_STORE })); // guard-ok: одна строка при загрузке модуля, только dev
}
