// ═══════════════════════════════════════════════════════════════════════════
// spire_ghost_flag.ts — выключатель «призрака друга» на ступени Пика (ТЗ spire-engagement-2026-10-25.md §3а).
//
// зачем (координатор 25.10; решение владельца: среднее время друга из уже загруженной комнаты): функция новая и меняет экран ступени,
// поэтому она за флагом и по умолчанию ВЫКЛЮЧЕНА — выключено = ступень 2.0.2 без единой разницы. Включить в релизе — заменить false
// на true ОДНОЙ строкой по слову координатора; для кадров Сверки в dev-сборке есть переключатель `dev_state?spireGhost=on|off`.
// Отдельный крошечный модуль: его читают экран ступени и итог, остальной Пик сюда не тянется.
// ═══════════════════════════════════════════════════════════════════════════
export const SPIRE_GHOST_ENABLED: boolean = false;

// ВЛАДЕЛЕЦ 29.10 ~09:30 («Да, проба на 2 недели»): призрак друга виден ПОЛОВИНЕ людей. Пока флаг «Пульта» ghost_friend_ab выключен (по умолчанию) — не виден никому,
// ровно как раньше. Включил владелец → видят те, чья корзина «a»; корзина считается из стабильного id аккаунта (без чтений: id в памяти, флаг уже приехал с remote_config).
import { captureAccountGeneration } from '../../app/account_generation';
import { getRemoteBool } from '../../app/remote_flags';

export const SPIRE_GHOST_AB_FLAG_KEY = 'ghost_friend_ab' as const;
/** a — призрак показывается; b — не показывается. */
export type SpireGhostBucket = 'a' | 'b';

/**
 * Корзина пробы: FNV-1a (32 бита) от строки `ghost_friend_ab:v1:<stableId>`, чётный хеш → «a» (показываем), нечётный → «b». Детерминирована: аналитик пересчитает корзину
 * любого uid той же формулой (docs/work/spire-ghost-ab-2026-10-29.md). Нет id — null (в пробу не попадает).
 */
export function spireGhostBucket(stableId: string | null | undefined): SpireGhostBucket | null {
  if (!stableId) return null;
  let hash = 0x811c9dc5;
  const text = `${SPIRE_GHOST_AB_FLAG_KEY}:v1:${stableId}`;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash % 2 === 0 ? 'a' : 'b';
}

export type SpireGhostDecision = Readonly<{
  shown: boolean;
  /** dev_override — подмена Сверки; constant — код включил для всех; experiment — проба 50/50; experiment_off — флаг «Пульта» выкл; no_uid — id аккаунта ещё нет. */
  source: 'dev_override' | 'constant' | 'experiment' | 'experiment_off' | 'no_uid';
  bucket: SpireGhostBucket | null;
  flagOn: boolean;
}>;

// зачем: dev-сборка проверяется в момент вызова, а не при загрузке модуля — так подмену можно проверить тестом
const isDev = (): boolean => typeof __DEV__ !== 'undefined' && __DEV__ === true;
let devOverride: boolean | null = null;

/** dev_state?spireGhost=on|off — только dev-сборка; в сторе всегда отказ (флаг решает константа выше). */
export function setDevSpireGhostOverride(value: boolean | null): boolean {
  if (!isDev()) {
    console.warn('[DEV-STATE] spireGhost: отклонено — не dev-сборка', { value }); // guard-ok: ранний выход логируется
    return false;
  }
  devOverride = value;
  console.log(value === null ? '[DEV-STATE] spireGhost override=off' : `[DEV-STATE] spireGhost override=${value ? 'on' : 'off'}`); // guard-ok: единичный лог на ссылку
  return true;
}

/** Решение с причиной: подмена dev → константа → флаг «Пульта» + корзина. stableId можно подать явно (тесты); иначе берётся из памяти аккаунта. */
export function spireGhostDecision(stableId?: string | null): SpireGhostDecision {
  if (isDev() && devOverride !== null) return { shown: devOverride, source: 'dev_override', bucket: null, flagOn: false };
  if (SPIRE_GHOST_ENABLED) return { shown: true, source: 'constant', bucket: null, flagOn: false };
  const flagOn = getRemoteBool(SPIRE_GHOST_AB_FLAG_KEY);
  if (!flagOn) return { shown: false, source: 'experiment_off', bucket: null, flagOn };
  const id = stableId === undefined ? captureAccountGeneration().stableId : stableId;
  const bucket = spireGhostBucket(id);
  if (bucket === null) return { shown: false, source: 'no_uid', bucket: null, flagOn };
  return { shown: bucket === 'a', source: 'experiment', bucket, flagOn };
}

/** Показывать ли призрака: проба «Пульта» по корзине аккаунта, а в dev-сборке — ещё и подмена для Сверки. */
export function spireGhostEnabled(): boolean {
  return spireGhostDecision().shown;
}
