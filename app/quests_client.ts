/**
 * quests_client.ts — клиентский слой системы «Задания».
 *
 * зачем (владелец, 2026-08-31): задание, назначенное из админки, показывается
 * пульсирующей плашкой под карточкой последнего урока на Главной; в модале
 * человек видит что сделать, какие подарки получит, и забирает награду.
 *
 * Экономия Firestore: активное задание кэшируется на диск и перечитывается
 * НЕ ЧАЩЕ раза в 30 минут и только при заходе на Главную. Фоновых таймеров
 * нет. Первый кадр рисуется из кэша синхронно — без «пусто, потом прыжок».
 *
 * Начисление наград идёт теми же путями, что подарки Пути дня
 * (app/daily_journey_gift_activation.ts): жемчуг — журналом операций, руны —
 * очередью грантов, спины — локальными кредитами. Своей экономики здесь нет.
 *
 * Логи: единый префикс [QUESTS] — каждый ранний выход и каждый catch называет
 * причину (правило владельца «сперва логи, потом починка»).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { DebugLogger } from './debug-logger';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import { commitShardCreditOperation } from './shards_system';
import { enqueueLevelSpinStarGrant } from './level_spin_star_grants';
import { grantLocalQuestSpins } from './local_level_spins';

const FUNCTIONS_REGION = 'us-central1';
const LOG = '[QUESTS]';

/**
 * Как часто разрешено спрашивать сервер о задании.
 *
 * 30 минут — компромисс: задание живёт 72 часа, поэтому более частый опрос
 * ничего не даёт, а стоит чтений. Прогресс между опросами обновляется
 * локально (оптимистично), так что экран не выглядит мёртвым.
 */
export const QUEST_REFRESH_TTL_MS = 30 * 60 * 1000;

const CACHE_KEY_PREFIX = 'quests_active_v1';

export type QuestRewardKind = 'pearls' | 'runes' | 'spins' | 'plus_days' | 'energy_full' | 'freeze';
export type QuestReward = Readonly<{ kind: QuestRewardKind; amount: number }>;

export type QuestKind =
  | 'community_pack_submit'
  | 'invite_friend'
  | 'earn_runes'
  | 'spin_wheel'
  | 'watch_video'
  | 'complete_lessons'
  | 'arena_matches'
  | 'streak_days'
  | 'flashcards_reviewed'
  | 'earn_xp';

export type QuestPhase = 'active' | 'ready' | 'claimed' | 'expired';
export type QuestTargetUnit = 'count' | 'runes' | 'minutes' | 'days' | 'xp';

export type QuestSnapshot = Readonly<{
  questId: string;
  kind: QuestKind;
  target: number;
  unit: QuestTargetUnit;
  title: string;
  body: string;
  rewards: readonly QuestReward[];
  progress: number;
  phase: QuestPhase;
  expiresAtMs: number;
}>;

type CachedQuest = Readonly<{
  fetchedAtMs: number;
  quest: QuestSnapshot | null;
}>;

let memoryCache: (CachedQuest & { owner: string }) | null = null;
let inFlight: Promise<QuestSnapshot | null> | null = null;

function isQuestCloudEnabled(): boolean {
  return CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
}

function cacheKey(stableId: string): string {
  return `${CACHE_KEY_PREFIX}:${stableId}`;
}

function callable<TReq extends object, TRes>(name: string) {
  return httpsCallable<TReq, TRes>(getFunctions(getApp(), FUNCTIONS_REGION), name);
}

function normalizeQuest(raw: unknown): QuestSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const data = raw as Record<string, unknown>;
  const questId = String(data.questId ?? '').trim();
  if (!questId) return null;
  const rewardsRaw = Array.isArray(data.rewards) ? data.rewards : [];
  const rewards = rewardsRaw
    .map((entry) => {
      const row = (entry ?? {}) as Record<string, unknown>;
      const kind = String(row.kind ?? '') as QuestRewardKind;
      const amount = Math.trunc(Number(row.amount ?? 0));
      if (!Number.isSafeInteger(amount) || amount <= 0) return null;
      return Object.freeze({ kind, amount });
    })
    .filter((r): r is QuestReward => r !== null);
  if (rewards.length === 0) return null;

  return Object.freeze({
    questId,
    kind: String(data.kind ?? '') as QuestKind,
    target: Math.max(1, Math.trunc(Number(data.target ?? 1))),
    unit: (String(data.unit ?? 'count') as QuestTargetUnit),
    title: String(data.title ?? '').trim(),
    body: String(data.body ?? '').trim(),
    rewards: Object.freeze(rewards),
    progress: Math.max(0, Math.trunc(Number(data.progress ?? 0))),
    phase: (String(data.phase ?? 'active') as QuestPhase),
    expiresAtMs: Math.max(0, Math.trunc(Number(data.expiresAtMs ?? 0))),
  });
}

/**
 * Синхронный снимок «прямо сейчас» — для первого кадра Главной.
 * Диск не читается: только то, что уже подняли в память.
 */
export function peekActiveQuest(): QuestSnapshot | null {
  const owner = captureAccountGeneration().stableId;
  if (!owner || memoryCache?.owner !== owner) return null;
  return memoryCache.quest;
}

async function readCache(stableId: string): Promise<CachedQuest | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(stableId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const fetchedAtMs = Math.max(0, Math.trunc(Number(parsed.fetchedAtMs ?? 0)));
    return Object.freeze({ fetchedAtMs, quest: normalizeQuest(parsed.quest) });
  } catch (error) {
    // Битый кэш — не повод падать: перечитаем из сети.
    DebugLogger.warn('quests:cache_read_failed', String(error));
    return null;
  }
}

async function writeCache(stableId: string, value: CachedQuest): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(stableId), JSON.stringify(value));
  } catch (error) {
    DebugLogger.warn('quests:cache_write_failed', String(error));
  }
}

/**
 * Активное задание. Сеть трогается не чаще QUEST_REFRESH_TTL_MS —
 * кроме forceRemote (жест pull-to-refresh пользователя).
 */
export async function loadActiveQuest(
  options: Readonly<{ forceRemote?: boolean; token?: AccountGenerationToken }> = {},
): Promise<QuestSnapshot | null> {
  const token = options.token ?? captureAccountGeneration();
  const owner = token.stableId?.trim();
  if (!owner) {
    console.log(`${LOG} load_skip reason=no_stable_id`);
    return null;
  }
  if (!isQuestCloudEnabled()) {
    console.log(`${LOG} load_skip reason=cloud_disabled expoGo=${IS_EXPO_GO}`);
    return null;
  }

  const nowMs = Date.now();
  if (memoryCache?.owner !== owner) {
    const disk = await readCache(owner);
    if (!isCurrentAccountGeneration(token, owner)) {
      console.log(`${LOG} load_skip reason=account_changed_after_cache_read`);
      return null;
    }
    memoryCache = disk ? { owner, ...disk } : null;
  }

  const fresh = memoryCache && nowMs - memoryCache.fetchedAtMs < QUEST_REFRESH_TTL_MS;
  if (fresh && !options.forceRemote) {
    console.log(`${LOG} load_cache quest=${memoryCache?.quest?.questId ?? 'none'} ageMs=${nowMs - (memoryCache?.fetchedAtMs ?? 0)}`);
    return memoryCache?.quest ?? null;
  }

  if (inFlight) return inFlight;

  const startedAtMs = Date.now();
  inFlight = (async () => {
    try {
      const response = await callable<{ stableId: string; lang: string }, { ok?: boolean; quest?: unknown }>('questGetActive')({
        stableId: owner,
        lang: 'ru',
      });
      if (!isCurrentAccountGeneration(token, owner)) {
        console.log(`${LOG} load_drop reason=account_changed_after_network`);
        return null;
      }
      const quest = normalizeQuest(response.data?.quest);
      memoryCache = { owner, fetchedAtMs: Date.now(), quest };
      await writeCache(owner, { fetchedAtMs: memoryCache.fetchedAtMs, quest });
      console.log(`${LOG} load_remote quest=${quest?.questId ?? 'none'} phase=${quest?.phase ?? 'none'} progress=${quest?.progress ?? 0}/${quest?.target ?? 0} tookMs=${Date.now() - startedAtMs}`);
      return quest;
    } catch (error) {
      // Сеть отвалилась — показываем последнее известное, а не пустоту.
      console.warn(`${LOG} load_failed reason=${String(error)} tookMs=${Date.now() - startedAtMs}`);
      DebugLogger.warn('quests:load_failed', String(error));
      return memoryCache?.quest ?? null;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Мгновенно обновить кэш локально — оптимистичный отклик без сети. */
export function patchCachedQuest(next: QuestSnapshot | null): void {
  const owner = captureAccountGeneration().stableId;
  if (!owner) return;
  memoryCache = { owner, fetchedAtMs: memoryCache?.fetchedAtMs ?? Date.now(), quest: next };
  if (next !== null || memoryCache) {
    void writeCache(owner, { fetchedAtMs: memoryCache.fetchedAtMs, quest: next });
  }
}

/** Сбросить TTL, чтобы следующий заход пошёл в сеть (после забора награды). */
export function invalidateQuestCache(): void {
  if (memoryCache) memoryCache = { ...memoryCache, fetchedAtMs: 0 };
}

// ────────────────────────────────────────────────────────────────────────────
// Отчёт о прогрессе (событийные типы: спины, видео, набор, друг, арена).
// ────────────────────────────────────────────────────────────────────────────

/**
 * Сообщить серверу о шаге задания.
 *
 * eventId делает вызов идемпотентным: повтор того же события (ретрай сети,
 * второй тап) не двигает счётчик. Вызов «тихий»: он не должен ломать основной
 * сценарий, поэтому ошибки только логируются — но НИКОГДА не глотаются молча.
 */
export async function reportQuestProgress(input: Readonly<{
  kind: QuestKind;
  eventId: string;
  amount?: number;
  token?: AccountGenerationToken;
}>): Promise<void> {
  const token = input.token ?? captureAccountGeneration();
  const owner = token.stableId?.trim();
  if (!owner) {
    console.log(`${LOG} report_skip reason=no_stable_id kind=${input.kind}`);
    return;
  }
  if (!isQuestCloudEnabled()) {
    console.log(`${LOG} report_skip reason=cloud_disabled kind=${input.kind}`);
    return;
  }

  // Отчёт нужен только когда активно задание ИМЕННО этого типа — иначе это
  // лишний вызов функции на каждый спин/видео у всех пользователей сразу.
  const quest = peekActiveQuest() ?? await loadActiveQuest({ token });
  if (!quest) {
    console.log(`${LOG} report_skip reason=no_active_quest kind=${input.kind}`);
    return;
  }
  if (quest.kind !== input.kind) {
    console.log(`${LOG} report_skip reason=kind_mismatch active=${quest.kind} reported=${input.kind}`);
    return;
  }
  if (quest.phase !== 'active') {
    console.log(`${LOG} report_skip reason=phase_not_active phase=${quest.phase}`);
    return;
  }

  const amount = Math.max(1, Math.trunc(input.amount ?? 1));

  // Оптимистично двигаем локальный счётчик — модал и плашка реагируют сразу,
  // не дожидаясь ответа сервера.
  patchCachedQuest(Object.freeze({
    ...quest,
    progress: Math.min(quest.target, quest.progress + amount),
    phase: quest.progress + amount >= quest.target ? 'ready' : quest.phase,
  }));

  try {
    const response = await callable<
      { stableId: string; questId: string; eventId: string; amount: number },
      { ok?: boolean; current?: number; complete?: boolean }
    >('questReportProgress')({
      stableId: owner,
      questId: quest.questId,
      eventId: input.eventId,
      amount,
    });
    if (!isCurrentAccountGeneration(token, owner)) {
      console.log(`${LOG} report_drop reason=account_changed_after_network`);
      return;
    }
    const current = Math.max(0, Math.trunc(Number(response.data?.current ?? 0)));
    // Серверное значение авторитетно: приводим кэш к нему, чтобы цифра не
    // «прыгала» при следующем чтении.
    const latest = peekActiveQuest();
    if (latest && latest.questId === quest.questId) {
      patchCachedQuest(Object.freeze({
        ...latest,
        progress: Math.min(latest.target, Math.max(latest.progress, current)),
        phase: response.data?.complete ? 'ready' : latest.phase,
      }));
    }
    console.log(`${LOG} report_ok kind=${input.kind} quest=${quest.questId} +${amount} current=${current} complete=${response.data?.complete === true}`);
  } catch (error) {
    // Откат оптимистичного шага: сервер его не принял.
    const latest = peekActiveQuest();
    if (latest && latest.questId === quest.questId) {
      patchCachedQuest(Object.freeze({
        ...latest,
        progress: quest.progress,
        phase: quest.phase,
      }));
    }
    console.warn(`${LOG} report_failed kind=${input.kind} quest=${quest.questId} reason=${String(error)}`);
    DebugLogger.warn('quests:report_failed', `${input.kind}:${String(error)}`);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Забор награды.
// ────────────────────────────────────────────────────────────────────────────
export type QuestClaimResult =
  | Readonly<{ status: 'claimed'; rewards: readonly QuestReward[] }>
  | Readonly<{ status: 'failed'; reason: string; messageRu: string }>;

const RUNE_DENOMINATIONS = Object.freeze([1_000, 500, 250, 100, 50, 20, 10] as const);

function runeGiftIds(amount: number): string[] {
  let remaining = amount;
  const giftIds: string[] = [];
  for (const denomination of RUNE_DENOMINATIONS) {
    while (remaining >= denomination) {
      giftIds.push(`stars_${denomination}`);
      remaining -= denomination;
    }
  }
  return remaining === 0 ? giftIds : [];
}

/**
 * Зачислить награды на устройстве по расписке сервера.
 *
 * Каждый вид идёт своим уже существующим путём — новых писателей баланса не
 * создаём. Идентификаторы операций детерминированы (questId + вид + индекс),
 * поэтому повтор после обрыва сети не удваивает награду.
 */
async function applyQuestRewards(
  questId: string,
  rewards: readonly QuestReward[],
  token: AccountGenerationToken,
): Promise<void> {
  for (const [index, reward] of rewards.entries()) {
    const operationId = `quest:${questId}:${reward.kind}:${index}`;
    switch (reward.kind) {
      case 'pearls': {
        const result = await commitShardCreditOperation({
          operationId,
          amount: reward.amount,
          reason: 'quest_reward',
          grant: {
            kind: 'quest_reward',
            subjectId: questId,
            payload: { questId, reward },
          },
          accountToken: token,
        });
        if (result.status !== 'applied' && result.status !== 'already-applied') {
          console.warn(`${LOG} apply_pearls_failed quest=${questId} status=${result.status}`);
          throw new Error('quest_reward_pearls_failed');
        }
        console.log(`${LOG} apply_pearls quest=${questId} amount=${reward.amount} status=${result.status}`);
        break;
      }
      case 'runes': {
        const giftIds = runeGiftIds(reward.amount);
        if (giftIds.length === 0) {
          console.warn(`${LOG} apply_runes_failed quest=${questId} reason=amount_not_payable amount=${reward.amount}`);
          throw new Error('quest_reward_runes_unsupported');
        }
        for (const [giftIndex, giftId] of giftIds.entries()) {
          await enqueueLevelSpinStarGrant({
            token,
            requestId: `quest_${questId}_${index}_${giftIndex + 1}`.slice(0, 100),
            lane: 'base',
            giftId,
          });
        }
        console.log(`${LOG} apply_runes quest=${questId} amount=${reward.amount} gifts=${giftIds.length}`);
        break;
      }
      case 'spins': {
        const granted = await grantLocalQuestSpins(`${questId}_${index}`, reward.amount, token);
        console.log(`${LOG} apply_spins quest=${questId} amount=${reward.amount} granted=${granted}`);
        break;
      }
      case 'plus_days':
        // Доступ Plus выдал сервер в той же транзакции — на клиенте делать
        // нечего. Логируем, чтобы цепочка в логах не обрывалась.
        console.log(`${LOG} apply_plus quest=${questId} days=${reward.amount} appliedBy=server`);
        break;
      case 'energy_full':
      case 'freeze':
        // Эти виды выдаются серверной расписной как факт; локальные эффекты
        // подхватит инвентарь при следующем чтении.
        console.log(`${LOG} apply_inventory quest=${questId} kind=${reward.kind} amount=${reward.amount}`);
        break;
    }
  }
}

/**
 * Забрать награду. Сервер проверяет выполнение и срок, клиент зачисляет.
 */
export async function claimQuestReward(
  questId: string,
  options: Readonly<{ token?: AccountGenerationToken }> = {},
): Promise<QuestClaimResult> {
  const token = options.token ?? captureAccountGeneration();
  const owner = token.stableId?.trim();
  if (!owner) {
    console.warn(`${LOG} claim_skip reason=no_stable_id quest=${questId}`);
    return Object.freeze({ status: 'failed', reason: 'no_stable_id', messageRu: 'Не удалось определить аккаунт. Попробуйте позже.' });
  }
  if (!isQuestCloudEnabled()) {
    console.warn(`${LOG} claim_skip reason=cloud_disabled quest=${questId}`);
    return Object.freeze({ status: 'failed', reason: 'cloud_disabled', messageRu: 'Нет связи с сервером.' });
  }

  const startedAtMs = Date.now();
  try {
    const response = await callable<
      { stableId: string; questId: string },
      { ok?: boolean; rewards?: unknown; alreadyClaimed?: boolean }
    >('questClaimReward')({ stableId: owner, questId });
    if (!isCurrentAccountGeneration(token, owner)) {
      console.warn(`${LOG} claim_drop reason=account_changed_after_network quest=${questId}`);
      return Object.freeze({ status: 'failed', reason: 'account_changed', messageRu: 'Аккаунт сменился. Зайдите ещё раз.' });
    }
    const rewardsRaw = Array.isArray(response.data?.rewards) ? response.data.rewards : [];
    const rewards = rewardsRaw
      .map((entry) => {
        const row = (entry ?? {}) as Record<string, unknown>;
        const kind = String(row.kind ?? '') as QuestRewardKind;
        const amount = Math.trunc(Number(row.amount ?? 0));
        return Number.isSafeInteger(amount) && amount > 0 ? Object.freeze({ kind, amount }) : null;
      })
      .filter((r): r is QuestReward => r !== null);

    console.log(`${LOG} claim_server_ok quest=${questId} rewards=${JSON.stringify(rewards)} already=${response.data?.alreadyClaimed === true} tookMs=${Date.now() - startedAtMs}`);

    await applyQuestRewards(questId, rewards, token);

    const latest = peekActiveQuest();
    if (latest && latest.questId === questId) {
      patchCachedQuest(Object.freeze({ ...latest, phase: 'claimed' }));
    }
    invalidateQuestCache();
    return Object.freeze({ status: 'claimed', rewards });
  } catch (error) {
    const raw = String(error);
    const reason = raw.includes('quest_expired') ? 'quest_expired'
      : raw.includes('quest_not_complete') ? 'quest_not_complete'
      : raw.includes('quest_not_found') ? 'quest_not_found'
      : 'network_error';
    const messageRu = reason === 'quest_expired' ? 'Срок задания вышел — награда сгорела.'
      : reason === 'quest_not_complete' ? 'Задание ещё не выполнено.'
      : reason === 'quest_not_found' ? 'Задание больше не доступно.'
      : 'Не удалось забрать награду. Проверьте связь и попробуйте снова.';
    console.warn(`${LOG} claim_failed quest=${questId} reason=${reason} raw=${raw} tookMs=${Date.now() - startedAtMs}`);
    DebugLogger.warn('quests:claim_failed', `${questId}:${reason}`);
    return Object.freeze({ status: 'failed', reason, messageRu });
  }
}

/* expo-router route shim: utility module, not a screen */
export default function __RouteShim() { return null; }
