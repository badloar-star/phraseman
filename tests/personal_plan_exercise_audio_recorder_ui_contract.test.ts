import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'app', 'personal_plan_exercise.tsx'), 'utf8');
const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2]/u;

describe('personal plan exercise audio and recorder UI contract', () => {
  it('keeps listening audio control readable, accessible and stateful', () => {
    expect(SOURCE).not.toMatch(MOJIBAKE_RE);
    expect(SOURCE).toContain("accessibilityRole=\"button\"");
    expect(SOURCE).toContain("accessibilityLabel={disabled ? 'Аудио готовится' : 'Слушать фразу'}");
    expect(SOURCE).toContain("shadowColor: disabled ? '#000000' : accent");
    expect(SOURCE).toContain("label = disabled ? 'Аудио готовится' : isBuffering ? 'Загрузка' : isPlaying ? 'Слушаю' : 'Слушать'");
  });

  // The old record-and-playback self-check UI was replaced by a real on-device
  // recognition flow (listen to the phrase, speak it, score the transcript, pass at
  // PLAN_PRONUNCIATION_PASS_THRESHOLD). These assertions track the current honest flow.
  it('drives pronunciation through real on-device recognition, not a fake recording', () => {
    expect(SOURCE).toContain('recorderHintPill');
    expect(SOURCE).toContain('recorderStack: {');

    // Real on-device recognition + local scoring (no paid service, no server).
    expect(SOURCE).toContain('speechModule.start({');
    expect(SOURCE).toContain("speechModule.addListener('result', applyResult)");
    expect(SOURCE).toContain('scorePlanPronunciationTranscript({');
    expect(SOURCE).toContain('listenPronunciationTarget');
    expect(SOURCE).toContain('speakAudio(targetText, 0.86');

    // Completion is gated on a real passing score, not on "I recorded something".
    expect(SOURCE).toContain('enabled={pronunciationHeardTarget && !pronunciationSpeakingTarget}');
    expect(SOURCE).toContain('disabled={saving || pronunciationScoring || !pronunciationScore?.passed}');
    expect(SOURCE).toContain('PLAN_PRONUNCIATION_PASS_THRESHOLD');

    // The fake "record 12 seconds + listen to yourself = pass" path must be gone.
    expect(SOURCE).not.toContain('Запись до 12 секунд');
    expect(SOURCE).not.toContain('userPlayedRecording: true,\n      });');
  });
});
