/**
 * Ворота Шпиля без 6-часового ожидания кэша.
 *
 * зачем (владелец 11.10: «ШПИЛЬ НЕМЕДЛЕННО ОПУБЛИКОВАТЬ!»; диагноз координатора по логу Metro): сервер включил Шпиль, а
 * клиент держал старое: `[SPIRE] tab flag: remote=false` из кэша рубильников (возраст 287 мин при TTL 360) и
 * `config/spire_v1` из своего кэша 6 ч → `config.enabled=false`. Перезапуск не помогал — оба кэша на диске.
 *
 * Правило: только когда ворота ЗАКРЫТЫ (вкладка скрыта или сервер «выключен» по кэшу) — один принудительный перечит, не
 * чаще раза в 60 секунд на устройство (память + диск). Открыто — ни одного лишнего чтения. Firebase-экономия: 1–2 чтения
 * на человека со скрытым Шпилем раз в 60 секунд, только при входе в раздел.
 * Логи: [SPIRE-GATE].
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DebugLogger } from './debug-logger';
import { refreshRemoteConfigNow } from './remote_config_client';
import { loadSpireConfig } from './spire_config_client';
import { isSpireTabEnabled, rereadSpireTabFlag, spireGateUiLang } from './spire_tab_flag';
import { spireUiLangDecision } from './spire/spire_ui_lang_gate';

// зачем (координатор 11.10): не чаще раза в 60 с — владелец ждёт «сейчас», а закрытые ворота бывают у немногих.
export const SPIRE_GATE_REFRESH_MIN_INTERVAL_MS = 60 * 1000;
const STORAGE_KEY = 'spire_gate_refresh_v1';
const LOG = '[SPIRE-GATE]';

type GateKind = 'tab' | 'config';
type Stamps = Partial<Record<GateKind, number>>;

let memoryStamps: Stamps | null = null;
const inFlight: Partial<Record<GateKind, Promise<boolean>>> = {};

/** Перечитывать ли: ворота закрыты и с прошлого перечита прошло ≥ 60 секунд. Чистая функция. */
export function shouldForceSpireGateRefresh(input: Readonly<{ open: boolean; lastMs: number | undefined; nowMs: number }>): {
  refresh: boolean;
  reason: 'open' | 'throttled' | 'due';
} {
  if (input.open) return { refresh: false, reason: 'open' };
  const last = Number(input.lastMs);
  if (Number.isFinite(last) && last > 0 && input.nowMs - last < SPIRE_GATE_REFRESH_MIN_INTERVAL_MS && input.nowMs >= last) {
    return { refresh: false, reason: 'throttled' };
  }
  return { refresh: true, reason: 'due' };
}

async function readStamps(): Promise<Stamps> {
  if (memoryStamps) return memoryStamps;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    memoryStamps = raw ? (JSON.parse(raw) as Stamps) : {};
  } catch (error) {
    DebugLogger.warn(LOG, `метки перечита не прочитались — считаем, что перечита не было (${String(error)})`);
    memoryStamps = {};
  }
  return memoryStamps;
}

async function writeStamp(kind: GateKind, nowMs: number): Promise<void> {
  const stamps = { ...(await readStamps()), [kind]: nowMs };
  memoryStamps = stamps;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stamps));
  } catch (error) {
    DebugLogger.warn(LOG, `метка перечита не сохранилась (${String(error)}) — троттлинг держится в памяти`);
  }
}

async function runGate(kind: GateKind, where: string, open: boolean, refresh: () => Promise<boolean>, force: boolean): Promise<boolean> {
  const nowMs = Date.now();
  const stamps = await readStamps();
  const decision = force ? { refresh: true, reason: 'due' as const } : shouldForceSpireGateRefresh({ open, lastMs: stamps[kind], nowMs });
  if (!decision.refresh) {
    DebugLogger.info(LOG, `${kind}: перечит не нужен (${decision.reason}) where=${where} lastAgoMin=${stamps[kind] ? Math.round((nowMs - stamps[kind]!) / 60_000) : 'никогда'}`);
    return open;
  }
  const pending = inFlight[kind];
  if (pending) return pending;
  DebugLogger.info(LOG, `${kind}: ворота закрыты — принудительный перечит (where=${where}, force=${String(force)})`);
  await writeStamp(kind, nowMs);
  const run = refresh()
    .then((openNow) => {
      DebugLogger.info(LOG, `${kind}: после перечита открыто=${String(openNow)} за ${Date.now() - nowMs} мс`);
      return openNow;
    })
    .catch((error: unknown) => {
      DebugLogger.warn(LOG, `${kind}: перечит не удался (${String(error)}) — остаёмся на кэше, следующий не раньше чем через 60 с`);
      return open;
    })
    .finally(() => {
      inFlight[kind] = undefined;
    });
  inFlight[kind] = run;
  return run;
}

/** Вкладка «Шпиль» скрыта по кэшу рубильников → перечитать `remote_config/app` (флаг вкладки обновится сам по событию). */
export function refreshSpireTabFlagIfClosed(where: string, options: { force?: boolean } = {}): Promise<boolean> {
  // зачем (владелец 11.10, Шпиль только ru/uk): при другом языке интерфейса вкладка закрыта языком, а не кэшем —
  // перечит рубильников её не откроет, а стоил бы чтение на каждый заход в «Сообщество».
  // зачем (координатор 12.10): «язык ещё неизвестен» — не отказ. Пропускаем перечит только при точно неподходящем
  // языке; при неизвестном перечит идёт, а вкладку откроет пересчёт замка, когда LangContext опубликует язык.
  const ui = spireGateUiLang();
  const langDecision = spireUiLangDecision(ui.lang);
  if (langDecision.reason === 'ui_lang_not_supported') {
    DebugLogger.info(LOG, `tab: перечит не нужен (${langDecision.reason}, lang=${String(langDecision.lang)}, source=${ui.source}) where=${where}`);
    return Promise.resolve(false);
  }
  if (langDecision.reason === 'ui_lang_unknown') {
    DebugLogger.info(LOG, `tab: язык интерфейса ещё неизвестен (source=${ui.source}) — перечит не отменяем, замок пересчитается при публикации языка where=${where}`);
  }
  return runGate('tab', where, isSpireTabEnabled(), async () => {
    await refreshRemoteConfigNow();
    return rereadSpireTabFlag();
  }, options.force === true);
}

/** Сервер Шпиля «выключен» по кэшу → перечитать `config/spire_v1`. Возвращает enabled после перечита. */
export function refreshSpireConfigIfLocked(where: string, enabledNow: boolean, options: { force?: boolean } = {}): Promise<boolean> {
  return runGate('config', where, enabledNow, async () => {
    const fresh = await loadSpireConfig({ force: true });
    return fresh.enabled === true;
  }, options.force === true);
}

/** Dev Hub: «Обновить рубильники сейчас» — оба перечита без троттлинга. */
export async function forceRefreshSpireGatesNow(): Promise<{ tab: boolean; config: boolean }> {
  const [tab, config] = await Promise.all([
    refreshSpireTabFlagIfClosed('dev_hub', { force: true }),
    refreshSpireConfigIfLocked('dev_hub', false, { force: true }),
  ]);
  DebugLogger.info(LOG, `dev_hub: рубильники обновлены — вкладка=${String(tab)} сервер=${String(config)}`);
  return { tab, config };
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
