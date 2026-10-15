// R56 (аудит кнопок 15.10, docs/work/tasks/button-audit-dialogs-mistakes-progress-2026-10-15.md, зона Ядра).
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('R56: кнопки и тихие сбои', () => {
  it('промокод: «успех» только после локальной записи VIP (с повтором); при провале — синхронизация, не ложная ошибка', () => {
    const src = read('app/promo_code_entry.tsx');
    expect(src).toMatch(/if \(res\.status !== 'redeemed'\) \{\s*setFeedback\(feedbackForStatus/);
    expect(src).toMatch(/for \(let attempt = 1; attempt <= 2 && marker === null; attempt \+= 1\)[\s\S]{0,700}setFeedback\(feedbackForStatus\(res\.status/);
  });

  it('«Заморозить серию» без Plus — защищённый переход (один пейвол на дребезг пальца)', () => {
    const src = read('app/streak_stats.tsx');
    expect(src).toContain("guardedNav.push({ pathname: '/premium_modal', params: { context: 'streak', source: 'stats_streak'");
  });

  it('«Поделиться» достижением — один системный диалог за раз, пустой вызов achievement_shared убран', () => {
    const src = read('app/achievements_screen.tsx');
    expect(src).toContain('if (shareInFlightRef.current) {');
    expect(src).not.toContain("type: 'achievement_shared'");
  });

  it('неотслеживаемые события достижений не молчат (одна строка на тип), новые не включены', () => {
    const src = read('app/achievements.ts');
    expect(src).toContain('[ACH-CHECK] skip:event_not_tracked');
    expect(src).toMatch(/FOUNDATION_ACHIEVEMENT_EVENT_TYPES[^=]*= new Set\(\[\s*'streak',\s*'backfill',\s*'shards',\s*'foreground_usage',\s*'active_day',\s*'streak_freeze_used',\s*\]\)/);
  });

  it('включение языка: неудача и исключение показывают тост, не молчат', () => {
    const src = read('app/language_welcome.tsx');
    expect(src.match(/emitAppEvent\('action_toast', languageActivateFailedToast\(\)\)/g)).toHaveLength(2);
  });

  it('сиротские экраны ИИ-диалогов в стор-сборке уводят на Главную', () => {
    for (const [file, route] of [
      ['app/ai_dialog_session.tsx', 'ai_dialog_session'],
      ['app/ai_dialog_briefing.tsx', 'ai_dialog_briefing'],
      ['app/ai_companion_session.tsx', 'ai_companion_session'],
    ]) {
      expect([file, read(file).includes(`useOrphanDialogRouteRedirect('${route}')`)]).toEqual([file, true]);
    }
    expect(read('app/orphan_dialog_route_redirect.ts')).toMatch(/router\.replace\('\/\(tabs\)\/home'/);
  });
});
