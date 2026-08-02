import * as fs from 'fs';
import * as path from 'path';

const lessonSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8');
const audioSource = fs.readFileSync(path.join(__dirname, '..', 'hooks', 'use-audio.ts'), 'utf8');

describe('lesson result phrase audio replay', () => {
  it('keeps a visible replay audio control on the result screen', () => {
    expect(lessonSource).toContain('testID="lesson1-replay-audio"');
    expect(lessonSource).toContain("status === 'result' && (");
    expect(lessonSource).toContain('onReplayPhraseAudio();');
    expect(lessonSource).toContain('volume-high');
  });

  it('manual replay uses the central voice path that is blocked when voice-out is disabled', () => {
    const start = lessonSource.indexOf('const replayResultPhraseAudio = useCallback');
    const end = lessonSource.indexOf('// Pulsing animation for to-be hint');
    const replayBlock = lessonSource.slice(start, end);

    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(replayBlock).toContain("status !== 'result'");
    expect(replayBlock).toContain('phraseAnswerDisplayLine(phrase, studyTarget, lang)');
    expect(replayBlock).toContain('stopAudio();');
    expect(replayBlock).toContain('speakAudio(line, settings.speechRate');
    expect(audioSource).toContain('voicePlaybackPolicy.captureStart()');
    expect(audioSource).toContain('voicePlaybackPolicy.canStart(voicePolicyToken)');
  });
});
