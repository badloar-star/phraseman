import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '..');
const session = fs.readFileSync(path.join(root, 'app', 'dialogue_v2_session.tsx'), 'utf8');
const screen = fs.readFileSync(path.join(root, 'components', 'dialogs', 'DialogueV2SessionScreen.tsx'), 'utf8');

describe('Dialogue V2 local voice-message surface contract', () => {
  test('keeps the recorded audio local while the existing text-turn transport receives the transcript', () => {
    expect(session).toContain('useDialogueV2VoiceMessage');
    expect(session).toContain('takeVoiceAttachment');
    // D112: ход идёт через клиент разбора (тот же callable, плюс язык интерфейса).
    expect(session).toContain('sendDialogueV2CoachedTextTurn');
    expect(session).not.toMatch(/expo-audio|expo-file-system|SpeechRecognition|persistRecording/u);
    expect(session).not.toMatch(/voice:\s*\{\s*uri:[^}]*\}[\s\S]{0,300}sendDialogueV2CoachedTextTurn/u);
  });

  test('renders a replayable voice bubble instead of rendering the transcript in the chat', () => {
    expect(screen).toContain("voice?: Readonly<{ uri: string }>");
    expect(screen).toContain('onPlayVoice');
    expect(screen).toContain('describeDialogueVoiceMessage');
    expect(screen).toContain("voiceUri ? (");
  });

  test('exposes push-to-talk controls only through the existing V2 session screen', () => {
    expect(screen).toContain('onStartVoice');
    expect(screen).toContain('onStopVoice');
    expect(session).toContain('onStartVoice');
    expect(session).toContain('onStopVoice');
  });

  test('cancels a pending microphone start when the learner releases the hold before native startup', () => {
    const hook = fs.readFileSync(path.join(root, 'hooks', 'use_dialogue_v2_voice_message.ts'), 'utf8');
    expect(hook).toContain('voiceStartGenerationRef');
    expect(hook).toContain('voiceHoldActiveRef');
    expect(hook).toContain('startGeneration === voiceStartGenerationRef.current');
    expect(hook).toContain('&& voiceHoldActiveRef.current');
  });
});
