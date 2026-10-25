import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeEol } from './helpers/read_source';

// зачем (learning-v2-013, координатор 05.10): тап по закрытому ЗАНЯТИЮ открывает окно learning-v2.html 2.4 modal-locked
// (замок, «Занятие N», «Сначала заверши предыдущее занятие.», одна кнопка «Закрыть», без фактов) вместо тоста; ветки
// «Plus» и «в работе» — тост, как раньше; лог [V2-TAP] остаётся.
const lessons = normalizeEol(readFileSync(join(__dirname, '..', 'app', '(tabs)', 'lessons.tsx'), 'utf8'));
const sheet = normalizeEol(readFileSync(join(__dirname, '..', 'components', 'LearningV2SessionOutcomeSheet.tsx'), 'utf8'));

function branch(label: string): string {
  const start = lessons.indexOf(`'[V2-TAP] ${label}'`);
  expect(start).toBeGreaterThan(-1);
  const end = lessons.indexOf('return;', start);
  return lessons.slice(start, end);
}

describe('learning-v2-013: locked session opens the locked sheet', () => {
  it('denied:locked opens the locked sheet instantly instead of the hint toast', () => {
    const locked = branch('denied:locked');
    expect(locked).toContain("shown: 'locked_sheet'");
    expect(locked).toContain('setLearningV2LockedSession({ lessonOrdinal: selectedLesson, sessionOrdinal });');
    expect(locked).not.toContain('showLearningV2DenialHint(');
    expect(locked).not.toMatch(/prewarm|startLearningV2SessionLaunchTraceV1|setSelectedLearningV2Session/);
  });

  it('denied:plus and denied:wip still show the hint toast', () => {
    expect(branch('denied:plus')).toContain('showLearningV2DenialHint(');
    expect(branch('denied:wip')).toContain('showLearningV2DenialHint(');
  });

  it('the locked sheet is a separate instance: locked, no second button, closes to null', () => {
    const start = lessons.indexOf('visible={learningV2LockedSession !== null}');
    expect(start).toBeGreaterThan(-1);
    const block = lessons.slice(start, lessons.indexOf('/>', start));
    expect(block).toMatch(/\n\s+locked\n/);
    expect(block).toContain('secondaryLabel={null}');
    expect(block).toContain('ru: "Сначала заверши предыдущее занятие."');
    expect(block).toContain('onPrimaryPress={() => setLearningV2LockedSession(null)}');
    expect(block).toContain('onClose={() => setLearningV2LockedSession(null)}');
  });

  it('the sheet hides the facts row when locked (mockup noFacts) and when there are no facts at all', () => {
    // зачем (владелец 25.10, координатор): черновые факты «минут/попытки» убраны (f305f6ed6) — ряд рисуется, только если есть хотя бы один факт;
    // закрытое занятие по-прежнему без ряда фактов (макет noFacts)
    expect(sheet).toContain('{locked || stats.length === 0 ? null : <View style={sx.stats}>');
  });
});
