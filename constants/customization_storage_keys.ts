export const CUSTOM_AVATAR_OWNED_KEY = 'custom_avatar_owned_v1';
export const CUSTOM_AVATAR_GIFT_OWNED_KEY = 'custom_avatar_gift_owned_v1';
export const USER_AVATAR_AURA_KEY = 'user_avatar_aura';
export const AVATAR_AURA_OWNED_KEY = 'avatar_aura_owned_v1';
export const AVATAR_AURA_GIFT_OWNED_KEY = 'avatar_aura_gift_owned_v1';
export const CUSTOMIZATION_PURCHASE_INTENT_KEY = 'customization_purchase_intent_v1';
export const SHARD_SPEND_OP_LEDGER_KEY = 'shard_spend_op_ledger_v1';
export const CUSTOM_AVATAR_GIFT_REPLAY_KEY = 'custom_avatar_gift_replay_v1';

export const CUSTOMIZATION_STORAGE_KEYS = [
  USER_AVATAR_AURA_KEY,
  CUSTOM_AVATAR_OWNED_KEY,
  CUSTOM_AVATAR_GIFT_OWNED_KEY,
  AVATAR_AURA_OWNED_KEY,
  AVATAR_AURA_GIFT_OWNED_KEY,
] as const;

export const CUSTOMIZATION_ACCOUNT_LOCAL_KEYS = [
  CUSTOMIZATION_PURCHASE_INTENT_KEY,
  SHARD_SPEND_OP_LEDGER_KEY,
  CUSTOM_AVATAR_GIFT_REPLAY_KEY,
] as const;
