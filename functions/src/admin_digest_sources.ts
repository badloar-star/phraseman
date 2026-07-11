import type { DigestWindow } from './admin_digest_contracts';

export interface DigestSourceDefinition {
  id: string;
  domain: 'growth' | 'revenue' | 'quality' | 'safety' | 'support' | 'community' | 'learning' | 'operations';
  mode: 'event' | 'snapshot' | 'configuration';
  timestampField: string | null;
  timestampType: 'number_ms' | 'firestore_timestamp' | 'day_string' | 'snapshot' | 'none';
  included: boolean;
  exclusionReason?: string;
}

export const DIGEST_SOURCE_REGISTRY: readonly DigestSourceDefinition[] = [
  { id: 'error_reports', domain: 'quality', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'subscription_cancel_surveys', domain: 'revenue', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'app_errors', domain: 'quality', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'safety_flags', domain: 'safety', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'users', domain: 'growth', mode: 'event', timestampField: 'created_at', timestampType: 'number_ms', included: true },
  { id: 'revenuecat_premium_events', domain: 'revenue', mode: 'event', timestampField: 'eventTimestampMs', timestampType: 'number_ms', included: true },
  { id: 'revenuecat_shard_transactions', domain: 'revenue', mode: 'event', timestampField: 'eventTimestampMs', timestampType: 'number_ms', included: true },
  { id: 'paywall_funnel', domain: 'revenue', mode: 'event', timestampField: 'day', timestampType: 'day_string', included: true },
  { id: 'user_ideas', domain: 'community', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'user_reports', domain: 'safety', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'community_pack_reports', domain: 'community', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'explain_reports', domain: 'quality', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'website_contact_inbox', domain: 'support', mode: 'event', timestampField: 'createdAt', timestampType: 'firestore_timestamp', included: true },
  { id: 'support_inbox', domain: 'support', mode: 'event', timestampField: 'receivedAtMs', timestampType: 'number_ms', included: true },
  { id: 'help_board_topics', domain: 'support', mode: 'event', timestampField: 'createdAt', timestampType: 'number_ms', included: true },
  { id: 'league_chat_messages', domain: 'community', mode: 'event', timestampField: 'createdAt', timestampType: 'number_ms', included: true },
  { id: 'referral_attributions', domain: 'growth', mode: 'event', timestampField: 'createdAt', timestampType: 'firestore_timestamp', included: true },
  { id: 'community_pack_purchases', domain: 'community', mode: 'event', timestampField: 'purchasedAtMs', timestampType: 'number_ms', included: true },
  { id: 'promo_redemptions', domain: 'growth', mode: 'event', timestampField: 'redeemedAtMs', timestampType: 'number_ms', included: true },
  { id: 'vip_survey_responses', domain: 'revenue', mode: 'event', timestampField: 'submittedAtMs', timestampType: 'number_ms', included: true },
  { id: 'community_pack_submissions', domain: 'community', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'arena_rooms_live', domain: 'community', mode: 'event', timestampField: 'createdAtMs', timestampType: 'number_ms', included: true },
  { id: 'users_active_subscription_snapshot', domain: 'revenue', mode: 'snapshot', timestampField: null, timestampType: 'snapshot', included: true },
  { id: 'moderation_backlog_snapshot', domain: 'operations', mode: 'snapshot', timestampField: null, timestampType: 'snapshot', included: true },
  { id: 'remote_config', domain: 'operations', mode: 'configuration', timestampField: null, timestampType: 'none', included: false, exclusionReason: 'Configuration is represented by change events, not counted as period activity.' },
] as const;

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
