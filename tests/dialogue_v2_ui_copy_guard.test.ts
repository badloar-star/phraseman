import fs from 'node:fs';
import path from 'node:path';

import { DIALOGUE_V2_CATALOGUE_INDEX } from '../shared/dialogue_v2_catalogue_index';
import {
  DIALOGUE_V2_UI_COPY_LANGS,
  buildDialogueV2UiCopy,
  dialogueV2UiCopyOutputPath,
  serializeDialogueV2UiCopy,
} from '../scripts/dialogue_v2_ui_copy';
import {
  dialogueV2UiCopy,
  dialogueV2UiWorldTitle,
  resetDialogueV2UiCopyCacheForTests,
} from '../app/dialogue_v2_ui_copy';

/**
 * Сторож служебного текста Диалогов V2 на языке интерфейса (владелец 01.10:
 * «Почему диалоги в русском интерфейсе все на английском?»). Падает, если снимки
 * разошлись с источниками, автопроверки перевода нашли нарушение, или в русском
 * интерфейсе хоть одна сцена показывает английскую служебную строку.
 * Чинить — правкой источника/перевода и `npx tsx scripts/dialogue_v2_ui_copy.ts --write`.
 */
const repoRoot = path.resolve(__dirname, '..');
const CYRILLIC_RE = /[Ѐ-ӿ]/u;
const LATIN_WORD_RE = /[A-Za-z]{3,}/u;

describe('Dialogue V2 interface-language copy guard', () => {
  const built = buildDialogueV2UiCopy(repoRoot);

  it('has every interface language and zero automatic check issues', () => {
    expect(built.missingTranslations).toEqual([]);
    expect(built.issues).toEqual([]);
  });

  it.each(DIALOGUE_V2_UI_COPY_LANGS)('generated snapshot for %s matches its sources', (uiLang) => {
    const file = built.files[uiLang];
    expect(file).toBeDefined();
    const current = fs.readFileSync(path.join(repoRoot, ...dialogueV2UiCopyOutputPath(uiLang).split('/')), 'utf8').replace(/\r\n/g, '\n');
    expect(current).toBe(serializeDialogueV2UiCopy(file!));
  });

  it('Russian interface: all 76 scenes have Cyrillic title/briefing/objectives without English service words', () => {
    resetDialogueV2UiCopyCacheForTests();
    expect(DIALOGUE_V2_CATALOGUE_INDEX).toHaveLength(76);
    for (const entry of DIALOGUE_V2_CATALOGUE_INDEX) {
      const copy = dialogueV2UiCopy('ru', entry.id);
      expect(copy).not.toBeNull();
      const texts = [copy!.title, copy!.briefing, ...Object.values(copy!.objectiveLabels),
        ...Object.values(copy!.personas).map((persona) => persona.styleNote)];
      for (const text of texts) {
        expect({ id: entry.id, text, cyrillic: CYRILLIC_RE.test(text) }).toEqual({ id: entry.id, text, cyrillic: true });
        expect({ id: entry.id, text, latinWord: LATIN_WORD_RE.test(text) }).toEqual({ id: entry.id, text, latinWord: false });
      }
      expect(Object.keys(copy!.objectiveLabels).length).toBeGreaterThanOrEqual(6);
      expect(Object.keys(copy!.personas).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('client module returns the contract shape and falls back to English for an unknown interface language', () => {
    resetDialogueV2UiCopyCacheForTests();
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      const ru = dialogueV2UiCopy('ru', 'social_01');
      expect(ru).toEqual({
        title: expect.any(String),
        briefing: expect.any(String),
        objectiveLabels: expect.objectContaining({ objective_01: expect.any(String) }),
        personas: expect.objectContaining({ mila: { displayName: 'Мила', styleNote: expect.any(String) } }),
      });
      expect(dialogueV2UiCopy('xx', 'social_01')?.title).toBe(dialogueV2UiCopy('en', 'social_01')?.title);
      expect(dialogueV2UiCopy('ru', 'no_such_scene')).toBeNull();
      expect(dialogueV2UiWorldTitle('ru', 'social')).toBe('Общение');
      expect(log.mock.calls.some((call) => String(call[0]).includes('[DIALOGUE-V2] i18n'))).toBe(true);
      expect(warn.mock.calls.some((call) => String(call[1]).includes('"event":"fallback"'))).toBe(true);
    } finally {
      warn.mockRestore();
      log.mockRestore();
    }
  });
});
