// peak_screen_flag — выключатель нового экрана Пика (вариант B «Рельса»), по умолчанию ВЫКЛ.
// зачем (владелец 04.11 выбрал вариант B; координатор: «за флагом peak_screen_v2_enabled, старый экран остаётся до решения»):
// пока константа в коде — подключение к Пульту делает координатор. В dev-превью ?state=peak_screen экран показывается независимо от флага.
export const PEAK_SCREEN_V2_ENABLED: boolean = false;

// зачем (Сверка 05.11): кадры живого экрана Пика B без правки константы — ?peakB=1 в превью Шпиля (только __DEV__); в релизе override всегда null.
let devOverride: boolean | null = null;
export function setPeakScreenV2DevOverride(value: boolean | null): void {
  const next = typeof __DEV__ !== 'undefined' && __DEV__ ? value : null;
  if (next !== devOverride) console.log('[PEAK-B] override', JSON.stringify({ was: devOverride, now: next, requested: value })); // guard-ok: одна строка на смену (диагностика 05.11, кадры Пика B)
  devOverride = next;
}
/** Включён ли экран Пика B: dev-override, иначе константа PEAK_SCREEN_V2_ENABLED. */
let lastLogged: boolean | null = null;
export function peakScreenV2On(): boolean {
  const on = devOverride ?? PEAK_SCREEN_V2_ENABLED;
  if (on !== lastLogged) {
    lastLogged = on;
    console.log('[PEAK-B] решение экрана', JSON.stringify({ on, override: devOverride, constant: PEAK_SCREEN_V2_ENABLED, screen: on ? 'PeakScreenV2 (B)' : 'старый экран Пика' })); // guard-ok: одна строка на смену (диагностика 05.11)
  }
  return on;
}
