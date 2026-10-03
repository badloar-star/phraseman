import fs from 'fs';
import path from 'path';

const read = (...parts: string[]) => fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');

describe('legacy monetization copy contract', () => {
  // зачем (владелец 22.09, 114baf437): заголовок «3 бесплатных урока пройдено» снят ещё в 2.0, а текст
  // мягкого предложения после урока не рассказывает, что человек «уже получил», и не называет уровни.
  it('lesson-complete upsell speaks about what is ahead, without levels or past claims', () => {
    const source = read('app', 'lesson_complete.tsx');
    const body = source.slice(source.indexOf('const MAIN_COURSE_ACCESS_BODY'), source.indexOf('const LESSON_SOFT_UPSELL_COPY'));
    expect(body).toContain("ru: 'Дальше курс ведёт от простых фраз до свободного разговора.");
    expect(body).not.toMatch(/\b(A1|A2|B1|B2)\b/);
    expect(body).not.toMatch(/доступны бесплатно|пройдено/);
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

  it('keeps the live admin aligned with runtime guardrails and retired Trainer removal', () => {
    const source = read('admin', 'v2', 'legacy.html');
    // зачем: ключ оставлен только для совместимости старых клиентов — подпись в админке переименована так.
    expect(source).toContain("{ key: 'free_lesson_limit', label: 'Совместимость: лимит бесплатных уроков (только старые клиенты)', def: 3");
    const retiredTrainerSignals = [
      ['free', 'trainer', 'sessions', 'per', 'day'].join('_'),
      ['trainer', 'ab', 'a', 'pct'].join('_'),
      ['trainer', 'ab', 'b', 'pct'].join('_'),
      ['trainer', 'ab', 'c', 'pct'].join('_'),
      ['gate', 'smart', 'trainer', 'premium'].join('_'),
      ['gate', 'trainer', 'modes', 'premium'].join('_'),
      ['trainer', 'limit'].join('_'),
      ['smart', 'trainer'].join('_'),
    ];
    for (const retiredSignal of retiredTrainerSignals) {
      expect(source).not.toContain(retiredSignal);
    }
  });
});
