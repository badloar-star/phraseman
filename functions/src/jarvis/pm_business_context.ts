import { buildBusinessTierSnapshot } from './business_tier_snapshot';
import { readPeakTier, readRecentHistory, type RecentHistoryPoint } from './business_tier_history_store';

/**
 * Компактный проверяемый бизнес-контекст для PM-слоя Джарвиса.
 *
 * Он переиспользует уже рассчитанную business history и latest admin digest,
 * а не запускает ещё один аналитический/LLM-контур. В prompt уходят только
 * числовые агрегаты и серверные labels — никаких писем, жалоб и PII.
 */

export const JARVIS_PM_HISTORY_DAYS = 28;
export const JARVIS_PM_DIGEST_MAX_AGE_MS = 36 * 60 * 60 * 1_000;

export interface JarvisPmMetricDelta {
  readonly id: string;
  readonly label: string;
  readonly current: number;
  readonly previous: number;
  readonly absoluteDelta: number;
  readonly percentDelta: number | null;
  readonly direction: 'up' | 'down' | 'flat' | 'new';
}

export interface JarvisPmBusinessContext {
  readonly state: 'ready' | 'partial' | 'unavailable';
  readonly currentTier: string | null;
  readonly peakTier: string | null;
  readonly totalUsers: number | null;
  readonly activeUsers: number | null;
  readonly mrrUsd: number | null;
  readonly moneyCoverage: 'complete' | 'partial' | 'unavailable';
  readonly historyDays: number;
  readonly last7Days: {
    readonly newUsers: number;
    readonly newPaying: number;
    readonly renewals: number;
    readonly refunds: number;
  } | null;
  readonly recentMetricChanges: readonly JarvisPmMetricDelta[];
  readonly digestGeneratedAtMs: number | null;
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

const PM_METRIC_LABELS: Readonly<Record<string, string>> = Object.freeze({
  new_users: 'Новые пользователи',
  new_paying: 'Новые платящие пользователи',
  renewals: 'Продления Plus',
  refunds: 'Возвраты',
  trial_starts: 'Начатые пробные периоды',
  paywall_purchase_signals: 'Сигналы покупки после пейвола',
  open_reports: 'Открытые сообщения об ошибках',
  critical_errors: 'Критические ошибки приложения',
  subscription_cancels: 'Ответы при отмене подписки',
  open_safety: 'Необработанные сигналы безопасности',
  user_ideas: 'Новые идеи пользователей',
  referrals: 'Новые реферальные связи',
  community_pack_purchases: 'Покупки паков сообщества',
  moderation_backlog: 'Новые элементы в очередях разбора',
});

function recentSevenDays(history: readonly RecentHistoryPoint[]): JarvisPmBusinessContext['last7Days'] {
  if (history.length === 0) return null;
  const rows = history.slice(-7);
  return Object.freeze({
    newUsers: rows.reduce((sum, row) => sum + row.newUsers, 0),
    newPaying: rows.reduce((sum, row) => sum + row.newPaying, 0),
    renewals: rows.reduce((sum, row) => sum + row.renewals, 0),
    refunds: rows.reduce((sum, row) => sum + row.refunds, 0),
  });
}

function parseMetricChanges(raw: unknown, generatedAtMs: number | null, nowMs: number): readonly JarvisPmMetricDelta[] {
  if (generatedAtMs === null || nowMs - generatedAtMs > JARVIS_PM_DIGEST_MAX_AGE_MS || !Array.isArray(raw)) {
    return Object.freeze([]);
  }
  const parsed: JarvisPmMetricDelta[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    if (row.availability !== 'ok') continue;
    const current = finite(row.current);
    const previous = finite(row.previous);
    const absoluteDelta = finite(row.absoluteDelta);
    const direction = row.direction;
    const id = typeof row.id === 'string' ? row.id.slice(0, 80) : '';
    const label = PM_METRIC_LABELS[id] ?? '';
    if (current === null || previous === null || absoluteDelta === null || !id || !label) continue;
    if (!['up', 'down', 'flat', 'new'].includes(String(direction))) continue;
    parsed.push(Object.freeze({
      id,
      label,
      current,
      previous,
      absoluteDelta,
      percentDelta: finite(row.percentDelta),
      direction: direction as JarvisPmMetricDelta['direction'],
    }));
  }
  return Object.freeze(parsed
    .sort((a, b) => Math.abs(b.percentDelta ?? b.absoluteDelta) - Math.abs(a.percentDelta ?? a.absoluteDelta))
    .slice(0, 8));
}

export function buildJarvisPmBusinessContext(input: {
  readonly history: readonly RecentHistoryPoint[];
  readonly peakTier: Parameters<typeof buildBusinessTierSnapshot>[0]['storedPeakTier'];
  readonly latestDigest: Record<string, unknown> | null;
  readonly nowMs: number;
}): JarvisPmBusinessContext {
  const latest = input.history.length > 0 ? input.history[input.history.length - 1] : null;
  const digestGeneratedAtMs = finite(input.latestDigest?.generatedAtMs);
  const snapshot = buildBusinessTierSnapshot({
    history: input.history,
    totalUsers: latest?.cumulativeUsers ?? 0,
    activeUsers: latest?.activeUsers ?? null,
    storedPeakTier: input.peakTier,
    nowMs: input.nowMs,
  });
  const recentMetricChanges = parseMetricChanges(
    input.latestDigest?.comparisons,
    digestGeneratedAtMs,
    input.nowMs,
  );
  const state: JarvisPmBusinessContext['state'] = input.history.length === 0
    ? (recentMetricChanges.length > 0 ? 'partial' : 'unavailable')
    : snapshot.moneyCoverage === 'complete' && recentMetricChanges.length > 0 ? 'ready' : 'partial';

  return Object.freeze({
    state,
    currentTier: snapshot.hasData ? snapshot.currentTier : null,
    peakTier: snapshot.hasData ? snapshot.tier : null,
    totalUsers: latest?.cumulativeUsers ?? null,
    activeUsers: latest?.activeUsers ?? null,
    mrrUsd: snapshot.mrrUsd,
    moneyCoverage: snapshot.moneyCoverage,
    historyDays: input.history.length,
    last7Days: recentSevenDays(input.history),
    recentMetricChanges,
    digestGeneratedAtMs,
  });
}

export async function readJarvisPmBusinessContext(
  db: FirebaseFirestore.Firestore,
  nowMs: number,
): Promise<JarvisPmBusinessContext> {
  const [history, peakTier, digestSnapshot] = await Promise.all([
    readRecentHistory({ db, limit: JARVIS_PM_HISTORY_DAYS }).catch(() => []),
    readPeakTier(db).catch(() => null),
    db.collection('admin_digests').orderBy('generatedAtMs', 'desc').limit(1).get().catch(() => null),
  ]);
  const latestDigest = digestSnapshot && !digestSnapshot.empty
    ? (digestSnapshot.docs[0].data() as Record<string, unknown>)
    : null;
  return buildJarvisPmBusinessContext({ history, peakTier, latestDigest, nowMs });
}

export function formatJarvisPmBusinessContext(context: JarvisPmBusinessContext): string {
  const lines = [
    `Состояние бизнес-контекста: ${context.state}`,
    context.currentTier ? `Текущий business tier: ${context.currentTier}; достигнутый: ${context.peakTier}` : null,
    context.totalUsers !== null ? `Всего пользователей: ${context.totalUsers}` : null,
    context.activeUsers !== null ? `Активных в последнем суточном срезе: ${context.activeUsers}` : null,
    context.mrrUsd !== null ? `MRR-equivalent: $${context.mrrUsd.toFixed(2)}; покрытие денег: ${context.moneyCoverage}` : null,
    context.last7Days
      ? `Последние 7 дней: новые ${context.last7Days.newUsers}, платящие ${context.last7Days.newPaying}, продления ${context.last7Days.renewals}, возвраты ${context.last7Days.refunds}`
      : null,
    ...context.recentMetricChanges.map((metric) =>
      `${metric.label}: ${metric.previous} → ${metric.current} (${metric.direction}, Δ ${metric.absoluteDelta})`),
  ];
  return lines.filter((line): line is string => Boolean(line)).join('\n');
}
