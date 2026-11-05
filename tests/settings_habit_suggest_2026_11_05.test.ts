// Раунд 2, Настройки п.3 (одобрено владельцем 05.11): «Обычно ты занимаешься в 19:40 · поставить» — привычное время из локальной истории.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Уведомления: подсказка привычного времени', () => {
  const screen = read('app/settings_notifications.tsx');
  const store = read('app/smart_reminder_store.ts');
  it('время берётся только из уверенного локального расчёта, иначе null (ничего не выдумываем)', () => {
    expect(store).toContain('export async function peekHabitMinute(');
    expect(store).toContain("decision.source === 'smart' && decision.peakMinute != null ? decision.peakMinute : null");
  });
  it('подсказка видна, только когда напоминание включено и привычка отличается от выбранного времени', () => {
    expect(screen).toContain('{timeRowActive && habitDiffers && habitHour !== null && habitMin !== null ? (');
    expect(screen).toContain('const habitDiffers =');
  });
  it('«поставить» — тот же confirmTime, что и ручной выбор (режим manual), без новых записей в облако', () => {
    expect(screen).toContain('confirmTime(habitHour, habitMin)');
    const block = screen.slice(screen.indexOf('notif-habit-suggest'), screen.indexOf('notif-habit-suggest') + 1400);
    expect(block).not.toMatch(/firestore/i);
  });
  it('текст на 9 языках, шрифт 15, без обводки', () => {
    expect(screen).toContain("ru:'Обычно ты занимаешься в'");
    expect(screen).toContain("pl:'Zwykle uczysz się o'");
    const block = screen.slice(screen.indexOf('notif-habit-suggest'), screen.indexOf('notif-habit-suggest') + 1400);
    expect(block).toContain('fontSize: 15');
    expect(block).not.toMatch(/border(Width|Color)\s*:/);
  });
});
