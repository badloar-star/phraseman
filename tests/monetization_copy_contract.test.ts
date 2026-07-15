import fs from 'fs';
import path from 'path';

const read = (...parts: string[]) => fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');

describe('legacy monetization copy contract', () => {
  it('describes three free lessons at the boundary upsell', () => {
    const source = read('app', 'lesson_complete.tsx');
    expect(source).toContain("ru: { title: '3 бесплатных урока пройдено'");
    expect(source).not.toContain("title: '8 бесплатных уроков пройдено'");
  });

  it('describes one free quiz per day across paywall copy', () => {
    const paywallCopy = read('app', 'paywall_copy.ts');
    const proofCards = read('components', 'paywall', 'PaywallProofCards.tsx');
    expect(paywallCopy).toContain('В бесплатной версии доступен 1 квиз в день.');
    expect(paywallCopy).not.toContain('В бесплатной версии доступно 3 квиза в день.');
    expect(proofCards).toContain('free-лимита 1/день');
    expect(proofCards).not.toContain('free-лимита 3/день');
  });

  it('keeps the admin preview aligned with the third-lesson boundary', () => {
    const source = read('components', 'admin_panel', 'soft_upsell_preview_catalog.ts');
    expect(source).toContain("adminLabel: 'После третьего бесплатного урока'");
    expect(source).toContain("milestoneId: 'free_lessons_complete:3:en'");
  });

  it('keeps legacy admin defaults aligned with runtime guardrails', () => {
    const source = read('admin', 'legacy.html');
    expect(source).toContain("{ key: 'free_lesson_limit', label: 'Free: уроков открыто', def: 3");
    expect(source).toContain("{ key: 'free_daily_quiz_limit', label: 'Free: квизов в день', def: 1");
    expect(source).toContain("{ key: 'free_trainer_sessions_per_day', label: 'Free: сессий тренера в день', def: 1");
    expect(source).toContain("{ key: 'trainer_ab_b_pct', label: 'A/B тренер: группа B %', def: 0");
    expect(source).toContain("{ key: 'intro_full_access_enabled', label: 'Подарок «3 дня» новым юзерам',    def: false");
  });
});
