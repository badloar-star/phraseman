export const INTRO_FULL_ACCESS_DURATION_MS = 72 * 60 * 60 * 1000;

export const INTRO_FULL_ACCESS_STARTED_AT_KEY = 'intro_full_access_started_at_v1';
export const INTRO_FULL_ACCESS_ENDS_AT_KEY = 'intro_full_access_ends_at_v1';
export const INTRO_FULL_ACCESS_WELCOME_SEEN_KEY = 'intro_full_access_welcome_seen_v1';
export const INTRO_FULL_ACCESS_ENDED_SEEN_KEY = 'intro_full_access_ended_seen_v1';

export const INTRO_FULL_ACCESS_STORAGE_KEYS = [
  INTRO_FULL_ACCESS_STARTED_AT_KEY,
  INTRO_FULL_ACCESS_ENDS_AT_KEY,
  INTRO_FULL_ACCESS_WELCOME_SEEN_KEY,
  INTRO_FULL_ACCESS_ENDED_SEEN_KEY,
] as const;
