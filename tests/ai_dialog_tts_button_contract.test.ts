import fs from 'fs';
import path from 'path';

describe('ai dialog TTS button contract', () => {
  const scenarioSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_dialog_session.tsx'), 'utf8');
  const companionSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_companion_session.tsx'), 'utf8');

  it('сохраняет озвучку реплики по решению владельца от 2026-09-14 и точный язык', () => {
    // Новое решение владельца: под репликой обязательны все три кнопки —
    // озвучить, перевести, объяснить (DialogBubbleActions). Августовский запрет
    // отменён; инвариант здесь — голос выбранного изучаемого языка.
    expect(scenarioSource).toContain('speak(stripMarkers(m.text)');
    for (const source of [scenarioSource, companionSource]) {
      expect(source).toContain('language: dialogueSpeechLocale');
      expect(source).toContain('dialogueLanguageMeta(dialogueTarget).speechLocale');
    }
  });

  it('учебная озвучка ключевой фразы сохранена — звучит именно фраза', () => {
    // Подчёркнутая ключевая фраза остаётся кликабельной: speak(seg.text) читает
    // саму фразу, а не реплику вокруг неё. Это учебная суть экрана.
    for (const source of [scenarioSource, companionSource]) {
      expect(source).toContain('speak(seg.text, undefined');
      expect(source).toContain("voice: ''");
    }
  });
});
