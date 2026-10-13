/**
 * [ONB-DEFER] — тяжёлая фоновая работа ждёт конца онбординга.
 *
 * зачем (координатор 11.10, пункт B; первое впечатление нового пользователя важнее): на свежем онбординге за
 * экраном шёл весь стартовый конвейер Главной (~40 с: база телефона 22 с с остановкой потока 7,7 с, посев озвучки,
 * проверка достижений…), и тапы онбординга вставали в очередь за ним. Онбордингу это не нужно.
 *
 * Как устроено: корень (_layout) сообщает, идёт ли онбординг (`setOnboardingDeferActive`). Задача, которая
 * согласилась ждать, зовёт `whenOnboardingSettled(label)`: онбординга нет или состояние ещё не известно — сразу
 * (прежнее поведение); идёт — ждёт его конца. Гость, который вышел из онбординга на Главную, отпускает всё сразу.
 * Ничего не теряется: каждый ждущий получает ответ при первом «не идёт».
 */
type Waiter = Readonly<{ label: string; since: number; resolve: (outcome: OnboardingSettledOutcome) => void }>;

export type OnboardingSettledOutcome = 'not_active' | 'unknown' | 'finished';

let active: boolean | null = null;
let waiters: Waiter[] = [];

/** Корень сообщает текущее состояние онбординга. true → задачи ждут; false → все ждущие отпускаются. */
export function setOnboardingDeferActive(next: boolean, where: string): void {
  if (active === next) return;
  const previous = active;
  active = next;
  console.log(`[ONB-DEFER] state ${String(previous)}→${String(next)} where=${where} waiting=${waiters.length}`);
  if (next) return;
  const released = waiters;
  waiters = [];
  for (const waiter of released) {
    console.log(`[ONB-DEFER] resume label=${waiter.label} waitedMs=${Date.now() - waiter.since} reason=onboarding_finished`);
    waiter.resolve('finished');
  }
}

/** Дождаться, пока онбординг не идёт. Не бросает. */
export function whenOnboardingSettled(label: string): Promise<OnboardingSettledOutcome> {
  if (active === null) {
    console.log(`[ONB-DEFER] pass label=${label} reason=state_unknown`);
    return Promise.resolve('unknown');
  }
  if (!active) return Promise.resolve('not_active');
  console.log(`[ONB-DEFER] hold label=${label} reason=onboarding_active waitingBefore=${waiters.length}`);
  return new Promise((resolve) => {
    waiters = [...waiters, { label, since: Date.now(), resolve }];
  });
}

/** Идёт ли онбординг сейчас: true/false, null — корень ещё не сообщил. Для журналов ([LESSONS-REBUILD]); задачам — whenOnboardingSettled. */
export function isOnboardingDeferActive(): boolean | null {
  return active;
}

/** Сколько задач ждёт (для логов и тестов). */
export function onboardingDeferWaitingCount(): number {
  return waiters.length;
}

/** Только для тестов. */
export function __resetOnboardingDeferGateForTests(): void {
  active = null;
  waiters = [];
}

/* expo-router: keep this utility from being treated as a screen */
export default function __OnboardingDeferGateRouteShim() {
  return null;
}
