import fs from 'fs';
import path from 'path';

/**
 * Контракт разговорного режима «зажми и говори» (hands-free болталка).
 * Проверяет по исходнику, что оба стыка голосового цикла на месте:
 *   стык №1 — отпустил палец → авто-отправка распознанного;
 *   стык №2 — пришёл ответ ИИ → авто-озвучка вслух.
 * И что режим press-and-hold исключает одновременный микрофон+динамик
 * (конец речи определяет палец, а не OEM-endpointer — обходит
 * «микрофон Android закрывается сам» и эхо).
 */
describe('ai dialog conversation mode contract', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'app', 'ai_dialog_session.tsx'),
    'utf8',
  );

  it('has a conversation-mode toggle wired to state', () => {
    expect(source).toContain('conversationMode');
    expect(source).toContain('setConversationMode');
    // Свежее значение флага держим в ref для колбэков без stale-closure.
    expect(source).toContain('conversationModeRef');
  });

  it('stitch #2: auto-speaks the AI reply in conversation mode', () => {
    expect(source).toContain('speakAiReply(res.assistantMessage)');
    // Озвучка — no-op вне разговорного режима (ручная озвучка остаётся по тапу).
    expect(source).toContain('if (!conversationModeRef.current) return;');
  });

  it('stitch #1: press-and-hold auto-sends the transcript on release', () => {
    expect(source).toContain('handleMicPressIn');
    expect(source).toContain('handleMicPressOut');
    expect(source).toContain('onPressIn={conversationMode ? handleMicPressIn : undefined}');
    expect(source).toContain('onPressOut={conversationMode ? handleMicPressOut : undefined}');
    // Транскрипт для авто-отправки берётся из ref (локальная latest недоступна снаружи).
    expect(source).toContain('latestTranscriptRef');
    expect(source).toContain('void send(text)');
  });

  it('avoids echo: mic is stopped before the grace-period auto-send fires', () => {
    // В onPressOut сначала останавливаем движок, потом отложенно шлём — микрофон
    // закрыт, пока звучит ответ (палец отпущен), поэтому эха нет.
    expect(source).toContain('CONVERSATION_SEND_GRACE_MS');
    expect(source).toContain('speechModule?.stop()');
  });
});
