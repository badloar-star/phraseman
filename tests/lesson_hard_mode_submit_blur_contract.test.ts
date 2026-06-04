import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

describe('lesson hard mode submit focus contract', () => {
  it('dismisses the typed answer keyboard before showing the result state', () => {
    const source = fs.readFileSync(path.join(ROOT, 'app', 'lesson1.tsx'), 'utf8');
    const submitStart = source.indexOf('const handleTypedSubmit = useCallback');
    const submitEnd = source.indexOf('}, [typedText, status, checkAnswer]);', submitStart);
    const handleTypedSubmit = source.slice(submitStart, submitEnd);

    expect(handleTypedSubmit).toContain('textInputRef.current?.blur()');
    expect(handleTypedSubmit).toContain('Keyboard.dismiss()');
    expect(handleTypedSubmit.indexOf('textInputRef.current?.blur()')).toBeLessThan(
      handleTypedSubmit.indexOf('checkAnswer(typedText)'),
    );
  });
});
