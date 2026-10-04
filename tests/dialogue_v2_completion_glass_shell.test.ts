import fs from 'fs';
import path from 'path';

describe('Dialogue V2 completion glass shell', () => {
  test('renders only grounded data inside a safe header, glass cards and a fixed Done action', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_completion.tsx'), 'utf8');

    expect(source).toContain('dialogue-v2-completion-header');
    expect(source).toContain('dialogue-v2-completion-done');
    expect(source).toContain("edges={['top', 'bottom']}");
    expect(source).toContain('dialogueGlassCardStyle(glass, 16)');
    expect(source).toContain('review.objectiveResults.map');
    // 04.10 (Ядро, navigation_back_underlay): «Готово» уходит назад через общий помощник с корнем раздела.
    expect(source).toContain("safeRouterBack(router, '/ai_dialog_home' as never)");
    expect(source).not.toContain('router.back()');

    // Итог без выдуманной экономики: опыта, жемчуга и монет за диалог нет (решения о награде нет).
    expect(source).not.toMatch(/\bXP\b/);
    expect(source).not.toMatch(/pearl|жемчуг/i);
    expect(source).not.toContain('Монеты');
    expect(source).not.toContain('Сценарий:');
  });
});
