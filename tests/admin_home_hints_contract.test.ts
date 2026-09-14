import fs from 'fs';
import path from 'path';

import { parseHomeHintsPublishRequest } from '../functions/src/admin_home_hints';

const source = fs.readFileSync(path.join(process.cwd(), 'functions/src/admin_home_hints.ts'), 'utf8');

describe('home hints publication contract', () => {
  it('accepts a bounded, idempotent selection request', () => {
    expect(parseHomeHintsPublishRequest({
      selections: [{ id: 'home_hint_home_01', variantIndex: 2 }],
      idempotencyKey: 'hint-publish-1', reason: 'Owner approved the first batch', requestId: 'req-1',
    })).toMatchObject({ idempotencyKey: 'hint-publish-1', requestId: 'req-1' });
  });

  it('rejects malformed selections and missing publication metadata', () => {
    expect(() => parseHomeHintsPublishRequest({ selections: [{ id: 'x', variantIndex: 4 }], idempotencyKey: 'x', reason: 'x', requestId: 'x' })).toThrow();
    expect(() => parseHomeHintsPublishRequest({ selections: [], idempotencyKey: '', reason: '', requestId: '' })).toThrow();
  });

  it('keeps publication on the existing admin callable boundary', () => {
    expect(source).toContain('ADMIN_SENSITIVE_WRITE_OPTIONS');
    expect(source).toContain('requireAdminAppCheck(request)');
    expect(source).toContain("hasPermission(role, 'content.publish')");
    expect(source).toContain("db.collection('home_hints').doc(PUBLISHED_DOC_ID)");
    expect(source).toContain("db.collection('admin_command_operations')");
    expect(source).toContain("action: 'home_hints.publish'");
  });
});
