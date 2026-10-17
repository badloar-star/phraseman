import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

/**
 * Прогрев серверных функций Диалогов V2 (владелец 01.10: «ДОЛЖНЫ» прогреваться заранее).
 *
 * зачем: первый старт сессии и первый ход платили холодный старт двух функций
 * (секреты, модули ~600 КБ выпуска). При показе хаба «Диалоги» или плитки на Главной
 * шлём { warm: true } в dialogueV2SessionStart и dialogueV2TextTurn — сервер отвечает
 * сразу и ничего не делает (functions/src/dialogue_v2_warm.ts), а экземпляры уже живы,
 * когда человек нажмёт «Начать».
 *
 * Экономия: не чаще раза в 10 минут на устройство — метка в памяти процесса и в
 * AsyncStorage (переживает перезапуск). Метка ставится ДО отправки, поэтому два экрана
 * одновременно не шлют двойной прогрев. Ошибка прогрева ни на что не влияет — только лог.
 * minInstances не используем (решение владельца нужно отдельно).
 */
// зачем (расходы, координатор 17.10, пункт 5 клиентского аудита): было 10 минут -> 30; каждый прогрев — 2 вызова на полном ядре
export const DIALOGUE_V2_WARM_INTERVAL_MS = 30 * 60 * 1000;
const STORAGE_KEY = 'dialogue_v2_warm_last_at_v1';
const FUNCTIONS_REGION = 'us-central1';
const WARM_FUNCTIONS = ['dialogueV2SessionStart', 'dialogueV2TextTurn'] as const;
const LOG = '[DIALOGUE-V2] warm';

export type DialogueV2WarmSource = 'hub' | 'home_tile';
export type DialogueV2WarmOutcome = 'sent' | 'throttled' | 'in_flight' | 'failed';

export type DialogueV2WarmupDependencies = Readonly<{
  nowMs(): number;
  readLastWarmAtMs(): Promise<number | null>;
  writeLastWarmAtMs(value: number): Promise<void>;
  callWarm(functionName: typeof WARM_FUNCTIONS[number]): Promise<unknown>;
}>;

export function createDialogueV2Warmup(dependencies: DialogueV2WarmupDependencies) {
  let lastWarmAtMs: number | null = null;
  let storageChecked = false;
  let inFlight: Promise<DialogueV2WarmOutcome> | null = null;

  const run = async (source: DialogueV2WarmSource): Promise<DialogueV2WarmOutcome> => {
    if (!storageChecked) {
      storageChecked = true;
      try {
        const stored = await dependencies.readLastWarmAtMs();
        if (stored !== null && Number.isFinite(stored)) lastWarmAtMs = Math.max(lastWarmAtMs ?? 0, stored);
      } catch (error) {
        console.warn(LOG, JSON.stringify({ event: 'storage_read_failed', message: error instanceof Error ? error.message : String(error) }));
      }
    }
    const now = dependencies.nowMs();
    if (lastWarmAtMs !== null && now - lastWarmAtMs >= 0 && now - lastWarmAtMs < DIALOGUE_V2_WARM_INTERVAL_MS) {
      console.log(LOG, JSON.stringify({ event: 'throttled', source, ageMs: now - lastWarmAtMs }));
      console.log('[COST-CUT] dialogue_v2_warm skipped reason=ttl_not_expired', JSON.stringify({ source, ageMs: now - lastWarmAtMs, ttlMs: DIALOGUE_V2_WARM_INTERVAL_MS })); // guard-ok: ранний выход называет причину
      return 'throttled';
    }
    lastWarmAtMs = now;
    dependencies.writeLastWarmAtMs(now).catch((error: unknown) => {
      console.warn(LOG, JSON.stringify({ event: 'storage_write_failed', message: error instanceof Error ? error.message : String(error) }));
    });
    const startedAt = dependencies.nowMs();
    const results = await Promise.allSettled(WARM_FUNCTIONS.map((name) => dependencies.callWarm(name)));
    const failed = results.flatMap((result, index) => (result.status === 'rejected'
      ? [{ fn: WARM_FUNCTIONS[index], code: String((result.reason as { code?: unknown })?.code ?? (result.reason instanceof Error ? result.reason.message : result.reason)).slice(0, 60) }]
      : []));
    console.log(LOG, JSON.stringify({ event: failed.length === 0 ? 'sent' : 'partial_failure', source, tookMs: dependencies.nowMs() - startedAt, failed }));
    return failed.length === WARM_FUNCTIONS.length ? 'failed' : 'sent';
  };

  return Object.freeze({
    /** Прогреть обе функции, если с прошлого прогрева прошло ≥10 минут. Никогда не бросает. */
    warm(source: DialogueV2WarmSource): Promise<DialogueV2WarmOutcome> {
      if (inFlight) {
        console.log(LOG, JSON.stringify({ event: 'in_flight', source }));
        return Promise.resolve('in_flight');
      }
      inFlight = run(source).catch((error: unknown) => {
        console.warn(LOG, JSON.stringify({ event: 'failed', source, message: error instanceof Error ? error.message : String(error) }));
        return 'failed' as const;
      }).finally(() => { inFlight = null; });
      return inFlight;
    },
  });
}

const productionWarmup = createDialogueV2Warmup({
  nowMs: () => Date.now(),
  readLastWarmAtMs: async () => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    const value = raw === null ? null : Number(raw);
    return value !== null && Number.isFinite(value) ? value : null;
  },
  writeLastWarmAtMs: (value) => AsyncStorage.setItem(STORAGE_KEY, String(value)),
  callWarm: (functionName) => httpsCallable<Readonly<{ warm: true }>, unknown>(
    getFunctions(getApp(), FUNCTIONS_REGION),
    functionName,
  )({ warm: true }),
});

export function warmDialogueV2Functions(source: DialogueV2WarmSource): Promise<DialogueV2WarmOutcome> {
  return productionWarmup.warm(source);
}
