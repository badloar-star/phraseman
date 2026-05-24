import { readFileSync } from 'fs';
import { join } from 'path';

const appSource = (relativePath: string) => readFileSync(join(__dirname, '..', relativePath), 'utf8');

test('xp changes refresh the weekly recap payload', () => {
  const src = appSource('app/xp_manager.ts');
  expect(src).toContain("from './notifications'");
  expect(src).toContain('refreshWeeklyRecapNotificationAfterXpChange(lang)');
});

test('phrase-of-day scheduling tracks an id and clears stale scheduled requests', () => {
  const src = appSource('app/notifications.ts');
  expect(src).toContain('PHRASE_OF_DAY_NOTIF_ID_KEY');
  expect(src).toContain("cancelScheduledNotificationsByType(N, ['phrase_of_day'])");
  expect(src).toContain('AsyncStorage.setItem(PHRASE_OF_DAY_NOTIF_ID_KEY, phraseId)');
});

test('streak-loss push language keeps Spanish instead of falling back to Russian', () => {
  const src = appSource('app/hall_of_fame_utils.ts');
  expect(src).toContain("value === 'es' ? 'es'");
  expect(src).not.toContain("l === 'uk' ? 'uk' : 'ru'");
});

test('D+1 reminder is tracked, cleaned, and keeps Spanish locale', () => {
  const notificationsSrc = appSource('app/notifications.ts');
  expect(notificationsSrc).toContain('D1_PERSONALIZED_REMINDER_NOTIF_ID_KEY');
  expect(notificationsSrc).toContain("cancelScheduledNotificationsByType(N, ['d1_reminder'])");
  expect(notificationsSrc).toContain('AsyncStorage.setItem(D1_PERSONALIZED_REMINDER_NOTIF_ID_KEY, d1Id)');

  const lessonCompleteSrc = appSource('app/lesson_complete.tsx');
  expect(lessonCompleteSrc).toContain("langRaw === 'es' ? 'es'");
});

test('notification runtime copy has planned locale branches', () => {
  const src = appSource('app/notifications.ts');
  for (const marker of ['MESSAGES_PT_BR', 'MESSAGES_VI', 'MESSAGES_ID', 'MESSAGES_TR', 'MESSAGES_PL']) {
    expect(src).toContain(marker);
  }
  expect(src).toContain("const NOTIFICATION_LANGS: readonly Lang[] = ['ru', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']");
  expect(src).toContain('function pickNotif<R>(lang: Lang | string, copy: NotificationCopy<R>): R');
  expect(src).not.toMatch(/function pickNotif<R>\(lang: Lang \| string, ru: R, uk: R, es: R\)/);
  const oldPickNotifCalls = src
    .split('\n')
    .filter(line => line.includes('pickNotif(lang,') && !line.includes('notificationCopy(') && !line.includes('function pickNotif'));
  expect(oldPickNotifCalls).toEqual([]);
  expect(src).not.toMatch(/lang === 'uk'|lang === 'es'|lang === 'ru'/);
});
