import { buildApprovalAuditEntry, JARVIS_APPROVAL_AUDIT_COLLECTION } from './approval_audit';

const NOW = 1_800_000_000_000;

describe('Jarvis approval audit — every press leaves a trace, no press leaks a secret', () => {
  test('records what was decided, by whom and when', () => {
    const entry = buildApprovalAuditEntry({
      action: 'approve',
      department: 'payments',
      decisionHash: 'abc123',
      outcome: 'accepted',
      nowMs: NOW,
    });
    expect(entry.action).toBe('approve');
    expect(entry.department).toBe('payments');
    expect(entry.outcome).toBe('accepted');
    expect(entry.atMs).toBe(NOW);
  });

  test('never stores the nonce — the audit log must not become a key ring', () => {
    const entry = buildApprovalAuditEntry({
      action: 'approve',
      department: 'payments',
      decisionHash: 'abc123',
      outcome: 'accepted',
      nowMs: NOW,
      // Даже если вызывающий по ошибке принесёт лишнее — оно не должно осесть.
      nonce: 'n'.repeat(32),
    } as never);
    expect(JSON.stringify(entry)).not.toContain('n'.repeat(32));
  });

  test('records a refusal too — a rejected press is evidence, not silence', () => {
    const entry = buildApprovalAuditEntry({
      action: 'reject',
      department: 'safety',
      decisionHash: 'def',
      outcome: 'expired',
      nowMs: NOW,
    });
    expect(entry.outcome).toBe('expired');
  });

  test('records a /stop command, not just approve/reject on decisions', () => {
    // зачем: "кто останавливал Джарвиса и когда" не должно жить только
    // в перезаписываемом jarvis_control.changedBy — это тоже действие,
    // достойное неизменяемого журнала (бриф в235).
    const entry = buildApprovalAuditEntry({
      action: 'stop', department: 'jarvis', decisionHash: '', outcome: 'accepted', nowMs: NOW,
    });
    expect(entry.action).toBe('stop');
    expect(entry.department).toBe('jarvis');
  });

  test('records a /start command the same way', () => {
    const entry = buildApprovalAuditEntry({
      action: 'start', department: 'jarvis', decisionHash: '', outcome: 'accepted', nowMs: NOW,
    });
    expect(entry.action).toBe('start');
  });

  test('the audit collection is named explicitly, not derived at runtime', () => {
    expect(JARVIS_APPROVAL_AUDIT_COLLECTION).toBe('jarvis_approval_audit');
  });

  test('lists every stored field explicitly, so a forgotten one breaks the build', () => {
    const entry = buildApprovalAuditEntry({
      action: 'approve', department: 'money', decisionHash: 'x', outcome: 'accepted', nowMs: NOW,
    });
    expect(Object.keys(entry).sort()).toEqual(
      ['action', 'atMs', 'decisionHash', 'department', 'outcome'],
    );
  });
});
