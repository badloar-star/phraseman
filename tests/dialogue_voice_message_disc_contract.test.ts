// зачем (Макеты dialogs-gap-014, образец dialogs-gaps-states.html .dg-vm .pl): ▶ голосового сообщения в ленте диалога стоит в круге 30 с подложкой 14 % от чернил пузыря,
// а не голым значком; кнопка воспроизведения и подпись «Голосовое сообщение» остались.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const screen = read('components/dialogs/DialogueV2SessionScreen.tsx');

describe('голосовое сообщение в ленте диалога', () => {
  it('▶ в круге 30 с подложкой 14 %, значок 16, зазор до подписи 10', () => {
    expect(screen).toContain("style={{ minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 10 }}");
    expect(screen).toContain("width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: glassTone(ink, 0.14)");
    expect(screen).toContain("<Ionicons name={playingVoiceUri === voiceUri ? 'pause' : 'play'} size={16} color={ink} />");
    expect(screen).toContain("import { glassTone } from './glass/glassTone';");
  });

  it('кнопка воспроизведения, подпись и тестовые идентификаторы на месте', () => {
    expect(screen).toContain('onPress={() => onPlayVoice(voiceUri)}');
    expect(screen).toContain('testID={`dialogue-v2-voice-message-${message.id}`}');
    expect(screen).toContain('<DialogueGlassBubbleText glass={glass} author={author}>{voiceCopy.label}</DialogueGlassBubbleText>');
  });
});
