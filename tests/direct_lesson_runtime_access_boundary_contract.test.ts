import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

const guardedScreens = [
  ['lesson1.tsx', 'LessonScreen'],
  ['lesson_words.tsx', 'LessonWords'],
  ['lesson_irregular_verbs.tsx', 'LessonIrregularVerbs'],
  ['lesson_help.tsx', 'LessonHelp'],
  ['preposition_drill.tsx', 'PrepositionDrillScreen'],
  ['hint.tsx', 'HintScreen'],
] as const;

describe('direct lesson screens wait for verified runtime access', () => {
  it('shared boundary remains noninteractive until the exact route is authorized', () => {
    const source = read('app', 'lesson_runtime_access_boundary.tsx');

    expect(source).toContain("useState<string | null>(null)");
    expect(source).toContain("gate === 'available'");
    expect(source).toContain('setAuthorizedRouteKey(routeKey)');
    expect(source).toContain('return authorizedRouteKey === routeKey;');
    expect(source).toContain('pointerEvents="none"');
    expect(source).toContain('testID="lesson-runtime-access-pending"');
    expect(source).toContain('openLessonPremiumPaywall(router, lessonId)');
    expect(source).toContain('openLessonAccessGate(router, lessonId)');
    expect(source).toContain('export default function __RouteShim() { return null; }');
  });

  it.each(guardedScreens)('%s mounts content only behind the shared boundary', (file, component) => {
    const source = read('app', file);

    expect(source).toContain("from './lesson_runtime_access_boundary'");
    expect(source).toContain(`withLessonRuntimeAccessBoundary(${component}`);
    expect(source).not.toContain(`export default function ${component}`);
    expect(source).not.toContain('shouldBlockLessonAccess');
    expect(source).not.toContain('openLessonGateByRuntime');
  });
});
