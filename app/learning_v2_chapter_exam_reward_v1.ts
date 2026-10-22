// learning_v2_chapter_exam_reward_v1.ts — 40 монет за первую сдачу экзамена главы Learning V2.
// зачем (владелец 22.10 через координатора): награду «+40» НАЧИСЛЯТЬ по-настоящему, один раз на главу, через существующий
// серверный кошелёк (levelSpinStarGrant, квитанция на операцию — повтор не начисляет второй раз). Номинала 40 в кошельке нет,
// поэтому две операции stars_20: chapterexam_l<УУ>_c<Г>_1 и _2. Плашку показываем ТОЛЬКО после факта: обе операции ушли из очереди
// (сервер подтвердил). Отказ сервера (например, политика ещё не выложена) — начисление остаётся в очереди и дойдёт позже, плашки нет.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration } from './account_generation';

const LOG = '[COIN-WALLET]';

export type ChapterExamRewardOutcomeV1 = 'credited' | 'pending' | 'skipped';

export function chapterExamRewardRequestIdsV1(lessonOrdinal: number, chapterOrdinal: number): readonly [string, string] {
  const base = `chapterexam_l${String(lessonOrdinal).padStart(2, '0')}_c${chapterOrdinal}`;
  return [`${base}_1`, `${base}_2`];
}

export async function grantChapterExamCoinsV1(input: Readonly<{ lessonOrdinal: number; chapterOrdinal: number }>): Promise<ChapterExamRewardOutcomeV1> {
  const token = captureAccountGeneration();
  const owner = token.phase === 'active' ? token.stableId?.trim() ?? null : null;
  const requestIds = chapterExamRewardRequestIdsV1(input.lessonOrdinal, input.chapterOrdinal);
  console.log(`${LOG} chapter_exam:enter`, JSON.stringify({ ...input, requestIds, phase: token.phase, hasOwner: owner !== null })); // guard-ok: вход
  if (!owner) {
    console.warn(`${LOG} chapter_exam:skip`, JSON.stringify({ reason: 'no_active_account', phase: token.phase })); // guard-ok: ранний выход
    return 'skipped';
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const wallet = require('./level_spin_star_grants') as typeof import('./level_spin_star_grants');
    for (const requestId of requestIds) {
      // зачем (Ревизор 22.10): без синка на каждую постановку — один проход синка ниже; иначе две части давали до трёх проходов к серверу
      await wallet.enqueueLevelSpinStarGrant({ token, requestId, lane: 'base', giftId: 'stars_20', promotionEligibility: 'gameplay' }, { syncNow: false });
    }
    const sync = await wallet.syncPendingLevelSpinStarGrants(token);
    const raw = await AsyncStorage.getItem(wallet.levelSpinStarGrantOutboxKey(owner));
    const pending = requestIds.filter((id) => (raw ?? '').includes(`level_spin:${id}.base`));
    const outcome: ChapterExamRewardOutcomeV1 = pending.length === 0 ? 'credited' : 'pending';
    // зачем: отказ сервера (coin_wallet_source_not_allowed и др.) печатает сам цикл синка; здесь — что осталось в очереди
    console.log(`${LOG} chapter_exam:result`, JSON.stringify({ ...input, outcome, pending, synced: sync.synced, stillQueued: sync.pending })); // guard-ok: итог
    return outcome;
  } catch (error) {
    console.warn(`${LOG} chapter_exam:failed`, JSON.stringify({ ...input, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
    return 'pending';
  }
}

export default function __RouteShim() { return null; }
