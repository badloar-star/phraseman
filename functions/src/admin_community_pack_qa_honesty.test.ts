// зачем (владелец 25.10, набор «Пословицы»): в поле en у карточки 23 лежало итальянское
// «La fretta è cattiva consigliera.», а проверка объяснила правку словом «пешка», которого в
// карточке нет. Сторожа: «не тот язык» — отдельная находка, выдуманная причина не становится ошибкой.
import { readFileSync } from 'fs';
import { join } from 'path';
import { normalizeFindings, quotedWordsMissingFromCard } from './admin_community_pack_qa';
import { PACK_AI_MODEL, PACK_AI_PRICE_INPUT_PER_MTOK, packAiCostUsd } from './admin_community_pack_model';
import { ACTIVE_TEXT_MODEL_PRICES } from './openai_model_policy';

const qaSource = readFileSync(join(__dirname, 'admin_community_pack_qa.ts'), 'utf8');
const trSource = readFileSync(join(__dirname, 'admin_community_pack_translate.ts'), 'utf8');

const proverbs = [
  { index: 22, id: 'p23', en: 'La fretta è cattiva consigliera.', ru: 'Поспешишь — людей насмешишь.' },
];
const slots = { targetField: 'en', sourceField: 'ru' };

describe('pack QA honesty (25.10)', () => {
  test('wrong language is its own finding with a translation as the fix', () => {
    const [finding] = normalizeFindings([{
      scope: 'card', cardIndex: 22, field: 'en', category: 'wrong_language', severity: 'error',
      reason: 'Текст на итальянском («La fretta è cattiva consigliera»), а поле должно быть на английском.',
      originalText: 'La fretta è cattiva consigliera.', correctedText: 'Haste is a bad counsellor.',
    }], proverbs, slots);
    expect(finding.code).toBe('ai_wrong_language');
    expect(finding.severity).toBe('error');
    expect(String(finding.reason)).toMatch(/^Не тот язык: /);
    expect(finding.fix).toMatchObject({ field: 'en', before: 'La fretta è cattiva consigliera.', after: 'Haste is a bad counsellor.' });
  });

  test('a reason built on a word that is not in the card is not shown as an error', () => {
    const [finding] = normalizeFindings([{
      scope: 'card', cardIndex: 22, field: 'en', category: 'grammar', severity: 'error',
      reason: "'пешка' — это 'pawn'", originalText: 'La fretta è cattiva consigliera.', correctedText: 'Haste is a bad counsellor.',
    }], proverbs, slots);
    expect(finding.severity).toBe('info');
    expect(String(finding.reason)).toContain('Нужно проверить');
    expect(String(finding.reason)).toContain('«пешка»');
    // Правка остаётся видимой — решает владелец.
    expect(finding.fix).toMatchObject({ after: 'Haste is a bad counsellor.' });
  });

  test('quoted words from the card or from the correction are accepted', () => {
    expect(quotedWordsMissingFromCard('«fretta» → «Haste»', ['La fretta è cattiva consigliera.', 'Haste is a bad counsellor.'])).toEqual([]);
    expect(quotedWordsMissingFromCard("don't touch 'пешка'", ['La fretta'])).toEqual(['пешка']);
  });

  test('uncertain findings say «Нужно проверить», not «ошибка»', () => {
    const [finding] = normalizeFindings([{
      scope: 'card', cardIndex: 22, field: 'ru', category: 'naturalness', severity: 'info',
      reason: 'возможно, привычнее другая пословица', originalText: 'Поспешишь — людей насмешишь.', correctedText: '',
    }], proverbs, slots);
    expect(String(finding.reason)).toBe('Естественность: Нужно проверить: возможно, привычнее другая пословица');
  });

  test('prompt asks for language check and honest reasons', () => {
    expect(qaSource).toContain('6. wrong_language');
    expect(qaSource).toContain('"category": "swapped" | "wrong_language" | "grammar" | "meaning" | "naturalness" | "typo" | "pack"');
    expect(qaSource).toContain('may quote ONLY words that literally occur');
    expect(qaSource).toContain('"Нужно проверить:"');
  });

  test('both tools use the stronger shared model and its real price', () => {
    expect(PACK_AI_MODEL).toBe('gpt-4.1');
    expect(PACK_AI_PRICE_INPUT_PER_MTOK).toBe(ACTIVE_TEXT_MODEL_PRICES['gpt-4.1'].input);
    expect(packAiCostUsd(1_000_000, 1_000_000)).toBe(10);
    expect(qaSource).toContain('const DEFAULT_MODEL = PACK_AI_MODEL;');
    expect(trSource).toContain('const DEFAULT_MODEL = PACK_AI_MODEL;');
    expect(qaSource).not.toContain("'gpt-4.1-mini'");
    expect(trSource).not.toContain("'gpt-4.1-mini'");
  });

  test('[PACK-QA] result log carries model, languages, tokens and price', () => {
    const log = qaSource.slice(qaSource.indexOf("console.log('[PACK-QA] результат'"));
    for (const key of ['model: DEFAULT_MODEL', 'studyTarget', 'sourceLang', 'promptTokens', 'completionTokens', 'costUsd']) {
      expect(log.slice(0, 600)).toContain(key);
    }
  });
});
