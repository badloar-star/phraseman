import { readFileSync } from 'fs';
import { join } from 'path';
import {
  deriveComplianceCounts,
  normalizeSafetyListInput,
  normalizeSafetyMarkInput,
  safetyFlagMatchesFilter,
} from './admin_compliance';

describe('admin compliance pure contracts', () => {
  test('derives missing consent states and legacy open flags by subtraction', () => {
    expect(deriveComplianceCounts({ consentTotal: 10, adult: 4, teenSafe: 2, under13: 1,
      analyticsGranted: 3, analyticsDenied: 2, aiExplainGranted: 1, aiExplainDenied: 1,
      aiDialogGranted: 2, aiDialogDenied: 1,
      safetyTotal: 9, safetyHandled: 4,
      minorTotal: 5, minorHandled: 2 })).toMatchObject({
      consent: {
        brackets: { unknown: 3 },
        analytics: { granted: 3, denied: 2, unset: 5 },
        aiExplain: { granted: 1, denied: 1, unset: 8 },
        aiDialog: { granted: 2, denied: 1, unset: 7 },
      },
      safety: { open: 5, minor: { open: 3 } },
      jurisdiction: { status: 'unavailable_not_collected' }, complete: true,
    });
  });

  test('accepts strict filters and deterministic phase cursor', () => {
    expect(normalizeSafetyListInput({ handled: 'open', category: 'self_harm', limit: 100,
      cursor: { phase: 'dated', createdAtMs: 123, id: 'flag_1' } })).toMatchObject({ handled: 'open', category: 'self_harm', limit: 100 });
    expect(() => normalizeSafetyListInput({ handled: 'nope' })).toThrow();
    expect(() => normalizeSafetyListInput({ handled: 'all', category: 'other' })).toThrow();
    expect(() => normalizeSafetyListInput({ handled: 'open', limit: 101 })).toThrow();
  });

  test('treats missing handled as open and validates commands fail closed', () => {
    expect(safetyFlagMatchesFilter({ category: 'abuse' }, { handled: 'open', category: 'abuse' })).toBe(true);
    expect(safetyFlagMatchesFilter({ category: 'abuse', handled: true }, { handled: 'open', category: 'abuse' })).toBe(false);
    expect(normalizeSafetyMarkInput({ ids: ['a', 'a', 'b'], reason: 'reviewed', requestId: 'req_1', idempotencyKey: 'idem_1' }).ids).toEqual(['a', 'b']);
    expect(() => normalizeSafetyMarkInput({ ids: ['a'], reason: '', requestId: 'req_1', idempotencyKey: 'idem_1' })).toThrow();
  });

  test('callable source enforces App Check, permissions, exact counts, audit and honest pagination', () => {
    const source = readFileSync(join(__dirname, 'admin_compliance.ts'), 'utf8');
    expect(source).toContain("if (!request.app)");
    expect(source).toContain("requireAdmin(request, 'diagnostics.read')");
    expect(source).toContain("requireAdmin(request, 'diagnostics.status.write')");
    expect(source).toContain('.count().get()');
    expect(source).toContain("orderBy('createdAtMs', 'desc')");
    expect(source).toContain("phase: 'legacy'");
    expect(source).toContain('complete: exhausted');
    expect(source).toContain('pageComplete: rows.length >= filter.limit || exhausted');
    expect(source).toContain('scanBoundReached');
    expect(source).toContain('createAuditRecord({');
    expect(source).toContain('requestFingerprint');
  });
});
