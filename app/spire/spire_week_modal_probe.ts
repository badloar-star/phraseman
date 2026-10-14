// ═══════════════════════════════════════════════════════════════════════════
// spire_week_modal_probe.ts — D191, этап 1 (сборка 16.10): «когда показали бы окно итога недели» — только журнал.
//
// зачем (владелец 14.10, D191: окно «Повышение / понижение / удержался» — при ПЕРВОМ открытии приложения после закрытия
// недели, поверх Главной, раньше всех окон, 1 раз в неделю, только игравшим; координатор: в сборку 16.10 — ТОЛЬКО
// загрузчик на Главной после первого кадра и логи [SPIRE-WEEK-MODAL], без показа и без изменения арбитра оверлеев).
// Само окно — по анимированному образцу Макетов, через OTA до 26.10.
//
// Firebase-экономия: тот же загрузчик spireLoadWeekResult (≤1 чтение в неделю на игравшего, не игравшие — 0), режим
// «только посмотреть»: отметку «показано» не ставит, найденный итог кладёт в кэш — карточка в Пике потом без сети.
// ═══════════════════════════════════════════════════════════════════════════
import { DebugLogger } from '../debug-logger';
import { spireUiLangDecision } from './spire_ui_lang_gate';
import { spireOpenLiveGate } from './spire_live_gate';
import { spireLoadWeekResult } from './spire_week_result_client';
import { asSpireLang } from '../../components/spire/spire_home_week';

const TAG = '[SPIRE-WEEK-MODAL]';
let probedKey: string | null = null;

const log = (msg: string): void => DebugLogger.info('[SPIRE]', `${TAG} ${msg}`);

export type SpireWeekModalProbeInput = Readonly<{ uiLang: string; studyTarget: string; tabEnabled: boolean }>;

/** Один раз за процесс на пару «интерфейс+язык изучения» — после того, как дошли до загрузчика. */
export async function spireProbeWeekModal(input: SpireWeekModalProbeInput): Promise<void> {
  log(`вход ui=${input.uiLang} study=${input.studyTarget} tab=${String(input.tabEnabled)}`);
  if (!input.tabEnabled) { log('не показали бы: вкладка Пика выключена (spire_tab_enabled)'); return; }
  const ui = spireUiLangDecision(input.uiLang);
  if (!ui.allowed) { log(`не показали бы: язык интерфейса ${input.uiLang} — Пика нет (${ui.reason})`); return; }
  const lang = asSpireLang(input.studyTarget);
  if (!lang) { log(`не показали бы: язык изучения ${input.studyTarget} — не язык Пика`); return; }
  const key = `${input.uiLang}:${lang}`;
  if (probedKey === key) { log(`пропуск: уже проверяли в этом запуске (${key})`); return; }
  try {
    const configClient = await import('../spire_config_client');
    const warmed = await configClient.warmSpireConfigFromDisk();
    const gate = spireOpenLiveGate(configClient.peekSpireConfig(), 'home_week_modal');
    if (!gate) { log(`не показали бы: ворота Пика закрыты (конфиг ${warmed})`); return; }
    const { getCanonicalUserId } = await import('../user_id_policy');
    const uid = await getCanonicalUserId();
    if (!uid) { log('не показали бы: нет uid'); return; }
    probedKey = key;
    const result = await spireLoadWeekResult(gate, { uid, lang }, { markShown: false, where: 'home_week_modal' });
    if (!result) { log(`не показали бы: итога прошлой недели нет / уже показан / не играл (lang=${lang})`); return; }
    const outcome = result.promoted ? 'promoted' : result.demoted ? 'demoted' : 'stayed';
    log(`ПОКАЗАЛИ БЫ сейчас поверх Главной: weekId=${result.weekId} lang=${lang} outcome=${outcome} tier ${result.prevTier}→${result.newTier} rankBy=${result.rankBy ?? 'steps'} (окно не показываем до OTA, отметку «показано» не ставим)`);
  } catch (error) {
    log(`сбой пробы: ${error instanceof Error ? error.message.slice(0, 120) : String(error).slice(0, 120)}`);
  }
}

export function __resetSpireWeekModalProbeForTests(): void {
  probedKey = null;
}

/* expo-router route shim: модуль в app/ — не экран */
export default function __RouteShim() { return null; }
