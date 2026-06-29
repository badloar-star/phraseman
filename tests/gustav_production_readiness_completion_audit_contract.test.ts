import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Gustav production readiness completion audit contract', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'scripts', 'gustav_production_readiness_completion_audit_v2_packet.ts'),
    'utf8',
  );

  it('classifies a sole exact-approval master blocker as production-locked, not missing technical work', () => {
    expect(source).toContain('const exactApprovalOnlyMasterLock =');
    expect(source).toContain('input.masterBlockers === 1');
    expect(source).toContain('input.masterApplyBlockers === 1');
    expect(source).toContain('!input.p44ActiveApprovalReceiptExists');
    expect(source).toContain('!input.p44ActiveHashLockExists');
    expect(source).toContain('exactApprovalOnlyMasterLock');
    expect(source).toContain('Need master zero non-approval blockers');
  });

  it('requires the post exact approval apply runbook before closed-mode completion can be claimed', () => {
    expect(source).toContain('postApprovalRunbookStatus: string');
    expect(source).toContain('REQ-11-POST-EXACT-APPROVAL-RUNBOOK');
    expect(source).toContain('postExactApprovalApplyRunbookReady');
    expect(source).toContain('POST_EXACT_APPROVAL_APPLY_RUNBOOK_NOT_READY');
    expect(source).toContain('post_exact_approval_runbook_ready_waiting_for_canonical_source');
    expect(source).toContain('post_exact_approval_apply_runbook_v2_packet.json');
    expect(source).toContain('post_exact_approval_runbook_missing_rejected');
  });
});
