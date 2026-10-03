/**
 * [FIRST-FRAME] — PM-211: необязательные прогревы идут ПОСЛЕ первого кадра Главной.
 *
 * зачем: владелец «так чтобы все летало не лагало». Первый кадр = локальный снимок +
 * auth-гейт; всё остальное (проверка достижений по монетам, тяжёлая пост-стартовая
 * инициализация с прогревом друзей/магазина/аналитики) делило JS-поток с ещё не
 * нарисованной Главной: firstContentReady срабатывает запасным таймером 400 мс, а на
 * слабом телефоне чанк Главной доезжает позже. Тот же приём, что у phone-state (§80,
 * 415f9ec83): ждём липкое событие `app_home_screen_ready`, затем конец взаимодействий.
 * Потолок `fallbackMs` — чтобы задача не потерялась, если Главная не рисуется
 * (онбординг, переход по ссылке сразу в другой экран).
 *
 * Логи: одна цепочка по `[FIRST-FRAME]` — регистрация, что отпустило (кадр/потолок) и
 * сколько ждали, длительность задачи, отмена, ошибка. console.warn для итоговых строк —
 * в release console.log вырезается (babel transform-remove-console).
 */
import { InteractionManager } from 'react-native';
import { onAppEvent } from './events';
import { coldStartProcessMs } from './cold_start_trace';

export const FIRST_FRAME_WARMUP_FALLBACK_MS = 2_500;

export type FirstFrameReleaseTrigger = 'home_painted' | 'fallback';

type Options = { readonly fallbackMs?: number };

let homePaintedLogged = false;

function logHomePaintedOnce(): void {
  if (homePaintedLogged) return;
  homePaintedLogged = true;
  console.warn(`[FIRST-FRAME] home_painted proc=${coldStartProcessMs()}ms`);
}

function describeError(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

function runTask(label: string, task: () => void | Promise<unknown>): void {
  const startedAt = Date.now();
  const fail = (error: unknown) => {
    console.warn(`[FIRST-FRAME] deferred:failed label=${label} after=${Date.now() - startedAt}ms reason=${describeError(error)}`);
  };
  try {
    const result = task();
    void Promise.resolve(result).then(
      () => console.warn(`[FIRST-FRAME] deferred:done label=${label} taskMs=${Date.now() - startedAt} proc=${coldStartProcessMs()}ms`),
      fail,
    );
  } catch (error) {
    fail(error);
  }
}

/**
 * Запустить необязательную задачу после первого кадра Главной (или по потолку) и после
 * текущих взаимодействий. Возвращает отмену. Ошибки задачи не пробрасываются — пишутся в лог.
 */
export function runAfterHomeFirstFrame(
  label: string,
  task: () => void | Promise<unknown>,
  options: Options = {},
): () => void {
  const fallbackMs = options.fallbackMs ?? FIRST_FRAME_WARMUP_FALLBACK_MS;
  const registeredAt = Date.now();
  let released = false;
  let cancelled = false;
  let interaction: { cancel?: () => void } | null = null;
  // зачем: объявлены до release — событие может прийти синхронно, без TDZ.
  let sub: { remove: () => void } | null = null;
  let fallbackTimer: ReturnType<typeof setTimeout> | null = null;
  console.log(`[FIRST-FRAME] deferred:register label=${label} fallbackMs=${fallbackMs} proc=${coldStartProcessMs()}ms`);

  const release = (trigger: FirstFrameReleaseTrigger) => {
    if (released || cancelled) return;
    released = true;
    sub?.remove();
    if (fallbackTimer) clearTimeout(fallbackTimer);
    if (trigger === 'home_painted') logHomePaintedOnce();
    console.warn(`[FIRST-FRAME] deferred:release label=${label} trigger=${trigger} waitedMs=${Date.now() - registeredAt}`);
    interaction = InteractionManager.runAfterInteractions(() => {
      interaction = null;
      if (cancelled) {
        console.log(`[FIRST-FRAME] deferred:skip label=${label} reason=cancelled_after_release`);
        return;
      }
      runTask(label, task);
    });
  };

  sub = onAppEvent('app_home_screen_ready', () => release('home_painted'));
  if (!released) fallbackTimer = setTimeout(() => release('fallback'), fallbackMs);
  else sub.remove();

  return () => {
    if (cancelled) return;
    cancelled = true;
    sub?.remove();
    if (fallbackTimer) clearTimeout(fallbackTimer);
    interaction?.cancel?.();
    console.log(`[FIRST-FRAME] deferred:cancel label=${label} stage=${released ? 'after_release' : 'before_release'}`);
  };
}

/* expo-router: keep this utility from being treated as a screen */
export default function __FirstFrameDeferredWarmupsRouteShim() {
  return null;
}
