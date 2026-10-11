import fs from 'fs';
import path from 'path';

// зачем (§AUTH-0230 → §CORE-0158, приватность): журналы сбоев (app_errors) и активности (app_activity) хранятся 90 дней
// и питают оповещения в Telegram — имя пользователя туда не кладём, хватает uid. Админка подставляет имя по uid сама.
const ROOT = path.resolve(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function serverKindBlock(source: string, kind: string): string {
  const start = source.indexOf(`if (kind === '${kind}')`);
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf('if (kind ===', start + 10);
  return source.slice(start, end > -1 ? end : undefined);
}

describe('app logs carry no user name', () => {
  it('the client error and activity logs neither read nor send the name', () => {
    for (const rel of ['app/app_health.ts', 'app/app_activity.ts']) {
      const source = read(rel);
      expect(source).not.toContain("getItem('user_name')");
      expect(source).not.toMatch(/\buserName\s*:/);
    }
  });

  it('the server does not store a name sent by old builds into app_error or app_activity', () => {
    const server = read('functions/src/client_reports.ts');
    expect(serverKindBlock(server, 'app_error')).not.toContain('userName');
    expect(serverKindBlock(server, 'app_activity')).not.toContain('userName');
  });

  it('the admin App Health shows the name next to uid through the batched resolver', () => {
    const admin = read('admin/v2/legacy.html');
    expect(admin).toContain('function appLogNameFor(r)');
    expect(admin).toContain('await resolveUserNames(missing)');
    expect(admin).not.toContain('renderUserRef(r.uid, r.userName ? { [r.uid]: r.userName } : null');
    expect((admin.match(/renderUserRef\(r\.uid, appLogNameFor\(r\), \{ shortUid: true \}\)/g) || []).length).toBe(2);
  });
});
