/**
 * Дев-начисление минут без списания денег.
 *
 * зачем: владелец 2026-08-29 — «сделай в дев чтобы кнопки покупки работали и
 * мне начислялись минуты без списания». Реальная покупка требует настроенного
 * sandbox Google Play, поэтому в дев-сборке карточка пакета зовёт серверную
 * voiceMinuteDevGrant: она пишет тот же неизменяемый идемпотентный event и
 * пересобирает ту же проекцию кошелька, что и оплаченная покупка. Никакого
 * второго писателя баланса не появляется (Economy Constitution), а деньги не
 * задействованы вовсе.
 *
 * Первая версия звала админскую adminGrantVoiceMinutes и получала
 * permission-denied: владелец тестирует с телефона под АНОНИМНЫМ аккаунтом, а
 * claim `admin` висит на его почте. Поэтому нужна отдельная функция.
 *
 * Двойная защита: __DEV__ на клиенте (в релизной сборке ветки нет вовсе) и
 * серверный флаг, выключенный по умолчанию.
 */
import { withCallableTimeout } from '../../app/callable_timeout';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../../app/account_generation';
import { parseVoiceMinuteWalletStatus, type VoiceMinuteWalletStatus } from './wallet';

const FUNCTIONS_REGION = 'us-central1';

export type VoiceMinuteDevGrantResult = Readonly<{
  status: 'credited' | 'stale' | 'failed';
  wallet?: VoiceMinuteWalletStatus;
  /** Причина отказа для дев-подсказки: без неё «не прошло» ничего не объясняет. */
  reason?: string;
}>;

/** Дев-начисление доступно только в отладочной сборке. */
export function isVoiceMinuteDevGrantAvailable(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__ === true;
}

type GrantCallable = (data: Readonly<Record<string, unknown>>) => Promise<{ data?: unknown }>;

let grantCallable: GrantCallable | null = null;

function getGrantCallable(): GrantCallable {
  if (!grantCallable) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getApp } = require('@react-native-firebase/app');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
    grantCallable = httpsCallable(
      getFunctions(getApp(), FUNCTIONS_REGION),
      'voiceMinuteDevGrant',
    ) as GrantCallable;
  }
  return grantCallable;
}

export async function grantVoiceMinutesInDev(minutes: number): Promise<VoiceMinuteDevGrantResult> {
  if (!isVoiceMinuteDevGrantAvailable()) return { status: 'failed' };
  const generation = captureAccountGeneration();
  const isCurrent = () => isCurrentAccountGeneration(generation);
  if (!generation.stableId || !isCurrent()) return { status: 'stale' };

  try {
    // Функция сама возвращает пересобранную проекцию кошелька — второй запрос
    // за балансом не нужен (минус один сетевой круг и одно чтение Firestore).
    const response = await withCallableTimeout(
      getGrantCallable()({ minutes }),
      'voiceMinuteDevGrant',
    );
    if (!isCurrent()) return { status: 'stale' };
    return { status: 'credited', wallet: parseVoiceMinuteWalletStatus(response?.data) };
  } catch (grantError) {
    // зачем: раньше причина глоталась и дев видел безадресное «не прошло».
    // Код Firebase сразу говорит, что чинить: voice_minute_dev_grant_disabled —
    // выключен серверный флаг, resource-exhausted — упёрлись в потолок.
    const code = String((grantError as { code?: unknown })?.code ?? '')
      || String((grantError as { message?: unknown })?.message ?? 'unknown');
    return { status: 'failed', reason: code };
  }
}
