// зачем (координатор 13.10, RELEASE_LOGGING_R1): коды причин в журнале обращения не должны пропускать личное —
// ни email, ни uid, ни UUID, ни свободный текст. Правильный код даёт событие feature_action «область:код».
const mockRecord = jest.fn(async (_event: unknown) => undefined);
jest.mock('../app/support_diagnostics', () => ({
  recordSupportDiagnostic: (event: unknown) => mockRecord(event),
}));

// eslint-disable-next-line import/first
import { isValidReleaseReasonCode, releaseReason } from '../app/release_reason';
// eslint-disable-next-line import/first
import { sanitizeSupportDiagnosticEvent } from '../app/support_diagnostic_schema';

describe('releaseReason', () => {
  beforeEach(() => {
    mockRecord.mockClear();
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  test('a valid code is recorded as a feature_action that survives the support schema', () => {
    releaseReason('purchase', 'rc_cancelled', 'blocked');
    expect(mockRecord).toHaveBeenCalledWith({ event: 'feature_action', action: 'purchase:rc_cancelled', result: 'blocked', subject: 'app' });
    const recorded = mockRecord.mock.calls[0][0] as Record<string, unknown>;
    expect(sanitizeSupportDiagnosticEvent({ ...recorded, atMs: 1_700_000_000_000 })).toMatchObject({ action: 'purchase:rc_cancelled', result: 'blocked' });
  });

  test.each([
    ['email', 'user@example.com'],
    ['uid', 'aB3dE5gH7jK9mN1pQ3sT5vX7'],
    ['lowercase id', 'ab3de5gh7jk9mn1pq3st5vx7'],
    ['uuid', '123e4567-e89b-12d3-a456-426614174000'],
    ['free text', 'card declined by bank'],
    ['uppercase', 'RC_Cancelled'],
    ['long digits', 'order_12345678'],
    ['too long', `a${'b'.repeat(40)}`],
    ['empty', ''],
  ])('rejects a code that looks like personal data or free text: %s', (_label, code) => {
    expect(isValidReleaseReasonCode(code)).toBe(false);
    releaseReason('energy', code);
    expect(mockRecord).not.toHaveBeenCalled();
  });

  test('an area outside the list is dropped (and is a type error)', () => {
    // @ts-expect-error — область не из списка
    releaseReason('payments', 'rc_cancelled');
    expect(mockRecord).not.toHaveBeenCalled();
  });

  test('never throws, even if the journal write fails', () => {
    mockRecord.mockRejectedValueOnce(new Error('disk'));
    expect(() => releaseReason('restore_purchase', 'failed', 'error')).not.toThrow();
  });
});

// зачем (координатор 13.10): причины отказа покупки, восстановления покупок и списания энергии подключены к журналу обращения.
describe('releaseReason wiring in money flows', () => {
  const fs = require('fs') as typeof import('fs');
  const path = require('path') as typeof import('path');
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

  test('purchase and restore failure branches report a code', () => {
    const src = read('app/paywall_purchase.ts');
    expect((src.match(/releaseReason\('purchase', /g) ?? []).length).toBe(11);
    expect((src.match(/releaseReason\('restore_purchase', /g) ?? []).length).toBe(5);
  });

  test('every energy start refusal reports its reason; the gate without deps too', () => {
    const energy = read('components/EnergyContext.tsx');
    expect(energy).toContain("if (decision === 'insufficient' || decision === 'cancelled') releaseReason('energy', reason, decision === 'insufficient' ? 'blocked' : 'error');");
    for (const reason of energy.match(/gateDecision\('(?:insufficient|cancelled)', '([a-z_]+)'/g) ?? []) {
      expect(isValidReleaseReasonCode(reason.replace(/^.*'([a-z_]+)'$/, '$1'))).toBe(true);
    }
    expect(read('hooks/useFirstQuestionEnergyGate.ts')).toContain("releaseReason('energy', 'gate_not_mounted', 'error');");
  });
});
