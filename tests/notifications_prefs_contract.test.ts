/**
 * Храповик раздела «Уведомления»: выбор категорий (2026-07-26).
 * зачем: каждый тип локального уведомления обязан проверять свою категорию
 * (isNotifCategoryEnabled) или мастер (isNotifMasterEnabled) ПЕРЕД планированием.
 * Если кто-то добавит новый schedule*-вызов без гейта или удалит существующий —
 * юзерский выбор «какие уведомления получать» молча перестанет работать.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const appSource = (relativePath: string) => readFileSync(join(__dirname, '..', relativePath), 'utf8');

describe('гейты категорий в app/notifications.ts', () => {
  const src = appSource('app/notifications.ts');

  it.each([
    'streak',
    'phrase_of_day',
    'energy',
    'weekly_recap',
    'monthly_recap',
    'league',
  ])('категория %s проверяется перед планированием', (category) => {
    expect(src).toContain(`isNotifCategoryEnabled('${category}')`);
  });

  it('offers гейтит все три конверсионных пуша (intro, upsell, paywall_abandoned)', () => {
    const count = src.split("isNotifCategoryEnabled('offers')").length - 1;
    expect(count).toBeGreaterThanOrEqual(3);
  });

  it('мастер гейтит reminder, d1 и trial_end (сервисные — без категории offers)', () => {
    const count = src.split('isNotifMasterEnabled()').length - 1;
    // scheduleDailyReminder + scheduleNotifications + d1 + trial_end
    expect(count).toBeGreaterThanOrEqual(4);
  });

  it('выключение расписания больше НЕ гасит остальные категории', () => {
    // Раньше scheduleNotifications при «все дни выкл» звал cancelAllScheduledLocalNotifications
    // и сносил фразу дня/итоги/серию + сбрасывал мастер-флаг. Теперь только тип reminder.
    const fnStart = src.indexOf('export const scheduleNotifications');
    const fnEnd = src.indexOf('export const scheduleStreakWarningIfNeeded');
    const body = src.slice(fnStart, fnEnd);
    expect(fnStart).toBeGreaterThan(-1);
    // Ищем именно ВЫЗОВ (упоминание в комментарии-объяснении допустимо).
    expect(body).not.toContain('await cancelAllScheduledLocalNotifications(');
    expect(body).toContain("cancelScheduledNotificationsByType(N, ['reminder'])");
  });

  it('saveNotifPrefs синхронизирует легаси-флаг и зеркалит выбор в облако', () => {
    expect(src).toContain("AsyncStorage.setItem('notifications_enabled', normalized.master ? 'true' : 'false')");
    expect(src).toContain('updateServerPushPrefs');
  });

  it('applyNotifPrefsSideEffects чистит scheduled-маркеры выключенных категорий', () => {
    expect(src).toContain('applyNotifPrefsSideEffects');
    expect(src).toContain("'streak_warning_scheduled'");
    expect(src).toContain("'phrase_notif_scheduled'");
  });
});

describe('зеркало pushPrefs для серверных пушей', () => {
  it('клиент пишет pushPrefs с кэшем (1 write на смену настройки)', () => {
    const src = appSource('app/push_token_registration.ts');
    expect(src).toContain('export async function updateServerPushPrefs');
    expect(src).toContain('pushPrefs: { streak: prefs.streak, offers: prefs.offers }');
    expect(src).toContain('PUSH_PREFS_LOCAL_KEY');
  });

  it('сервер уважает pushPrefs.streak и проецирует поле в скане', () => {
    const src = appSource('functions/src/re_engage_push.ts');
    expect(src).toContain('u.pushPrefs?.streak === false');
    expect(src).toContain("'pushPrefs',");
  });
});
