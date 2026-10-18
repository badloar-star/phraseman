// зачем (Сверка 18.10, walk/04_dark_settings.png; правило «сперва логи»): при первом открытии вкладки «Настройки» в тёмной теме
// экран ПУСТОЙ ≥ 6 с, а сама отрисовка Настроек по [SETTINGS-PERF] занимает 30–40 мс. Чтобы отличить «вкладка не смонтирована /
// заморожена / ждёт фоновой подготовки» от «экран смонтирован, но рисует пусто», раскладка вкладок пишет момент выбора вкладки
// и её состояние, а экран — первый кадр относительно этого момента. Префикс [TAB-FIRST-FRAME]. Временная трасса — снять после диагноза.

const activatedAt = new Map<number, number>();

export function noteTabActivated(idx: number, state: Readonly<Record<string, unknown>>): void {
  const at = Date.now();
  activatedAt.set(idx, at);
  console.log(`[TAB-FIRST-FRAME] activate ${JSON.stringify({ idx, at, ...state })}`); // guard-ok: временная трасса пустой вкладки
}

export function noteTabFirstFrame(idx: number, what: string, extra?: Readonly<Record<string, unknown>>): void {
  const since = activatedAt.get(idx);
  console.log(`[TAB-FIRST-FRAME] ${what} ${JSON.stringify({ idx, sinceActivateMs: since === undefined ? null : Date.now() - since, ...extra })}`); // guard-ok: временная трасса пустой вкладки
}
