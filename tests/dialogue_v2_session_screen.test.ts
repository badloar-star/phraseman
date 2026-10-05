import fs from 'fs';
import path from 'path';

describe('DialogueV2SessionScreen', () => {
  it('keeps the V2 chat surface bounded with explicit sending accessibility state', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2SessionScreen.tsx'),
      'utf8',
    );

    expect(source).toContain('testID="dialogue-v2-session-screen"');
    expect(source).toContain('messages.map((message) =>');
    expect(source).toContain('disabled={sending || !canSend}');
    expect(source).toContain('accessibilityState={{ disabled: sending || !canSend }}');
    expect(source).toContain('labels.complete');
    expect(source).toContain('onComplete');
    expect(source).toContain('useDialogueGlass()');
    expect(source).not.toContain('ai_dialog_session');
    expect(source).not.toContain('purchase');
  });

  it('renders local voice bubbles without exposing their transcript and offers hold-to-record', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2SessionScreen.tsx'),
      'utf8',
    );

    expect(source).toContain('message.voice');
    expect(source).toContain('testID={`dialogue-v2-voice-message-${message.id}`}');
    expect(source).toContain('onPlayVoice(voiceUri)');
    expect(source).toContain("name={playingVoiceUri === voiceUri ? 'pause' : 'play'}");
    expect(source).toContain('onPressIn={onStartVoice}');
    expect(source).toContain('onPressOut={onStopVoice}');
    expect(source).toContain('voiceDraft');
    expect(source).toContain("voiceStatus !== 'idle'");
    expect(source).not.toContain('{message.voice.transcript}');
  });

  it('uses the V2 glass session hierarchy with a safe header, pending reply and protected composer', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2SessionScreen.tsx'),
      'utf8',
    );

    expect(source).toContain('testID="dialogue-v2-session-header"');
    expect(source).toContain('testID="dialogue-v2-session-typing"');
    expect(source).toContain('keyboardShouldPersistTaps="handled"');
    expect(source).toContain('<DialogueGlassBubble');
    expect(source).toContain('dialogueGlassFieldStyle(glass)');
    expect(source).toContain('<DialogueGlassMenuSheet');
    // зачем (сверка dialogs-030/-016): на Android 'height' при adjustResize не возвращал высоту после скрытия клавиатуры (пустая полоса ~150px) — режим 'padding' на обеих платформах
    expect(source).toContain('behavior="padding"');
    expect(source).not.toContain("'height'");
    expect(source).toContain('keyboardVerticalOffset={0}');
  });
});
