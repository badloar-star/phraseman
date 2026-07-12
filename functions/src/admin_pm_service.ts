import crypto from 'node:crypto';

export type PmServiceValidation = { ok: true } | { ok: false; errors: string[] };

export function validatePmIdempotencyKey(value: unknown): PmServiceValidation {
  const errors: string[] = [];
  if (typeof value !== 'string') return { ok: false, errors: ['idempotency_key_not_string'] };
  if (value.length < 8 || value.length > 80) errors.push('idempotency_key_length');
  if (!/^[A-Za-z0-9._:-]+$/.test(value)) errors.push('idempotency_key_format');
  return errors.length ? { ok: false, errors } : { ok: true };
}

export function derivePmRunIds(idempotencyKey: string): { runId: string; briefId: string } {
  const hash = crypto.createHash('sha256').update(idempotencyKey).digest('hex').slice(0, 24);
  return {
    runId: `pmrun_${hash}`,
    briefId: `pmbrief_${hash}`,
  };
}
