/**
 * Friend code alphabet — Crockford-style base32, excluding visually ambiguous chars:
 *   0 (zero, looks like O)
 *   O (oh, looks like 0)
 *   1 (one, looks like I/L)
 *   I (eye, looks like 1/L)
 *   L (el, looks like 1/I)
 * Result: 32 chars to keep base32 entropy.
 */
export const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const FRIEND_CODE_LENGTH = 6;

/** Strict validation regex (uppercase only, exact length). */
const FRIEND_CODE_REGEX = new RegExp(`^[${FRIEND_CODE_ALPHABET}]{${FRIEND_CODE_LENGTH}}$`);

/**
 * Generate a random 6-char friend code from the safe base32 alphabet.
 * Uses Math.random — for collision resistance we rely on transactional
 * reservation in Firestore (see app/firestore_friends.ts), not on entropy.
 * 32^6 = ~1.07B → Birthday collision probability is negligible at <1M users.
 */
export function generateRandomCode(): string {
  let out = '';
  for (let i = 0; i < FRIEND_CODE_LENGTH; i++) {
    const idx = Math.floor(Math.random() * FRIEND_CODE_ALPHABET.length);
    out += FRIEND_CODE_ALPHABET[idx];
  }
  return out;
}

/**
 * Strict validation: 6 uppercase chars, all from FRIEND_CODE_ALPHABET.
 * Used by client-side input field BEFORE Firestore lookup (cheap fail-fast).
 */
export function isValidFriendCode(code: unknown): boolean {
  if (typeof code !== 'string') return false;
  return FRIEND_CODE_REGEX.test(code);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
