// зачем (координатор 12.10, R1_OPTIMISTIC_UI_REST п.3): полоса языков изучения при смене не блокируется целиком — занятой остаётся только тапнутая строка;
// остальные тапы отсекает busyRef в select() с журналом, откат отметки и тост ошибки на месте.
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'settings', 'StudyLanguagePicker.tsx'), 'utf8');

describe('study language strip: busy only on the tapped row', () => {
  it('rows are no longer all disabled by the shared busy flag', () => {
    expect(source).not.toMatch(/disabled=\{busy\}/);
    expect(source).toContain('disabled={busy && code === pendingTarget}');
    expect(source).toContain('busy: busy && code === pendingTarget');
  });

  it('keeps the double-tap guard, the optimistic mark, the rollback and the error toast', () => {
    expect(source).toMatch(/if \(busyRef\.current\) \{\s*console\.warn\(`\$\{logTag\} select_ignored reason=busy/);
    expect(source).toContain('onSwitchStart: (code) =>');
    expect(source).toContain('strip_rollback');
    expect(source).toContain("actionToastTri('error', switchFailedToastCopy())");
  });
});
