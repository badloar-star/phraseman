/**
 * DEV-подмена состояния заставки Plus (№35): `dev_state?plusSplash=trial|notrial|loading|failed|off`.
 *
 * зачем (координатор 21.10, «Сверка»): состояния цены заставки (пробный есть / пробного нет / цена грузится / магазин не ответил) нельзя вызвать на
 * эмуляторе без магазина, а политика «раз в 14 дней» не даёт открыть окно по требованию. Ссылка показывает заставку СРАЗУ в нужном состоянии, мимо политики
 * и без записи счётчика показа. Только память процесса: ничего не пишется ни в хранилище, ни в облако; перезапуск сбрасывает.
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттер всегда null, а установка отклоняется. Лог: [PLUS-SPLASH] dev.
 */
import { IS_STORE_RELEASE } from './config';
import type { PlusSplashOffer } from './plus_splash_offer';

export type DevPlusSplashState = 'trial' | 'notrial' | 'loading' | 'failed';

let forced: DevPlusSplashState | null = null;
const listeners = new Set<() => void>();

function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE;
}

export function subscribeDevPlusSplash(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Поставить состояние (или null — снять). В стор-сборке — отказ с логом. Возвращает true, если применено. */
export function setDevPlusSplash(next: DevPlusSplashState | null): boolean {
  if (!devAvailable()) {
    console.warn('[PLUS-SPLASH] dev: отклонено — не dev-сборка', { next }); // guard-ok: ранний выход логируется
    return false;
  }
  forced = next;
  console.log(`[PLUS-SPLASH] dev: состояние заставки = ${next ?? 'off'} (только память)`); // guard-ok: единичный лог на ссылку
  listeners.forEach((listener) => listener());
  return true;
}

/** Текущее принудительное состояние; в стор-сборке всегда null. */
export function getDevPlusSplash(): DevPlusSplashState | null {
  return devAvailable() ? forced : null;
}

/** Предложение для состояния: цена и срок — образец эталона (в продукте их отдаёт магазин, здесь магазина нет). */
export function devPlusSplashOffer(state: DevPlusSplashState): PlusSplashOffer | null {
  if (state === 'trial') return { kind: 'ready', yearlyPrice: '€39,99', trialDays: 14 };
  if (state === 'notrial') return { kind: 'ready', yearlyPrice: '€39,99', trialDays: null };
  if (state === 'failed') return { kind: 'no_prices', reason: 'dev' };
  return null;
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __DevPlusSplashRouteShim() { return null; }
