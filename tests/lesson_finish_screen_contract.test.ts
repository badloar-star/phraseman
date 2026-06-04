import fs from 'fs';
import path from 'path';

describe('lesson finish screen contract', () => {
  it('closes the lesson by position, not by daily total answer tasks or replay state', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson1.tsx'), 'utf8');
    const completionStart = source.indexOf('// Урок закрывается по кругу позиций');
    expect(completionStart).toBeGreaterThan(-1);

    const completionBlock = source.slice(completionStart, source.indexOf("void trackFeatureStart('lesson', 'complete'", completionStart));
    expect(completionBlock).toContain('if (nextCell === 0)');
    expect(completionBlock).not.toContain('overridePhraseCell === null');
    expect(completionBlock).not.toContain('sessionAnswerCount.current >= effectiveTotal');
    expect(completionBlock).not.toContain('total_answers');
  });

  it('keeps result reveal animation on the JS driver before lesson completion', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson1.tsx'), 'utf8');
    const resultStart = source.indexOf('// Сразу показываем результат');
    expect(resultStart).toBeGreaterThan(-1);

    const resultBlock = source.slice(resultStart, source.indexOf('const nextCell = (cellIndex + 1) % effectiveTotal', resultStart));
    expect(resultBlock).toContain('fadeAnim.stopAnimation');
    expect(resultBlock).toContain('Animated.timing(fadeAnim');
    expect(resultBlock).toContain('useNativeDriver: false');
    expect(resultBlock).not.toContain('useNativeDriver: true');
  });

  it('exposes stable test ids for the cycle-end modal QA gate', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'app', 'lesson1.tsx'), 'utf8');

    expect(source).toContain('testID="lesson-cycle-end-modal"');
    expect(source).toContain('testID="lesson-cycle-end-continue"');
  });
});
