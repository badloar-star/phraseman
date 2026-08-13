import fs from 'fs';
import path from 'path';

describe('AddToFlashcard save flow', () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'AddToFlashcard.tsx'), 'utf8');

  it('keeps post-save rewards and analytics isolated from the primary save action', () => {
    expect(source).toContain('const safeAsyncSideEffect =');
    expect(source).toContain('const runPostSaveSideEffects =');
    expect(source).toContain('const result = await addFlashcard({');
    expect(source.indexOf('const result = await addFlashcard({')).toBeLessThan(
      source.indexOf('runPostSaveSideEffects();'),
    );
  });

  it('does not assume React Native press events always expose stopPropagation', () => {
    expect(source).toContain('e.stopPropagation?.();');
    expect(source).not.toContain('e.stopPropagation();');
  });
});
