import fs from 'node:fs';
import path from 'node:path';

// зачем: аудит 2026-08-24 нашёл дрейф юридических копий — одна сессия дописала
// блок «MAX voice privacy summary» только в app/legal/, другая — абзац про
// камеру/моушн только в legal/. Следующий `npm run legal:sync` молча затёр бы
// чужую правку, а сторож max_voice_privacy_contract уронил бы сборку. Этот
// контракт ловит дрейф на первом же прогоне: канон legal/*.json обязан быть
// байт-в-байт равен копиям app/legal/*.json, а все сгенерированные HTML —
// нести дату из канона. Правило: правим ТОЛЬКО legal/*.json, затем
// `npm run legal:sync` (см. legal/README.md). Тест НЕ проверяет содержание
// текстов — только синхронность копий.

const ROOT = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

const LEGAL_JSON_NAMES = [
  'terms_of_use_en.json',
  'terms_of_use_en_ios.json',
  'privacy_policy_en.json',
  'privacy_policy_en_ios.json',
] as const;

type LegalSection = { heading: string; body: string };

const lastUpdatedOf = (name: string): string => {
  const sections = JSON.parse(read('legal', name)) as LegalSection[];
  const intro = sections.find((s) => /^Last updated:/m.test(s.body));
  const match = intro?.body.match(/Last updated: ([^\n]+)/);
  if (!match) throw new Error(`legal/${name}: не найдена строка "Last updated:"`);
  return match[1].trim();
};

describe('legal copies sync contract', () => {
  test.each(LEGAL_JSON_NAMES)('app/legal/%s байт-в-байт равен канону legal/', (name) => {
    expect(read('app', 'legal', name)).toBe(read('legal', name));
  });

  test('даты en и ios вариантов совпадают внутри каждого документа', () => {
    expect(lastUpdatedOf('terms_of_use_en_ios.json')).toBe(lastUpdatedOf('terms_of_use_en.json'));
    expect(lastUpdatedOf('privacy_policy_en_ios.json')).toBe(lastUpdatedOf('privacy_policy_en.json'));
  });

  test('сгенерированные HTML несут дату из канона (значит, legal:sync прогнан)', () => {
    const termsDate = lastUpdatedOf('terms_of_use_en.json');
    const privacyDate = lastUpdatedOf('privacy_policy_en.json');

    const htmlByDate: Array<[string[], string]> = [
      [['terms.html'], termsDate],
      [['privacy.html'], privacyDate],
      // зачем: hosting-таргет admin публикует ТОЛЬКО admin/v2 — легаси-копия в
      // admin/ остаётся для истории, публикуемая живёт в admin/v2 (аудит 2026-08-25).
      [['admin', 'oauth-privacy.html'], privacyDate],
      [['admin', 'v2', 'oauth-privacy.html'], privacyDate],
      [['knowly-www', 'legal', 'terms', 'index.html'], termsDate],
      [['knowly-www', 'legal', 'privacy', 'index.html'], privacyDate],
      [['knowly-www', 'legal', 'data-deletion', 'index.html'], privacyDate],
    ];

    for (const [parts, date] of htmlByDate) {
      expect({ file: path.join(...parts), hasDate: read(...parts).includes(date) }).toEqual({
        file: path.join(...parts),
        hasDate: true,
      });
    }
  });
});
