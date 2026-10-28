// ═══════════════════════════════════════════════════════════════════════════
// story_poll_client.ts — голос в опросе объявления историй (шаблон «Опрос», макет stories-announcements-v1).
//
// зачем (координатор 28.10, по образцу app/home_polls/home_polls_v2_client.ts): показ НЕ ходит в сеть — свой выбор и проценты лежат на
// устройстве по владельцу и ревизии объявления; сеть — только голос по тапу (callable storyPollVote), в ответ приходят счётчики — их и
// показываем. Потолок ожидания 10 с; смена аккаунта во время голоса — ответ не применяется. Журнал [STORY-POLL]: вход, каждая ветка с
// причиной, сеть (что ушло, что вернулось, мс), итог.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { DebugLogger } from '../../app/debug-logger';
import { captureAccountGeneration, isCurrentAccountGeneration } from '../../app/account_generation';
import { withCallableTimeout } from '../../app/callable_timeout';
import { getCanonicalUserId } from '../../app/user_id_policy';
import { storyPollPercents } from '../../modules/story_events/story_announcements_contract';

const LOG = '[STORY-POLL]';
const REGION = 'us-central1';
const PREFIX = 'story_poll_v1';
export const STORY_POLL_VOTE_TIMEOUT_MS = 10_000;

export type StoryPollLocal = Readonly<{ myOption: number | null; percents: readonly number[] | null }>;
export type StoryPollVoteOutcome =
  | Readonly<{ ok: true; status: 'accepted' | 'already_answered'; percents: readonly number[] }>
  | Readonly<{ ok: false; reason: 'account_changed' | 'closed' | 'not_found' | 'invalid' | 'network' }>;

const EMPTY: StoryPollLocal = { myOption: null, percents: null };
const keyOf = (owner: string, id: string, revision: number): string => `${PREFIX}:${owner}:${id}:${revision}`;

async function ownerId(): Promise<string> {
  return (await getCanonicalUserId().catch((error: unknown) => {
    DebugLogger.info(LOG, `owner:unavailable ${error instanceof Error ? error.message : String(error)}`);
    return null;
  })) ?? '';
}

/** Свой выбор и проценты с диска (повторный показ без сети). Битая запись — пусто и лог. */
export async function readStoryPollLocal(id: string, revision: number): Promise<StoryPollLocal> {
  const owner = await ownerId();
  try {
    const raw = await AsyncStorage.getItem(keyOf(owner, id, revision));
    if (!raw) return EMPTY;
    const v = JSON.parse(raw) as { myOption?: unknown; percents?: unknown };
    const myOption = Number.isInteger(v.myOption) ? Number(v.myOption) : null;
    const percents = Array.isArray(v.percents) && v.percents.every((n) => typeof n === 'number') ? (v.percents as number[]) : null;
    DebugLogger.info(LOG, `local:read id=${id.slice(0, 8)} rev=${revision} myOption=${myOption ?? '—'} percents=${percents ? percents.join('/') : '—'}`);
    return { myOption, percents };
  } catch (error: unknown) {
    DebugLogger.info(LOG, `local:read_failed id=${id.slice(0, 8)} rev=${revision}: ${String(error)} — показываем без выбора`);
    return EMPTY;
  }
}

async function writeLocal(owner: string, id: string, revision: number, value: StoryPollLocal): Promise<void> {
  try {
    await AsyncStorage.setItem(keyOf(owner, id, revision), JSON.stringify(value));
  } catch (error: unknown) {
    DebugLogger.info(LOG, `local:write_failed id=${id.slice(0, 8)} rev=${revision}: ${String(error)} — повторный показ спросит сеть заново`);
  }
}

function classify(error: unknown): 'closed' | 'not_found' | 'invalid' | 'network' {
  const e = error as { code?: unknown; message?: unknown };
  const text = `${String(e?.code ?? '')} ${String(e?.message ?? '')}`.toLowerCase();
  if (text.includes('poll_closed')) return 'closed';
  if (text.includes('poll_not_found')) return 'not_found';
  if (text.includes('invalid')) return 'invalid';
  return 'network';
}

/** Голос по тапу: одна транзакция на сервере, в ответ — счётчики → проценты (сохраняются на устройстве). */
export async function voteStoryPoll(id: string, revision: number, option: number): Promise<StoryPollVoteOutcome> {
  const token = captureAccountGeneration();
  const owner = await ownerId();
  const t0 = Date.now();
  DebugLogger.info(LOG, `vote:send id=${id.slice(0, 8)} rev=${revision} option=${option}`);
  try {
    const fn = httpsCallable<{ id: string; revision: number; option: number }, { ok: boolean; status: 'accepted' | 'already_answered'; counts: number[]; voteCount: number }>(
      getFunctions(getApp(), REGION), 'storyPollVote',
    );
    const res = await withCallableTimeout(fn({ id, revision, option }), 'storyPollVote', STORY_POLL_VOTE_TIMEOUT_MS);
    if (!isCurrentAccountGeneration(token)) {
      DebugLogger.info(LOG, `vote:account_changed id=${id.slice(0, 8)} — ответ не применяем`);
      return { ok: false, reason: 'account_changed' };
    }
    const counts = Array.isArray(res.data?.counts) ? res.data.counts.map((n) => Number(n) || 0) : [];
    const percents = storyPollPercents(counts);
    DebugLogger.info(LOG, `vote:done id=${id.slice(0, 8)} status=${res.data?.status} counts=${counts.join('/')} percents=${percents.join('/')} ${Date.now() - t0} мс`);
    await writeLocal(owner, id, revision, { myOption: option, percents });
    return { ok: true, status: res.data?.status === 'already_answered' ? 'already_answered' : 'accepted', percents };
  } catch (error: unknown) {
    const reason = classify(error);
    DebugLogger.info(LOG, `vote:failed id=${id.slice(0, 8)} reason=${reason} ${Date.now() - t0} мс: ${String((error as { message?: unknown })?.message ?? error).slice(0, 120)}`);
    return { ok: false, reason };
  }
}
