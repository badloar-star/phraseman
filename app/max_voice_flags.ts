/**
 * Клиентский гейт MAX-звонка (паттерн ai_dialog_flags + remote_flags).
 *
 * Два независимых условия видимости входа:
 *  1) `gate_ai_voice_call` — kill switch из «Пульта» (дефолт ВЫКЛ до запуска,
 *     спека §3): админ включает/выключает голосовую линию живьём, без релиза;
 *  2) доступность нативного стека (react-native-webrtc + incall-manager) на
 *     ЭТОМ бинарнике — OTA поверх старого билда не должна показать кнопку,
 *     которая упадёт на первом же нажатии.
 *
 * Ключ пока не заведён в RemoteBoolKey (remote_flags.ts правится параллельной
 * серверной сессией) — читаем его защищённо через getRemoteBool с кастом: пока
 * ключа нет, значение undefined → работает дефолт ВЫКЛ; после слияния каст
 * можно убрать без смены сигнатур (тот же приём, что в ai_dialog_flags).
 */

import { getRemoteBool, type RemoteBoolKey } from './remote_flags';
import { isMaxVoiceNativeAvailable } from './max_webrtc_module';

export const MAX_VOICE_GATE_KEY = 'gate_ai_voice_call';

/** Дефолт ВЫКЛ — голосовая линия не существует, пока админ её не включил. */
export const MAX_VOICE_GATE_DEFAULT = false;

/** QA-override сборки: EXPO_PUBLIC_MAX_VOICE_ENABLED=true открывает гейт локально. */
function envOverride(): boolean | undefined {
  const raw = process.env.EXPO_PUBLIC_MAX_VOICE_ENABLED;
  if (raw == null || raw === '') return undefined;
  return raw === 'true' || raw === '1';
}

/** Включён ли kill switch `gate_ai_voice_call` (env → remote → дефолт ВЫКЛ). */
export function isMaxVoiceCallEnabled(): boolean {
  const env = envOverride();
  if (env !== undefined) return env;
  try {
    const remote = getRemoteBool(MAX_VOICE_GATE_KEY as RemoteBoolKey) as boolean | undefined;
    if (typeof remote === 'boolean') return remote;
  } catch {
    // Слой remote_flags не готов (ранний старт) — работаем от дефолта.
  }
  return MAX_VOICE_GATE_DEFAULT;
}

/**
 * Видимость входа в MAX-звонок: гейт И нативный стек. Нет модуля (OTA поверх
 * старого бинарника) → вход скрыт, юзеру остаётся текст/half-duplex (спека §1).
 */
export function isMaxVoiceEntryVisible(): boolean {
  return isMaxVoiceCallEnabled() && isMaxVoiceNativeAvailable();
}

/* expo-router route shim: файлы в app/ считаются роутами и требуют default export. */
export default function __RouteShim() {
  return null;
}
