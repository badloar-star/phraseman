import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const scripts = ['scripts/set_admin_claim.mjs', 'scripts/set_admin_claim.js'];

describe('admin claim provisioning contract', () => {
  for (const relativePath of scripts) {
    test(`${relativePath} requires a role and preserves existing claims`, () => {
      const source = fs.readFileSync(path.join(root, relativePath), 'utf8');

      expect(source).toContain('ADMIN_ROLES');
      expect(source).toContain('adminRole: role');
      expect(source).toContain('...(user.customClaims ?? {})');
      expect(source).toContain('existingClaims.admin !== true && !allowGrant');
      expect(source).toContain('--grant');
      expect(source).not.toContain('setCustomUserClaims(user.uid, { admin: true })');
    });
  }
});
