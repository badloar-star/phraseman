import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

const playMock = jest.fn();
const tapMock = jest.fn();
const lightMock = jest.fn();
const mediumMock = jest.fn();
const peakMock = jest.fn();
const successMock = jest.fn();
const correctMock = jest.fn();
const wrongMock = jest.fn();

jest.mock('../app/user_settings_store', () => ({
  getUserSettingsSnapshot: () => ({ uiSounds: true }),
}));

jest.mock('../app/feedback/sound_bank', () => ({
  play: (...args: unknown[]) => playMock(...args),
}));

jest.mock('../app/feedback/haptics', () => ({
  tap: () => tapMock(),
  pop: jest.fn(),
  light: () => lightMock(),
  medium: () => mediumMock(),
  peak: () => peakMock(),
  success: () => successMock(),
  correct: () => correctMock(),
  wrong: () => wrongMock(),
}));

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('lesson lightning feedback scope', () => {
  it('requires an explicit lesson surface before playing combo lightning effects', () => {
    const feedbackKit = read('app/feedback/feedback_kit.ts');

    expect(feedbackKit).toContain("surface?: FeedbackSurface");
    expect(feedbackKit).toContain("if (options.surface === 'lesson')");
    expect(feedbackKit).toContain("sfx('crack')");
    expect(feedbackKit).toContain("sfx('thunder')");
  });

  it('enables lightning combo effects only on the main lesson screen', () => {
    const lesson = read('app/lesson1.tsx');
    const words = read('app/lesson_words.tsx');
    const irregular = read('app/lesson_irregular_verbs.tsx');
    const prepositions = read('app/preposition_drill.tsx');

    expect(lesson).toContain("fk.combo(correctStreakRef.current, { surface: 'lesson' })");
    expect(words).not.toContain("surface: 'lesson'");
    expect(irregular).not.toContain("surface: 'lesson'");
    expect(prepositions).not.toContain("surface: 'lesson'");
  });

  it('keeps practice combo haptics but suppresses practice lightning sounds', async () => {
    const { fk } = await import('../app/feedback/feedback_kit');

    playMock.mockClear();
    mediumMock.mockClear();
    peakMock.mockClear();

    fk.combo(5);
    expect(playMock).not.toHaveBeenCalled();
    expect(mediumMock).toHaveBeenCalledTimes(1);

    fk.combo(10);
    expect(playMock).not.toHaveBeenCalled();
    expect(peakMock).toHaveBeenCalledTimes(1);
  });

  it('plays lightning sounds on lesson combo thresholds', async () => {
    const { fk } = await import('../app/feedback/feedback_kit');

    playMock.mockClear();
    mediumMock.mockClear();
    peakMock.mockClear();

    fk.combo(5, { surface: 'lesson' });
    expect(playMock).toHaveBeenCalledWith('crack', undefined);
    expect(mediumMock).toHaveBeenCalledTimes(1);

    playMock.mockClear();
    fk.combo(10, { surface: 'lesson' });
    expect(playMock).toHaveBeenCalledWith('thunder', undefined);
    expect(peakMock).toHaveBeenCalledTimes(1);
  });
});
