import fs from 'fs';
import path from 'path';

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

describe('ai dialog Phraseman copy contract', () => {
  const scenarioSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_dialog_session.tsx'), 'utf8');
  const companionSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_companion_session.tsx'), 'utf8');
  const homeSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai_dialog_home.tsx'), 'utf8');
  const dialogsContentSource = fs.readFileSync(path.join(__dirname, '..', 'components', 'DialogsTabContent.tsx'), 'utf8');

  it('keeps conversational UI copy emoji-free while allowing explicit game-state indicators', () => {
    const scenarioCopy = scenarioSource
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/outcome === 'success' \? '[^']+' : outcome === 'lost_patience' \? '[^']+' : '[^']+'/g, '');
    expect(scenarioCopy).not.toMatch(EMOJI_RE);
    expect(companionSource).not.toMatch(EMOJI_RE);
    expect(homeSource).not.toMatch(EMOJI_RE);
    expect(dialogsContentSource).not.toMatch(EMOJI_RE);
  });

  it('does not show an empty-dialog success summary', () => {
    expect(scenarioSource).not.toContain('Ты говорил по-английски {userExchanges} раз');
    expect(scenarioSource).not.toContain('Отличный разговор!');
    expect(scenarioSource).toContain('userExchanges > 0');
    expect(scenarioSource).toContain('Разговор завершён');
    expect(scenarioSource).toContain('Твоїх реплік: ${userExchanges}');
  });

  it('labels companion as an open learning conversation, not a fixed scenario', () => {
    expect(companionSource).toContain('Вільна розмова');
    expect(companionSource).toContain('Запитай про фразу, прогрес або свій наступний крок');
    expect(companionSource).toContain('Запитай про фразу або свій шлях');
    expect(companionSource).not.toContain('Tell me more.');
    expect(companionSource).not.toContain('I’m not sure');
    expect(homeSource).toContain('сценаріїв із Компасом');
  });
});
