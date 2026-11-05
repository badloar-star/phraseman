/**
 * Список шагов онбординга на холодном старте: не «всё включено», а ответ Пульта или безопасный минимум.
 *
 * зачем (диагноз Эмулятора 06.11, решение координатора): на свежей установке кэша нет → список пуст → все 12 шагов «включены»,
 * а настоящий список админки приходит из сети через ~3 с — когда маршрут уже выбран. Welcome одинаков во всех списках, поэтому его
 * показываем сразу, а маршрут остальных шагов фиксируем после ответа (кнопка «Начать» ждёт до ONBOARDING_STEPS_WAIT_MS с индикатором).
 * Нет сети/таймаут → ONBOARDING_STEPS_SAFE_MINIMUM (welcome, language, name + согласия на name), а не полный каталог.
 * Журнал: [ONB-FLAGS] route.
 */
import type { OnboardingStepId } from './onboarding_flow';

export const ONBOARDING_STEPS_SAFE_MINIMUM: readonly OnboardingStepId[] = ['welcome', 'language', 'name'];
export const ONBOARDING_STEPS_WAIT_MS = 4000;

export type OnboardingRoutePlan = Readonly<{
  steps: readonly OnboardingStepId[];
  source: 'ready_immediately' | 'arrived_while_waiting' | 'timeout_safe_minimum';
  waitedMs: number;
}>;

export type OnboardingStepsGateDeps = Readonly<{
  /** Пришёл ли снимок Пульта (из кэша или сети). */
  isReady: () => boolean;
  /** Текущий список шагов Пульта (имеет смысл, когда isReady). */
  getList: () => readonly OnboardingStepId[];
  /** Подписка на изменение конфигурации; возвращает отписку. */
  subscribe: (onChange: () => void) => () => void;
  waitMs?: number;
  nowMs?: () => number;
}>;

export function awaitOnboardingStepsList(deps: OnboardingStepsGateDeps): Promise<OnboardingRoutePlan> {
  const nowMs = deps.nowMs ?? Date.now;
  const waitMs = deps.waitMs ?? ONBOARDING_STEPS_WAIT_MS;
  const startedAt = nowMs();
  if (deps.isReady()) {
    return Promise.resolve({ steps: deps.getList(), source: 'ready_immediately', waitedMs: 0 });
  }
  return new Promise<OnboardingRoutePlan>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let unsubscribe: (() => void) | null = null;
    const finish = (plan: OnboardingRoutePlan) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      if (unsubscribe) unsubscribe();
      resolve(plan);
    };
    unsubscribe = deps.subscribe(() => {
      if (deps.isReady()) finish({ steps: deps.getList(), source: 'arrived_while_waiting', waitedMs: nowMs() - startedAt });
    });
    // событие могло прийти между проверкой и подпиской
    if (deps.isReady()) {
      finish({ steps: deps.getList(), source: 'arrived_while_waiting', waitedMs: nowMs() - startedAt });
      return;
    }
    timer = setTimeout(() => {
      finish({ steps: ONBOARDING_STEPS_SAFE_MINIMUM, source: 'timeout_safe_minimum', waitedMs: nowMs() - startedAt });
    }, waitMs);
  });
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __OnboardingStepsGateRouteShim() { return null; }
