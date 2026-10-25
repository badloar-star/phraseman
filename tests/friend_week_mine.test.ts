// зачем (идея 6, макет friends-full.html #week `wMine`): «Моя неделя» — как друзья видят твою неделю, кто дал пять (из кэша
// колокольчика — 0 новых чтений) и переключатель «Показывать друзьям мою неделю» (сразу, с откатом при сбое).
import * as fs from 'fs';
import * as path from 'path';
import { bothFivesToday, fivesThisWeek, weekStartMs } from '../app/friends_together/friend_week_fives';
import { gaveFiveLine, gaveFiveWhen } from '../app/friends_together/friend_week_copy';

const at = (d: number, h: number, m = 0) => new Date(2026, 9, d, h, m).getTime();
const NOW = new Date(2026, 9, 26, 12, 0); // понедельник

describe('«Моя неделя»: кто дал пять', () => {
  it('пятёрки этой недели — по одной на друга, самые ранние первыми; другие типы и прошлая неделя — мимо', () => {
    const rows = [
      { type: 'activity_like' as const, fromUid: 'oleg', fromName: 'Олег', createdAt: at(26, 9, 40) },
      { type: 'activity_like' as const, fromUid: 'ira', fromName: 'Ирина', createdAt: at(26, 9, 12) },
      { type: 'activity_like' as const, fromUid: 'ira', fromName: 'Ирина', createdAt: at(26, 10, 0) },
      { type: 'activity_like' as const, fromUid: 'old', fromName: 'Старый', createdAt: at(25, 23, 0) },
      { type: 'friend_accepted' as const, fromUid: 'x', fromName: 'X', createdAt: at(26, 8, 0) },
    ];
    expect(weekStartMs(NOW)).toBe(at(26, 0));
    const fives = fivesThisWeek(rows, NOW);
    expect(fives.map((f) => f.uid)).toEqual(['ira', 'oleg']);
    expect(bothFivesToday(fives, NOW)).toBe(true);
  });

  it('строки: одна пятёрка, две пятёрки и время — имена не склоняются', () => {
    expect(gaveFiveLine('ru', [])).toBeNull();
    expect(gaveFiveLine('ru', ['Ирина'])).toBe('Ирина даёт пять');
    expect(gaveFiveLine('ru', ['Ирина', 'Олег'])).toBe('Ирина и Олег дали пять');
    expect(gaveFiveLine('en', ['Ira', 'Oleg'])).toBe('Ira and Oleg gave you a high five');
    expect(gaveFiveWhen('ru', '9:12', '9:40')).toBe('сегодня в 9:12 и 9:40');
  });

  it('экран и вход: только локальные данные, переключатель с откатом, строка Настроек за выключателем', () => {
    const root = path.resolve(__dirname, '..');
    const screen = fs.readFileSync(path.join(root, 'app', 'friends_week_mine.tsx'), 'utf8');
    expect(screen).toContain('readCachedUserNotifications()');
    expect(screen).not.toMatch(/fetchActivityLikesReceived|@react-native-firebase\/firestore/);
    expect(screen).toMatch(/setShown\(next\);[\s\S]{0,200}setMyFriendWeekHidden\(!next\)/);
    expect(screen).toContain('setShown(before)');
    expect(screen).toContain('if (!FRIENDS_TOGETHER_UI_ENABLED)');
    // переключатель «Показывать друзьям мою неделю» есть и ведёт в setMyFriendWeekHidden; двойной тап, пока пишем, — мимо
    expect(screen).toMatch(/<CustomSwitch testID="my-week-show-switch"[^>]*onValueChange=\{onToggle\}/);
    expect(screen).toMatch(/if \(savingRef\.current\) \{[\s\S]{0,200}return;/);
    expect(screen).toContain("messageEn: \"Didn’t work the first time. Try again\"");
    const settings = fs.readFileSync(path.join(root, 'app', '(tabs)', 'settings.tsx'), 'utf8');
    expect(settings).toMatch(/FRIENDS_TOGETHER_UI_ENABLED \? \([\s\S]{0,400}settings-my-week-row[\s\S]{0,300}friends_week_mine/);
  });
});
