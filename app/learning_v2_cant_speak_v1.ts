// Режим «Не могу говорить» Learning V2 (решение владельца 21.10 ~22:45, как в Duolingo).
//
// зачем: «Сверка» нашла в эпизоде 8 главы 1 шесть голосовых заданий подряд без способа пропустить — человек без микрофона,
// с отказом в доступе или в автобусе не мог закончить эпизод. Теперь на 15 минут все голосовые задания засчитываются
// пропущенными (без потери сердец, в звёзды не идут), эпизод засчитывается. Включается кнопкой на голосовом задании,
// кнопкой в шторке «голосовые впереди» и сам — при отказе в микрофоне.
// Состояние в памяти процесса + копия на телефоне (переживает перезапуск в пределах 15 минут). Сети нет.
// Журнал [V2-VOICE-SKIP] с причиной: button / headsup_button / permission_denied / timer.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getRemoteBool, hasRemoteBoolOverride } from "./remote_flags";

const LOG = "[V2-VOICE-SKIP]";
const KEY = "learning_v2_cant_speak_until_v1";
export const LEARNING_V2_CANT_SPEAK_WINDOW_MS = 15 * 60 * 1000;

export type LearningV2CantSpeakReasonV1 = "button" | "headsup_button" | "permission_denied";

let untilMs = 0;
let hydrated = false;
let gateLogged: boolean | null = null;

/**
 * Можно ли вообще режим «Не могу говорить».
 * зачем (ЗАМОК ВЛАДЕЛЬЦА 25.10, дословно «Не могу говорить выключи это! … в админке в пульте управления добавь возможность
 * добавить эту кнопку… но сейчас убери… это удар по монетизации»): только по флагу «Пульта» learning_cant_speak_enabled, по
 * умолчанию нет. Флаг читается из уже загруженного снимка (кэш приходит при входе) — новых чтений Firestore нет.
 */
export function isLearningV2CantSpeakEnabledV1(): boolean {
  const flag = getRemoteBool("learning_cant_speak_enabled") === true;
  if (gateLogged !== flag) {
    gateLogged = flag;
    console.log("[CANT-SPEAK-GATE]", JSON.stringify({ flag, source: hasRemoteBoolOverride("learning_cant_speak_enabled") ? "cache" : "default" })); // guard-ok: одна строка на смену значения
  }
  return flag;
}

export function learningV2CantSpeakUntilV1(): number {
  return isLearningV2CantSpeakEnabledV1() ? untilMs : 0;
}

export function isLearningV2CantSpeakActiveV1(nowMs: number = Date.now()): boolean {
  return isLearningV2CantSpeakEnabledV1() && untilMs > nowMs;
}

export function activateLearningV2CantSpeakV1(reason: LearningV2CantSpeakReasonV1, nowMs: number = Date.now()): number {
  if (!isLearningV2CantSpeakEnabledV1()) {
    console.warn(`${LOG} activate:blocked_by_flag`, JSON.stringify({ reason })); // guard-ok: ранний выход с причиной
    return 0;
  }
  untilMs = nowMs + LEARNING_V2_CANT_SPEAK_WINDOW_MS;
  console.log(`${LOG} activated`, JSON.stringify({ reason, untilMs, windowMs: LEARNING_V2_CANT_SPEAK_WINDOW_MS })); // guard-ok: одна строка на включение
  void AsyncStorage.setItem(KEY, String(untilMs)).catch((error: unknown) => {
    console.warn(`${LOG} persist_failed`, JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch с причиной
  });
  return untilMs;
}

/** Подтянуть сохранённый срок после перезапуска приложения (один раз). */
export async function hydrateLearningV2CantSpeakV1(nowMs: number = Date.now()): Promise<number> {
  if (!isLearningV2CantSpeakEnabledV1()) return 0;
  if (hydrated) return untilMs;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const stored = raw ? Number(raw) : 0;
    if (Number.isFinite(stored) && stored > nowMs && stored > untilMs) untilMs = stored;
    console.log(`${LOG} hydrated`, JSON.stringify({ stored: Number.isFinite(stored) ? stored : null, active: untilMs > nowMs })); // guard-ok: итог загрузки
  } catch (error) {
    console.warn(`${LOG} hydrate_failed`, JSON.stringify({ reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch с причиной
  }
  return untilMs;
}

/** Только для тестов. */
export function __resetLearningV2CantSpeakForTests(): void {
  untilMs = 0;
  hydrated = false;
  gateLogged = null;
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __LearningV2CantSpeakRouteShim() {
  return null;
}
