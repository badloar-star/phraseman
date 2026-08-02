"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminProductAnalytics = void 0;
exports.clampProductAnalyticsDays = clampProductAnalyticsDays;
exports.normalizeProductAnalyticsPlatform = normalizeProductAnalyticsPlatform;
exports.buildProductAnalyticsAggregateQuery = buildProductAnalyticsAggregateQuery;
exports.buildProductAnalyticsPurchaseFailureQuery = buildProductAnalyticsPurchaseFailureQuery;
exports.parseProductAnalyticsPayload = parseProductAnalyticsPayload;
exports.loadProductAnalyticsAggregateRows = loadProductAnalyticsAggregateRows;
exports.loadProductAnalyticsPurchaseFailureRows = loadProductAnalyticsPurchaseFailureRows;
exports.isAnalyticsExportPendingError = isAnalyticsExportPendingError;
const bigquery_1 = require("@google-cloud/bigquery");
const https_1 = require("firebase-functions/v2/https");
const callable_options_1 = require("./callable_options");
const permissions_1 = require("./admin/permissions");
const admin_analytics_trends_core_1 = require("./admin_analytics_trends_core");
const REGION = 'us-central1';
const CACHE_TTL_MS = 10 * 60 * 1000;
const SUPPORTED_DAYS = new Set([7, 28, 90]);
const DATASET_PATTERN = /^(?:[a-z][a-z0-9-]{4,61}[a-z0-9]\.)?[A-Za-z_][A-Za-z0-9_]*$/;
const cache = new Map();
function clampProductAnalyticsDays(value) {
    const parsed = Math.round(Number(value));
    return SUPPORTED_DAYS.has(parsed) ? parsed : 28;
}
function normalizeProductAnalyticsPlatform(value) {
    return value === 'ios' || value === 'android' ? value : 'all';
}
function datasetTable() {
    const dataset = String(process.env.ANALYTICS_BIGQUERY_DATASET ?? '').trim();
    if (!dataset || !DATASET_PATTERN.test(dataset)) {
        throw new https_1.HttpsError('failed-precondition', 'Analytics warehouse is not configured. Set ANALYTICS_BIGQUERY_DATASET to the Firebase Analytics BigQuery dataset.');
    }
    return `\`${dataset}.events_*\``;
}
function buildProductAnalyticsAggregateQuery(table) {
    return `
WITH raw_base AS (
  SELECT
    event_name,
    user_pseudo_id,
    event_timestamp,
    user_first_touch_timestamp,
    LOWER(platform) AS platform,
    CASE
      WHEN LOWER(COALESCE(traffic_source.medium, '')) = 'organic' THEN 'organic_search'
      WHEN REGEXP_CONTAINS(LOWER(COALESCE(traffic_source.source, '')), r'apple|app.?store') THEN 'apple_app_store'
      WHEN REGEXP_CONTAINS(LOWER(COALESCE(traffic_source.source, '')), r'google|play') THEN 'google_play_or_ads'
      WHEN REGEXP_CONTAINS(LOWER(COALESCE(traffic_source.source, '')), r'facebook|instagram|meta') THEN 'meta'
      WHEN REGEXP_CONTAINS(LOWER(COALESCE(traffic_source.source, '')), r'tiktok') THEN 'tiktok'
      WHEN LOWER(COALESCE(traffic_source.medium, '')) IN ('referral', 'affiliate') THEN 'referral_or_affiliate'
      WHEN COALESCE(traffic_source.source, '') IN ('', '(direct)', '(not set)') THEN 'direct_or_unknown'
      ELSE 'other_or_unclassified'
    END AS acquisition_channel_bucket,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'event_id') AS event_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'lesson_attempt_id') AS lesson_attempt_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'paywall_impression_id') AS paywall_impression_id,
    COALESCE(
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'session_id'),
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'product_session_id')
    ) AS session_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'screen_id') AS screen_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'study_target') AS study_target,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'review_session_id') AS review_session_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'review_mode') AS review_mode,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'content_version') AS content_version,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'actual_delay_bucket') AS actual_delay_bucket,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'due_status') AS due_status,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'previous_mastery_state') AS previous_mastery_state,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'next_mastery_state') AS next_mastery_state,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'mastery_transition') AS mastery_transition,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'experiment_id') AS experiment_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'variant_id') AS experiment_variant_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'control_variant_id') AS experiment_control_variant_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'exposure_id') AS exposure_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'surface') AS experiment_surface,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'assignment_quality') AS assignment_quality,
    COALESCE(
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'app_version'),
      app_info.version
    ) AS app_version,
    COALESCE(
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'build_number'),
      'unknown'
    ) AS build_number,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'operation') AS operation,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'feature') AS feature,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'failure_code') AS failure_code,
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
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'definition_version'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'definition_version') AS INT64)
    ) AS experiment_definition_version,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'config_revision'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'config_revision') AS INT64)
    ) AS experiment_config_revision,
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
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'retryable'),
      CASE LOWER((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'retryable'))
        WHEN 'true' THEN 1
        WHEN 'false' THEN 0
        ELSE NULL
      END
    ) AS retryable,
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
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'response_time_ms'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'response_time_ms') AS INT64)
    ) AS response_time_ms,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'planned_item_count'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'planned_item_count') AS INT64)
    ) AS planned_item_count,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'answered_item_count'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'answered_item_count') AS INT64)
    ) AS answered_item_count,
    COALESCE(
      (SELECT value.int_value FROM UNNEST(event_params) WHERE key = 'correct_item_count'),
      SAFE_CAST((SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'correct_item_count') AS INT64)
    ) AS correct_item_count,
    ROW_NUMBER() OVER (PARTITION BY COALESCE(
      (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'event_id'),
      CONCAT(event_name, ':', user_pseudo_id, ':', CAST(event_timestamp AS STRING))
    ) ORDER BY event_timestamp) AS duplicate_rank
  FROM ${table}
  WHERE _TABLE_SUFFIX BETWEEN @fromSuffix AND @toSuffix
    AND event_timestamp >= @fromMicros
    AND event_timestamp < @toMicrosExclusive
    AND (@platform = 'all' OR LOWER(platform) = @platform)
    -- ANALYTICS_EVENT_ALLOWLIST_START
    AND event_name IN (
      'product_session_start', 'product_session_resume', 'product_session_background',
      'product_screen_view', 'product_screen_leave',
      'lesson_start', 'lesson_complete', 'lesson_abandoned', 'lesson_answer',
      'onboarding_complete',
      'experiment_exposure',
      'product_operation_failure',
      'learning_review_session_start', 'learning_review_answer',
      'learning_review_session_complete', 'learning_review_session_abandoned',
      'paywall_view', 'paywall_plan_select', 'paywall_cta_click',
      'paywall_continue_free', 'paywall_close', 'premium_purchased',
      'paywall_shown', 'purchase_started', 'purchase_completed', 'purchase_failed',
      'purchase_cancelled', 'trial_started',
      'paywall_inventory_resolved',
      'paywall_exit_offer_shown', 'paywall_exit_offer_accepted', 'paywall_exit_offer_declined',
      'exit_trial_offer_shown', 'exit_trial_offer_accepted', 'exit_trial_offer_declined'
    )
    -- ANALYTICS_EVENT_ALLOWLIST_END
),
base AS (
  SELECT * EXCEPT(duplicate_rank) FROM raw_base
  WHERE duplicate_rank = 1
    AND (
      NOT (STARTS_WITH(event_name, 'learning_review_') OR STARTS_WITH(event_name, 'product_') OR STARTS_WITH(event_name, 'experiment_'))
      OR schema_version = 1
    )
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
session_bucket_facts AS (
  SELECT
    CASE
      WHEN observed_duration_ms < 60000 THEN '<1m'
      WHEN observed_duration_ms < 300000 THEN '1-5m'
      WHEN observed_duration_ms < 900000 THEN '5-15m'
      WHEN observed_duration_ms < 1800000 THEN '15-30m'
      ELSE '30m+'
    END AS id
  FROM session_facts
),
session_bucket_rows AS (
  SELECT 'session_bucket' AS row_kind, TO_JSON_STRING(STRUCT(
    id,
    COUNT(*) AS count
  )) AS payload
  FROM session_bucket_facts GROUP BY id
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
  SELECT DISTINCT user_pseudo_id, DATE(TIMESTAMP_MICROS(event_timestamp), @reportingTimezone) AS activity_date
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
warehouse_watermark AS (
  SELECT DATE(TIMESTAMP_MICROS(MAX(event_timestamp)), @reportingTimezone) AS data_through_date
  FROM base
),
first_touch_base AS (
  SELECT
    user_pseudo_id,
    MIN(user_first_touch_timestamp) AS first_touch_timestamp,
    DATE(TIMESTAMP_MICROS(MIN(user_first_touch_timestamp)), @reportingTimezone) AS cohort_date,
    ARRAY_AGG(acquisition_channel_bucket ORDER BY event_timestamp LIMIT 1)[SAFE_OFFSET(0)] AS acquisition_channel_bucket
  FROM base
  WHERE user_pseudo_id IS NOT NULL
    AND user_first_touch_timestamp IS NOT NULL
    AND user_first_touch_timestamp > 0
    AND user_first_touch_timestamp <= event_timestamp
  GROUP BY user_pseudo_id
  HAVING cohort_date BETWEEN PARSE_DATE('%Y-%m-%d', @reportFromDate) AND PARSE_DATE('%Y-%m-%d', @reportToDate)
),
first_touch_onboarding AS (
  SELECT
    b.*,
    MIN(IF(
      e.event_name = 'onboarding_complete' AND e.event_timestamp >= b.first_touch_timestamp,
      e.event_timestamp,
      NULL
    )) AS onboarding_completed_at
  FROM first_touch_base b
  LEFT JOIN base e USING (user_pseudo_id)
  GROUP BY b.user_pseudo_id, b.first_touch_timestamp, b.cohort_date, b.acquisition_channel_bucket
),
first_touch_learning_start AS (
  SELECT
    o.*,
    MIN(IF(
      e.event_name = 'lesson_start' AND e.event_timestamp >= o.onboarding_completed_at,
      e.event_timestamp,
      NULL
    )) AS learning_started_at
  FROM first_touch_onboarding o
  LEFT JOIN base e USING (user_pseudo_id)
  GROUP BY o.user_pseudo_id, o.first_touch_timestamp, o.cohort_date, o.acquisition_channel_bucket, o.onboarding_completed_at
),
first_touch_learning_complete AS (
  SELECT
    s.*,
    MIN(IF(
      e.event_name = 'lesson_complete' AND e.event_timestamp >= s.learning_started_at,
      e.event_timestamp,
      NULL
    )) AS learning_completed_at
  FROM first_touch_learning_start s
  LEFT JOIN base e USING (user_pseudo_id)
  GROUP BY s.user_pseudo_id, s.first_touch_timestamp, s.cohort_date, s.acquisition_channel_bucket, s.onboarding_completed_at, s.learning_started_at
),
first_touch_return_72h AS (
  SELECT
    c.*,
    MIN(IF(
      e.event_name = 'product_session_start'
      AND e.event_timestamp >= c.learning_completed_at
      AND e.event_timestamp >= c.first_touch_timestamp + 24 * 60 * 60 * 1000000
      AND e.event_timestamp <= c.first_touch_timestamp + 72 * 60 * 60 * 1000000,
      e.event_timestamp,
      NULL
    )) AS returned_within_72h_at
  FROM first_touch_learning_complete c
  LEFT JOIN base e USING (user_pseudo_id)
  GROUP BY c.user_pseudo_id, c.first_touch_timestamp, c.cohort_date, c.acquisition_channel_bucket, c.onboarding_completed_at, c.learning_started_at, c.learning_completed_at
),
first_touch_return_d7 AS (
  SELECT
    r.*,
    MIN(IF(
      e.event_name = 'product_session_start'
      AND e.event_timestamp >= r.returned_within_72h_at
      AND DATE_DIFF(DATE(TIMESTAMP_MICROS(e.event_timestamp), @reportingTimezone), r.cohort_date, DAY) = 7,
      e.event_timestamp,
      NULL
    )) AS returned_d7_at
  FROM first_touch_return_72h r
  LEFT JOIN base e USING (user_pseudo_id)
  GROUP BY r.user_pseudo_id, r.first_touch_timestamp, r.cohort_date, r.acquisition_channel_bucket, r.onboarding_completed_at, r.learning_started_at, r.learning_completed_at, r.returned_within_72h_at
),
first_touch_instance_facts AS (
  SELECT
    *,
    onboarding_completed_at IS NOT NULL AS onboarding_completed,
    learning_started_at IS NOT NULL AS learning_started,
    learning_completed_at IS NOT NULL AS learning_completed,
    returned_within_72h_at IS NOT NULL AS returned_within_72h,
    returned_d7_at IS NOT NULL AS returned_d7
  FROM first_touch_return_d7
),
first_touch_return_flags AS (
  SELECT
    f.user_pseudo_id,
    f.cohort_date,
    DATE_DIFF(w.data_through_date, f.cohort_date, DAY) >= 1 AS eligible_d1,
    DATE_DIFF(w.data_through_date, f.cohort_date, DAY) >= 7 AS eligible_d7,
    DATE_DIFF(w.data_through_date, f.cohort_date, DAY) >= 14 AS eligible_d14,
    DATE_DIFF(w.data_through_date, f.cohort_date, DAY) >= 30 AS eligible_d30,
    MAX(IF(DATE_DIFF(a.activity_date, f.cohort_date, DAY) = 1, 1, 0)) AS exact_returned_d1,
    MAX(IF(DATE_DIFF(a.activity_date, f.cohort_date, DAY) = 7, 1, 0)) AS exact_returned_d7,
    MAX(IF(DATE_DIFF(a.activity_date, f.cohort_date, DAY) = 14, 1, 0)) AS exact_returned_d14,
    MAX(IF(DATE_DIFF(a.activity_date, f.cohort_date, DAY) = 30, 1, 0)) AS exact_returned_d30,
    MAX(IF(DATE_DIFF(a.activity_date, f.cohort_date, DAY) >= 1, 1, 0)) AS rolling_returned_d1,
    MAX(IF(DATE_DIFF(a.activity_date, f.cohort_date, DAY) >= 7, 1, 0)) AS rolling_returned_d7,
    MAX(IF(DATE_DIFF(a.activity_date, f.cohort_date, DAY) >= 14, 1, 0)) AS rolling_returned_d14,
    MAX(IF(DATE_DIFF(a.activity_date, f.cohort_date, DAY) >= 30, 1, 0)) AS rolling_returned_d30,
    COUNT(DISTINCT a.activity_date) AS active_days
  FROM first_touch_instance_facts f
  CROSS JOIN warehouse_watermark w
  LEFT JOIN activity_days a USING (user_pseudo_id)
  GROUP BY f.user_pseudo_id, f.cohort_date, w.data_through_date
),
true_retention_day_rows AS (
  SELECT 'true_retention_day' AS row_kind, TO_JSON_STRING(STRUCT(
    FORMAT_DATE('%Y-%m-%d', cohort_date) AS cohort_date,
    COUNT(*) AS cohort_app_instances,
    COUNTIF(eligible_d1) AS eligible_d1,
    COUNTIF(eligible_d1 AND exact_returned_d1 = 1) AS exact_returned_d1,
    SAFE_DIVIDE(COUNTIF(eligible_d1 AND exact_returned_d1 = 1), COUNTIF(eligible_d1)) AS exact_d1_rate,
    COUNTIF(eligible_d1 AND rolling_returned_d1 = 1) AS rolling_returned_d1,
    SAFE_DIVIDE(COUNTIF(eligible_d1 AND rolling_returned_d1 = 1), COUNTIF(eligible_d1)) AS rolling_d1_rate,
    COUNTIF(eligible_d7) AS eligible_d7,
    COUNTIF(eligible_d7 AND exact_returned_d7 = 1) AS exact_returned_d7,
    SAFE_DIVIDE(COUNTIF(eligible_d7 AND exact_returned_d7 = 1), COUNTIF(eligible_d7)) AS exact_d7_rate,
    COUNTIF(eligible_d7 AND rolling_returned_d7 = 1) AS rolling_returned_d7,
    SAFE_DIVIDE(COUNTIF(eligible_d7 AND rolling_returned_d7 = 1), COUNTIF(eligible_d7)) AS rolling_d7_rate,
    COUNTIF(eligible_d14) AS eligible_d14,
    COUNTIF(eligible_d14 AND exact_returned_d14 = 1) AS exact_returned_d14,
    SAFE_DIVIDE(COUNTIF(eligible_d14 AND exact_returned_d14 = 1), COUNTIF(eligible_d14)) AS exact_d14_rate,
    COUNTIF(eligible_d14 AND rolling_returned_d14 = 1) AS rolling_returned_d14,
    SAFE_DIVIDE(COUNTIF(eligible_d14 AND rolling_returned_d14 = 1), COUNTIF(eligible_d14)) AS rolling_d14_rate,
    COUNTIF(eligible_d30) AS eligible_d30,
    COUNTIF(eligible_d30 AND exact_returned_d30 = 1) AS exact_returned_d30,
    SAFE_DIVIDE(COUNTIF(eligible_d30 AND exact_returned_d30 = 1), COUNTIF(eligible_d30)) AS exact_d30_rate,
    COUNTIF(eligible_d30 AND rolling_returned_d30 = 1) AS rolling_returned_d30,
    SAFE_DIVIDE(COUNTIF(eligible_d30 AND rolling_returned_d30 = 1), COUNTIF(eligible_d30)) AS rolling_d30_rate
  )) AS payload
  FROM first_touch_return_flags
  GROUP BY cohort_date
),
true_retention_summary_row AS (
  SELECT 'true_retention_summary' AS row_kind, TO_JSON_STRING(STRUCT(
    COUNT(*) AS cohort_app_instances,
    COUNTIF(eligible_d1) AS eligible_d1,
    COUNTIF(eligible_d1 AND exact_returned_d1 = 1) AS exact_returned_d1,
    SAFE_DIVIDE(COUNTIF(eligible_d1 AND exact_returned_d1 = 1), COUNTIF(eligible_d1)) AS exact_d1_rate,
    COUNTIF(eligible_d1 AND rolling_returned_d1 = 1) AS rolling_returned_d1,
    SAFE_DIVIDE(COUNTIF(eligible_d1 AND rolling_returned_d1 = 1), COUNTIF(eligible_d1)) AS rolling_d1_rate,
    COUNTIF(eligible_d7) AS eligible_d7,
    COUNTIF(eligible_d7 AND exact_returned_d7 = 1) AS exact_returned_d7,
    SAFE_DIVIDE(COUNTIF(eligible_d7 AND exact_returned_d7 = 1), COUNTIF(eligible_d7)) AS exact_d7_rate,
    COUNTIF(eligible_d7 AND rolling_returned_d7 = 1) AS rolling_returned_d7,
    SAFE_DIVIDE(COUNTIF(eligible_d7 AND rolling_returned_d7 = 1), COUNTIF(eligible_d7)) AS rolling_d7_rate,
    COUNTIF(eligible_d14) AS eligible_d14,
    COUNTIF(eligible_d14 AND exact_returned_d14 = 1) AS exact_returned_d14,
    SAFE_DIVIDE(COUNTIF(eligible_d14 AND exact_returned_d14 = 1), COUNTIF(eligible_d14)) AS exact_d14_rate,
    COUNTIF(eligible_d14 AND rolling_returned_d14 = 1) AS rolling_returned_d14,
    SAFE_DIVIDE(COUNTIF(eligible_d14 AND rolling_returned_d14 = 1), COUNTIF(eligible_d14)) AS rolling_d14_rate,
    COUNTIF(eligible_d30) AS eligible_d30,
    COUNTIF(eligible_d30 AND exact_returned_d30 = 1) AS exact_returned_d30,
    SAFE_DIVIDE(COUNTIF(eligible_d30 AND exact_returned_d30 = 1), COUNTIF(eligible_d30)) AS exact_d30_rate,
    COUNTIF(eligible_d30 AND rolling_returned_d30 = 1) AS rolling_returned_d30,
    SAFE_DIVIDE(COUNTIF(eligible_d30 AND rolling_returned_d30 = 1), COUNTIF(eligible_d30)) AS rolling_d30_rate
  )) AS payload
  FROM first_touch_return_flags
),
active_day_bucket_facts AS (
  SELECT
    CASE
      WHEN active_days <= 1 THEN '1'
      WHEN active_days <= 3 THEN '2-3'
      WHEN active_days <= 7 THEN '4-7'
      ELSE '8+'
    END AS id
  FROM first_touch_return_flags
),
active_day_bucket_rows AS (
  SELECT 'active_day_bucket' AS row_kind, TO_JSON_STRING(STRUCT(
    id,
    COUNT(*) AS app_instances
  )) AS payload
  FROM active_day_bucket_facts
  GROUP BY id
),
activation_summary_row AS (
  SELECT 'activation_summary' AS row_kind, TO_JSON_STRING(STRUCT(
    COUNT(*) AS cohort_app_instances,
    COUNTIF(onboarding_completed) AS onboarding_completed,
    SAFE_DIVIDE(COUNTIF(onboarding_completed), COUNT(*)) AS onboarding_rate,
    COUNTIF(learning_started) AS learning_started,
    SAFE_DIVIDE(COUNTIF(learning_started), COUNT(*)) AS learning_start_rate,
    COUNTIF(learning_completed) AS learning_completed,
    SAFE_DIVIDE(COUNTIF(learning_completed), COUNT(*)) AS learning_completion_rate,
    COUNTIF(returned_within_72h) AS returned_within_72h,
    SAFE_DIVIDE(COUNTIF(returned_within_72h), COUNT(*)) AS return_within_72h_rate,
    COUNTIF(returned_d7) AS returned_d7,
    SAFE_DIVIDE(COUNTIF(returned_d7), COUNT(*)) AS return_d7_rate
  )) AS payload
  FROM first_touch_instance_facts
),
acquisition_channel_rows AS (
  SELECT 'acquisition_channel' AS row_kind, TO_JSON_STRING(STRUCT(
    IFNULL(acquisition_channel_bucket, 'direct_or_unknown') AS channel,
    COUNT(*) AS consented_first_touch_app_instances
  )) AS payload
  FROM first_touch_instance_facts
  GROUP BY channel
),
review_answers AS (
  SELECT * FROM base WHERE event_name = 'learning_review_answer'
),
review_summary_row AS (
  SELECT 'review_summary' AS row_kind, TO_JSON_STRING(STRUCT(
    COUNT(*) AS persisted_answers,
    COUNT(DISTINCT user_pseudo_id) AS consented_app_instances,
    COUNTIF(correct = 1) AS correct_answers,
    SAFE_DIVIDE(COUNTIF(correct = 1), COUNT(*)) AS first_answer_accuracy,
    COUNTIF(actual_delay_bucket IN ('d1_to_d6', 'd7_to_d29', 'd30_plus')) AS delayed_answers,
    COUNTIF(correct = 1 AND actual_delay_bucket IN ('d1_to_d6', 'd7_to_d29', 'd30_plus')) AS correct_delayed_answers,
    SAFE_DIVIDE(
      COUNTIF(correct = 1 AND actual_delay_bucket IN ('d1_to_d6', 'd7_to_d29', 'd30_plus')),
      COUNTIF(actual_delay_bucket IN ('d1_to_d6', 'd7_to_d29', 'd30_plus'))
    ) AS delayed_recall_accuracy,
    APPROX_QUANTILES(response_time_ms, 100)[OFFSET(50)] AS p50_response_time_ms
  )) AS payload
  FROM review_answers
),
review_delay_rows AS (
  SELECT 'review_delay' AS row_kind, TO_JSON_STRING(STRUCT(
    IFNULL(actual_delay_bucket, 'unknown') AS delay_bucket,
    COUNT(*) AS answers,
    COUNTIF(correct = 1) AS correct_answers,
    SAFE_DIVIDE(COUNTIF(correct = 1), COUNT(*)) AS accuracy,
    COUNT(DISTINCT user_pseudo_id) AS consented_app_instances
  )) AS payload
  FROM review_answers
  GROUP BY delay_bucket
),
mastery_transition_rows AS (
  SELECT 'mastery_transition' AS row_kind, TO_JSON_STRING(STRUCT(
    IFNULL(mastery_transition, 'none') AS transition,
    COUNT(*) AS events,
    COUNT(DISTINCT user_pseudo_id) AS consented_app_instances
  )) AS payload
  FROM review_answers
  GROUP BY transition
),
review_content_lesson_samples AS (
  SELECT lesson_id, COUNT(DISTINCT user_pseudo_id) AS lesson_app_instances
  FROM review_answers
  GROUP BY lesson_id
),
review_content_labeled_events AS (
  SELECT
    r.*,
    IF(s.lesson_app_instances >= 5, CAST(r.lesson_id AS STRING), 'suppressed_small_sample') AS diagnostic_group,
    IF(s.lesson_app_instances >= 5, r.lesson_id, NULL) AS output_lesson_id
  FROM review_answers r
  JOIN review_content_lesson_samples s USING (lesson_id)
),
review_content_grouped AS (
  SELECT
    diagnostic_group,
    output_lesson_id,
    COUNT(*) AS answers,
    COUNTIF(correct = 1) AS correct_answers,
    COUNTIF(mastery_transition = 'mastered') AS mastered_transitions,
    COUNTIF(mastery_transition = 'durable_mastered') AS durable_mastered_transitions,
    COUNTIF(mastery_transition = 'lapsed') AS lapses,
    COUNT(DISTINCT user_pseudo_id) AS app_instances
  FROM review_content_labeled_events
  GROUP BY diagnostic_group, output_lesson_id
),
review_content_rows AS (
  SELECT 'review_content' AS row_kind, TO_JSON_STRING(STRUCT(
    diagnostic_group,
    output_lesson_id AS lesson_id,
    answers,
    correct_answers,
    SAFE_DIVIDE(correct_answers, answers) AS accuracy,
    mastered_transitions,
    durable_mastered_transitions,
    lapses,
    app_instances AS consented_app_instances
  )) AS payload
  FROM review_content_grouped
),
review_session_facts AS (
  SELECT
    user_pseudo_id,
    review_session_id,
    COUNTIF(event_name = 'learning_review_session_start') > 0 AS has_start,
    COUNTIF(event_name = 'learning_review_session_complete') > 0 AS has_complete,
    COUNTIF(event_name = 'learning_review_session_abandoned') > 0 AS has_abandoned,
    MAX(IF(event_name = 'learning_review_session_complete', duration_ms, NULL)) AS completed_duration_ms
  FROM base
  WHERE event_name IN (
    'learning_review_session_start',
    'learning_review_session_complete',
    'learning_review_session_abandoned'
  )
    AND user_pseudo_id IS NOT NULL
    AND review_session_id IS NOT NULL
  GROUP BY user_pseudo_id, review_session_id
),
review_session_summary_row AS (
  SELECT 'review_session_summary' AS row_kind, TO_JSON_STRING(STRUCT(
    COUNTIF(has_start) AS starts,
    COUNTIF(has_start AND has_complete) AS completes,
    COUNTIF(has_start AND has_abandoned AND NOT has_complete) AS abandons,
    SAFE_DIVIDE(COUNTIF(has_start AND has_complete), COUNTIF(has_start)) AS completion_rate,
    COUNT(DISTINCT user_pseudo_id) AS consented_app_instances,
    APPROX_QUANTILES(IF(has_start AND has_complete, completed_duration_ms, NULL), 100)[OFFSET(50)] AS p50_completed_duration_ms
  )) AS payload
  FROM review_session_facts
),
meaningful_learning_events AS (
  SELECT
    user_pseudo_id,
    event_timestamp,
    DATE(TIMESTAMP_MICROS(event_timestamp)) AS activity_date,
    event_name,
    correct,
    actual_delay_bucket
  FROM base
  WHERE user_pseudo_id IS NOT NULL
    AND event_name IN ('lesson_complete', 'learning_review_answer')
),
weekly_effective_instance_facts AS (
  SELECT
    DATE_TRUNC(activity_date, WEEK(MONDAY)) AS week_start_utc,
    user_pseudo_id,
    COUNT(DISTINCT activity_date) AS meaningful_learning_days,
    COUNTIF(
      event_name = 'learning_review_answer'
      AND correct = 1
      AND actual_delay_bucket IN ('d1_to_d6', 'd7_to_d29', 'd30_plus')
    ) AS correct_delayed_reviews,
    MAX(event_timestamp) AS data_through_micros
  FROM meaningful_learning_events
  GROUP BY week_start_utc, user_pseudo_id
),
weekly_effective_learner_rows AS (
  SELECT 'weekly_effective_learner' AS row_kind, TO_JSON_STRING(STRUCT(
    CAST(week_start_utc AS STRING) AS week_start_utc,
    (
      week_start_utc >= PARSE_DATE('%Y%m%d', @fromSuffix)
      AND data_through_date >= DATE_ADD(week_start_utc, INTERVAL 7 DAY)
    ) AS is_complete_week,
    COUNT(*) AS active_consented_app_instances,
    COUNTIF(meaningful_learning_days >= 2 AND correct_delayed_reviews >= 1) AS weekly_effective_learners,
    SAFE_DIVIDE(
      COUNTIF(meaningful_learning_days >= 2 AND correct_delayed_reviews >= 1),
      COUNT(*)
    ) AS weekly_effective_learner_rate,
    SUM(correct_delayed_reviews) AS delayed_success_count,
    MAX(data_through_micros) AS data_through_micros
  )) AS payload
  FROM weekly_effective_instance_facts
  CROSS JOIN warehouse_watermark
  GROUP BY week_start_utc, data_through_date
),
experiment_exposure_rows AS (
  SELECT 'experiment_exposure' AS row_kind, TO_JSON_STRING(STRUCT(
    experiment_id,
    experiment_definition_version AS definition_version,
    experiment_variant_id AS variant_id,
    experiment_control_variant_id AS control_variant_id,
    experiment_surface AS surface,
    experiment_config_revision AS config_revision,
    COUNT(DISTINCT exposure_id) AS exposures,
    COUNT(DISTINCT user_pseudo_id) AS consented_app_instances,
    MAX(event_timestamp) AS data_through_micros,
    'behavioral_only_no_server_revenue_join' AS outcome_scope
  )) AS payload
  FROM base
  WHERE event_name = 'experiment_exposure'
    AND assignment_quality = 'frozen'
    AND experiment_id IS NOT NULL
    AND exposure_id IS NOT NULL
  GROUP BY experiment_id, definition_version, variant_id, control_variant_id, surface, config_revision
),
release_adoption_rows AS (
  SELECT 'release_adoption' AS row_kind, TO_JSON_STRING(STRUCT(
    IFNULL(NULLIF(app_version, ''), 'unknown') AS app_version,
    IFNULL(NULLIF(build_number, ''), 'unknown') AS build_number,
    platform,
    COUNT(DISTINCT user_pseudo_id) AS consented_app_instances,
    COUNT(DISTINCT session_id) AS consented_sessions,
    MAX(event_timestamp) AS data_through_micros,
    'analytics_consent_only' AS coverage
  )) AS payload
  FROM base
  WHERE event_name = 'product_session_start'
  GROUP BY app_version, build_number, platform
),
operation_failure_rows AS (
  SELECT 'operation_failure' AS row_kind, TO_JSON_STRING(STRUCT(
    IFNULL(NULLIF(app_version, ''), 'unknown') AS app_version,
    IFNULL(NULLIF(build_number, ''), 'unknown') AS build_number,
    platform,
    IFNULL(NULLIF(feature, ''), 'unknown') AS feature,
    IFNULL(NULLIF(operation, ''), 'unknown') AS operation,
    IFNULL(NULLIF(failure_code, ''), 'unknown_bounded') AS failure_code,
    retryable,
    COUNT(*) AS failures,
    COUNT(DISTINCT user_pseudo_id) AS affected_consented_app_instances,
    MAX(event_timestamp) AS data_through_micros
  )) AS payload
  FROM base
  WHERE event_name = 'product_operation_failure'
  GROUP BY app_version, build_number, platform, feature, operation, failure_code, retryable
),
daily_kpi_rows AS (
  SELECT 'daily_kpi' AS row_kind, TO_JSON_STRING(STRUCT(
    FORMAT_DATE('%Y-%m-%d', DATE(TIMESTAMP_MICROS(event_timestamp), @reportingTimezone)) AS local_date,
    COUNT(DISTINCT IF(event_name = 'product_session_start', session_id, NULL)) AS sessions,
    COUNT(DISTINCT IF(event_name = 'product_session_start', user_pseudo_id, NULL)) AS active_consented_app_instances,
    COUNTIF(event_name = 'product_screen_view') AS screen_views,
    COUNTIF(event_name = 'lesson_start') AS lesson_starts,
    COUNTIF(event_name = 'lesson_complete') AS lesson_completes,
    COUNTIF(event_name = 'learning_review_answer') AS review_answers
  )) AS payload
  FROM base
  GROUP BY local_date
),
quality_row AS (
  SELECT 'quality' AS row_kind, TO_JSON_STRING(STRUCT(
    COUNTIF(event_name = 'product_screen_view') AS screen_views,
    COUNTIF(event_name = 'product_screen_view' AND (screen_id IS NULL OR screen_id = 'unknown_screen')) AS unknown_screen_views,
    SAFE_DIVIDE(
      COUNTIF(event_name = 'product_screen_view' AND (screen_id IS NULL OR screen_id = 'unknown_screen')),
      COUNTIF(event_name = 'product_screen_view')
    ) AS unknown_screen_rate,
    COUNTIF((STARTS_WITH(event_name, 'learning_review_') OR STARTS_WITH(event_name, 'product_') OR STARTS_WITH(event_name, 'experiment_')) AND event_id IS NULL) AS missing_event_ids,
    COUNTIF((STARTS_WITH(event_name, 'learning_review_') OR STARTS_WITH(event_name, 'product_') OR STARTS_WITH(event_name, 'experiment_')) AND session_id IS NULL) AS missing_session_ids,
    (SELECT COUNTIF(duplicate_rank > 1) FROM raw_base WHERE STARTS_WITH(event_name, 'learning_review_') OR STARTS_WITH(event_name, 'product_') OR STARTS_WITH(event_name, 'experiment_')) AS duplicate_events,
    (SELECT COUNTIF((STARTS_WITH(event_name, 'learning_review_') OR STARTS_WITH(event_name, 'product_') OR STARTS_WITH(event_name, 'experiment_')) AND IFNULL(schema_version, -1) != 1) FROM raw_base) AS invalid_schema_events,
    COUNT(DISTINCT IF(event_name = 'product_session_start', session_id, NULL)) AS sessions,
    COUNT(DISTINCT IF(STARTS_WITH(event_name, 'product_'), user_pseudo_id, NULL)) AS consented_app_instances,
    COUNT(DISTINCT IF(
      user_first_touch_timestamp IS NOT NULL
      AND user_first_touch_timestamp > 0
      AND user_first_touch_timestamp <= event_timestamp,
      user_pseudo_id,
      NULL
    )) AS valid_first_touch_app_instances,
    COUNT(DISTINCT user_pseudo_id) - COUNT(DISTINCT IF(
      user_first_touch_timestamp IS NOT NULL
      AND user_first_touch_timestamp > 0
      AND user_first_touch_timestamp <= event_timestamp,
      user_pseudo_id,
      NULL
    )) AS invalid_or_missing_first_touch_app_instances,
    SAFE_DIVIDE(
      COUNT(DISTINCT IF(
        user_first_touch_timestamp IS NOT NULL
        AND user_first_touch_timestamp > 0
        AND user_first_touch_timestamp <= event_timestamp,
        user_pseudo_id,
        NULL
      )),
      COUNT(DISTINCT user_pseudo_id)
    ) AS first_touch_coverage_rate,
    MAX(IF(STARTS_WITH(event_name, 'learning_review_') OR STARTS_WITH(event_name, 'product_') OR STARTS_WITH(event_name, 'experiment_'), event_timestamp, NULL)) AS data_through_micros
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
UNION ALL SELECT * FROM true_retention_day_rows
UNION ALL SELECT * FROM true_retention_summary_row
UNION ALL SELECT * FROM active_day_bucket_rows
UNION ALL SELECT * FROM activation_summary_row
UNION ALL SELECT * FROM acquisition_channel_rows
UNION ALL SELECT * FROM review_summary_row
UNION ALL SELECT * FROM review_delay_rows
UNION ALL SELECT * FROM mastery_transition_rows
UNION ALL SELECT * FROM review_content_rows
UNION ALL SELECT * FROM review_session_summary_row
UNION ALL SELECT * FROM weekly_effective_learner_rows
UNION ALL SELECT * FROM experiment_exposure_rows
UNION ALL SELECT * FROM release_adoption_rows
UNION ALL SELECT * FROM operation_failure_rows
UNION ALL SELECT * FROM daily_kpi_rows
UNION ALL SELECT * FROM quality_row
UNION ALL SELECT * FROM session_summary_row
UNION ALL SELECT * FROM session_bucket_rows
UNION ALL SELECT * FROM session_entry_rows
UNION ALL SELECT * FROM session_last_rows
`;
}
function buildProductAnalyticsPurchaseFailureQuery(table) {
    return `
WITH raw_failures AS (
  SELECT
    user_pseudo_id,
    (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'error') AS purchase_error,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(
        (SELECT value.string_value FROM UNNEST(event_params) WHERE key = 'event_id'),
        CONCAT(event_name, ':', user_pseudo_id, ':', CAST(event_timestamp AS STRING))
      )
      ORDER BY event_timestamp
    ) AS duplicate_rank
  FROM ${table}
  WHERE _TABLE_SUFFIX BETWEEN @fromSuffix AND @toSuffix
    AND event_timestamp >= @fromMicros
    AND event_timestamp < @toMicrosExclusive
    AND (@platform = 'all' OR LOWER(platform) = @platform)
    AND event_name = 'purchase_failed'
),
deduplicated_failures AS (
  SELECT user_pseudo_id, purchase_error
  FROM raw_failures
  WHERE duplicate_rank = 1
),
governed_failures AS (
  SELECT
    user_pseudo_id,
    CASE
      WHEN purchase_error IN (
        'identity_sync', 'no_active_entitlement_after_purchase', 'payment_pending',
        'network_error', 'payment_error', 'store_error', 'configuration_error',
        'sdk_other', 'unknown'
      ) THEN purchase_error
      ELSE 'legacy_or_other'
    END AS reason
  FROM deduplicated_failures
)
SELECT
  'conversion_failure' AS row_kind,
  TO_JSON_STRING(STRUCT(
    reason,
    COUNT(*) AS events,
    COUNT(DISTINCT user_pseudo_id) AS app_instances
  )) AS payload
FROM governed_failures
GROUP BY reason
ORDER BY reason
LIMIT 10
`;
}
function yyyymmdd(date) {
    return date.toISOString().slice(0, 10).replace(/-/g, '');
}
function bigQueryLocation() {
    const location = String(process.env.ANALYTICS_BIGQUERY_LOCATION ?? 'US').trim();
    return /^[A-Za-z0-9-]{2,30}$/.test(location) ? location : 'US';
}
function parseProductAnalyticsPayload(row) {
    return (0, admin_analytics_trends_core_1.parseProductAnalyticsPayloadValue)(row.payload);
}
async function loadProductAnalyticsAggregateRows(input) {
    const start = new Date(input.startMs);
    const endInclusive = new Date(Math.max(input.startMs, input.endExclusiveMs - 1));
    const reportingTimezone = input.reportingTimezone ?? 'UTC';
    const localDate = (value) => new Intl.DateTimeFormat('en-CA', {
        timeZone: reportingTimezone, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(value);
    const bigquery = new bigquery_1.BigQuery();
    try {
        const [rows] = await bigquery.query({
            query: buildProductAnalyticsAggregateQuery(datasetTable()),
            params: {
                fromSuffix: yyyymmdd(start),
                toSuffix: yyyymmdd(endInclusive),
                fromMicros: Math.floor(input.startMs * 1000),
                toMicrosExclusive: Math.floor(input.endExclusiveMs * 1000),
                reportFromDate: localDate(start),
                reportToDate: localDate(endInclusive),
                reportingTimezone,
                platform: input.platform ?? 'all',
            },
            location: bigQueryLocation(),
            maximumBytesBilled: input.maximumBytesBilled ?? '5000000000',
        });
        return { rows, exportPending: false };
    }
    catch (error) {
        if (!isAnalyticsExportPendingError(error))
            throw error;
        return { rows: [], exportPending: true };
    }
}
async function loadProductAnalyticsPurchaseFailureRows(input) {
    const start = new Date(input.startMs);
    const endInclusive = new Date(Math.max(input.startMs, input.endExclusiveMs - 1));
    const bigquery = new bigquery_1.BigQuery();
    try {
        const [rows] = await bigquery.query({
            query: buildProductAnalyticsPurchaseFailureQuery(datasetTable()),
            params: {
                fromSuffix: yyyymmdd(start),
                toSuffix: yyyymmdd(endInclusive),
                fromMicros: Math.floor(input.startMs * 1000),
                toMicrosExclusive: Math.floor(input.endExclusiveMs * 1000),
                platform: input.platform ?? 'all',
            },
            location: bigQueryLocation(),
            maximumBytesBilled: input.maximumBytesBilled ?? '5000000000',
            maxResults: 10,
        });
        const boundedRows = rows
            .filter((row) => row.row_kind === 'conversion_failure')
            .slice(0, 10);
        return { rows: boundedRows, exportPending: false };
    }
    catch (error) {
        if (!isAnalyticsExportPendingError(error))
            throw error;
        return { rows: [], exportPending: true };
    }
}
function isAnalyticsExportPendingError(error) {
    const candidate = error;
    const code = Number(candidate?.code);
    const message = String(candidate?.message ?? '').toLowerCase();
    return code === 404
        || message.includes('does not match any table')
        || message.includes('not found: table');
}
exports.adminProductAnalytics = (0, https_1.onCall)({
    region: REGION,
    enforceAppCheck: callable_options_1.ENFORCE_APP_CHECK,
    timeoutSeconds: 60,
    memory: '512MiB',
}, async (request) => {
    if (!(0, permissions_1.hasClaimedPermission)(request.auth?.token, 'money.read')) {
        throw new https_1.HttpsError('permission-denied', 'money.read permission required');
    }
    const rangeDays = clampProductAnalyticsDays(request.data?.rangeDays);
    const platform = normalizeProductAnalyticsPlatform(request.data?.platform);
    const cacheKey = `${rangeDays}:${platform}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAtMs > Date.now())
        return cached.value;
    const now = new Date();
    const from = new Date(now.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000);
    const { rows, exportPending } = await loadProductAnalyticsAggregateRows({
        startMs: from.getTime(),
        endExclusiveMs: now.getTime() + 1,
        platform,
    });
    const screens = [];
    const lessons = [];
    const learningCheckpoints = [];
    const conversionContexts = [];
    const conversionImpressions = [];
    const conversionInventory = [];
    const conversionFailures = [];
    const retentionDays = [];
    const trueRetentionDays = [];
    const activeDayBuckets = [];
    const acquisitionChannels = [];
    const sessionBuckets = [];
    const sessionEntryScreens = [];
    const sessionLastScreens = [];
    const reviewDelayBuckets = [];
    const masteryTransitions = [];
    const reviewContentDiagnostics = [];
    const weeklyEffectiveLearners = [];
    const experimentExposures = [];
    const releaseAdoption = [];
    const operationFailures = [];
    let sessionSummary = {};
    let learningSummary = {};
    let retentionSummary = {};
    let trueRetentionSummary = {};
    let activationSummary = {};
    let reviewSummary = {};
    let reviewSessionSummary = {};
    let quality = exportPending
        ? { export_status: 'waiting_for_first_daily_export' }
        : {};
    for (const row of rows) {
        const payload = parseProductAnalyticsPayload(row);
        if (!payload)
            continue;
        if (row.row_kind === 'screen')
            screens.push(payload);
        else if (row.row_kind === 'lesson')
            lessons.push(payload);
        else if (row.row_kind === 'learning_checkpoint')
            learningCheckpoints.push(payload);
        else if (row.row_kind === 'learning_summary')
            learningSummary = payload;
        else if (row.row_kind === 'conversion_context')
            conversionContexts.push(payload);
        else if (row.row_kind === 'conversion_impression')
            conversionImpressions.push(payload);
        else if (row.row_kind === 'conversion_inventory')
            conversionInventory.push(payload);
        else if (row.row_kind === 'conversion_failure')
            conversionFailures.push(payload);
        else if (row.row_kind === 'retention_day')
            retentionDays.push(payload);
        else if (row.row_kind === 'retention_summary')
            retentionSummary = payload;
        else if (row.row_kind === 'true_retention_day')
            trueRetentionDays.push(payload);
        else if (row.row_kind === 'true_retention_summary')
            trueRetentionSummary = payload;
        else if (row.row_kind === 'active_day_bucket')
            activeDayBuckets.push(payload);
        else if (row.row_kind === 'activation_summary')
            activationSummary = payload;
        else if (row.row_kind === 'acquisition_channel')
            acquisitionChannels.push(payload);
        else if (row.row_kind === 'review_summary')
            reviewSummary = payload;
        else if (row.row_kind === 'review_delay')
            reviewDelayBuckets.push(payload);
        else if (row.row_kind === 'mastery_transition')
            masteryTransitions.push(payload);
        else if (row.row_kind === 'review_content')
            reviewContentDiagnostics.push(payload);
        else if (row.row_kind === 'review_session_summary')
            reviewSessionSummary = payload;
        else if (row.row_kind === 'weekly_effective_learner')
            weeklyEffectiveLearners.push(payload);
        else if (row.row_kind === 'experiment_exposure')
            experimentExposures.push(payload);
        else if (row.row_kind === 'release_adoption')
            releaseAdoption.push(payload);
        else if (row.row_kind === 'operation_failure')
            operationFailures.push(payload);
        else if (row.row_kind === 'quality')
            quality = payload;
        else if (row.row_kind === 'session_summary')
            sessionSummary = payload;
        else if (row.row_kind === 'session_bucket')
            sessionBuckets.push(payload);
        else if (row.row_kind === 'session_entry')
            sessionEntryScreens.push(payload);
        else if (row.row_kind === 'session_last')
            sessionLastScreens.push(payload);
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
                const impressionRow = conversionImpressions.find((candidate) => (candidate.context === contextRow.context && candidate.source === contextRow.source));
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
        acquisition: {
            firebaseFirstTouch: {
                status: exportPending ? 'waiting_for_first_daily_export' : 'available_consent_observed',
                entity: 'app_instance',
                channels: acquisitionChannels.sort((a, b) => (Number(b.consented_first_touch_app_instances ?? 0) - Number(a.consented_first_touch_app_instances ?? 0))),
            },
            storeImports: { status: 'unavailable_not_configured' },
            adSpendImports: { status: 'unavailable_not_configured' },
            missingSourcesAreZero: false,
        },
        activation: {
            ...activationSummary,
            definition: 'first_touch_to_onboarding_to_learning_to_return_v1',
            entity: 'app_instance',
            coverage: 'analytics_consent_only',
        },
        trueRetention: {
            ...trueRetentionSummary,
            cohorts: trueRetentionDays.sort((a, b) => String(b.cohort_date ?? '').localeCompare(String(a.cohort_date ?? ''))),
            activeDayBuckets,
            definition: 'firebase_user_first_touch_timestamp_consent_observed_v1',
            entity: 'app_instance',
            coverage: 'analytics_consent_only',
            exactDefinition: 'activity_on_exact_calendar_day_after_first_touch',
            rollingDefinition: 'activity_on_or_after_calendar_day_through_data_watermark',
        },
        sessions: {
            ...sessionSummary,
            buckets: sessionBuckets,
            entryScreens: sessionEntryScreens.sort((a, b) => Number(b.sessions ?? 0) - Number(a.sessions ?? 0)),
            lastObservedScreens: sessionLastScreens.sort((a, b) => Number(b.sessions ?? 0) - Number(a.sessions ?? 0)),
        },
        learningOutcomes: {
            review: reviewSummary,
            reviewSessions: reviewSessionSummary,
            delayBuckets: reviewDelayBuckets,
            masteryTransitions,
            contentDiagnostics: reviewContentDiagnostics,
            weeklyEffectiveLearners: weeklyEffectiveLearners.sort((a, b) => (String(b.week_start_utc ?? '').localeCompare(String(a.week_start_utc ?? '')))),
            entity: 'consent_observed_app_instance',
            weekDefinition: 'utc_monday_start',
            masteryDefinition: 'observed_correct_recall_after_7d_v1',
            durableMasteryDefinition: 'observed_correct_recall_after_30d_v1',
        },
        experiments: {
            exposures: experimentExposures,
            causalOutcomeStatus: 'unavailable_until_predeclared_metric_maturity_and_sample_are_met',
            serverRevenueStatus: 'unavailable_no_governed_cross_source_join',
            automaticWinnerSelection: false,
        },
        reliability: {
            releaseAdoption,
            operationFailures,
            criticalReportAggregates: { status: 'available_from_separate_bounded_app_errors_source' },
            crashFreeUsers: 'unavailable_no_crashlytics_aggregate_export',
            crashFreeSessions: 'unavailable_no_crashlytics_aggregate_export',
            anrRate: 'unavailable_no_crashlytics_aggregate_export',
            nativeColdStart: 'unavailable_no_native_performance_export',
            automaticHealthyStatus: false,
        },
        quality,
    };
    cache.set(cacheKey, { expiresAtMs: Date.now() + CACHE_TTL_MS, value });
    return value;
});
//# sourceMappingURL=admin_product_analytics.js.map