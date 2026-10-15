// Статистика экрана уровня в онбординге (владелец 15.10): один ответ на человека, дневные счётчики, уровень человека не хранится.
import fs from 'node:fs';
import path from 'node:path';

import { onbDailyIncrementPaths, onbDayKey, parseOnbLevelAnswer } from './onboarding_level_stats';

describe('onboarding_level_stats', () => {
  it('вход: уровень из списка или null (пропустил), язык — короткий код', () => {
    expect(parseOnbLevelAnswer({ level: 'b1', target: 'en' })).toEqual({ level: 'b1', target: 'en' });
    expect(parseOnbLevelAnswer({ level: null, target: 'pt-BR' })).toEqual({ level: null, target: 'pt-br' });
    expect(() => parseOnbLevelAnswer({ level: 'c2', target: 'en' })).toThrow('onb_level_invalid');
    expect(() => parseOnbLevelAnswer({ level: 'a1', target: '../x' })).toThrow('onb_target_invalid');
  });

  it('счётчики: total, ответил/пропустил, по уровню и по языку (пути без дефиса)', () => {
    expect(onbDailyIncrementPaths({ level: 'a2', target: 'en' })).toEqual(['total', 'answered', 'byLevel.a2', 'byTarget.en.a2']);
    expect(onbDailyIncrementPaths({ level: null, target: 'pt-br' })).toEqual(['total', 'skipped', 'byLevel.skipped', 'byTarget.pt_br.skipped']);
    expect(onbDayKey(Date.UTC(2026, 9, 15, 23, 59))).toBe('2026-10-15');
  });

  it('один ответ на человека в транзакции, чтения до записей, уровень человека не пишется, экспорт есть', () => {
    const src = fs.readFileSync(path.join(__dirname, 'onboarding_level_stats.ts'), 'utf8');
    expect(src).toContain('const [counted, dailySnap] = await tx.getAll(countedRef, dailyRef);');
    expect(src).toContain("if (counted.exists) return 'duplicate' as const;");
    expect(src).toContain('tx.create(countedRef, { day, atMs: nowMs });');
    expect(fs.readFileSync(path.join(__dirname, 'index.ts'), 'utf8')).toContain('export { onboardingLevelRecord } from "./onboarding_level_stats";');
  });
});
