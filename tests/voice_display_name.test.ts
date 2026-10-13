// зачем (settings-gap-034, координатор 12.10): в Настройках в строке «Голос озвучки (EN)» показывался сырой id Android-голоса
// «en-au-x-aua-local». Подпись = язык (регион) · номер на языке интерфейса; настоящие имена iOS («Samantha») не трогаем.
import { voiceTitle } from '../app/flashcards/tts_voices';
import {
  isTechnicalVoiceName,
  parseVoiceLocale,
  technicalVoiceDisplayName,
  voiceOrdinal,
} from '../app/flashcards/voice_display_name';

const aua = { identifier: 'en-au-x-aua-local', name: 'en-au-x-aua-local', language: 'en-AU', quality: 'Default' };
const aub = { identifier: 'en-au-x-aub-network', name: 'en-au-x-aub-network', language: 'en-AU', quality: 'Enhanced' };
const usLang = { identifier: 'en-US-language', name: 'en-US-language', language: 'en-US' };
const samantha = { identifier: 'com.apple.voice.compact.en-US.Samantha', name: 'Samantha', language: 'en-US' };
const list = [aub, aua, usLang, samantha];

describe('имя голоса озвучки', () => {
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => {}); });
  afterEach(() => jest.restoreAllMocks());

  it('отличает технический id от человеческого имени', () => {
    expect(isTechnicalVoiceName('en-au-x-aua-local', 'en-au-x-aua-local')).toBe(true);
    expect(isTechnicalVoiceName('en-us-x-iom#male_1-local', 'x')).toBe(true);
    expect(isTechnicalVoiceName('en-US-language', 'en-US-language')).toBe(true);
    expect(isTechnicalVoiceName('Samantha', samantha.identifier)).toBe(false);
    expect(isTechnicalVoiceName('Google UK English Female', 'x')).toBe(false);
  });

  it('технический id → «English (Australia) · N» с номером по списку устройства', () => {
    expect(voiceTitle(aua, 'en', list)).toBe('English (Australia) · 1');
    expect(voiceTitle(aub, 'en', list)).toBe('English (Australia) · 2');
    expect(voiceTitle(usLang, 'en', list)).toBe('English (United States) · 2'); // в списке два голоса en-US
    expect(voiceTitle(aua, 'en')).toBe('English (Australia)');
  });

  it('compact (settings-gap-034): в строке «Голос озвучки (EN)» — только регион и номер, человеческое имя как есть', () => {
    expect(voiceTitle(aub, 'ru', list, { compact: true })).toBe('Австралия · 2');
    expect(voiceTitle(aua, 'en', undefined, { compact: true })).toBe('Australia');
    expect(voiceTitle(aua, 'en', list)).toBe('English (Australia) · 1');
  });

  it('на всех 9 языках интерфейса — без сырого id', () => {
    const expected: Record<string, string> = {
      ru: 'Английский (Австралия) · 1', uk: 'Англійська (Австралія) · 1', en: 'English (Australia) · 1',
      es: 'Inglés (Australia) · 1', 'pt-BR': 'Inglês (Austrália) · 1', vi: 'Tiếng Anh (Úc) · 1',
      id: 'Inggris (Australia) · 1', tr: 'İngilizce (Avustralya) · 1', pl: 'Angielski (Australia) · 1',
    };
    for (const [ui, title] of Object.entries(expected)) {
      const shown = voiceTitle(aua, ui, list);
      expect(shown).toBe(title);
      expect(shown).not.toContain('-x-');
    }
    expect(voiceTitle(aua, 'fr', list)).toBe('English (Australia) · 1');
  });

  it('человеческое имя iOS остаётся как есть, без «(Enhanced)»', () => {
    expect(voiceTitle(samantha, 'ru', list)).toBe('Samantha');
    expect(voiceTitle({ ...samantha, name: 'Samantha (Enhanced)' }, 'ru', list)).toBe('Samantha');
  });

  it('неизвестный язык или регион — заглавный код, а не сырой id', () => {
    expect(technicalVoiceDisplayName({ identifier: 'ja-jp-x-htm-local', name: 'ja-jp-x-htm-local', language: 'ja-JP' }, 'ru')).toBe('JA (JP)');
    expect(parseVoiceLocale('en_GB', 'x')).toEqual({ language: 'en', region: 'GB' });
    expect(voiceOrdinal(aua, undefined)).toBeNull();
  });

  it('лог [VOICE-NAME] пишет id, имя, язык, качество и ветку', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    voiceTitle({ identifier: 'en-in-x-ena-local', name: 'en-in-x-ena-local', language: 'en-IN', quality: 'Default' }, 'ru', list);
    const line = log.mock.calls.map((call) => String(call[0])).find((l) => l.includes('en-in-x-ena-local')) ?? '';
    expect(line).toContain('[VOICE-NAME]');
    expect(line).toContain('"branch":"technical_id_formatted"');
    expect(line).toContain('"title":"Английский (Индия)"');
    expect(line).toContain('"quality":"Default"');
  });
});
