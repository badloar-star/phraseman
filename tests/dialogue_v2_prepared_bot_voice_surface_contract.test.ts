import fs from 'node:fs';
import path from 'node:path';

describe('Dialogue V2 prepared bot voice surface boundary', () => {
  it('renders prepared persona voice with Design 2 tokens while retaining text fallback', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '..', 'components', 'dialogs', 'DialogueV2SessionScreen.tsx'),
      'utf8',
    );
    expect(source).toContain('message.preparedBotVoice');
    expect(source).toContain('onPlayPreparedBotVoice(message.id)');
    expect(source).toContain('dialogue-v2-prepared-bot-voice-');
    expect(source).toContain('useDialogueGlass()');
    expect(source).toContain('<DialogueGlassBubbleText glass={glass} author={author}>{message.text}</DialogueGlassBubbleText>');
    expect(source).not.toContain('https://');
  });

  it('wires local playback but never claims or generates voice from the live text route', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_session.tsx'), 'utf8');
    expect(source).toContain('useDialogueV2PreparedBotVoicePlayback');
    expect(source).toContain('onPlayPreparedBotVoice');
    expect(source).toContain('resolveCurrentDialogueV2PreparedBotVoice');
    expect(source).toContain('result.preparedBotVoiceSelection');
    expect(source).not.toContain('dialogueV2BotVoiceClaim');
    // зачем (04.10): §SPEECH-NA (83300f8d5) добавил текст «распознавание речи недоступно» — это подпись
    // интерфейса, а не генерация голоса. Её и комментарии вычищаем; синтез/TTS/OpenAI по-прежнему запрещены.
    const voiceRelevant = source
      .split(/\r?\n/).map((line) => line.replace(/\/\/.*$/, '')).join('\n')
      .replace(/speechUnavailableOnDeviceText|'\.\/speech_device_availability'/g, '');
    expect(voiceRelevant).not.toMatch(/speech|tts|openai/i);
  });
});
