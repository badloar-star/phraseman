import { hasClaimedPermission, hasPermission, type AdminPermission } from '../admin/permissions';
import type { AdminRole } from '../admin/roles';
import fs from 'node:fs';
import path from 'node:path';

const source = (name: string) => fs.readFileSync(path.join(__dirname, '..', name), 'utf8');

const matrix: readonly { action: string; permission: AdminPermission; leastRole: AdminRole; file: string; auditAction: string; auditFile?: string }[] = [
  { action: 'create_job', permission: 'content.draft.write', leastRole: 'content_editor', file: 'admin_content_factory.ts', auditAction: 'content_factory.job.create' },
  { action: 'stage_generate', permission: 'content.draft.write', leastRole: 'content_editor', file: 'content_stage_worker.ts', auditAction: 'content_factory.stage.generate' },
  { action: 'stage_retry', permission: 'content.draft.write', leastRole: 'content_editor', file: 'content_stage_worker.ts', auditAction: 'content_factory.stage.retry' },
  { action: 'unit_generate', permission: 'content.draft.write', leastRole: 'content_editor', file: 'content_factory_worker.ts', auditAction: 'content_factory.unit.generate' },
  { action: 'unit_retry', permission: 'content.draft.write', leastRole: 'content_editor', file: 'content_factory_worker.ts', auditAction: 'content_factory.unit.retry' },
  { action: 'pause_resume_cancel', permission: 'content.draft.write', leastRole: 'content_editor', file: 'admin_content_stages.ts', auditAction: 'content_factory.stage.${input.action}', auditFile: 'content_factory/stage_control_repository.ts' },
  { action: 'approve_reject', permission: 'content.publish', leastRole: 'admin', file: 'admin_content_stages.ts', auditAction: 'content_factory.stage.${input.status}' },
  { action: 'review_release', permission: 'content.publish', leastRole: 'admin', file: 'admin_content_release.ts', auditAction: 'content_factory.course_generation.review' },
  { action: 'seal', permission: 'content.publish', leastRole: 'admin', file: 'admin_content_release.ts', auditAction: 'content_factory.course_release.seal' },
  { action: 'activate', permission: 'content.publish', leastRole: 'admin', file: 'language_release.ts', auditAction: 'content_factory.course_release.activate' },
  { action: 'rollback', permission: 'content.publish', leastRole: 'admin', file: 'language_release.ts', auditAction: 'content_factory.course_release.rollback' },
];

describe('R7 content factory permission and audit matrix', () => {
  it.each(matrix)('$action denies missing claims and permits only the least role or stronger', ({ permission, leastRole }) => {
    expect(hasClaimedPermission(undefined, permission)).toBe(false);
    expect(hasClaimedPermission({ admin: false, adminRole: leastRole }, permission)).toBe(false);
    expect(hasClaimedPermission({ admin: true, adminRole: 'support' }, permission)).toBe(false);
    expect(hasPermission(leastRole, permission)).toBe(true);
    expect(hasClaimedPermission({ admin: true, adminRole: leastRole }, permission)).toBe(true);
  });

  it.each(matrix)('$action callable keeps App Check, permission and transactional audit evidence', ({ file, permission, auditAction, auditFile }) => {
    const worker = source(file);
    const auditSource = auditFile ? source(auditFile) : fs.readFileSync(path.join(__dirname, 'generation_audit.ts'), 'utf8');
    const text = `${worker}\n${auditSource}`;
    expect(text).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    expect(text).toContain(permission);
    expect(text).toContain(auditAction);
    for (const field of ['actorUid', 'role', 'entity', 'operationId', 'reason']) expect(text).toContain(field);
    if (file.endsWith('_worker.ts')) {
      expect(worker).toContain("tx.create(db.collection('admin_log').doc(audit.operationId), audit)");
      expect(worker).toContain('buildGenerationTerminalAudit');
    }
    if (auditFile) {
      expect(auditSource).toContain('db.runTransaction');
      expect(auditSource).toContain('tx.update(stageRef');
      expect(auditSource).toContain('tx.create(auditRef');
    }
  });

  it('activation and rollback audit records retain before/after CAS state', () => {
    const text = source('language_release.ts');
    for (const action of ['activate', 'rollback']) {
      expect(text).toContain(`content_factory.course_release.${action}`);
    }
    expect(text).toContain('before: { revision');
    expect(text).toContain('after: { revision: nextRevision');
    expect(text.match(/tx\.create\(auditRef, audit\)/g)).toHaveLength(2);
  });
});
