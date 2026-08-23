import fs from 'fs';
import path from 'path';

describe('ai dialog TTS button contract', () => {
  const scenarioSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_dialog_session.tsx'), 'utf8');
  const companionSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_companion_session.tsx'), 'utf8');

  it('не озвучивает реплику целиком — звучит только ключевая фраза', () => {
    // зачем (владелец 2026-08-23): «убери "Послушать фразу" в диалоге, потому что
    // он повторяет не фразу, а текст своей реплики». Кнопка-динамик у реплики и
    // тап по обычному тексту читали ВСЮ реплику (stripMarkers(m.text)) — убраны
    // из обоих экранов диалога.
    for (const source of [scenarioSource, companionSource]) {
      expect(source).not.toContain('volume-medium-outline');
      expect(source).not.toContain('speak(stripMarkers(m.text)');
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
