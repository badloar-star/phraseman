import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

const hookSrc = read('hooks/use-speak-answer.ts');
const wordsSrc = read('app/trainer_words_session.tsx');
const phrasesSrc = read('app/trainer_phrases_session.tsx');
const arenaSrc = read('app/trainer_arena_session.tsx');
const reviewSrc = read('app/review.tsx');

describe('"My practice" speaks the correct answer out loud', () => {
  it('the shared hook respects voiceOut, uses the user speech rate and the target locale', () => {
    expect(hookSrc).toContain('export function useSpeakAnswer()');
    expect(hookSrc).toContain("import { useAudio } from './use-audio'");
    expect(hookSrc).toContain('getUserSettingsSnapshot()');
    // Не озвучивать, если пользователь выключил озвучку в настройках.
    expect(hookSrc).toContain('if (!settings.voiceOut) return');
    // Скорость из настроек + правильная локаль учебного языка.
    expect(hookSrc).toContain('speak(line, settings.speechRate');
    expect(hookSrc).toContain('ttsLocaleForStudyTarget(studyTarget)');
  });

  it('trainer (words) voices the English word on a correct answer', () => {
    expect(wordsSrc).toContain("import { useSpeakAnswer } from '../hooks/use-speak-answer'");
    expect(wordsSrc).toContain('const { speakAnswer } = useSpeakAnswer();');
    expect(wordsSrc).toContain('speakAnswer(card.item.key, studyTarget)');
  });

  it('trainer (phrases) voices the phrase on a correct answer in every mode', () => {
    expect(phrasesSrc).toContain("import { useSpeakAnswer } from '../hooks/use-speak-answer'");
    // WordBank + speaking-fill + FillGap — три точки правильного ответа.
    const calls = phrasesSrc.match(/speakAnswer\(item\.key, studyTarget\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(3);
  });

  it('trainer (arena) voices the phrase on a correct answer', () => {
    expect(arenaSrc).toContain("import { useSpeakAnswer } from '../hooks/use-speak-answer'");
    expect(arenaSrc).toContain('speakAnswer(item.key, studyTarget)');
  });

  it('review (SRS practice) voices the English surface of the phrase on a correct answer', () => {
    expect(reviewSrc).toContain("import { useSpeakAnswer } from '../hooks/use-speak-answer'");
    expect(reviewSrc).toContain('speakAnswer(englishRecallSurface(item.phrase), studyTarget)');
  });
});
