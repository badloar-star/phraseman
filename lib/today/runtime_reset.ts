type TodayRuntimeReset = () => void;

const resetters = new Set<TodayRuntimeReset>();

export function registerTodayRuntimeReset(resetter: TodayRuntimeReset): void {
  resetters.add(resetter);
}

export function resetTodayRuntimeMemory(): void {
  resetters.forEach((resetter) => resetter());
}

export function __resetTodayRuntimeResetRegistryForTests(): void {
  resetters.clear();
}
