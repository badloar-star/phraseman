import fs from 'fs';
import path from 'path';

const read = (...parts: string[]) => fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');

describe('legacy monetization copy contract', () => {
  it('describes three free lessons at the boundary upsell', () => {
    const source = read('app', 'lesson_complete.tsx');
    expect(source).toContain("ru: { title: '3 бесплатных урока пройдено'");
    expect(source).not.toContain("title: '8 бесплатных уроков пройдено'");
  });

  // зачем: раздел квизов удалён из приложения — обещания про «N квизов в день»
  // стали ложными и вычищены из всех продающих текстов. Контракт перевёрнут:
  // теперь он охраняет ОТСУТСТВИЕ упоминаний, чтобы квизы не вернулись в копирайт.
  it('never promises quizzes in monetization copy', () => {
    const surfaces = [
      read('app', 'paywall_copy.ts'),
      read('components', 'paywall', 'PaywallProofCards.tsx'),
      read('app', 'manage_subscription.tsx'),
    ];
    for (const source of surfaces) {
      // Комментарии-объяснения («раздела квизов нет») допустимы, обещания — нет.
      const userFacing = source
        .split('\n')
        .filter((line) => !line.trimStart().startsWith('//'))
        .join('\n');
      expect(userFacing).not.toMatch(/квиз/i);
      expect(userFacing).not.toMatch(/\bquiz(es|zes)?\b/i);
    }
  });

  it('keeps legacy admin defaults aligned with runtime guardrails', () => {
    const source = read('admin', 'v2', 'legacy.html');
    expect(source).toContain("{ key: 'free_lesson_limit', label: 'Free: уроков открыто', def: 3");
    expect(source).toContain("{ key: 'free_daily_quiz_limit', label: 'Free: квизов в день', def: 1");
    expect(source).toContain("{ key: 'free_trainer_sessions_per_day', label: 'Free: сессий тренера в день', def: 1");
    expect(source).toContain("{ key: 'trainer_ab_b_pct', label: 'A/B тренер: группа B %', def: 0");
    expect(source).toContain("{ key: 'intro_full_access_enabled', label: 'Подарок «3 дня» новым юзерам',    def: false");
  });
});
