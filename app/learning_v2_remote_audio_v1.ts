/**
 * Решение владельца 18.10: звук Learning V2 в MP3 96 кбит/с. В сборке пять первых занятий,
 * остальное догружается из Storage; вперёд готовятся только две сессии.
 *
 * Как: REST GET firebasestorage.googleapis.com/v0/b/{bucket}/o/{objectPath}?alt=media с «Authorization: Firebase <idToken>»
 * — тот же приём, что у Шпиля (app/spire/spire_pack_client.ts): модуля @react-native-firebase/storage в приложении нет,
 * правила Storage пускают только вошедшего и только get (learning-v2/voice-audio, листинга нет). App Check не используется
 * (пломба владельца). Байты не доверяются: точную сверку sha256 и размера делает
 * prepareLearningV2VoiceAudioOfflineBytesV1 (кэш на диске), повторно файл не качается.
 *
 * Журнал [AUDIO-REMOTE] на каждом шаге: вход (хеш, путь), токен, запрос (код, байты, мс), отказ с причиной, итог.
 * Ничего не бросает наружу без причины: вызывающий получает Uint8Array или ошибку с кодом, и сам решает (TTS).
 */
import { DebugLogger } from "./debug-logger";

const LOG = "[AUDIO-REMOTE]";
const TOKEN_TIMEOUT_MS = 8_000;
const DOWNLOAD_TIMEOUT_MS = 15_000;
/** В полном курсе есть длинные реплики до 182 016 байт; точный размер и SHA проверяет кэш. */
const MAX_BYTES = 256 * 1024;
// зачем: голый __DEV__ в тестах — ReferenceError (память project_dev_global_undefined_in_tests)
const DEV = typeof __DEV__ !== "undefined" && __DEV__ === true;

export type LearningV2RemoteAudioFailureV1 =
  | "no_bucket"
  | "no_user"
  | "token_timeout"
  | "token_failed"
  | "not_found"
  | "forbidden"
  | "http_error"
  | "timeout"
  | "network"
  | "too_large";

export class LearningV2RemoteAudioErrorV1 extends Error {
  constructor(readonly reason: LearningV2RemoteAudioFailureV1, detail: string) {
    super(`learning_v2_remote_audio_${reason}: ${detail}`);
  }
}

const errText = (error: unknown): string => (error instanceof Error ? error.message : String(error)).slice(0, 160);

function storageBucket(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require("@react-native-firebase/app");
    const bucket: unknown = getApp()?.options?.storageBucket;
    if (typeof bucket === "string" && bucket.length > 0) return bucket;
    DebugLogger.warn(LOG, "в настройках Firebase нет storageBucket");
    return null;
  } catch (error) {
    DebugLogger.warn(LOG, `настройки Firebase не прочитались (${errText(error)})`);
    return null;
  }
}

async function idToken(): Promise<string> {
  let user: { getIdToken: () => Promise<string> } | null | undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const auth = require("@react-native-firebase/auth").default;
    user = auth()?.currentUser;
  } catch (error) {
    throw new LearningV2RemoteAudioErrorV1("token_failed", `auth не загрузился (${errText(error)})`);
  }
  if (!user) throw new LearningV2RemoteAudioErrorV1("no_user", "нет вошедшего пользователя — Storage не пустит");
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timedOut = new Promise<"timeout">((resolve) => { timer = setTimeout(() => resolve("timeout"), TOKEN_TIMEOUT_MS); });
  try {
    const token = await Promise.race([user.getIdToken(), timedOut]);
    if (token === "timeout") throw new LearningV2RemoteAudioErrorV1("token_timeout", `токен дольше ${TOKEN_TIMEOUT_MS} мс`);
    return token;
  } catch (error) {
    if (error instanceof LearningV2RemoteAudioErrorV1) throw error;
    throw new LearningV2RemoteAudioErrorV1("token_failed", errText(error));
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Байты одного файла озвучки из Storage по точному пути. Проверку sha256/размера делает вызывающий кэш. */
export async function fetchLearningV2RemoteAudioBytesV1(input: {
  readonly objectPath: string;
  readonly contentHash: string;
  readonly byteSize: number;
  readonly where: string;
}): Promise<Uint8Array> {
  const startedAt = Date.now();
  const tag = `${input.where} hash=${input.contentHash.slice(0, 12)} size=${input.byteSize}`;
  const bucket = storageBucket();
  if (!bucket) throw new LearningV2RemoteAudioErrorV1("no_bucket", tag);
  const token = await idToken();
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodeURIComponent(input.objectPath)}?alt=media`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DOWNLOAD_TIMEOUT_MS);
  try {
    if (DEV) DebugLogger.info(LOG, `запрос ${tag}`);
    const res = await fetch(url, { headers: { Authorization: `Firebase ${token}` }, signal: controller.signal });
    const ms = Date.now() - startedAt;
    if (res.status === 404) {
      DebugLogger.warn(LOG, `нет в Storage (404) ${tag} за ${ms}мс — будет голос телефона`);
      throw new LearningV2RemoteAudioErrorV1("not_found", tag);
    }
    if (res.status === 403) {
      DebugLogger.warn(LOG, `403: правила Storage не пускают ${tag} за ${ms}мс`);
      throw new LearningV2RemoteAudioErrorV1("forbidden", tag);
    }
    if (!res.ok) {
      DebugLogger.warn(LOG, `ответ ${res.status} ${tag} за ${ms}мс`);
      throw new LearningV2RemoteAudioErrorV1("http_error", `${res.status} ${tag}`);
    }
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      DebugLogger.warn(LOG, `файл больше потолка: ${buffer.byteLength} байт ${tag}`);
      throw new LearningV2RemoteAudioErrorV1("too_large", `${buffer.byteLength} ${tag}`);
    }
    if (DEV) DebugLogger.info(LOG, `сеть ok ${tag} байт=${buffer.byteLength} за ${Date.now() - startedAt}мс`);
    return new Uint8Array(buffer);
  } catch (error) {
    if (error instanceof LearningV2RemoteAudioErrorV1) throw error;
    const aborted = error instanceof Error && error.name === "AbortError";
    DebugLogger.warn(LOG, `${aborted ? "таймаут" : "сеть упала"} ${tag} за ${Date.now() - startedAt}мс (${errText(error)})`);
    throw new LearningV2RemoteAudioErrorV1(aborted ? "timeout" : "network", tag);
  } finally {
    clearTimeout(timer);
  }
}

/* expo-router route shim: служебный модуль в app/ не должен считаться экраном */
export default function __LearningV2RemoteAudioRouteShim() { return null; }
