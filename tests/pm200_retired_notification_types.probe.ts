import fs from 'node:fs';
import path from 'node:path';

// зачем: PM-200-A2 — игровые типы уведомлений (подарки, спины, арена, лиги, турниры) retired: ни один
// клиентский код не планирует их локально, а тап по уже доставленному — инертен. Серверные пуши
// (арена-приглашения и др.) проверяются отдельно allowlist'ом серверных функций (PM-202).
const RETIRED_TYPE = /^(gift|spin|arena|league|tournament|level_gift|daily_gift|season|boon)/;
const roots = ['app', 'components', 'modules', 'hooks'];

function walk(dir: string, out: string[]): void {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full.replace(/\\/g, '/'));
  }
}

const files: string[] = [];
roots.forEach((root) => walk(root, files));

const schedulers = files.filter((file) => fs.readFileSync(file, 'utf8').includes('scheduleNotificationAsync('));
const violations: string[] = [];
for (const file of schedulers) {
  const text = fs.readFileSync(file, 'utf8');
  let index = text.indexOf('scheduleNotificationAsync(');
  while (index >= 0) {
    const window = text.slice(index, index + 1600);
    for (const match of window.matchAll(/type:\s*'([a-z0-9_]+)'/g)) {
      if (RETIRED_TYPE.test(match[1])) violations.push(`${file}: schedules retired type '${match[1]}'`);
    }
    index = text.indexOf('scheduleNotificationAsync(', index + 1);
  }
}
if (violations.length > 0) throw new Error(`pm200_retired_type_scheduled:\n${violations.join('\n')}`);

// Дополнительно: удалённый планировщик подарков не вернулся.
const notifications = fs.readFileSync('app/notifications.ts', 'utf8');
for (const forbidden of ['runGiftExpiringSync', 'syncGiftExpiringNotification']) {
  if (notifications.includes(forbidden)) throw new Error(`pm200_removed_scheduler_present:${forbidden}`);
}

console.log(`pm200_retired_notification_types: PASS (${files.length} files scanned, ${schedulers.length} local schedulers checked)`);
