import type { AccountGenerationToken } from './account_generation';

/**
 * Stable in-process cache scope for data that contains account-owned fields.
 * Transitional and not-yet-restored identities must never hydrate UI caches.
 */
export function accountScopeKey(token: AccountGenerationToken): string | null {
  if (token.phase !== 'active') return null;
  return `generation:${token.generation}:uid:${token.stableId ?? 'none'}`;
}
