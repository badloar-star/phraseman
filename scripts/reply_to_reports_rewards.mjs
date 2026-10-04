/**
 * Правила награды за репорт для scripts/reply_to_reports.mjs — чистые функции без Firebase.
 *
 * зачем (D109, владелец 2026-09-30): награда за репорт — ТОЛЬКО монеты 300/600/1000; жемчужную часть
 * монетами не заменять. Скрипт раньше выдавал спины/руны/жемчуг (набор v1). Формат v2
 * `{ version: 2, severity, coins }` — тот же, что у сервера (functions/src/report_replies.ts) и клиента
 * (app/report_reward_bundle.ts): сервер принимает только точное совпадение с таблицей.
 */

export const REPORT_REWARD_BUNDLES = Object.freeze({
  none: Object.freeze({ version: 2, severity: 'none', coins: 0 }),
  minor: Object.freeze({ version: 2, severity: 'minor', coins: 300 }),
  serious: Object.freeze({ version: 2, severity: 'serious', coins: 600 }),
  critical: Object.freeze({ version: 2, severity: 'critical', coins: 1000 }),
});

/** Старый набор v1 (спины/руны/жемчуг) — только чтобы узнать уровень и перевести его в монеты. */
const LEGACY_V1_TIERS = Object.freeze({
  none: { spins: 0, runes: 0, pearls: 0 },
  minor: { spins: 1, runes: 300, pearls: 1 },
  serious: { spins: 2, runes: 600, pearls: 5 },
  critical: { spins: 3, runes: 1000, pearls: 10 },
});

export const REPORT_COLLECTIONS = new Set(['error_reports', 'explain_report_entries', 'user_reports', 'community_pack_reports']);
export const REPORT_RESOLUTIONS = new Set(['confirmed_fixed', 'duplicate', 'in_progress', 'rejected', 'unconfirmed']);
export const LEGACY_RESOLUTION_MAP = Object.freeze({
  confirmed_investigating: 'in_progress',
  content_review: 'in_progress',
  stale_content_not_reproduced: 'unconfirmed',
  not_reproduced: 'unconfirmed',
  by_design: 'rejected',
  user_error: 'rejected',
  no_issue_details: 'rejected',
});
const TITLE_MAX = 120;
const BODY_MAX = 1200;

export function bundleHasReward(bundle) {
  return bundle.coins > 0;
}

export function rewardLabel(bundle) {
  return bundle.severity === 'none' ? 'без награды' : `${bundle.coins} монет`;
}

/**
 * Точный набор v2 из таблицы. Набор v1 точного уровня переводится в монеты того же уровня
 * (как сервер для админки, `admin_v1_bundle_upgraded`). Любые другие суммы — null.
 */
export function resolveRewardBundle(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { bundle: null, upgradedFromV1: false };
  const tier = REPORT_REWARD_BUNDLES[String(value.severity || '')];
  if (!tier) return { bundle: null, upgradedFromV1: false };
  const version = Number(value.version);
  if (version === 2) {
    const keys = Object.keys(value).sort().join(',');
    return { bundle: keys === 'coins,severity,version' && Number(value.coins) === tier.coins ? tier : null, upgradedFromV1: false };
  }
  if (version === 1) {
    const legacy = LEGACY_V1_TIERS[tier.severity];
    const exact = Number(value.spins) === legacy.spins && Number(value.runes) === legacy.runes && Number(value.pearls) === legacy.pearls;
    return { bundle: exact ? tier : null, upgradedFromV1: exact };
  }
  return { bundle: null, upgradedFromV1: false };
}

export function sanitizePreparedReplyBody(value) {
  return String(value || '')
    .replace(/(^|[.!?]\s+)[^.!?\n]*(?:вам\s+(?:начисл\p{L}*|нарах\p{L}*)|за\s+(?:находку|знахідку)\s+(?:начисл\p{L}*|нарах\p{L}*))[^.!?\n]*[.!?]?/giu, '$1')
    .replace(/(^|[.!?]\s+)(?=[^.!?\n]*(?:жемчуж\p{L}*|перлин\p{L}*|спин\p{L}*|рун\p{L}*))(?=[^.!?\n]*(?:забрат\p{L}*|отрим\p{L}*|получ\p{L}*|награ\p{L}*|бонус\p{L}*|подяк\p{L}*))[^.!?\n]*[.!?]?/giu, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Разбор одной строки replies.json. Ошибка → { error }, иначе { item, warning? }. */
export function normalizeReplyRow(row, index) {
  const at = `элемент #${index + 1}`;
  const reportId = String(row?.reportId ?? '').trim();
  const uid = String(row?.uid ?? '').trim();
  const title = String(row?.title ?? '').trim().slice(0, TITLE_MAX);
  const body = sanitizePreparedReplyBody(row?.body).slice(0, BODY_MAX);
  const legacyShards = Math.floor(Number(row?.shards ?? 0));
  const rawResolution = String(row?.resolution ?? (legacyShards > 0 ? 'confirmed_fixed' : 'unconfirmed')).trim();
  const resolution = LEGACY_RESOLUTION_MAP[rawResolution] || rawResolution;
  const resolved = row?.rewardBundle === undefined
    ? { bundle: legacyShards > 0 && resolution === 'confirmed_fixed' ? REPORT_REWARD_BUNDLES.minor : REPORT_REWARD_BUNDLES.none, upgradedFromV1: false }
    : resolveRewardBundle(row.rewardBundle);
  const reportCollection = String(row?.reportCollection ?? 'error_reports').trim();
  if (!reportId) return { error: `${at}: пустой reportId` };
  if (!uid || uid === 'unknown' || uid === 'test_uid_abc123') return { error: `${at}: невалидный uid "${uid}"` };
  if (!title || !body) return { error: `${at}: пустой title/body` };
  if (!REPORT_RESOLUTIONS.has(resolution)) return { error: `${at}: неизвестный resolution "${resolution}"` };
  if (!resolved.bundle) {
    return { error: `${at}: rewardBundle должен точно совпадать с уровнем D109: {"version":2,"severity":"none|minor|serious|critical","coins":0|300|600|1000}` };
  }
  if (bundleHasReward(resolved.bundle) && resolution !== 'confirmed_fixed') {
    return { error: `${at}: награда разрешена только при resolution=confirmed_fixed` };
  }
  if (!REPORT_COLLECTIONS.has(reportCollection)) return { error: `${at}: неизвестная reportCollection "${reportCollection}"` };
  return {
    item: { reportId, uid, title, body, resolution, rewardBundle: resolved.bundle, reportCollection },
    warning: resolved.upgradedFromV1
      ? `${at}: старый набор v1 (спины/руны/жемчуг) переведён в ${rewardLabel(resolved.bundle)} — D109`
      : undefined,
  };
}

/** Режим запуска: запись только при явном --send и без --dry-run; иначе предпросмотр. */
export function resolveRunMode(argv) {
  return argv.includes('--send') && !argv.includes('--dry-run') ? 'send' : 'dry-run';
}
