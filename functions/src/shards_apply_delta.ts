// ═══════════════════════════════════════════════════════════════════════════
// shards_apply_delta.ts — permanently retired server wallet callable.
//
// The callable never validates affordability, resolves a wallet
// owner, reads users.shards, or mutates a personal balance. Ordinary operations
// are client-journal entries; confirmed outside-world facts are immutable
// external_economy_events written by their narrow domain transaction.
// ═══════════════════════════════════════════════════════════════════════════

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
/** Compatibility export: authenticated callers always receive the retirement
 * error before any operation-specific validation or identity/database read. */
export const shardsApplyDelta = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Not authenticated');
  throw new HttpsError('failed-precondition', 'personal_balance_is_client_owned');
});
