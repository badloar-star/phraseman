// зачем (владелец 13.10, вариант (а) умного напоминания): «включить напоминания», онбординг и Настройки включают расписание
// на 7 дней с умным временем; отключённую scheduleDailyReminder не зовёт никто; ручное время не перетирается;
// история минут занятий живёт только на телефоне (не синхронизируется).
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('умное напоминание: подключение', () => {
  it('отключённую scheduleDailyReminder не зовёт никто (кроме самого определения)', () => {
    for (const rel of ['app/_layout.tsx', 'components/CleanOnboarding.tsx', 'app/(tabs)/settings.tsx', 'app/settings_notifications.tsx']) {
      expect(stripComments(read(rel))).not.toMatch(/scheduleDailyReminder\s*\(/);
    }
  });

  it('согласие включает 7 дней «авто»: окно, онбординг ×2, Настройки', () => {
    expect(read('app/_layout.tsx')).toContain("enableSmartDailyReminder(lang, { studyTarget, caller: 'notif_nudge' })");
    const onb = read('components/CleanOnboarding.tsx');
    expect(onb).toContain("caller: 'onboarding_allow'");
    expect(onb).toContain("caller: 'onboarding_finish'");
    expect(read('app/(tabs)/settings.tsx')).toContain("caller: 'settings_toggle'");
    const n = read('app/notifications.ts');
    expect(n).toContain('export async function enableSmartDailyReminder(');
    expect(n).toContain("[d, { enabled: true, hour: DEFAULT_NOTIF.schedule[0].hour, minute: 0, mode: 'auto' as const }]");
    expect(n).toMatch(/Array\.from\(\{ length: 7 \}, \(_, i\) => \[i, \{ enabled: false, hour: 20, minute: 0 \}\]\)/);
  });

  it('ручной выбор времени — mode manual; включение без выбора — auto; умное время только для дней auto', () => {
    const s = read('app/settings_notifications.tsx');
    expect(s).toContain("[d, { ...day, hour: h, minute: m, mode: 'manual' as const }]");
    expect(s).toContain("const mode: 'auto' | 'manual' = keepManual ? 'manual' : 'auto';");
    const n = read('app/notifications.ts');
    expect(n).toContain("d.mode === 'auto' ? { ...d, hour: t.hour, minute: t.minute } : d");
    expect(n).toContain('s = await applyAutoReminderTime(s);');
  });

  it('перепланировка только при смене: подпись расписания + сверка с системой', () => {
    const n = read('app/notifications.ts');
    expect(n).toContain('if (await reminderScheduleUnchanged(N, signature, Object.values(s.schedule).filter(d => d.enabled).length)) return;');
    expect(n).toContain("multiRemove(['per_day_notif_ids', DAILY_REMINDER_ID_KEY, REMINDER_SCHEDULE_SIG_KEY])");
  });

  it('события привычки пишутся локально: сессия, урок, открытие по нашему пушу', () => {
    expect(read('app/foreground_usage_ms.ts')).toContain("void recordSmartReminderEvent('session', now);");
    expect(read('app/firebase.ts')).toContain("void recordSmartReminderEvent('lesson');");
    expect(read('app/notification_tap_handler.ts')).toContain("void recordSmartReminderEvent('push_open');");
  });

  it('ключи умного напоминания — только устройство: не в облачной синхронизации, есть в реестре', () => {
    const cloud = read('app/cloud_sync.ts');
    for (const key of ['smart_reminder_activity_v1', 'smart_reminder_state_v1', 'reminder_schedule_sig_v1']) {
      expect(cloud).not.toContain(key);
      const row = JSON.parse(read('config/phone-state-legacy-inventory.v1.json')).rows.find((r: { key: string }) => r.key === key);
      expect(row).toMatchObject({ scope: 'device_only', importSource: [] });
    }
  });

  it('политика §12: время занятий хранится и обрабатывается только на устройстве', () => {
    for (const rel of ['legal/privacy_policy_en.json', 'legal/privacy_policy_en_ios.json']) {
      expect(read(rel)).toContain('These times are stored and processed only on your device for this purpose and are not sent to us.');
    }
  });
});
