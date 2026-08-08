import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (relative: string) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const panel = read('components/SpeakingPanel.tsx');
const wordDrill = read('components/WordDrillCard.tsx');
const onboarding = read('components/onboarding_aha/SpeechBeat.tsx');
const onboardingCopy = read('components/onboarding_aha/aha_scenes.ts');
const personalPlan = read('app/personal_plan_exercise.tsx');
const dialog = read('app/ai_dialog_session.tsx');

describe('canonical speaking push-to-talk UI contract', () => {
  it('never auto-starts the lesson/trainer microphone when the panel opens', () => {
    expect(panel).not.toContain('autoStartedRef');
    expect(panel).not.toContain('void startListening();\n  }, [isPreview, holdSupported');
    expect(panel).toContain("const [status, setStatus] = useState<SpeakingPanelStatus>(previewStatus ?? 'idle')");
  });

  it('keeps requesting neutral and turns listening on only from native start/audio', () => {
    expect(panel).toContain("setStatus('requesting')");
    expect(panel).toContain("speech.addListener('start'");
    expect(panel).toContain("setStatus('listening')");
    expect(panel).toContain("const micDisabled = status === 'scoring' || status === 'unavailable'");
    expect(panel).not.toContain("status === 'requesting' || status === 'scoring' || status === 'unavailable'");
    expect(panel).toContain('systemHoldPressActiveRef.current = true');
    expect(panel).toContain('onPressOut: () =>');
  });

  it('makes onboarding retry idle and red only while recording is actually live', () => {
    expect(onboarding).toContain("setStatus('requesting')");
    expect(onboarding).toContain("setStatus('preprompt')");
    expect(onboarding).toContain("active={status === 'listening'}");
    expect(onboarding).toContain("if (statusRef.current === 'requesting')");
    // зачем: раньше утверждение было привязано к ОДНОСТРОЧНОЙ записи, и падало,
    // как только рядом с setStatus('listening') появился второй вызов
    // (playRecordStart через playCueOnce) и строку пришлось раскрыть в блок.
    // Контракт здесь про ПОВЕДЕНИЕ — «слушаем» включается только когда палец
    // ещё на кнопке и экран жив, — поэтому проверяем гард вместе с переходом,
    // не диктуя форматирование.
    expect(onboarding).toMatch(
      /if \(pressActiveRef\.current && mountedRef\.current\)\s*\{?\s*setStatus\('listening'\)/,
    );
    expect(onboardingCopy).toContain("ru: 'Готовлю микрофон…'");
    expect(onboarding).toContain("permission === 'granted_after_prompt'");
  });

  it('uses the same hold gesture in the personal-plan pronunciation exercise', () => {
    expect(personalPlan).toContain('const holdMode = Boolean(speechModule)');
    expect(personalPlan).not.toContain('holdMode={holdMode}');
    expect(personalPlan).toContain('onPressIn={startUnifiedHold}');
    expect(personalPlan).toContain('stopUnifiedHold();');
    expect(personalPlan).toContain('preparing={pronunciationPreparing}');
    expect(personalPlan).toContain("holdToTalk: !pcmHoldModeRef.current");
    expect(personalPlan).toContain("? 'Готовлю микрофон… удерживай кнопку'");
    expect(personalPlan).toContain("permission === 'granted_after_prompt'");
  });

  it('uses hold for word drill and never exposes a tap-to-record branch', () => {
    expect(wordDrill).toContain('const repeatHandlers = { onPressIn: onHoldStart, onPressOut: onHoldEnd }');
    expect(wordDrill).not.toContain('tap-to-record');
    expect(wordDrill).not.toContain('{ onPress: onRepeatTap }');
    expect(wordDrill).toContain("ru: 'Зажми «Повторить» и скажи слово'");
  });

  it('uses hold for dialog dictation as well as conversation mode', () => {
    expect(dialog).toContain('onPressIn={handleMicPressIn}');
    expect(dialog).toContain('onPressOut={handleMicPressOut}');
    expect(dialog).toContain('holdToTalk: true');
    expect(dialog).toContain("| 'finishing'");
    expect(dialog).toContain("voiceInputStatus === 'requesting'");
    expect(dialog).toContain("permission === 'granted_after_prompt'");
    expect(dialog).not.toContain("conversationMode ? handleMicPressIn : undefined");
    expect(dialog).not.toContain("voiceInputStatus === 'listening'\n                      ? stopVoiceInput");
  });

  it('restores loud playback and cues only from real microphone activity', () => {
    for (const source of [panel, onboarding, personalPlan, dialog]) {
      expect(source).toContain('playRecordStart');
    }
    expect(panel).toContain('restoreLoudPlaybackMode');
    expect(onboarding).toContain('restoreLoudPlayback');
    expect(personalPlan).toContain('restoreLoudPlaybackMode');
    expect(dialog).toContain('restoreLoudPlaybackMode');
  });

  it('keeps audioend alive long enough to expose My recording', () => {
    expect(panel).toContain('audioEndSubRef.current = speech.addListener');
    expect(panel).toContain('cleanupAudioEndListener');
    expect(panel).not.toContain('noMatchSub,\n      audioEndSub,\n      volumeSub');
  });
});
