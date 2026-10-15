// ═══════════════════════════════════════════════════════════════════════════
// spire_week_result_client.ts — «Итог недели» Шпиля: одно чтение
// users/{uid}/spire_week_results/{прошлая неделя}_{lang} (пакет E, макет §9).
//
// зачем (владелец, фундамент «празднование не durable»): итог недели показываем
// ФАКТОМ — документом, который записал spireFinalizeCron, а не локальным
// пересчётом и не отложенной записью «надо показать». Карточка живёт на главном
// экране Шпиля, закрывается крестиком; «закрыто» — единственное, что хранится.
//
// Firebase-экономия:
//   • читаем только если человек сидел в комнате ПРОШЛОЙ недели этого языка
//     (spire_participation_v1) — не игравшие не тратят ни одного чтения;
//   • нашли → больше не читаем до следующей недели (кэш на устройстве);
//   • не нашли (крон ещё не прошёл) → повтор не чаще раза в 6 часов, а после
//     вторника 00:00 UTC — больше не спрашиваем (итог уже не появится).
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { SpireLang } from '../../modules/spire/report_queue';
import { spireWeekStartMs } from '../../modules/spire/residents';
import { spireCurrentWeekKey } from '../../components/spire/spire_tower_model';
import { captureAccountGeneration, type AccountGenerationToken } from '../account_generation';
import { DebugLogger } from '../debug-logger';
import type { SpireLiveGate } from './spire_live_gate';
import { spireErrorText, spireFirestore } from './spire_net';
import { spireReadParticipation } from './spire_room_client';
import { recordSpireWeekStory } from '../../modules/story_events/story_event_sources';

const LOG = '[SPIRE]';
const CACHE_PREFIX = 'spire_week_result_v1';
const RECHECK_MS = 6 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
/** После этого срока от начала недели итог прошлой недели уже точно подведён. */
const GIVE_UP_AFTER_WEEK_START_MS = DAY_MS;

export type SpireWeekResultView = Readonly<{
  weekId: string;
  lang: SpireLang;
  steps: number;
  roomRank: number;
  roomTotal: number;
  promoted: boolean;
  demoted: boolean;
  prevTier: number;
  newTier: number;
  placeCoins: number;
  promotionCoins: number;
  /** D162: чем решалось место (итог сервера); старые итоги — 'steps'. */
  rankBy?: 'steps' | 'coins';
  /** D162: монеты недели по журналу (с потолком); старые итоги — 0. */
  weekCoins?: number;
  /** D191: лестница комнаты для окна m01 (до 6 строк, «я» среди них); нет поля (старые итоги, до выкладки 17.10) — undefined. */
  ladder?: readonly SpireWeekLadderRowView[];
  /** D191: монеты последнего в зоне повышения (режим монет) — для m02 «сколько не хватило»; нет — undefined. */
  promotionLineCoins?: number;
  /** Статус выплаты крона (paid / pending_wallet / none…); только для журнала. Монеты места/повышения выше — уже 0, если не 'paid'. */
  rewardStatus?: string;
  /** Снимок кошелька после выплаты (крон с 17.10); нет — старый итог или выплата не прошла. */
  walletAfter?: SpireWeekWalletView;
}>;

export type SpireWeekWalletView = Readonly<{ stars: number; earnedTotal: number; seq: number; paidCoins: number }>;

/** Снимок кошелька из итога: только при paid и только целые неотрицательные числа, seq > 0; иначе undefined (вливать нечего). */
function decodeWallet(d: Record<string, unknown>): SpireWeekWalletView | undefined {
  if (d.rewardStatus !== 'paid') return undefined;
  const [stars, earnedTotal, seq, paidCoins] = [d.starsBalanceAfter, d.starsEarnedTotalAfter, d.starsSeq, d.rewardPaidCoins].map(Number);
  if (![stars, earnedTotal, seq].every((v) => Number.isSafeInteger(v) && v >= 0) || seq === 0) return undefined;
  return { stars, earnedTotal, seq, paidCoins: Number.isSafeInteger(paidCoins) && paidCoins > 0 ? paidCoins : 0 };
}

export type SpireWeekLadderRowView = Readonly<{ place: number; name: string; coinRank: number | null; coins: number; isMe: boolean; removed?: true }>;

/** Подпись строки удалённого аккаунта — то же нейтральное имя без языка, что у заглушек друзей (friends.tsx). */
export const SPIRE_LADDER_REMOVED_NAME = 'Phraseman';

/** D191: строки лестницы из документа крона; битые строки пропускаем, пустой список = поля нет. */
function decodeLadder(raw: unknown): readonly SpireWeekLadderRowView[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rows: SpireWeekLadderRowView[] = [];
  for (const item of raw.slice(0, 6)) {
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    // зачем: Number(null) = 0 — пустой ранг (базовая монета) стал бы «ранг 0»; берём только настоящее целое 0…19.
    const rank = typeof r.coinRank === 'number' ? r.coinRank : NaN;
    // зачем (координатор 15.10, политика §5): участник удалил аккаунт — сервер стёр имя и ранг ([D189-LADDER-SCRUB]); показываем
    // нейтральное имя и базовую монету, место и монеты остаются. Строка «я» удалённой не бывает (свой итог удаляется целиком).
    const removed = r.removed === true && r.isMe !== true;
    rows.push({
      place: Math.max(1, n(r.place)),
      name: removed ? SPIRE_LADDER_REMOVED_NAME : typeof r.name === 'string' ? r.name.slice(0, 48) : '',
      coinRank: !removed && Number.isInteger(rank) && rank >= 0 && rank <= 19 ? rank : null,
      coins: Math.max(0, n(r.coins)),
      isMe: r.isMe === true,
      ...(removed ? { removed: true as const } : {}),
    });
  }
  return rows.length > 0 ? rows : undefined;
}

type CacheRow = Readonly<{
  weekId: string;
  state: 'found' | 'absent' | 'dismissed';
  checkedAtMs: number;
  result: SpireWeekResultView | null;
}>;

const keyOf = (uid: string, lang: SpireLang) => `${CACHE_PREFIX}:${uid}:${lang}`;

function n(value: unknown): number {
  const x = Number(value);
  return Number.isFinite(x) ? Math.trunc(x) : 0;
}

/** Документ крона → то, что нужно карточке. Поля — SpireMemberWeekResult (spire_finalize_core.ts). */
export function spireDecodeWeekResult(raw: unknown, weekId: string, lang: SpireLang): SpireWeekResultView | null {
  if (!raw || typeof raw !== 'object') return null;
  const d = raw as Record<string, unknown>;
  if (d.schema !== 'spire-week-result.v1') return null;
  const coins = (d.rewardCoins && typeof d.rewardCoins === 'object' ? d.rewardCoins : {}) as Record<string, unknown>;
  // зачем (координатор 15.10, аудит Optimistic UI): «+N монет» (окно m01, карточка итога, сторис) — только если монеты РЕАЛЬНО
  // пришли в кошелёк (rewardStatus 'paid'). pending_wallet / отказ журнала → строки нет: нельзя хвалить монетами, которых нет в шапке.
  const rewardPaid = d.rewardStatus === 'paid';
  const wallet = decodeWallet(d);
  return {
    weekId,
    lang,
    steps: Math.max(0, n(d.steps)),
    roomRank: Math.max(0, n(d.roomRank)),
    roomTotal: Math.max(0, n(d.roomTotal)),
    promoted: d.promoted === true, // guard-ok: только показ итога, который решил сервер (крон)
    demoted: d.demoted === true, // guard-ok: только показ итога, который решил сервер (крон)
    prevTier: Math.max(0, n(d.prevTier)), // guard-ok: чтение для карточки, клиент ничего не пишет
    newTier: Math.max(0, n(d.newTier)), // guard-ok: чтение для карточки, клиент ничего не пишет
    placeCoins: rewardPaid ? Math.max(0, n(coins.place)) : 0,
    promotionCoins: rewardPaid ? Math.max(0, n(coins.promotion)) : 0,
    rewardStatus: typeof d.rewardStatus === 'string' ? d.rewardStatus.slice(0, 32) : 'none_field',
    rankBy: d.rankBy === 'coins' ? 'coins' : 'steps', // guard-ok: показ решения сервера (D162)
    weekCoins: Math.max(0, n(d.weekCoins)),
    // зачем (D191, координатор 14.10): клиент рисует лестницу / разрыв до топ-5 ТОЛЬКО если поля пришли — старые итоги без них.
    ...(decodeLadder(d.ladder) ? { ladder: decodeLadder(d.ladder) } : {}),
    ...(typeof d.promotionLineCoins === 'number' && Number.isFinite(d.promotionLineCoins) ? { promotionLineCoins: Math.max(0, n(d.promotionLineCoins)) } : {}),
    ...(wallet ? { walletAfter: wallet } : {}),
  };
}

/** Уже влитые снимки в этом процессе: загрузчик зовут три места (Пик, окно D191, проба) — вливаем один раз. */
const mergedWallets = new Set<string>();

/**
 * Снимок кошелька из итога недели → баланс шапки.
 * зачем (координатор 15.10, аудит Optimistic UI): выплата крона за место/повышение лежала на сервере, а шапка её не видела
 * до следующего урока — окно говорило «+100», баланс стоял. Вливаем ЕДИНСТВЕННЫМ каналом серверных снимков
 * (mergeLevelSpinServerStars): он берёт только более новый starsSeq и не трогает непогашенные локальные операции, поэтому
 * старый итог не затрёт свежий баланс, а повтор не удвоит монеты. Аккаунт сменился → не вливаем (token захвачен до чтения).
 */
async function mergeWeekWallet(token: AccountGenerationToken, uid: string, result: SpireWeekResultView | null, where: string): Promise<void> {
  if (!result) return;
  const tag = `[SPIRE-WEEK-WALLET] where=${where} weekId=${result.weekId} lang=${result.lang} rewardStatus=${result.rewardStatus ?? 'кэш_до_15.10'}`; // guard-ok: префикс строки журнала, не интерфейс
  const w = result.walletAfter;
  if (!w) { DebugLogger.info(LOG, `${tag} skip: снимка кошелька в итоге нет — баланс догонит квитанция урока/карточек`); return; }
  const key = `${uid}:${result.weekId}:${result.lang}:${w.seq}`;
  if (mergedWallets.has(key)) { DebugLogger.info(LOG, `${tag} skip: снимок seq=${w.seq} уже влит в этом запуске`); return; }
  if (token.stableId?.trim() !== uid) { DebugLogger.warn(LOG, `${tag} skip: аккаунт не совпал (token=${token.stableId ? token.stableId.slice(0, 8) : 'нет'} uid=${uid.slice(0, 8)})`); return; }
  mergedWallets.add(key); // guard-ok: метка процесса в памяти, не данные пользователя
  try {
    const grants = await import('../level_spin_star_grants');
    const visible = await grants.mergeLevelSpinServerStars(token, { stars: w.stars, starsEarnedTotal: w.earnedTotal, starsSeq: w.seq, serverCreditedDelta: w.paidCoins });
    DebugLogger.info(LOG, `${tag} merged: снимок stars=${w.stars} seq=${w.seq} выплата=${w.paidCoins} → видимый баланс=${visible.balance}`);
  } catch (error) {
    mergedWallets.delete(key);
    DebugLogger.warn(LOG, `${tag} catch: не влили (${spireErrorText(error)}) — повтор при следующем заходе`);
  }
}

async function readRow(uid: string, lang: SpireLang): Promise<CacheRow | null> {
  try {
    const raw = await AsyncStorage.getItem(keyOf(uid, lang));
    return raw ? (JSON.parse(raw) as CacheRow) : null;
  } catch (error) {
    DebugLogger.warn(LOG, `week result: кэш не прочитался (${spireErrorText(error)})`);
    return null;
  }
}

async function writeRow(uid: string, lang: SpireLang, row: CacheRow): Promise<void> {
  try {
    await AsyncStorage.setItem(keyOf(uid, lang), JSON.stringify(row));
  } catch (error) {
    DebugLogger.warn(LOG, `week result: кэш не сохранился (${spireErrorText(error)})`);
  }
}

/** Прошлая ISO-неделя относительно nowMs. */
export function spirePreviousWeekKey(nowMs: number): string {
  return spireCurrentWeekKey(spireWeekStartMs(nowMs) - DAY_MS);
}

/** Итог прошлой недели для карточки или null (не играл / закрыт / ещё не подведён). */
export async function spireLoadWeekResult(
  gate: SpireLiveGate,
  input: Readonly<{ uid: string; lang: SpireLang }>,
  // зачем (D191, координатор 14.10): Главная зовёт загрузчик «только посмотреть» (markShown: false) — узнать и записать в журнал,
  // КОГДА показали бы окно итога, не показывая его и не ставя «показано» (иначе карточка в Пике пропала бы). Найденный итог
  // кладётся в кэш как 'found' — Пик потом покажет его без сети.
  opts: Readonly<{ markShown?: boolean; where?: string }> = {},
): Promise<SpireWeekResultView | null> {
  const nowMs = Date.now();
  // зачем: аккаунт фиксируем ДО чтения — если он сменится, пока ждём сеть, снимок чужого кошелька не вольётся (merge сверит поколение).
  const accountToken = captureAccountGeneration();
  const prevWeek = spirePreviousWeekKey(nowMs);
  const shouldMark = opts.markShown !== false;
  const where = opts.where ?? 'spire';
  const row = await readRow(input.uid, input.lang);
  // зачем (владелец 13.10, «ЗАЧЕМ ТУТ КРЕСТИК?»): карточка показывается при ПЕРВОМ входе в Пик на новой неделе и при следующем входе уже нет. Отметка «показано»
  // — локально по weekId+uid+язык (state 'dismissed'), без записей в Firestore; ставится сразу, как только решили показать (markShown). Лог [SPIRE-WEEK-CARD].
  const logCard = (decision: 'shown' | 'skip', why: string): void => DebugLogger.info(LOG, `[SPIRE-WEEK-CARD] where=${where} weekId=${prevWeek} lang=${input.lang} ${shouldMark ? decision : `peek_${decision}`}: ${why}`);
  const markShown = async (): Promise<void> => {
    await writeRow(input.uid, input.lang, { weekId: prevWeek, state: 'dismissed', checkedAtMs: Date.now(), result: null });
    logCard('shown', 'отметка «показано» записана локально — при следующем входе карточки не будет');
  };
  if (row && row.weekId === prevWeek) {
    if (row.state === 'dismissed') {
      logCard('skip', 'уже показывалась при прошлом входе');
      return null;
    }
    if (row.state === 'found') {
      logCard('shown', `из кэша (promoted=${String(row.result?.promoted)} demoted=${String(row.result?.demoted)})`);
      void recordSpireWeekStory(row.result); // зачем (D192): факт → история у аватарки на Главной; за флагом stories_v1, без сети, поведение места не меняется.
      void mergeWeekWallet(accountToken, input.uid, row.result, where);
      if (shouldMark) await markShown();
      return row.result;
    }
    const giveUp = row.checkedAtMs - spireWeekStartMs(nowMs) > GIVE_UP_AFTER_WEEK_START_MS;
    if (giveUp || nowMs - row.checkedAtMs < RECHECK_MS) {
      logCard('skip', `итог не найден ранее (giveUp=${String(giveUp)} возраст=${nowMs - row.checkedAtMs}мс) — не читаем`);
      return null;
    }
  }
  const weeks = await spireReadParticipation(input.uid, input.lang);
  if (!weeks.includes(prevWeek)) {
    logCard('skip', `в комнате не сидел (недели=${weeks.join(',') || '—'}) — 0 чтений`);
    return null;
  }
  const db = spireFirestore(gate, 'week_result:get');
  if (!db) { logCard('skip', 'нет доступа к базе (gate)'); return null; }
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const snap = await (db as any).collection('users').doc(input.uid).collection('spire_week_results').doc(`${prevWeek}_${input.lang}`).get(); // guard-ok: один документ по id
    const result = snap?.exists ? spireDecodeWeekResult(snap.data(), prevWeek, input.lang) : null;
    DebugLogger.info(LOG, `week result: сеть ${prevWeek}_${input.lang} exists=${String(Boolean(snap?.exists))} разобран=${String(result !== null)}`);
    if (result) {
      logCard('shown', 'первый вход на новой неделе — итог прочитан с сервера');
      void recordSpireWeekStory(result); // зачем (D192): факт → история у аватарки на Главной; за флагом stories_v1, без сети, поведение места не меняется.
      void mergeWeekWallet(accountToken, input.uid, result, where);
      if (shouldMark) await markShown();
      else await writeRow(input.uid, input.lang, { weekId: prevWeek, state: 'found', checkedAtMs: nowMs, result });
    } else {
      logCard('skip', 'документа итога нет — повторим позже');
      await writeRow(input.uid, input.lang, { weekId: prevWeek, state: 'absent', checkedAtMs: nowMs, result: null });
    }
    return result;
  } catch (error) {
    logCard('skip', `чтение упало (${spireErrorText(error)}) — повторим при следующем заходе`);
    return null;
  }
}

/** Крестик на карточке: больше не показываем итог этой недели. Сеть не трогает. */
export async function spireDismissWeekResult(uid: string, lang: SpireLang, weekId: string): Promise<void> {
  DebugLogger.info(LOG, `week result: закрыт ${weekId}_${lang}`);
  await writeRow(uid, lang, { weekId, state: 'dismissed', checkedAtMs: Date.now(), result: null });
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
