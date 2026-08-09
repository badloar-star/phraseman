let explainUsageSequence = 0;

/**
 * Client-generated idempotency key for one user-visible explanation action.
 * It stays stable across the action's silent retries, so a callable that finished
 * just before a client timeout cannot consume the Free allowance twice.
 */
export function createExplainUsageId(surface: string): string {
  explainUsageSequence = (explainUsageSequence + 1) % 1_000_000;
  const safeSurface = String(surface || 'explain').replace(/[^a-z0-9_-]/gi, '').slice(0, 20) || 'explain';
  const random = Math.random().toString(36).slice(2, 10);
  return `${safeSurface}_${Date.now().toString(36)}_${explainUsageSequence.toString(36)}_${random}`.slice(0, 96);
}
