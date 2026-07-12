import type { DigestWindow } from './admin_digest_contracts';

export interface DigestSourceDefinition {
  id: string;
  label: string;
  domain: 'growth' | 'revenue' | 'quality' | 'safety' | 'support' | 'community' | 'learning' | 'operations';
  mode: 'event' | 'snapshot' | 'configuration';
  readTarget?: { kind: 'collection' | 'collectionGroup'; path: string };
  timestampField: string | null;
  timestampType: 'number_ms' | 'firestore_timestamp' | 'day_string' | 'snapshot' | 'none';
  included: boolean;
  exclusionReason?: string;
}

export const DIGEST_SOURCE_REGISTRY: readonly DigestSourceDefinition[] = [
  { id: 'error_reports', label: 'Сообщения пользователей об ошибках', domain: 'quality', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'subscription_cancel_surveys', label: 'Причины отмены подписки', domain: 'revenue', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'app_errors', label: 'Ошибки приложения', domain: 'quality', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'safety_flags', label: 'Сигналы безопасности', domain: 'safety', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'users', label: 'Новые пользователи', domain: 'growth', mode: 'event', timestampField: 'created_at', timestampType: 'number_ms', included: true },
  { id: 'progress_events', label: 'Учебные действия пользователей', domain: 'learning', mode: 'event', readTarget: { kind: 'collectionGroup', path: 'progress_events' }, timestampField: 'createdAt', timestampType: 'firestore_timestamp', included: true },
  { id: 'revenuecat_premium_events', label: 'События подписки RevenueCat', domain: 'revenue', mode: 'event', timestampField: 'eventTimestampMs', timestampType: 'number_ms', included: true },
  { id: 'revenuecat_shard_transactions', label: 'Покупки пакетов кристаллов', domain: 'revenue', mode: 'event', timestampField: 'eventTimestampMs', timestampType: 'number_ms', included: true },
  { id: 'paywall_funnel', label: 'Воронка предложения Plus', domain: 'revenue', mode: 'event', timestampField: 'ts', timestampType: 'number_ms', included: true },
  { id: 'user_ideas', label: 'Идеи пользователей', domain: 'community', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'user_reports', label: 'Жалобы на пользователей', domain: 'safety', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'community_pack_reports', label: 'Жалобы на паки сообщества', domain: 'community', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'explain_reports', label: 'Отзывы об объяснениях', domain: 'quality', mode: 'event', readTarget: { kind: 'collection', path: 'explain_report_entries' }, timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'website_contact_inbox', label: 'Обращения с сайта', domain: 'support', mode: 'event', timestampField: 'createdAt', timestampType: 'firestore_timestamp', included: true },
  { id: 'support_inbox', label: 'Почта поддержки', domain: 'support', mode: 'event', timestampField: 'receivedAtMs', timestampType: 'number_ms', included: true },
  { id: 'help_board_topics', label: 'Темы доски помощи', domain: 'support', mode: 'event', timestampField: 'createdAt', timestampType: 'number_ms', included: true },
  { id: 'league_chat_messages', label: 'Сообщения чата лиг на модерации', domain: 'community', mode: 'event', readTarget: { kind: 'collection', path: 'league_chat_moderation_queue' }, timestampField: 'createdAt', timestampType: 'number_ms', included: true },
  { id: 'referral_attributions', label: 'Реферальные связи', domain: 'growth', mode: 'event', timestampField: 'createdAt', timestampType: 'firestore_timestamp', included: true },
  { id: 'community_pack_purchases', label: 'Покупки паков сообщества', domain: 'community', mode: 'event', timestampField: 'createdAt', timestampType: 'number_ms', included: true },
  { id: 'promo_redemptions', label: 'Активации промокодов', domain: 'growth', mode: 'event', readTarget: { kind: 'collectionGroup', path: 'promo_redemptions' }, timestampField: 'redeemedAtMs', timestampType: 'number_ms', included: true },
  { id: 'vip_survey_responses', label: 'Ответы на опрос Plus', domain: 'revenue', mode: 'event', timestampField: 'updatedAtMs', timestampType: 'number_ms', included: true },
  { id: 'community_pack_submissions', label: 'Паки на модерации', domain: 'community', mode: 'event', timestampField: 'submittedAt', timestampType: 'number_ms', included: true },
  { id: 'arena_rooms_live', label: 'Созданные комнаты Арены', domain: 'community', mode: 'event', timestampField: 'createdAt', timestampType: 'number_ms', included: true },
  { id: 'users_active_subscription_snapshot', label: 'Активные подписки на конец периода', domain: 'revenue', mode: 'snapshot', timestampField: null, timestampType: 'snapshot', included: false, exclusionReason: 'Исторические снимки ещё не накоплены; источник не участвует в сравнении периодов.' },
  { id: 'moderation_backlog_snapshot', label: 'Текущий остаток очередей модерации', domain: 'operations', mode: 'snapshot', timestampField: null, timestampType: 'snapshot', included: false, exclusionReason: 'Исторические снимки ещё не накоплены; источник не участвует в сравнении периодов.' },
  { id: 'remote_config', label: 'Настройки приложения', domain: 'operations', mode: 'configuration', timestampField: null, timestampType: 'none', included: false, exclusionReason: 'Конфигурация является контекстом, а не событием периода.' },
] as const;

export function readTargetForDigestSource(source: DigestSourceDefinition): { kind: 'collection' | 'collectionGroup'; path: string } {
  return source.readTarget || { kind: 'collection', path: source.id };
}

export type SourceCoverageStatus = 'ok' | 'partial' | 'failed' | 'not_configured';

export interface SourceCoverage {
  sourceId: string;
  status: SourceCoverageStatus;
  rowCount: number;
  uniqueCount: number;
  truncated: boolean;
  timestampField: string;
  window: DigestWindow;
  errorCode?: string;
}

export interface SourceResult<T> {
  rows: T[];
  coverage: SourceCoverage;
}

export interface DigestPage<T> {
  rows: T[];
  nextCursor?: string;
}

export interface DigestPageInput {
  startMs: number;
  endMs: number;
  cursor?: string;
  pageSize: number;
}

export type DigestPageReader<T> = (input: DigestPageInput) => Promise<DigestPage<T>>;

export interface PaginatedSourceOptions<T> {
  sourceId: string;
  timestampField: string;
  window: DigestWindow;
  pageSize: number;
  maxPages?: number;
  readPage: DigestPageReader<T>;
  uniqueKey: (row: T) => string;
}

function errorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null || !('code' in error)) return 'unknown';
  const code = String((error as { code?: unknown }).code || '').trim();
  return code || 'unknown';
}

export async function readPaginatedSource<T>(options: PaginatedSourceOptions<T>): Promise<SourceResult<T>> {
  const maxPages = options.maxPages ?? 100;
  const rows: T[] = [];
  const uniqueKeys = new Set<string>();
  let cursor: string | undefined;
  let pagesRead = 0;

  try {
    while (pagesRead < maxPages) {
      const page = await options.readPage({
        startMs: options.window.startMs,
        endMs: options.window.endMs,
        cursor,
        pageSize: options.pageSize,
      });
      pagesRead += 1;

      for (const row of page.rows) {
        rows.push(row);
        uniqueKeys.add(options.uniqueKey(row));
      }

      if (!page.nextCursor) {
        return {
          rows,
          coverage: {
            sourceId: options.sourceId,
            status: 'ok',
            rowCount: rows.length,
            uniqueCount: uniqueKeys.size,
            truncated: false,
            timestampField: options.timestampField,
            window: options.window,
          },
        };
      }
      cursor = page.nextCursor;
    }

    return {
      rows,
      coverage: {
        sourceId: options.sourceId,
        status: 'partial',
        rowCount: rows.length,
        uniqueCount: uniqueKeys.size,
        truncated: true,
        timestampField: options.timestampField,
        window: options.window,
        errorCode: 'page_limit_reached',
      },
    };
  } catch (error) {
    return {
      rows,
      coverage: {
        sourceId: options.sourceId,
        status: rows.length > 0 ? 'partial' : 'failed',
        rowCount: rows.length,
        uniqueCount: uniqueKeys.size,
        truncated: false,
        timestampField: options.timestampField,
        window: options.window,
        errorCode: errorCode(error),
      },
    };
  }
}
