/**
 * DEV-подмена ответа гейта «согласие на AI-диалоги»: `dev_state?aiConsent=granted` / `aiConsent=off`.
 *
 * зачем (координатор 12.10): у чистого гостя согласия нет, и «Начать» в брифинге открывает шторку согласия вместо сессии — Сверка не может снять ни один кадр
 * внутри диалога. Согласие — юридически значимый факт и уходит в облако (облачная запись согласия), поэтому подменяется ТОЛЬКО ответ гейта в памяти процесса:
 * запись в хранилище и вызов облачной функции НЕ делаются. Строка dialogs-009 (сама шторка согласия) снимается без подмены.
 * Только `__DEV__ && !IS_STORE_RELEASE`: в стор-сборке геттер всегда false, а установка отклоняется. Перезапуск приложения сбрасывает. Лог: [DEV-STATE] aiConsent.
 */
import { IS_STORE_RELEASE } from './config';
import { DIAG_ENABLED } from './dev_diag_gate';

// зачем (координатор 13.10, dialogs-010): экран «AI-диалоги выключены» достигается только решением «отказ» — добавлен режим denied
// (тоже только память, без записи и облака). null — подмены нет, гейт отвечает по настоящему решению.
export type DevAiConsentOverride = 'granted' | 'denied';
let override: DevAiConsentOverride | null = null;

// зачем (координатор 18.10, Сверка встала на шторке согласия): подмена доступна только при ВСЕХ трёх условиях — __DEV__, не стор-сборка (IS_STORE_RELEASE)
// и DIAG_ENABLED (EXPO_PUBLIC_STORE_RELEASE !== '1'). В релизе __DEV__ = false — флаг физически не работает: установка отклоняется, геттер null.
function devAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true && !IS_STORE_RELEASE && DIAG_ENABLED;
}

let lastLoggedOverride: DevAiConsentOverride | null = null;

/** Включить/выключить подмену. В стор-сборке — отказ с логом, значение не меняется. Возвращает true, если применено. */
export function setDevAiConsentGranted(next: boolean): boolean {
  return setDevAiConsentOverride(next ? 'granted' : null);
}

/** Подмена решения: granted / denied / null (снять). В стор-сборке — отказ с логом. Возвращает true, если применено. */
export function setDevAiConsentOverride(next: DevAiConsentOverride | null): boolean {
  if (!devAvailable()) {
    console.warn('[DEV-STATE] aiConsent: отклонено — не dev-сборка', { next }); // guard-ok: ранний выход логируется
    return false;
  }
  override = next;
  console.log(`[DEV-STATE] aiConsent override=${next ?? 'off'}${next ? ' (только ответ гейта в памяти; запись и облако не вызываются)' : ''}`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Текущая подмена решения или null. В стор-сборке всегда null. */
export function getDevAiConsentOverride(): DevAiConsentOverride | null {
  const value = devAvailable() ? override : null;
  // Каждый раз, когда гейт впервые ответил подменой (или подмену сняли), — одна строка: за человека согласие не принималось, это dev-подмена.
  if (value !== lastLoggedOverride) {
    lastLoggedOverride = value;
    console.log(`[AI-CONSENT] dev_override=${value ?? 'off'} (только ответ гейта в памяти; согласие человека не записано и в облако не ушло)`); // guard-ok: одна строка на смену подмены
  }
  return value;
}

/** true — гейт согласия в dev отвечает «согласие дано». В стор-сборке всегда false. */
export function getDevAiConsentGranted(): boolean {
  return getDevAiConsentOverride() === 'granted';
}
