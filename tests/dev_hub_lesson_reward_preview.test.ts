import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

describe('Dev Hub lesson reward preview', () => {
  test('registers and renders a synthetic ResultsSequence after the sheet closes', () => {
    const registry = read('components/dev/devToolRegistry.ts');
    const sheet = read('components/dev/DevHubSheet.tsx');

    expect(registry).toContain("| 'preview-lesson-results'");
    expect(registry).toContain("id: 'lesson-results'");
    expect(registry).toContain("action: 'preview-lesson-results'");
    expect(registry).toContain('testID: \'dev-preview-lesson-results\'');

    expect(sheet).toContain("import ResultsSequence from '../feedback/ResultsSequence'");
    expect(sheet).toContain("case 'preview-lesson-results':");
    expect(sheet).toContain('openLessonResultsPreview()');
    expect(sheet).toContain('requestClose(true);');
    expect(sheet).toContain('testID="dev-lesson-results-preview"');
    expect(sheet).toContain('presentationStyle="fullScreen"');
    expect(sheet).toContain("visible={!visible && preview?.type === 'lesson-results'}");
    expect(sheet).toContain('<ResultsSequence');
    expect(sheet).toContain('stars={3}');
    // зачем (10.10): итог урока 2.0 без опыта, спина и множителей XP — превью показывает только звёзды и подарок.
    expect(sheet).not.toContain('xp={');
    expect(sheet).not.toContain('spinReward=');
    expect(sheet).not.toContain('multipliers: [');
    expect(sheet).toContain("activeGift: { label: 'Активный подарок: +1 подсказка' }");
    expect(sheet).toContain('title="DEV · Учебный пример"');
    expect(sheet).toContain('ctaPrimaryLabel="Вернуться в Dev Hub"');
    expect(sheet).toContain('onCtaPrimary={closePreview}');
    expect(sheet).toContain('onCtaSecondary={closePreview}');
    expect(sheet).not.toMatch(/from ['"][^'"]*(xp_manager|AsyncStorage|firebase|reward[^'"]*(grant|apply))/i);
    expect(sheet).not.toContain('grantLesson');
    expect(sheet).not.toContain('writeLesson');
  });
});
