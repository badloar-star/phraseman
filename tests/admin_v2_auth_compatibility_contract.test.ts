import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Admin v2 legacy administrator compatibility', () => {
  test('routes every deployed strict native surface through the shared role resolver', () => {
    const files = [
      'functions/src/admin_analytics.ts',
      'functions/src/admin_user_profile.ts',
      'functions/src/admin_remote_config.ts',
      'functions/src/admin_app_messages.ts',
      'functions/src/promo_codes.ts',
    ];

    for (const relativePath of files) {
      expect(read(relativePath)).toContain('resolveAdminRole');
    }
  });
});
