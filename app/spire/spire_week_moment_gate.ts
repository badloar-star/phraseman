// ═══════════════════════════════════════════════════════════════════════════
// spire_week_moment_gate.ts — D191 этап 2: «показать ли окно итога недели сейчас».
//
// зачем (владелец 14.10, D191): окно «повышение / удержался / понижение» (m01–m03) — при ПЕРВОМ открытии после
// закрытия недели (пн 00:01 UTC), поверх Главной, раньше всех окон, ровно 1 раз за неделю, только игравшим в Пике.
// Здесь только логика; вид — components/spire/moments (Дизайн), слот в очереди окон — use_spire_week_moment.ts.
//
// Firebase-экономия: итог берётся тем же загрузчиком spireLoadWeekResult в режиме «только посмотреть» — кэш 'found'
// (его кладёт проба D191 на Главной) → 0 чтений; нет в кэше → ОДИН документ по id; не игравшие → 0 чтений.
// Отметка «показано» — локально (id недели), ставится, когда окно реально получило слот, а не при решении.
// Неделя считается по UTC, как у сервера — часовой пояс устройства на решение не влияет.
// Лог: [D191-GATE] — каждое ветвление и каждый ранний выход со значением, которое его решило.
// ═══════════════════════════════════════════════════════════════════════════
import AsyncStorage from '@react-native-async-storage/async-storage';
import { asSpireLang } from '../../components/spire/spire_home_week';
import type { SpireLang } from '../../modules/spire/report_queue';
import { spireWeekStartMs } from '../../modules/spire/residents';
import { recordSpireWeekStory } from '../../modules/story_events/story_event_sources';
import { DebugLogger } from '../debug-logger';
import { readMomentsV3Flag } from '../moments_v3_flag_read';
import { getDevSpireWeekResultOverride } from '../dev_spire_tier';
import { spireOpenLiveGate } from './spire_live_gate';
import { spireUiLangDecision } from './spire_ui_lang_gate';
import { spireLoadWeekResult, spirePreviousWeekKey, type SpireWeekResultView } from './spire_week_result_client';

const TAG = '[D191-GATE]';
const SHOWN_PREFIX = 'spire_week_moment_shown_v1';
/** «пн 00:01 UTC»: первая минута новой недели — крон итога ещё работает, окно не предлагаем. */
export const SPIRE_WEEK_MOMENT_GRACE_MS = 60_000;
// зачем: съёмка окна на эмуляторе без правки remote-конфига; только dev-сборка, в релизе игнорируется.

export type SpireWeekMomentOutcome = 'promoted' | 'stayed' | 'demoted';

export type SpireWeekMomentInput = Readonly<{ uiLang: string; studyTarget: string; tabEnabled: boolean; nowMs?: number }>;

export type SpireWeekMomentShow = Readonly<{
  show: true;
  uid: string;
  lang: SpireLang;
  weekId: string;
  outcome: SpireWeekMomentOutcome;
  result: SpireWeekResultView;
  /** m01 вариант B «Короткая: для повторных повышений» — это не первое повышение человека (см. spireIsRepeatPromotion). Гейт задаёт всегда; необязательно для тестовых заготовок. */
  isRepeatPromotion?: boolean;
}>;

/**
 * Повышение не первое: ушёл вверх из лиги ≥ 1. Лига стартует с 0 — кто поднимается из 1+, уже повышался раньше.
 * зачем (координатор 15.10, Дизайн переносит m01 вариант B): признак из того же итога недели — 0 чтений, без истории.
 * Случай «вылетел обратно на 0 и снова поднялся» считается первым — координатор принял это допущение.
 */
export function spireIsRepeatPromotion(result: Pick<SpireWeekResultView, 'promoted' | 'prevTier'>): boolean {
  return result.promoted === true && result.prevTier >= 1;
}

export type SpireWeekMomentSkipReason =
  | 'flag_off' | 'tab_off' | 'ui_lang' | 'study_lang' | 'no_uid' | 'week_not_closed' | 'already_shown'
  | 'in_progress' | 'gate_closed' | 'no_result' | 'failed';

export type SpireWeekMomentDecision = SpireWeekMomentShow | Readonly<{ show: false; reason: SpireWeekMomentSkipReason }>;

const log = (msg: string): void => DebugLogger.info('[SPIRE]', `${TAG} ${msg}`);
const shownKeyOf = (uid: string, lang: SpireLang): string => `${SHOWN_PREFIX}:${uid}:${lang}`;

/** Чистое решение по времени: неделя закрыта и итог этой недели ещё не показывали. */
export function decideSpireWeekMomentTiming(
  nowMs: number,
  shownWeekId: string | null,
): Readonly<{ ok: true; weekId: string } | { ok: false; reason: 'week_not_closed' | 'already_shown'; weekId: string }> {
  const weekId = spirePreviousWeekKey(nowMs);
  const sinceClose = nowMs - spireWeekStartMs(nowMs);
  if (sinceClose < SPIRE_WEEK_MOMENT_GRACE_MS) return { ok: false, reason: 'week_not_closed', weekId };
  if (shownWeekId === weekId) return { ok: false, reason: 'already_shown', weekId };
  return { ok: true, weekId };
}

export function spireWeekMomentOutcome(result: SpireWeekResultView): SpireWeekMomentOutcome {
  return result.promoted ? 'promoted' : result.demoted ? 'demoted' : 'stayed';
}

// зачем (координатор 15.10): одно чтение и одно правило флага для всех ворот — app/moments_v3_flag_read.ts (ключа нет → включено, явный false → выключено, dev-переключатель).
async function readMomentsFlag(): Promise<boolean> {
  const on = await readMomentsV3Flag('spire_week');
  log(`флаг moments_v3: ${String(on)}`);
  return on;
}

async function readShownWeek(uid: string, lang: SpireLang): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(shownKeyOf(uid, lang));
  } catch (error) {
    // Не прочитали отметку — считаем «не показывали»: худший случай — окно ещё раз, а не потеря итога.
    log(`отметка «показано» не прочиталась (${String(error).slice(0, 120)}) — считаем, что не показывали`);
    return null;
  }
}

// Защита от двух решений подряд в одном процессе (два открытия Главной, пока первое ещё решает).
let inFlightKey: string | null = null;

/** Решить, показывать ли окно итога недели сейчас. Ничего не помечает — отметка ставится при реальном показе. */
export async function resolveSpireWeekMoment(input: SpireWeekMomentInput): Promise<SpireWeekMomentDecision> {
  const nowMs = input.nowMs ?? Date.now();
  log(`вход ui=${input.uiLang} study=${input.studyTarget} tab=${String(input.tabEnabled)} now=${new Date(nowMs).toISOString()}`);
  if (!(await readMomentsFlag())) { log('не показываем: флаг moments_v3 выключен'); return { show: false, reason: 'flag_off' }; }
  if (!input.tabEnabled) { log('не показываем: вкладка Пика выключена (spire_tab_enabled)'); return { show: false, reason: 'tab_off' }; }
  const ui = spireUiLangDecision(input.uiLang);
  if (!ui.allowed) { log(`не показываем: язык интерфейса ${input.uiLang} — Пика нет (${ui.reason})`); return { show: false, reason: 'ui_lang' }; }
  const lang = asSpireLang(input.studyTarget);
  if (!lang) { log(`не показываем: язык изучения ${input.studyTarget} — не язык Пика`); return { show: false, reason: 'study_lang' }; }
  const { getCanonicalUserId } = await import('../user_id_policy');
  const uid = await getCanonicalUserId();
  if (!uid) { log('не показываем: нет uid'); return { show: false, reason: 'no_uid' }; }
  // зачем (координатор 15.10, сценарий Сверки моментов v3): итог недели с сервера бывает раз в неделю — на эмуляторе окно D191 не вызвать.
  // dev_state?spireWeek=up|stay|down|top|marble|obsidian подставляет готовый итог макета: без сети, без проверки времени. Только dev-сборка —
  // в стор-сборке getDevSpireWeekResultOverride() всегда null, ветка мёртвая. Флаг, вкладка и языки выше проверяются как в бою.
  const devResult = getDevSpireWeekResultOverride();
  if (devResult) {
    const devOutcome = spireWeekMomentOutcome(devResult);
    log(`ПОКАЗЫВАЕМ (dev spireWeek): outcome=${devOutcome} tier ${devResult.prevTier}→${devResult.newTier} место=${devResult.roomRank}/${devResult.roomTotal}`);
    return { show: true, uid, lang, weekId: devResult.weekId, outcome: devOutcome, result: devResult, isRepeatPromotion: spireIsRepeatPromotion(devResult) };
  }
  const shownWeek = await readShownWeek(uid, lang);
  const timing = decideSpireWeekMomentTiming(nowMs, shownWeek);
  if (!timing.ok) {
    log(`не показываем: ${timing.reason} weekId=${timing.weekId} отмечено=${shownWeek ?? '—'} сЗакрытия=${nowMs - spireWeekStartMs(nowMs)}мс`);
    return { show: false, reason: timing.reason };
  }
  const flightKey = `${uid}:${lang}:${timing.weekId}`;
  if (inFlightKey === flightKey) { log(`не показываем: решение по ${timing.weekId} уже идёт в этом запуске`); return { show: false, reason: 'in_progress' }; }
  inFlightKey = flightKey;
  try {
    const configClient = await import('../spire_config_client');
    const warmed = await configClient.warmSpireConfigFromDisk();
    const gate = spireOpenLiveGate(configClient.peekSpireConfig(), 'home_week_moment');
    if (!gate) { log(`не показываем: ворота Пика закрыты (конфиг ${String(warmed)})`); return { show: false, reason: 'gate_closed' }; }
    const result = await spireLoadWeekResult(gate, { uid, lang }, { markShown: false, where: 'home_week_moment' });
    if (!result) {
      log(`не показываем: итога ${timing.weekId} нет (не играл / крон ещё не подвёл / уже видел карточку в Пике) lang=${lang}`);
      return { show: false, reason: 'no_result' };
    }
    const outcome = spireWeekMomentOutcome(result);
    const isRepeatPromotion = spireIsRepeatPromotion(result);
    log(`ПОКАЗЫВАЕМ: weekId=${result.weekId} lang=${lang} outcome=${outcome} tier ${result.prevTier}→${result.newTier} место=${result.roomRank}/${result.roomTotal} повторное=${String(isRepeatPromotion)}`);
    return { show: true, uid, lang, weekId: result.weekId, outcome, result, isRepeatPromotion };
  } catch (error) {
    log(`не показываем: сбой (${error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)})`);
    return { show: false, reason: 'failed' };
  } finally {
    inFlightKey = null;
  }
}

/** Окно реально получило слот: больше на этой неделе не показываем; история итога недели ложится в сторис непросмотренной. */
export async function markSpireWeekMomentShown(decision: SpireWeekMomentShow): Promise<void> {
  try {
    await AsyncStorage.setItem(shownKeyOf(decision.uid, decision.lang), decision.weekId);
    log(`показано: отметка ${decision.weekId} lang=${decision.lang} записана`);
  } catch (error) {
    log(`показано, но отметка не записалась (${String(error).slice(0, 120)}) — при следующем открытии окно может повториться`);
  }
  // зачем (координатор 15.10, R21): раньше окно D191 помечало историю просмотренной — итог недели (понедельник 19.10) не зажигал
  // кольцо. Теперь окно и кольцо независимы: пишем историю как обычный факт (повтор уже записанного — тихий дубль).
  log(`показано: история итога недели ${decision.weekId} → сторис непросмотренной`);
  void recordSpireWeekStory(decision.result);
}

export function __resetSpireWeekMomentGateForTests(): void {
  inFlightKey = null;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
