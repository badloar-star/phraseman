/**
 * Account-local storage used by level gift inventory and level-up recovery.
 * Keep this dependency-free so account wipe code can import it without loading
 * gift rolling or UI modules.
 */
export const UNCLAIMED_GIFTS_KEY = 'unclaimed_level_gifts';
export const CLAIMED_GIFTS_KEY = 'claimed_level_gifts';
export const UNCLAIMED_DUAL_GIFTS_KEY = 'unclaimed_level_gifts_dual_v1';
export const CLAIMED_DUAL_LEVELS_KEY = 'claimed_level_gift_dual_flag_v1';
export const PARTIAL_DUAL_CLAIMED_LEVELS_KEY = 'partial_dual_claimed_levels_v1';
export const PENDING_LEVEL_GIFT_COUNT_CACHE_KEY = 'pending_level_gift_count_cache_v1';
/** уровень → мс получения подарка; отсюда считается 72-часовой таймер сгорания. */
export const UNCLAIMED_GIFT_RECEIVED_AT_KEY = 'unclaimed_level_gift_received_at_v1';

export const PENDING_LEVEL_UP_QUEUE_KEY = 'pending_level_up_queue';
export const LEVEL_UP_REWARD_RETRY_KEY = 'pending_level_up_reward_retry_v1';
export const LEVEL_UP_REWARD_CONTEXT_KEY = 'pending_level_up_reward_context_v1';
export const LEVEL_UP_REWARD_FALLBACK_KEY = 'pending_level_up_reward_fallback_v1';
export const LEVEL_UP_REWARD_OWNER_KEY = 'pending_level_up_reward_owner_v1';
export const LEVEL_UP_REWARD_QUEUE_QUARANTINE_KEY = 'pending_level_up_queue_quarantine_v1';
export const LEVEL_UP_REWARD_RETRY_QUARANTINE_KEY = 'pending_level_up_reward_retry_quarantine_v1';
export const LEVEL_UP_REWARD_CONTEXT_QUARANTINE_KEY = 'pending_level_up_reward_context_quarantine_v1';
export const LEVEL_UP_REWARD_FALLBACK_QUARANTINE_KEY = 'pending_level_up_reward_fallback_quarantine_v1';

export const LEVEL_GIFT_INVENTORY_ACCOUNT_LOCAL_KEYS = [
  UNCLAIMED_GIFTS_KEY,
  CLAIMED_GIFTS_KEY,
  UNCLAIMED_DUAL_GIFTS_KEY,
  CLAIMED_DUAL_LEVELS_KEY,
  PARTIAL_DUAL_CLAIMED_LEVELS_KEY,
  PENDING_LEVEL_GIFT_COUNT_CACHE_KEY,
  UNCLAIMED_GIFT_RECEIVED_AT_KEY,
] as const;

export const LEVEL_UP_REWARD_RECOVERY_ACCOUNT_LOCAL_KEYS = [
  PENDING_LEVEL_UP_QUEUE_KEY,
  LEVEL_UP_REWARD_RETRY_KEY,
  LEVEL_UP_REWARD_CONTEXT_KEY,
  LEVEL_UP_REWARD_FALLBACK_KEY,
  LEVEL_UP_REWARD_OWNER_KEY,
  LEVEL_UP_REWARD_QUEUE_QUARANTINE_KEY,
  LEVEL_UP_REWARD_RETRY_QUARANTINE_KEY,
  LEVEL_UP_REWARD_CONTEXT_QUARANTINE_KEY,
  LEVEL_UP_REWARD_FALLBACK_QUARANTINE_KEY,
] as const;

export const LEVEL_UP_ACCOUNT_LOCAL_KEYS = [
  ...LEVEL_GIFT_INVENTORY_ACCOUNT_LOCAL_KEYS,
  ...LEVEL_UP_REWARD_RECOVERY_ACCOUNT_LOCAL_KEYS,
] as const;
