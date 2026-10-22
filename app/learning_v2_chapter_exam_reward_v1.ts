// learning_v2_chapter_exam_reward_v1.ts — 40 монет за первую сдачу экзамена главы Learning V2.
// зачем (владелец 22.10 через координатора): награду «+40» НАЧИСЛЯТЬ по-настоящему, один раз на главу, через существующий
// серверный кошелёк (levelSpinStarGrant, квитанция на операцию — повтор не начисляет второй раз). Номинала 40 в кошельке нет,
// поэтому две операции stars_20: chapterexam_l<УУ>_c<Г>_1 и _2.
// зачем (закон владельца 22.10: «сервер для сохранения, а не решений — монеты выдаёт телефон»): фактом считается локальное
// начисление — операции записаны в журнал телефона и баланс уже вырос (enqueue публикует проекцию). Сервер лишь сохраняет:
// синк идёт фоном и не задерживает плашку «+40». Отказ сервера оставляет операции в очереди — дойдут при следующем синке.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { captureAccountGeneration } from './account_generation';

const LOG = '[COIN-WALLET]';

/** credited — записано на телефоне (баланс вырос); failed — локальная запись не удалась; skipped — нет активного аккаунта. */
export type ChapterExamRewardOutcomeV1 = 'credited' | 'failed' | 'skipped';

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
    console.log(`${LOG} chapter_exam:result`, JSON.stringify({ ...input, outcome: 'credited', source: 'local_journal' })); // guard-ok: итог — начислено на телефоне
    // сохранение на сервере — фоном; отказ сервера (coin_wallet_source_not_allowed и др.) печатает сам цикл синка
    void wallet.syncPendingLevelSpinStarGrants(token).then(async (sync) => {
      const raw = await AsyncStorage.getItem(wallet.levelSpinStarGrantOutboxKey(owner));
      const stillQueued = requestIds.filter((id) => (raw ?? '').includes(`level_spin:${id}.base`));
      console.log(`${LOG} chapter_exam:synced`, JSON.stringify({ ...input, synced: sync.synced, pending: sync.pending, stillQueued })); // guard-ok: что сохранил сервер
    }, (error: unknown) => {
      console.warn(`${LOG} chapter_exam:sync_failed`, JSON.stringify({ ...input, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину; операции остаются в очереди
    });
    return 'credited';
  } catch (error) {
    console.warn(`${LOG} chapter_exam:failed`, JSON.stringify({ ...input, reason: error instanceof Error ? error.message : String(error) })); // guard-ok: catch пишет причину
    return 'failed';
  }
}

export default function __RouteShim() { return null; }
