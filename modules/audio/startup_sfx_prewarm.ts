/**
 * Когда на холодном старте греть звуки (обе волны: нажатия → конец урока).
 *
 * зачем (координатор 13.10, вариант «б»; замер Сверки ×3 57ecd26e6, evidence/perf_r1_2026-10-12/cpuprofile_sfx): после разноса
 * по одному плееру за шаг (21d429827) дорогим остался только ПЕРВЫЙ созданный плеер — разовый подъём нативного аудио
 * (pm.ui.tap_soft 574 / 373 / 1502 мс), остальные 3–131 мс. Таймер 1,2 с от монтирования корня ставил этот шаг ровно в окно
 * премаунта вкладок после кадра Главной (+5…+12 с, стоянки ≥1 с). Теперь: кадр Главной (потолок 6 с) → пауза под премаунт
 * вкладок (старт +0,5 с, шаги ≈2,9 + 0,9 + 0,5 с по [TABS-PREMOUNT] step) → конец взаимодействий → обе волны одной очередью.
 *
 * Ранний тап до прогрева НЕ молчит: play() сам создаёт плеер (ExpoSfxBackend.ensure) — звук лишь опоздает на цену создания.
 */
export const SFX_PREWARM_HOME_PAINT_CEILING_MS = 6_000;
export const SFX_PREWARM_AFTER_PAINT_DELAY_MS = 4_500;

export type StartupSfxPrewarmDeps = Readonly<{
  whenHomePainted: (ceilingMs: number) => Promise<'painted' | 'ceiling'>;
  runAfterInteractions: (task: () => void) => { cancel?: () => void };
  setTimer: (task: () => void, ms: number) => ReturnType<typeof setTimeout>;
  clearTimer: (timer: ReturnType<typeof setTimeout>) => void;
  now: () => number;
  /** Обе волны по порядку: нажатия первыми (их слышно раньше всего), затем конец урока — если план не уводит её на вход в занятие. */
  prewarm: (reason: string) => void;
}>;

/** Ставит прогрев; возвращает отмену (размонтирование корня). */
export function scheduleStartupSfxPrewarm(deps: StartupSfxPrewarmDeps): () => void {
  const startedAt = deps.now();
  let cancelled = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let interaction: { cancel?: () => void } | null = null;
  void deps.whenHomePainted(SFX_PREWARM_HOME_PAINT_CEILING_MS).then((outcome) => {
    if (cancelled) {
      console.log('[SFX-PREWARM] startup skip reason=cancelled_before_paint');
      return;
    }
    timer = deps.setTimer(() => {
      timer = null;
      if (cancelled) return;
      interaction = deps.runAfterInteractions(() => {
        interaction = null;
        if (cancelled) {
          console.log('[SFX-PREWARM] startup skip reason=cancelled_after_delay');
          return;
        }
        const reason = `startup:${outcome}`;
        console.warn(`[SFX-PREWARM] startup start reason=${reason} sinceMountMs=${deps.now() - startedAt}`);
        deps.prewarm(reason);
      });
    }, SFX_PREWARM_AFTER_PAINT_DELAY_MS);
  });
  return () => {
    if (cancelled) return;
    cancelled = true;
    if (timer !== null) deps.clearTimer(timer);
    interaction?.cancel?.();
  };
}
