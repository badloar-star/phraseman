// R37 (Ревизор F02 15.10): «Защити серию» на 21:00 приходило после уже засчитанного дня — планировалось раз за старт
// и не снималось. Теперь первый засчитанный день снимает вечернее предупреждение и помечает день «уже запланировано».
import fs from 'fs';
import path from 'path';

const signal = fs.readFileSync(path.join(__dirname, '..', 'app', 'streak_day_signal.ts'), 'utf8');
const notifications = fs.readFileSync(path.join(__dirname, '..', 'app', 'notifications.ts'), 'utf8');

describe('день засчитан → вечернее «Защити серию» снято', () => {
  it('сигнал дня лениво зовёт cancelStreakWarningForToday только на первом засчитывании', () => {
    const first = signal.slice(signal.indexOf("emitAppEvent('streak_day_counted'"));
    expect(first).toMatch(/^emitAppEvent\('streak_day_counted'[\s\S]{0,300}import\('\.\/notifications'\)[\s\S]{0,120}cancelStreakWarningForToday\(`day_counted:\$\{input\.source\}`\)/);
    expect(signal.indexOf("counted:already")).toBeLessThan(signal.indexOf('cancelStreakWarningForToday'));
  });

  it('отмена снимает запланированное по типу и по id и ставит отметку дня', () => {
    const fn = notifications.slice(notifications.indexOf('export async function cancelStreakWarningForToday'));
    expect(fn).toMatch(/cancelScheduledNotificationsByType\(N, \['streak_warning'\]\)/);
    expect(fn).toMatch(/cancelScheduledNotificationAsync\(warningId\)/);
    expect(fn).toMatch(/setItem\('streak_warning_scheduled', getLocalDayKey\(\)\)/);
  });
});
