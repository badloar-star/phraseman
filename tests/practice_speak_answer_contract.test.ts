import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

const hookSrc = read('hooks/use-speak-answer.ts');
const wordsSrc = read('app/trainer_words_session.tsx');
const phrasesSrc = read('app/trainer_phrases_session.tsx');
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
    expect(hookSrc).toContain('onDone: finish');
    expect(hookSrc).toContain('ANSWER_SPEECH_MAX_WAIT_TIMEOUT_MS');
  });

  it('trainer (words) voices the English word on a correct answer', () => {
    expect(wordsSrc).toContain("import { useSpeakAnswer } from '../hooks/use-speak-answer'");
    expect(wordsSrc).toContain('const { speakAnswer } = useSpeakAnswer();');
    expect(wordsSrc).toContain('speakAnswer(card.item.key, studyTarget)');
  });

  it('trainer (phrases) voices the assembled phrase on a correct answer in every mode', () => {
    expect(phrasesSrc).toContain("import { useSpeakAnswer } from '../hooks/use-speak-answer'");
    // Арена озвучивается здесь же: trainerSessionPhrase подставляет correct вместо
    // маркера пропуска, поэтому TTS читает естественную фразу, а не «—»/«___».
    expect(phrasesSrc).toContain('const { phrase } = trainerSessionPhrase(item)');
    // WordBank + speaking-fill + FillGap — три точки правильного ответа.
    const calls = phrasesSrc.match(/speakAnswer\(phrase, studyTarget\)/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(3);
    const waitedCalls = phrasesSrc.match(/waitForPhraseAnswerFeedback\(speakAnswer\(phrase, studyTarget\)\)/g) ?? [];
    expect(waitedCalls.length).toBeGreaterThanOrEqual(3);
    expect(phrasesSrc).not.toContain('setTimeout(() => onResult(true), 700)');
  });

  it('review (SRS practice) voices the English surface of the phrase on a correct answer', () => {
    expect(reviewSrc).toContain("import { useSpeakAnswer } from '../hooks/use-speak-answer'");
    expect(reviewSrc).toContain('speakAnswer(englishRecallSurface(item.phrase), studyTarget)');
  });
});
