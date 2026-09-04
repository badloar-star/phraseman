/**
 * Клиентский гейт MAX-звонка (паттерн ai_dialog_flags + remote_flags).
 *
 * Два независимых условия видимости входа:
 *  1) `gate_ai_voice_call` — kill switch из «Пульта» (дефолт ВКЛ с 2026-08-16 по
 *     решению владельца): админ выключает голосовую линию живьём, без релиза;
 *  2) доступность нативного стека (react-native-webrtc + incall-manager) на
 *     ЭТОМ бинарнике — OTA поверх старого билда не должна показать кнопку,
 *     которая упадёт на первом же нажатии.
 *
 * Ключ читается защищённо через getRemoteBool с кастом: пока его нет в «Пульте»,
 * значение undefined → работает дефолт ВКЛ (линия открыта), а не «выключено».
 * Каст можно убрать без смены сигнатур (тот же приём, что в ai_dialog_flags).
 */

import { getRemoteBool, type RemoteBoolKey } from './remote_flags';
import { isMaxVoiceNativeAvailable } from './max_webrtc_module';
import { DebugLogger } from './debug-logger';

export const MAX_VOICE_GATE_KEY = 'gate_ai_voice_call';

/**
 * зачем: владелец 2026-08-16 — «звонок должен работать всегда без исключений,
 * единственный гейт будет пейвол». Дефолт ВКЛ: вход виден сразу, без записи в
 * «Пульте». Ключ gate_ai_voice_call остаётся рабочим выключателем — если админ
 * явно поставит false, вход скроется, но «выключено по умолчанию» больше нет.
 */
export const MAX_VOICE_GATE_DEFAULT = true;

// ═══════════════════════════════════════════════════════════════════════════
// ⛔ РАЗДЕЛ MAX ЗАКОНСЕРВИРОВАН — НЕ ВКЛЮЧАТЬ БЕЗ КОМАНДЫ ВЛАДЕЛЬЦА
//
// Решение владельца 2026-09-04: «Раздел макс надо скрыть и отключить все кроны
// инстансы и всё что тратит наши деньги… поставь флаги для всех следующих
// нейронок, что раздел закрыт и его не восстанавливать без специальной команды».
//
// ПОВОД (продовые данные, 162 звонка / 46 пользователей за 3 недели):
// 96 звонков (59%) закончились НА НУЛЕ СЕКУНД, средняя длительность 27 секунд,
// 37 из 63 аккаунтов сожгли пожизненный пробник впустую. Раздел не работал,
// но тратил деньги (watchdog каждые 10 минут + оплата OpenAI).
//
// Пломба стоит ЗДЕСЬ намеренно: это единственная точка, через которую вход в
// MAX виден на Главной, в уроках и во всех входах разом. Одно значение
// закрывает весь раздел, поэтому обойти его случайной правкой соседнего экрана
// невозможно.
//
// ⛔ БУДУЩИМ СЕССИЯМ (Claude, Codex, любой ИИ): НЕ СТАВИТЬ false→true.
// Ни «чиню сломанный тест», ни «раз уж рядом», ни «kill switch в Пульте
// включён» не являются основанием: пломба СИЛЬНЕЕ удалённого флага и env.
// Включение — ТОЛЬКО по прямой явной команде владельца («включи MAX обратно»).
// Серверные функции при этом тоже сняты с деплоя — см. functions-max/index.ts.
// Сторож: tests/max_section_sealed_contract.test.ts.
// ═══════════════════════════════════════════════════════════════════════════
export const MAX_SECTION_SEALED_BY_OWNER_2026_09_04 = true;

/** QA-override сборки: EXPO_PUBLIC_MAX_VOICE_ENABLED=true открывает гейт локально. */
function envOverride(): boolean | undefined {
  const raw = process.env.EXPO_PUBLIC_MAX_VOICE_ENABLED;
  if (raw == null || raw === '') return undefined;
  return raw === 'true' || raw === '1';
}

/** Включён ли kill switch `gate_ai_voice_call` (env → remote → дефолт ВКЛ). */
export function isMaxVoiceCallEnabled(): boolean {
  // Пломба владельца — ПЕРВЫМ условием, выше env и удалённого флага: раздел
  // закрыт целиком, и ни QA-override, ни «Пульт» его не открывают.
  if (MAX_SECTION_SEALED_BY_OWNER_2026_09_04) return false;
  const env = envOverride();
  if (env !== undefined) return env;
  try {
    const remote = getRemoteBool(MAX_VOICE_GATE_KEY as RemoteBoolKey) as boolean | undefined;
    if (typeof remote === 'boolean') return remote;
  } catch (e) {
      // Слой remote_flags не готов (ранний старт) — работаем от дефолта.
      DebugLogger.error('max_voice_flags:remote', e instanceof Error ? e : new Error(String(e)), 'warning');
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
