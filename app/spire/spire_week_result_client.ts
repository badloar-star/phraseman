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
import { DebugLogger } from '../debug-logger';
import type { SpireLiveGate } from './spire_live_gate';
import { spireErrorText, spireFirestore } from './spire_net';
import { spireReadParticipation } from './spire_room_client';

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
}>;

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
    placeCoins: Math.max(0, n(coins.place)),
    promotionCoins: Math.max(0, n(coins.promotion)),
  };
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
): Promise<SpireWeekResultView | null> {
  const nowMs = Date.now();
  const prevWeek = spirePreviousWeekKey(nowMs);
  const row = await readRow(input.uid, input.lang);
  // зачем (владелец 13.10, «ЗАЧЕМ ТУТ КРЕСТИК?»): карточка показывается при ПЕРВОМ входе в Пик на новой неделе и при следующем входе уже нет. Отметка «показано»
  // — локально по weekId+uid+язык (state 'dismissed'), без записей в Firestore; ставится сразу, как только решили показать (markShown). Лог [SPIRE-WEEK-CARD].
  const logCard = (decision: 'shown' | 'skip', why: string): void => DebugLogger.info(LOG, `[SPIRE-WEEK-CARD] weekId=${prevWeek} lang=${input.lang} ${decision}: ${why}`);
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
      await markShown();
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
      await markShown();
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
