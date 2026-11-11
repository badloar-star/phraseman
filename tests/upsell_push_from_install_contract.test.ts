// зачем (владелец 2026-11-11, аудит мотивации к Plus): пуши о Plus на 4/7/14 день не уходили никому — их ставил только
// выключенный «Бонус на старт». Теперь отсчёт от установки. Этот сторож держит четыре условия, без которых правка опасна:
// не вызывать системный запрос разрешения, не слать подписчику, не слать при неподтверждённой подписке, не планировать вечно.
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'notifications.ts'), 'utf8').replace(/\r\n/g, '\n');

function between(start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to < 0) throw new Error(`фрагмент не найден: ${start} … ${end}`);
  return source.slice(from, to);
}

describe('напоминания о Plus на 4/7/14 день от установки', () => {
  const helper = between('async function scheduleUpsellNotificationsFromInstall(', '\n}\n');
  const schedule = between('export const scheduleNotifications = async (', '\n};\n');

  it('зовётся из общего расписания ПОСЛЕ проверки разрешения и мастер-тумблера — системного запроса не будет', () => {
    const permission = schedule.indexOf('const hasPermission = await canUseNotifications(');
    const master = schedule.indexOf('isNotifMasterEnabled()');
    const call = schedule.indexOf('scheduleUpsellNotificationsFromInstall(');
    expect(permission).toBeGreaterThan(-1);
    expect(master).toBeGreaterThan(permission);
    expect(call).toBeGreaterThan(master);
    // фоном: расписание напоминаний не ждёт постановку пушей о Plus
    expect(schedule).toContain('void scheduleUpsellNotificationsFromInstall(');
  });

  it('отсчёт идёт от даты установки и кончается на 14-й день', () => {
    expect(helper).toContain("AsyncStorage.getItem('install_date')");
    expect(source).toContain('const UPSELL_FROM_INSTALL_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;');
    expect(helper).toContain('ageMs > UPSELL_FROM_INSTALL_WINDOW_MS');
    expect(helper).toContain('scheduleUpsellNotifications(installMs, lang)');
  });

  it('подписчику не ставит, а при неподтверждённой подписке не планирует вовсе', () => {
    const confirmed = helper.indexOf('isPremiumAccessDecisionConfirmedForCurrentAccount()');
    const verified = helper.indexOf('getVerifiedPremiumStatus()');
    const plan = helper.indexOf('scheduleUpsellNotifications(installMs, lang)');
    expect(confirmed).toBeGreaterThan(-1);
    expect(verified).toBeGreaterThan(confirmed);
    expect(plan).toBeGreaterThan(verified);
    expect(helper).toContain('cancelUpsellNotifications()');
  });

  it('каждый ранний выход и сбой пишут причину с единым префиксом', () => {
    for (const reason of ['no_install_date', 'window_passed', 'premium_unconfirmed', 'reason=premium ']) {
      expect(helper).toContain(reason);
    }
    expect(helper).toContain("console.warn('[UPSELL-PUSH] from_install failed'");
    expect(helper).not.toMatch(/catch\s*\{\s*\}/);
  });

  it('покупка Plus по-прежнему снимает уже стоящие напоминания', () => {
    const premium = between('export const sendPremiumNotification = async (', '\n};\n');
    expect(premium).toContain('cancelUpsellNotifications()');
  });
});
