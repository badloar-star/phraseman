import { BigQuery } from '@google-cloud/bigquery';
import { defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { hasClaimedPermission } from './admin/permissions';

const REGION = 'us-central1';
const ANALYTICS_BIGQUERY_DATASET = defineString('ANALYTICS_BIGQUERY_DATASET', { default: '' });
const ANALYTICS_BIGQUERY_LOCATION = defineString('ANALYTICS_BIGQUERY_LOCATION', { default: 'US' });
const CACHE_TTL_MS = 10 * 60 * 1000;
const SUPPORTED_DAYS = new Set([7, 28, 90]);
const DATASET_PATTERN = /^(?:[a-z][a-z0-9-]{4,61}[a-z0-9]\.)?[A-Za-z_][A-Za-z0-9_]*$/;

type ProductAnalyticsPlatform = 'all' | 'ios' | 'android';
type QueryRow = { row_kind?: string; payload?: string };

const cache = new Map<string, { expiresAtMs: number; value: unknown }>();

export function clampProductAnalyticsDays(value: unknown): number {
  const parsed = Math.round(Number(value));
  return SUPPORTED_DAYS.has(parsed) ? parsed : 28;
}

export function normalizeProductAnalyticsPlatform(value: unknown): ProductAnalyticsPlatform {
  return value === 'ios' || value === 'android' ? value : 'all';
}

function datasetTable(): string {
  const dataset = ANALYTICS_BIGQUERY_DATASET.value().trim();
  if (!dataset || !DATASET_PATTERN.test(dataset)) {
    throw new HttpsError(
      'failed-precondition',
      'Analytics warehouse is not configured. Set ANALYTICS_BIGQUERY_DATASET to the Firebase Analytics BigQuery dataset.',
    );
  }
  return `\`${dataset}.events_*\``;
}

function queryText(table: string): string {
  return `
WITH raw_base AS (
  SELECT
    event_name,
    user_pseudo_id,
    event_timestamp,
    LOWER(platform) AS platform,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'event_id') AS event_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'lesson_attempt_id') AS lesson_attempt_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'paywall_impression_id') AS paywall_impression_id,
    COALESCE(
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'session_id'),
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'product_session_id')
    ) AS session_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'screen_id') AS screen_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'study_target') AS study_target,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'context') AS paywall_context,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'source') AS paywall_source,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'plan') AS paywall_plan,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'paywall') AS paywall_variant,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'product_id') AS product_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'error') AS purchase_error,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'inventory_status') AS inventory_status,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'schema_version'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'schema_version') AS INT64)
    ) AS schema_version,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'duration_ms'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'duration_ms') AS INT64)
    ) AS duration_ms,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'elapsed_ms'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'elapsed_ms') AS INT64)
    ) AS elapsed_ms,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'time_since_impression_ms'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'time_since_impression_ms') AS INT64)
    ) AS time_since_impression_ms,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'lesson_id'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'lesson_id') AS INT64)
    ) AS lesson_id,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'phrase_index'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'phrase_index') AS INT64)
    ) AS phrase_index,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'total_phrases'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'total_phrases') AS INT64),
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'total'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'total') AS INT64)
    ) AS total_phrases,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'correct'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'correct') AS INT64)
    ) AS correct,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'monthly_available'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'monthly_available') AS INT64)
    ) AS monthly_available,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'yearly_available'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'yearly_available') AS INT64)
    ) AS yearly_available,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'lifetime_available'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'lifetime_available') AS INT64)
    ) AS lifetime_available,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'lifetime_expected'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'lifetime_expected') AS INT64)
    ) AS lifetime_expected,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'load_attempts'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'load_attempts') AS INT64)
    ) AS load_attempts,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'event_id'),
      CONCAT(event_name, ':', user_pseudo_id, ':', CAST(event_timestamp AS STRING))
    ) ORDER BY event_timestamp) AS duplicate_rank
  FROM ${table}
  WHERE _TABLE_SUFFIX BETWEEN @fromSuffix AND @toSuffix
    AND (@platform = 'all' OR LOWER(platform) = @platform)
    AND event_name IN (
      'product_session_start', 'product_session_resume', 'product_session_background',
      'product_screen_view', 'product_screen_leave',
      'lesson_start', 'lesson_complete', 'lesson_abandoned', 'lesson_answer',
      'paywall_view', 'paywall_plan_select', 'paywall_cta_click',
      'paywall_continue_free', 'paywall_close', 'premium_purchased',
      'paywall_shown', 'purchase_started', 'purchase_completed', 'purchase_failed',
      'purchase_cancelled', 'trial_started',
      'paywall_inventory_resolved',
      'paywall_exit_offer_shown', 'paywall_exit_offer_accepted', 'paywall_exit_offer_declined',
      'exit_trial_offer_shown', 'exit_trial_offer_accepted', 'exit_trial_offer_declined'
    )
),
base AS (
  SELECT * EXCEPT(duplicate_rank) FROM raw_base
  WHERE duplicate_rank = 1
    AND (NOT STARTS_WITH(event_name, 'product_') OR schema_version = 1)
),
session_facts AS (
  SELECT
    session_id,
    COUNTIF(event_name = 'product_session_start') > 0 AS has_session_start,
    MIN(event_timestamp) AS first_observed_at,
    MAX(event_timestamp) AS last_observed_at,
    CAST(ROUND((MAX(event_timestamp) - MIN(event_timestamp)) / 1000) AS INT64) AS observed_duration_ms,
    COUNTIF(event_name = 'product_screen_view') AS screen_views,
    COUNTIF(event_name = 'product_session_resume') AS resume_count,
    COUNTIF(event_name = 'product_session_background') AS background_count,
    ARRAY_AGG(IF(event_name = 'product_screen_view', IFNULL(NULLIF(screen_id, ''), 'missing_screen'), NULL)
      IGNORE NULLS ORDER BY event_timestamp ASC LIMIT 1)[SAFE_OFFSET(0)] AS entry_screen,
    ARRAY_AGG(IF(event_name = 'product_screen_view', IFNULL(NULLIF(screen_id, ''), 'missing_screen'), NULL)
      IGNORE NULLS ORDER BY event_timestamp DESC LIMIT 1)[SAFE_OFFSET(0)] AS last_observed_screen
  FROM base
  WHERE STARTS_WITH(event_name, 'product_') AND session_id IS NOT NULL
  GROUP BY session_id
),
session_summary_row AS (
  SELECT 'session_summary' AS row_kind, TO_JSON_STRING(STRUCT(
    COUNTIF(has_session_start) AS started,
    COUNT(*) AS observed,
    COUNTIF(NOT has_session_start) AS withoutStartInWindow,
    SUM(resume_count) AS resumed,
    AVG(screen_views) AS avgScreens,
    APPROX_QUANTILES(screen_views, 100)[SAFE_OFFSET(50)] AS p50Screens,
    APPROX_QUANTILES(screen_views, 100)[SAFE_OFFSET(90)] AS p90Screens,
    APPROX_QUANTILES(observed_duration_ms, 100)[SAFE_OFFSET(50)] AS p50ObservedDurationMs,
    APPROX_QUANTILES(observed_duration_ms, 100)[SAFE_OFFSET(90)] AS p90ObservedDurationMs
  )) AS payload FROM session_facts
),
session_bucket_rows AS (
  SELECT 'session_bucket' AS row_kind, TO_JSON_STRING(STRUCT(
    CASE
      WHEN observed_duration_ms < 60000 THEN '<1m'
      WHEN observed_duration_ms < 300000 THEN '1-5m'
      WHEN observed_duration_ms < 900000 THEN '5-15m'
      WHEN observed_duration_ms < 1800000 THEN '15-30m'
      ELSE '30m+'
    END AS id,
    COUNT(*) AS count
  )) AS payload
  FROM session_facts GROUP BY id
),
session_entry_rows AS (
  SELECT 'session_entry' AS row_kind, TO_JSON_STRING(STRUCT(entry_screen AS screenId, COUNT(*) AS sessions)) AS payload
  FROM session_facts WHERE entry_screen IS NOT NULL GROUP BY entry_screen
),
session_last_rows AS (
  SELECT 'session_last' AS row_kind, TO_JSON_STRING(STRUCT(last_observed_screen AS screenId, COUNT(*) AS sessions)) AS payload
  FROM session_facts WHERE last_observed_screen IS NOT NULL GROUP BY last_observed_screen
),
screen_views AS (
  SELECT
    IFNULL(NULLIF(screen_id, ''), 'missing_screen') AS screen_id,
    session_id,
    user_pseudo_id,
    event_timestamp,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY event_timestamp DESC) = 1 AS is_last_in_session
  FROM base
  WHERE event_name = 'product_screen_view' AND session_id IS NOT NULL
),
screen_view_stats AS (
  SELECT screen_id, COUNT(*) AS views, COUNT(DISTINCT user_pseudo_id) AS app_instances,
    COUNTIF(is_last_in_session) AS exits
  FROM screen_views GROUP BY screen_id
),
screen_leave_stats AS (
  SELECT IFNULL(NULLIF(screen_id, ''), 'missing_screen') AS screen_id,
    COUNT(*) AS measured_leaves,
    CAST(ROUND(AVG(duration_ms)) AS INT64) AS avg_duration_ms,
    APPROX_QUANTILES(duration_ms, 100)[OFFSET(50)] AS p50_duration_ms,
    APPROX_QUANTILES(duration_ms, 100)[OFFSET(90)] AS p90_duration_ms
  FROM base
  WHERE event_name = 'product_screen_leave' AND duration_ms IS NOT NULL
  GROUP BY screen_id
),
screen_rows AS (
  SELECT 'screen' AS row_kind, TO_JSON_STRING(STRUCT(
    v.screen_id, v.views, v.app_instances, v.exits,
    SAFE_DIVIDE(v.exits, v.views) AS exit_rate,
    IFNULL(l.measured_leaves, 0) AS measured_leaves,
    l.avg_duration_ms, l.p50_duration_ms, l.p90_duration_ms
  )) AS payload
  FROM screen_view_stats v LEFT JOIN screen_leave_stats l USING (screen_id)
),
lesson_rows AS (
  SELECT 'lesson' AS row_kind, TO_JSON_STRING(STRUCT(
    lesson_id,
    COUNTIF(event_name = 'lesson_start') AS starts,
    COUNTIF(event_name = 'lesson_complete') AS completes,
    COUNTIF(event_name = 'lesson_abandoned') AS abandons,
    SAFE_DIVIDE(COUNTIF(event_name = 'lesson_complete'), COUNTIF(event_name = 'lesson_start')) AS completion_rate,
    CAST(ROUND(AVG(IF(event_name = 'lesson_abandoned', phrase_index, NULL))) AS INT64) AS avg_abandon_phrase,
    MAX(IF(event_name IN ('lesson_answer', 'lesson_abandoned'), total_phrases, NULL)) AS observed_total_phrases
  )) AS payload
  FROM base WHERE lesson_id IS NOT NULL
  GROUP BY lesson_id
),
learning_checkpoint_rows AS (
  SELECT 'learning_checkpoint' AS row_kind, TO_JSON_STRING(STRUCT(
    lesson_id,
    phrase_index,
    MAX(total_phrases) AS total_phrases,
    COUNTIF(event_name = 'lesson_answer') AS answers,
    COUNTIF(event_name = 'lesson_answer' AND correct = 0) AS incorrect_answers,
    SAFE_DIVIDE(
      COUNTIF(event_name = 'lesson_answer' AND correct = 0),
      COUNTIF(event_name = 'lesson_answer')
    ) AS answer_error_rate,
    COUNTIF(event_name = 'lesson_abandoned') AS abandons,
    COUNT(DISTINCT user_pseudo_id) AS app_instances
  )) AS payload
  FROM base
  WHERE event_name IN ('lesson_answer', 'lesson_abandoned')
    AND lesson_id IS NOT NULL
    AND phrase_index IS NOT NULL
  GROUP BY lesson_id, phrase_index
),
learning_summary_row AS (
  SELECT 'learning_summary' AS row_kind, TO_JSON_STRING(STRUCT(
    COUNTIF(event_name = 'lesson_answer') AS answers,
    COUNTIF(event_name = 'lesson_answer' AND phrase_index IS NOT NULL AND total_phrases IS NOT NULL) AS answers_with_checkpoint,
    SAFE_DIVIDE(
      COUNTIF(event_name = 'lesson_answer' AND phrase_index IS NOT NULL AND total_phrases IS NOT NULL),
      COUNTIF(event_name = 'lesson_answer')
    ) AS checkpoint_coverage_rate,
    COUNTIF(event_name = 'lesson_abandoned') AS abandons,
    COUNTIF(event_name = 'lesson_abandoned' AND phrase_index IS NOT NULL AND total_phrases IS NOT NULL) AS abandons_with_checkpoint,
    SAFE_DIVIDE(
      COUNTIF(event_name = 'lesson_abandoned' AND phrase_index IS NOT NULL AND total_phrases IS NOT NULL),
      COUNTIF(event_name = 'lesson_abandoned')
    ) AS abandon_checkpoint_coverage_rate,
    COUNT(DISTINCT IF(event_name = 'lesson_start', lesson_attempt_id, NULL)) AS distinct_started_attempts,
    COUNT(DISTINCT IF(event_name = 'lesson_complete', lesson_attempt_id, NULL)) AS distinct_completed_attempts,
    COUNT(DISTINCT IF(event_name = 'lesson_abandoned', lesson_attempt_id, NULL)) AS distinct_abandoned_attempts,
    COUNTIF(lesson_attempt_id IS NOT NULL) AS lesson_events_with_attempt_id,
    COUNT(*) AS lesson_events_for_attempt_coverage,
    SAFE_DIVIDE(COUNTIF(lesson_attempt_id IS NOT NULL), COUNT(*)) AS lesson_attempt_id_coverage_rate,
    APPROX_QUANTILES(IF(event_name IN ('lesson_complete', 'lesson_abandoned'), elapsed_ms, NULL), 100)[SAFE_OFFSET(50)] AS p50_terminal_elapsed_ms,
    APPROX_QUANTILES(IF(event_name IN ('lesson_complete', 'lesson_abandoned'), elapsed_ms, NULL), 100)[SAFE_OFFSET(90)] AS p90_terminal_elapsed_ms
  )) AS payload
  FROM base
  WHERE event_name IN ('lesson_start', 'lesson_answer', 'lesson_complete', 'lesson_abandoned')
),
conversion_events AS (
  SELECT
    *,
    CASE
      WHEN paywall_context IN (
        'personal_plan', 'generic', 'settings', 'manage', 'level_up', 'quiz_limit',
        'streak', 'lesson', 'intro_ended', 'onboarding_plan', 'onboarding',
        'automatic', 'afterwin', 'direct', 'winback', 'referral', 'home'
      ) THEN paywall_context
      ELSE 'unknown'
    END AS context_bucket,
    CASE
      WHEN paywall_source IN (
        'direct', 'onboarding_plan', 'afterwin_levelup', 'settings', 'onboarding', 'automatic'
      ) THEN paywall_source
      ELSE 'unknown'
    END AS source_bucket
  FROM base
  WHERE event_name IN (
    'paywall_view', 'paywall_plan_select', 'paywall_cta_click',
    'paywall_continue_free', 'paywall_close', 'premium_purchased',
    'paywall_shown', 'purchase_started', 'purchase_completed', 'purchase_failed',
        'purchase_cancelled', 'trial_started',
        'paywall_inventory_resolved',
    'paywall_exit_offer_shown', 'paywall_exit_offer_accepted', 'paywall_exit_offer_declined',
    'exit_trial_offer_shown', 'exit_trial_offer_accepted', 'exit_trial_offer_declined'
  )
),
impression_facts AS (
  SELECT
    context_bucket,
    source_bucket,
    paywall_impression_id,
    COUNTIF(event_name = 'paywall_shown') > 0 AS shown,
    COUNTIF(event_name = 'paywall_cta_click') > 0 AS cta,
    COUNTIF(event_name = 'purchase_started') > 0 AS store_started,
    COUNTIF(event_name = 'purchase_completed') > 0 AS purchased,
    MIN(IF(event_name = 'paywall_cta_click', time_since_impression_ms, NULL)) AS time_to_cta_ms,
    MIN(IF(
      event_name IN ('purchase_completed', 'purchase_failed', 'purchase_cancelled'),
      time_since_impression_ms,
      NULL
    )) AS time_to_result_ms
  FROM conversion_events
  WHERE paywall_impression_id IS NOT NULL
  GROUP BY context_bucket, source_bucket, paywall_impression_id
),
inventory_resolution_events AS (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY paywall_impression_id
      ORDER BY event_timestamp
    ) AS inventory_rank
  FROM conversion_events
  WHERE event_name = 'paywall_inventory_resolved'
    AND paywall_impression_id IS NOT NULL
),
inventory_resolution_facts AS (
  SELECT
    context_bucket,
    source_bucket,
    paywall_impression_id,
    CASE
      WHEN inventory_status IN ('ready', 'partial_core', 'no_core_packages', 'load_failed') THEN inventory_status
      ELSE 'load_failed'
    END AS inventory_status,
    IF(monthly_available = 1, 1, 0) AS monthly_available,
    IF(yearly_available = 1, 1, 0) AS yearly_available,
    IF(lifetime_available = 1, 1, 0) AS lifetime_available,
    IF(lifetime_expected = 1, 1, 0) AS lifetime_expected,
    IF(load_attempts = 2, 2, 1) AS load_attempts,
    GREATEST(0, time_since_impression_ms) AS inventory_resolution_ms
  FROM inventory_resolution_events
  WHERE inventory_rank = 1
),
selected_plan_facts AS (
  SELECT
    context_bucket,
    source_bucket,
    paywall_impression_id,
    COUNTIF(event_name = 'paywall_plan_select' AND paywall_plan = 'monthly') > 0 AS selected_monthly,
    COUNTIF(event_name = 'paywall_plan_select' AND paywall_plan = 'yearly') > 0 AS selected_yearly,
    COUNTIF(event_name = 'paywall_plan_select' AND paywall_plan = 'lifetime') > 0 AS selected_lifetime
  FROM conversion_events
  WHERE paywall_impression_id IS NOT NULL
  GROUP BY context_bucket, source_bucket, paywall_impression_id
),
inventory_joined_facts AS (
  SELECT
    f.context_bucket,
    f.source_bucket,
    i.inventory_status,
    i.monthly_available,
    i.yearly_available,
    i.lifetime_available,
    i.lifetime_expected,
    i.inventory_resolution_ms,
    IFNULL(s.selected_monthly, FALSE) AS selected_monthly,
    IFNULL(s.selected_yearly, FALSE) AS selected_yearly,
    IFNULL(s.selected_lifetime, FALSE) AS selected_lifetime
  FROM impression_facts f
  LEFT JOIN inventory_resolution_facts i
    USING (context_bucket, source_bucket, paywall_impression_id)
  LEFT JOIN selected_plan_facts s
    USING (context_bucket, source_bucket, paywall_impression_id)
  WHERE f.shown
),
conversion_inventory_rows AS (
  SELECT 'conversion_inventory' AS row_kind, TO_JSON_STRING(STRUCT(
    context_bucket AS context,
    source_bucket AS source,
    COUNT(*) AS shown_impressions,
    COUNTIF(inventory_status IS NOT NULL) AS inventory_resolved_impressions,
    SAFE_DIVIDE(COUNTIF(inventory_status IS NOT NULL), COUNT(*)) AS inventory_resolution_coverage_rate,
    COUNTIF(inventory_status = 'ready') AS inventory_ready_impressions,
    COUNTIF(inventory_status = 'partial_core') AS inventory_partial_core_impressions,
    COUNTIF(inventory_status = 'no_core_packages') AS inventory_no_core_packages_impressions,
    COUNTIF(inventory_status = 'load_failed') AS inventory_load_failed_impressions,
    COUNTIF(inventory_status IS NOT NULL AND (inventory_status = 'load_failed' OR yearly_available = 0)) AS default_cta_blocked_impressions,
    SAFE_DIVIDE(
      COUNTIF(inventory_status IS NOT NULL AND (inventory_status = 'load_failed' OR yearly_available = 0)),
      COUNTIF(inventory_status IS NOT NULL)
    ) AS default_cta_blocked_rate,
    COUNTIF(inventory_status IS NOT NULL AND (
      (selected_monthly AND monthly_available = 0)
      OR (selected_yearly AND yearly_available = 0)
      OR (selected_lifetime AND lifetime_available = 0)
    )) AS selected_plan_missing_impressions,
    COUNTIF(inventory_status IS NOT NULL AND monthly_available = 0) AS monthly_missing_impressions,
    COUNTIF(inventory_status IS NOT NULL AND yearly_available = 0) AS yearly_missing_impressions,
    COUNTIF(inventory_status IS NOT NULL AND lifetime_expected = 1 AND lifetime_available = 0) AS lifetime_expected_missing_impressions,
    APPROX_QUANTILES(inventory_resolution_ms, 100)[SAFE_OFFSET(50)] AS p50_inventory_resolution_ms,
    APPROX_QUANTILES(inventory_resolution_ms, 100)[SAFE_OFFSET(90)] AS p90_inventory_resolution_ms
  )) AS payload
  FROM inventory_joined_facts
  GROUP BY context_bucket, source_bucket
),
impression_context_rows AS (
  SELECT 'conversion_impression' AS row_kind, TO_JSON_STRING(STRUCT(
    context_bucket AS context,
    source_bucket AS source,
    COUNTIF(shown) AS distinct_paywall_impressions,
    COUNTIF(shown AND cta) AS distinct_cta_impressions,
    COUNTIF(cta AND store_started) AS distinct_store_start_impressions,
    COUNTIF(store_started AND purchased) AS distinct_purchase_impressions,
    SAFE_DIVIDE(COUNTIF(shown AND cta), COUNTIF(shown)) AS impression_cta_rate,
    SAFE_DIVIDE(COUNTIF(cta AND store_started), COUNTIF(cta)) AS impression_store_start_rate,
    SAFE_DIVIDE(COUNTIF(store_started AND purchased), COUNTIF(store_started)) AS impression_purchase_per_store_start_rate,
    APPROX_QUANTILES(time_to_cta_ms, 100)[SAFE_OFFSET(50)] AS p50_time_to_cta_ms,
    APPROX_QUANTILES(time_to_cta_ms, 100)[SAFE_OFFSET(90)] AS p90_time_to_cta_ms,
    APPROX_QUANTILES(time_to_result_ms, 100)[SAFE_OFFSET(50)] AS p50_time_to_result_ms,
    APPROX_QUANTILES(time_to_result_ms, 100)[SAFE_OFFSET(90)] AS p90_time_to_result_ms
  )) AS payload
  FROM impression_facts
  GROUP BY context_bucket, source_bucket
),
conversion_context_rows AS (
  SELECT 'conversion_context' AS row_kind, TO_JSON_STRING(STRUCT(
    context_bucket AS context,
    source_bucket AS source,
    COUNTIF(event_name = 'paywall_shown') AS views,
    COUNTIF(event_name = 'paywall_view') AS legacy_views,
    COUNTIF(event_name = 'paywall_plan_select') AS plan_selects,
    COUNTIF(event_name = 'paywall_cta_click') AS cta_clicks,
    COUNTIF(event_name = 'purchase_started') AS store_starts,
    COUNTIF(event_name = 'purchase_completed') AS purchases,
    COUNTIF(event_name = 'premium_purchased') AS legacy_purchases,
    COUNTIF(event_name = 'trial_started') AS trials_started,
    COUNTIF(event_name = 'purchase_failed') AS purchase_failures,
    COUNTIF(event_name = 'purchase_cancelled') AS purchase_cancellations,
    COUNTIF(event_name = 'paywall_close') AS closes,
    COUNTIF(event_name = 'paywall_continue_free') AS continue_free,
    COUNTIF(event_name = 'paywall_exit_offer_shown') AS exit_offer_shown,
    COUNTIF(event_name = 'paywall_exit_offer_accepted') AS exit_offer_accepted,
    COUNTIF(event_name = 'paywall_exit_offer_declined') AS exit_offer_declined,
    COUNT(DISTINCT user_pseudo_id) AS app_instances,
    SAFE_DIVIDE(
      COUNTIF(event_name IN (
        'paywall_shown', 'paywall_plan_select', 'paywall_cta_click', 'purchase_started',
        'purchase_completed', 'purchase_failed', 'purchase_cancelled', 'paywall_close',
        'paywall_exit_offer_shown', 'paywall_exit_offer_accepted', 'paywall_exit_offer_declined'
      ) AND paywall_impression_id IS NOT NULL),
      COUNTIF(event_name IN (
        'paywall_shown', 'paywall_plan_select', 'paywall_cta_click', 'purchase_started',
        'purchase_completed', 'purchase_failed', 'purchase_cancelled', 'paywall_close',
        'paywall_exit_offer_shown', 'paywall_exit_offer_accepted', 'paywall_exit_offer_declined'
      ))
    ) AS paywall_impression_id_coverage_rate
  )) AS payload
  FROM conversion_events
  GROUP BY context_bucket, source_bucket
),
conversion_failure_rows AS (
  SELECT 'conversion_failure' AS row_kind, TO_JSON_STRING(STRUCT(
    CASE
      WHEN purchase_error IN (
        'identity_sync', 'no_active_entitlement_after_purchase', 'payment_pending',
        'network_error', 'payment_error', 'store_error', 'configuration_error',
        'sdk_other', 'unknown'
      ) THEN purchase_error
      ELSE 'legacy_or_other'
    END AS reason,
    COUNT(*) AS events,
    COUNT(DISTINCT user_pseudo_id) AS app_instances
  )) AS payload
  FROM conversion_events
  WHERE event_name = 'purchase_failed'
  GROUP BY reason
),
activity_days AS (
  SELECT DISTINCT user_pseudo_id, DATE(TIMESTAMP_MICROS(event_timestamp)) AS activity_date
  FROM base
  WHERE event_name = 'product_session_start' AND user_pseudo_id IS NOT NULL
),
instance_cohorts AS (
  SELECT user_pseudo_id, MIN(activity_date) AS cohort_date
  FROM activity_days
  GROUP BY user_pseudo_id
),
cohort_return_flags AS (
  SELECT
    c.user_pseudo_id,
    c.cohort_date,
    DATE_DIFF((SELECT MAX(activity_date) FROM activity_days), c.cohort_date, DAY) >= 1 AS eligible_d1,
    DATE_DIFF((SELECT MAX(activity_date) FROM activity_days), c.cohort_date, DAY) >= 7 AS eligible_d7,
    DATE_DIFF((SELECT MAX(activity_date) FROM activity_days), c.cohort_date, DAY) >= 28 AS eligible_d28,
    MAX(IF(DATE_DIFF(a.activity_date, c.cohort_date, DAY) = 1, 1, 0)) AS returned_d1,
    MAX(IF(DATE_DIFF(a.activity_date, c.cohort_date, DAY) = 7, 1, 0)) AS returned_d7,
    MAX(IF(DATE_DIFF(a.activity_date, c.cohort_date, DAY) = 28, 1, 0)) AS returned_d28
  FROM instance_cohorts c
  LEFT JOIN activity_days a USING (user_pseudo_id)
  GROUP BY c.user_pseudo_id, c.cohort_date
),
retention_day_rows AS (
  SELECT 'retention_day' AS row_kind, TO_JSON_STRING(STRUCT(
    FORMAT_DATE('%Y-%m-%d', cohort_date) AS cohort_date,
    COUNT(*) AS observed_new_instances,
    COUNTIF(eligible_d1) AS eligible_d1,
    COUNTIF(eligible_d1 AND returned_d1 = 1) AS returned_d1,
    SAFE_DIVIDE(COUNTIF(eligible_d1 AND returned_d1 = 1), COUNTIF(eligible_d1)) AS d1_rate,
    COUNTIF(eligible_d7) AS eligible_d7,
    COUNTIF(eligible_d7 AND returned_d7 = 1) AS returned_d7,
    SAFE_DIVIDE(COUNTIF(eligible_d7 AND returned_d7 = 1), COUNTIF(eligible_d7)) AS d7_rate,
    COUNTIF(eligible_d28) AS eligible_d28,
    COUNTIF(eligible_d28 AND returned_d28 = 1) AS returned_d28,
    SAFE_DIVIDE(COUNTIF(eligible_d28 AND returned_d28 = 1), COUNTIF(eligible_d28)) AS d28_rate
  )) AS payload
  FROM cohort_return_flags
  GROUP BY cohort_date
),
retention_summary_row AS (
  SELECT 'retention_summary' AS row_kind, TO_JSON_STRING(STRUCT(
    COUNT(*) AS observed_new_instances,
    COUNTIF(eligible_d1) AS eligible_d1,
    COUNTIF(eligible_d1 AND returned_d1 = 1) AS returned_d1,
    SAFE_DIVIDE(COUNTIF(eligible_d1 AND returned_d1 = 1), COUNTIF(eligible_d1)) AS d1_rate,
    COUNTIF(eligible_d7) AS eligible_d7,
    COUNTIF(eligible_d7 AND returned_d7 = 1) AS returned_d7,
    SAFE_DIVIDE(COUNTIF(eligible_d7 AND returned_d7 = 1), COUNTIF(eligible_d7)) AS d7_rate,
    COUNTIF(eligible_d28) AS eligible_d28,
    COUNTIF(eligible_d28 AND returned_d28 = 1) AS returned_d28,
    SAFE_DIVIDE(COUNTIF(eligible_d28 AND returned_d28 = 1), COUNTIF(eligible_d28)) AS d28_rate
  )) AS payload
  FROM cohort_return_flags
),
quality_row AS (
  SELECT 'quality' AS row_kind, TO_JSON_STRING(STRUCT(
    COUNTIF(event_name = 'product_screen_view') AS screen_views,
    COUNTIF(event_name = 'product_screen_view' AND (screen_id IS NULL OR screen_id = 'unknown_screen')) AS unknown_screen_views,
    SAFE_DIVIDE(
      COUNTIF(event_name = 'product_screen_view' AND (screen_id IS NULL OR screen_id = 'unknown_screen')),
      COUNTIF(event_name = 'product_screen_view')
    ) AS unknown_screen_rate,
    COUNTIF(STARTS_WITH(event_name, 'product_') AND event_id IS NULL) AS missing_event_ids,
    COUNTIF(STARTS_WITH(event_name, 'product_') AND session_id IS NULL) AS missing_session_ids,
    (SELECT COUNTIF(duplicate_rank > 1) FROM raw_base WHERE STARTS_WITH(event_name, 'product_')) AS duplicate_events,
    (SELECT COUNTIF(STARTS_WITH(event_name, 'product_') AND IFNULL(schema_version, -1) != 1) FROM raw_base) AS invalid_schema_events,
    COUNT(DISTINCT IF(event_name = 'product_session_start', session_id, NULL)) AS sessions,
    COUNT(DISTINCT IF(STARTS_WITH(event_name, 'product_'), user_pseudo_id, NULL)) AS consented_app_instances,
    MAX(IF(STARTS_WITH(event_name, 'product_'), event_timestamp, NULL)) AS data_through_micros
  )) AS payload FROM base
)
SELECT * FROM screen_rows
UNION ALL SELECT * FROM lesson_rows
UNION ALL SELECT * FROM learning_checkpoint_rows
UNION ALL SELECT * FROM learning_summary_row
UNION ALL SELECT * FROM conversion_context_rows
UNION ALL SELECT * FROM impression_context_rows
UNION ALL SELECT * FROM conversion_inventory_rows
UNION ALL SELECT * FROM conversion_failure_rows
UNION ALL SELECT * FROM retention_day_rows
UNION ALL SELECT * FROM retention_summary_row
UNION ALL SELECT * FROM quality_row
UNION ALL SELECT * FROM session_summary_row
UNION ALL SELECT * FROM session_bucket_rows
UNION ALL SELECT * FROM session_entry_rows
UNION ALL SELECT * FROM session_last_rows
`;
}

function yyyymmdd(date: Date): string {
  return date.toISOString().slice(0, 10).replace(/-/g, '');
}

function bigQueryLocation(): string {
  const location = ANALYTICS_BIGQUERY_LOCATION.value().trim();
  return /^[A-Za-z0-9-]{2,30}$/.test(location) ? location : 'US';
}

function parsePayload(row: QueryRow): Record<string, unknown> | null {
  try {
    return typeof row.payload === 'string' ? JSON.parse(row.payload) as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export const adminProductAnalytics = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 60,
  memory: '512MiB',
}, async (request) => {
  if (!hasClaimedPermission(request.auth?.token, 'money.read')) {
    throw new HttpsError('permission-denied', 'money.read permission required');
  }

  const rangeDays = clampProductAnalyticsDays(request.data?.rangeDays);
  const platform = normalizeProductAnalyticsPlatform(request.data?.platform);
  const cacheKey = `${rangeDays}:${platform}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAtMs > Date.now()) return cached.value;

  const now = new Date();
  const from = new Date(now.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000);
  const bigquery = new BigQuery();
  const [rows] = await bigquery.query({
    query: queryText(datasetTable()),
    params: { fromSuffix: yyyymmdd(from), toSuffix: yyyymmdd(now), platform },
    location: bigQueryLocation(),
    maximumBytesBilled: '5000000000',
  }) as [QueryRow[], unknown];

  const screens: Record<string, unknown>[] = [];
  const lessons: Record<string, unknown>[] = [];
  const learningCheckpoints: Record<string, unknown>[] = [];
  const conversionContexts: Record<string, unknown>[] = [];
  const conversionImpressions: Record<string, unknown>[] = [];
  const conversionInventory: Record<string, unknown>[] = [];
  const conversionFailures: Record<string, unknown>[] = [];
  const retentionDays: Record<string, unknown>[] = [];
  const sessionBuckets: Record<string, unknown>[] = [];
  const sessionEntryScreens: Record<string, unknown>[] = [];
  const sessionLastScreens: Record<string, unknown>[] = [];
  let sessionSummary: Record<string, unknown> = {};
  let learningSummary: Record<string, unknown> = {};
  let retentionSummary: Record<string, unknown> = {};
  let quality: Record<string, unknown> = {};
  for (const row of rows) {
    const payload = parsePayload(row);
    if (!payload) continue;
    if (row.row_kind === 'screen') screens.push(payload);
    else if (row.row_kind === 'lesson') lessons.push(payload);
    else if (row.row_kind === 'learning_checkpoint') learningCheckpoints.push(payload);
    else if (row.row_kind === 'learning_summary') learningSummary = payload;
    else if (row.row_kind === 'conversion_context') conversionContexts.push(payload);
    else if (row.row_kind === 'conversion_impression') conversionImpressions.push(payload);
    else if (row.row_kind === 'conversion_inventory') conversionInventory.push(payload);
    else if (row.row_kind === 'conversion_failure') conversionFailures.push(payload);
    else if (row.row_kind === 'retention_day') retentionDays.push(payload);
    else if (row.row_kind === 'retention_summary') retentionSummary = payload;
    else if (row.row_kind === 'quality') quality = payload;
    else if (row.row_kind === 'session_summary') sessionSummary = payload;
    else if (row.row_kind === 'session_bucket') sessionBuckets.push(payload);
    else if (row.row_kind === 'session_entry') sessionEntryScreens.push(payload);
    else if (row.row_kind === 'session_last') sessionLastScreens.push(payload);
  }
  screens.sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0));
  lessons.sort((a, b) => Number(a.lesson_id ?? 0) - Number(b.lesson_id ?? 0));
  learningCheckpoints.sort((a, b) => {
    const lessonDelta = Number(a.lesson_id ?? 0) - Number(b.lesson_id ?? 0);
    return lessonDelta || Number(a.phrase_index ?? 0) - Number(b.phrase_index ?? 0);
  });

  const value = {
    ok: true,
    queryGeneratedAtMs: Date.now(),
    dataThroughMs: Number(quality.data_through_micros ?? 0) > 0
      ? Math.round(Number(quality.data_through_micros) / 1000)
      : null,
    dataLagMs: Number(quality.data_through_micros ?? 0) > 0
      ? Math.max(0, Date.now() - Math.round(Number(quality.data_through_micros) / 1000))
      : null,
    sourceMode: 'daily_export_only',
    rangeDays,
    platform,
    coverage: 'analytics_consent_only',
    screens,
    lessons,
    learningDropoff: {
      ...learningSummary,
      checkpoints: learningCheckpoints,
    },
    behavioralConversion: {
      contexts: conversionContexts.map((contextRow) => {
        const impressionRow = conversionImpressions.find((candidate) => (
          candidate.context === contextRow.context && candidate.source === contextRow.source
        ));
        return { ...contextRow, ...(impressionRow ?? {}) };
      }).sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0)),
      failureReasons: conversionFailures.sort((a, b) => Number(b.events ?? 0) - Number(a.events ?? 0)),
      inventoryReadiness: conversionInventory.sort((a, b) => Number(b.shown_impressions ?? 0) - Number(a.shown_impressions ?? 0)),
    },
    observedReturn: {
      ...retentionSummary,
      cohorts: retentionDays.sort((a, b) => String(b.cohort_date ?? '').localeCompare(String(a.cohort_date ?? ''))),
      definition: 'first_observed_consented_product_session_in_selected_window',
    },
    sessions: {
      ...sessionSummary,
      buckets: sessionBuckets,
      entryScreens: sessionEntryScreens.sort((a, b) => Number(b.sessions ?? 0) - Number(a.sessions ?? 0)),
      lastObservedScreens: sessionLastScreens.sort((a, b) => Number(b.sessions ?? 0) - Number(a.sessions ?? 0)),
    },
    quality,
  };
  cache.set(cacheKey, { expiresAtMs: Date.now() + CACHE_TTL_MS, value });
  return value;
});
