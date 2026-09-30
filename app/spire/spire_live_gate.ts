// ═══════════════════════════════════════════════════════════════════════════
// spire_live_gate.ts — единственный ключ к сети игровой части Шпиля (пакеты B, D, E).
//
// зачем (владелец 30.09: «Шпиль — писать сейчас», но ЗА ФЛАГОМ): ни один сетевой
// вызов Шпиля (комната недели, пакет недели, итог недели, друзья, досылка очереди)
// не должен выполниться, пока (1) вкладка выключена флагом spire_tab_enabled и (2)
// config/spire_v1.enabled не включён владельцем. Сервер spireJoinRoom флаг сам НЕ
// проверяет (SPIRE_PLAN §3), поэтому замок обязан стоять на клиенте.
//
// Как устроено: каждая сетевая функция app/spire/* принимает SpireLiveGate
// первым аргументом. Тип «клеймёный» — получить его можно ТОЛЬКО через
// spireOpenLiveGate(), которая и проверяет оба замка. Забыть проверку при новом
// вызове физически нельзя: без ворот код не скомпилируется. Перед самой сетью
// функции ещё раз зовут spireGateStillOpen() — флаг могли выключить, пока экран
// был открыт.
// ═══════════════════════════════════════════════════════════════════════════
import type { SpireConfigDoc } from '../../modules/spire/config_contract';
import { DebugLogger } from '../debug-logger';
import { isSpireTabEnabled } from '../spire_tab_flag';

const LOG = '[SPIRE]';

declare const SPIRE_LIVE_BRAND: unique symbol;

/** Открытые ворота: оба замка проверены. Создаётся только spireOpenLiveGate. */
export type SpireLiveGate = Readonly<{
  readonly [SPIRE_LIVE_BRAND]: true;
  config: SpireConfigDoc;
  openedAtMs: number;
}>;

/**
 * Открыть ворота. null — хотя бы один замок закрыт (причина в логе).
 * where — кто спрашивает, чтобы по логу было видно, какой путь остановился.
 */
export function spireOpenLiveGate(config: SpireConfigDoc | null, where: string): SpireLiveGate | null {
  if (!isSpireTabEnabled()) {
    DebugLogger.info(LOG, `gate(${where}): закрыт — вкладка выключена (spire_tab_enabled=false, dev=off)`);
    return null;
  }
  if (!config) {
    DebugLogger.info(LOG, `gate(${where}): закрыт — config/spire_v1 ещё не прочитан`);
    return null;
  }
  if (config.enabled !== true) {
    DebugLogger.info(LOG, `gate(${where}): закрыт — config.enabled=${String(config.enabled)}`);
    return null;
  }
  return { config, openedAtMs: Date.now() } as unknown as SpireLiveGate;
}

/** Повторная проверка прямо перед сетью: флаг вкладки мог погаснуть за время жизни экрана. */
export function spireGateStillOpen(gate: SpireLiveGate, where: string): boolean {
  const open = isSpireTabEnabled() && gate.config.enabled === true;
  if (!open) DebugLogger.info(LOG, `gate(${where}): ворота закрылись во время работы — сеть не трогаем`);
  return open;
}

/* expo-router route shim */
export default function __RouteShim() { return null; }
