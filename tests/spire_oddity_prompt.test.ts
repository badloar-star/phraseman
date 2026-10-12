// зачем (координатор 11.10, первый выпуск): «Найди лишнее» показывало русский шаблон пула на «вы» любому языку
// интерфейса. Каждый шаблон из пулов Шпиля (es/de/fr/it + английский источник) обязан быть в таблице клиента;
// незнакомый — общая строка и предупреждение [SPIRE-ODDITY-PROMPT].
import fs from 'node:fs';
import path from 'node:path';
import {
  SPIRE_ODDITY_PROMPT_TEMPLATES,
  isKnownSpireOddityTemplate,
  localizeSpireOddityPrompt,
} from '../components/spire/spire_oddity_prompt';

const ROOT = path.join(__dirname, '..');

function poolOddityTemplates(): string[] {
  const out = new Set<string>();
  for (const lang of ['es', 'de', 'fr', 'it']) {
    const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'functions', 'src', 'generated', `spire_multilingual_${lang}.json`), 'utf8'));
    const items: unknown[] = Array.isArray(raw) ? raw : (Object.values(raw).find(Array.isArray) as unknown[] ?? []);
    for (const item of items) {
      const task = item as { mode?: string; payload?: { promptRu?: string } };
      if (task?.mode === 'find_oddity' && typeof task.payload?.promptRu === 'string') out.add(task.payload.promptRu.trim());
    }
  }
  const english = fs.readFileSync(path.join(ROOT, 'functions', 'src', 'tournament_pool_v11_oddity.ts'), 'utf8');
  for (const m of english.matchAll(/prompt:\s*'([^']+)'/g)) out.add(m[1].trim());
  return [...out];
}

describe('spire_oddity_prompt', () => {
  test('все шаблоны «Найди лишнее» из пулов покрыты таблицей', () => {
    const templates = poolOddityTemplates();
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.filter((t) => !isKnownSpireOddityTemplate(t))).toEqual([]);
  });

  test('на каждом языке интерфейса — строка на «ты», без русского шаблона', () => {
    const langs = ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const;
    for (const template of Object.keys(SPIRE_ODDITY_PROMPT_TEMPLATES)) {
      for (const lang of langs) {
        const text = localizeSpireOddityPrompt(template, lang);
        expect(text.length).toBeGreaterThan(0);
        expect(text).not.toBe(template);
      }
      expect(localizeSpireOddityPrompt(template, 'ru')).toBe('Найди фразу, которую нужно исправить.');
      // зачем (владелец 12.10 через Сверку): на украинском «вислів», не «фраза» (41443be48).
      expect(localizeSpireOddityPrompt(template, 'uk')).toBe('Знайди вислів, який треба виправити.');
    }
  });

  test('незнакомый шаблон → общая строка и одно предупреждение', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(localizeSpireOddityPrompt('Какой-то новый шаблон.', 'en')).toBe('Find the phrase that needs fixing.');
    localizeSpireOddityPrompt('Какой-то новый шаблон.', 'en');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('[SPIRE-ODDITY-PROMPT]');
    warn.mockRestore();
  });
});
