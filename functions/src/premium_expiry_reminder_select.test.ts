/** PM-252 п.6 (04.10): маска скана напоминания об окончании Plus покрывает каждое читаемое поле. */
import { readFileSync } from 'fs';
import { join } from 'path';
import { EXPIRY_REMINDER_SELECT_FIELDS } from './premium_expiry_reminder';

const source = readFileSync(join(__dirname, 'premium_expiry_reminder.ts'), 'utf8');
const TOP_LEVEL = new Set(['expoPushToken', 'pushTokenLang', 'pushTokenTimezone', 'lastPremiumExpiryReminderAt', 'pushPrefs', 'progress']);

test('every data.<field> the reminder reads is in the select mask', () => {
  const read = new Set([...source.matchAll(/data\??\.([A-Za-z_]+)/g)].map((m) => m[1]));
  const mask = new Set<string>(EXPIRY_REMINDER_SELECT_FIELDS);
  for (const field of read) {
    if (field === 'progress') continue;
    const expected = TOP_LEVEL.has(field) ? field : `progress.${field}`;
    expect(mask.has(expected)).toBe(true);
  }
});

test('the scan query uses the mask', () => {
  expect(source).toContain('.select(...EXPIRY_REMINDER_SELECT_FIELDS)');
});
