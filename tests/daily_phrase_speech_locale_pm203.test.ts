// зачем (PM-203-A1): фраза дня для французского target — французский текст; озвучка
// без языка выводила en-US (латиница → английский). Тест держит: язык озвучки берётся
// из target изучения, а три места «озвучить фразу дня» его передают.
import fs from 'fs';
import path from 'path';

jest.mock('expo-speech', () => ({ speak: jest.fn(), stop: jest.fn(), isSpeakingAsync: jest.fn(), getAvailableVoicesAsync: jest.fn() }));

describe('PM-203: язык озвучки фразы дня = язык изучения', () => {
  it('inferExpoSpeechLanguage: fr-текст с подсказкой fr даёт fr-FR, en остаётся en-US', () => {
    const { inferExpoSpeechLanguage } = require('../hooks/use-audio') as typeof import('../hooks/use-audio');
    expect(inferExpoSpeechLanguage('Bonjour, ça va ?', 'fr')).toBe('fr-FR');
    expect(inferExpoSpeechLanguage('Break the ice', 'en')).toBe('en-US');
  });

  it('DailyPhraseCard: все speak(...) фразы дня передают language по studyTarget', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'components', 'DailyPhraseCard.tsx'), 'utf8');
    const calls = src.match(/\bspeak\((?:english|en)\b[^)]*\)/gu) ?? [];
    // зачем: 867e8108d, кнопка «Озвучить» у фразы дня снята владельцем 18.10 — осталось два вызова (озвучка по ссылке и тап по фразе)
    expect(calls.length).toBe(2);
    for (const call of calls) {
      expect(call).toContain('inferExpoSpeechLanguage(');
      expect(call).toContain('studyTarget');
    }
  });
});
