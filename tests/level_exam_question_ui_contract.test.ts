import fs from 'fs';
import path from 'path';

import {
  formatLevelExamRemaining,
  getLevelExamTimerUrgency,
} from '../components/level-exam/levelExamTime';

const read = (file: string) => fs.readFileSync(
  path.join(process.cwd(), 'components/level-exam', file),
  'utf8',
);

describe('level exam question UI contract', () => {
  it('formats the total wall-clock timer and exposes warning states', () => {
    expect(formatLevelExamRemaining(13 * 60_000)).toBe('13:00');
    expect(formatLevelExamRemaining(61_000)).toBe('1:01');
    expect(formatLevelExamRemaining(60_000)).toBe('1:00');
    expect(formatLevelExamRemaining(999)).toBe('0:01');
    expect(formatLevelExamRemaining(-1)).toBe('0:00');
    expect(getLevelExamTimerUrgency(60_001)).toBe('normal');
    expect(getLevelExamTimerUrgency(60_000)).toBe('warning');
    expect(getLevelExamTimerUrgency(10_000)).toBe('critical');
  });

  it('ships only the audited tournament-style interactive formats', () => {
    const files = [
      'ContextChoiceQuestion.tsx',
      'PhraseBuilderQuestion.tsx',
      'SpeedMatchQuestion.tsx',
    ];

    for (const file of files) {
      const source = read(file);
      expect(source).toContain('accessibility');
      expect(source).toContain('<V2Chip');
      expect(source).toContain('FadeInDown');
      expect(source).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(source).not.toMatch(/rgba?\(/i);
      expect(source).not.toMatch(/borderWidth\s*:/);
    }
    const route = read('LevelExamV2.tsx');
    expect(route).not.toContain('<SpotErrorQuestion');
    expect(route).not.toContain('MeaningChoiceQuestion');
    expect(route).toContain("'guess_phrase'");
    expect(route).toContain("'fill_gap'");
    expect(route).toContain("'find_oddity'");
    expect(route).toContain("'translate_build'");
  });

  it('records an incorrect speed-match choice instead of allowing unlimited retries', () => {
    const source = read('SpeedMatchQuestion.tsx');
    expect(source).toMatch(/if \(activeSourceId !== targetId\)\s*\{[\s\S]*?onChange\(next\);[\s\S]*?\n\s*return;/);
  });

  it('keeps progress, timer, and one stable continuation action in the frame', () => {
    const frame = read('LevelExamQuestionFrame.tsx');
    expect(frame).toContain('<LevelExamTimer');
    expect(frame).toContain('progressStart');
    expect(frame).toContain('progressEnd');
    expect(frame).toContain('footerProgress');
    expect(frame.indexOf('footerProgress')).toBeGreaterThan(frame.indexOf('onContinue'));
    expect(frame).not.toContain('progressArea');
    expect(frame).toContain('accessibilityState={{ disabled: !canContinue }}');
    expect(frame).toContain('decelerationRate="fast"');
    expect(frame).toContain('SlideInRight');
    expect(frame).toContain('SlideOutLeft');
    expect(frame).not.toContain('TonalSurface tone="card"');
    expect(frame).not.toContain('backgroundColor: t.bgCard');
    expect(frame).not.toContain('name="arrow-forward"');
    expect(frame).not.toMatch(/#[0-9a-f]{3,8}\b/i);
    expect(frame).not.toMatch(/rgba?\(/i);
    expect(frame).not.toMatch(/borderWidth\s*:/);
  });

  it('keeps the exam intro metrics in one quiet surface', () => {
    const intro = read('LevelExamIntro.tsx');
    expect((intro.match(/<TonalSurface\b/g) || []).length).toBe(1);
    expect(intro).toContain('copy.passGoal');
    expect(intro).toContain('copy.duration');
  });

  it('updates the visible seconds without a high-frequency background loop', () => {
    const screen = read('LevelExamV2.tsx');
    expect(screen).toContain('setInterval(update, 1_000)');
    expect(screen).not.toContain('setInterval(update, 250)');
  });
});
