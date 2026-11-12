// step_clock.ts — живой бюджет ступени Пика для кольца таймера и чтение текста из полей задания.
// зачем (сторож ≤ 400 строк, spire_game_source_contract; координатор 12.11): вынесено из app/spire/use_spire_step_runner.ts без изменения поведения.
// Подписка вместо setState: перерисовывается только кольцо, а не весь экран ступени.

export type SpireStepClock = Readonly<{ get: () => number; subscribe: (fn: () => void) => () => void; set: (v: number) => void }>;

export function createSpireStepClock(): SpireStepClock {
  let value = 0;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (v: number) => { value = v; listeners.forEach((fn) => fn()); },
    subscribe: (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
  };
}

/** Строка из поля задания; всё прочее — пустая строка. */
export function spireTaskText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}
