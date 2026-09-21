// Контракт перевода набора на языки интерфейса.
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  PACK_INTERFACE_LOCALES,
  pickSourceText,
  readLocaleText,
  withTranslations,
} from './admin_community_pack_translate';

const source = readFileSync(join(__dirname, 'admin_community_pack_translate.ts'), 'utf8');
const index = readFileSync(join(__dirname, 'index.ts'), 'utf8');

describe('перевод набора на языки интерфейса', () => {
  test('список локалей совпадает с языками интерфейса приложения', () => {
    // Повод: забытый здесь язык означает, что人 с этим интерфейсом снова увидит
    // чужой текст. Сверяем с источником истины, а не с памятью.
    const appLocales = readFileSync(join(__dirname, '..', '..', 'app', 'source_locales.ts'), 'utf8');
    const block = appLocales.slice(
      appLocales.indexOf('INTERFACE_SOURCE_LOCALE_STATUS'),
      appLocales.indexOf('SOURCE_LOCALE_FIELD_SUFFIX'),
    );
    const declared = [...block.matchAll(/^\s*'?([a-zA-Z-]+)'?:\s*'active'/gm)].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(0);
    expect(PACK_INTERFACE_LOCALES.map((l) => l.code).sort()).toEqual(declared.sort());
  });

  test('callable экспортирован и подключён в index', () => {
    expect(source).toContain('export const adminCommunityPackTranslateLocales = onCall({');
    expect(index).toContain("export { adminCommunityPackTranslateLocales } from './admin_community_pack_translate';");
  });

  test('только админ, ключ в секретах, App Check не включается', () => {
    expect(source).toContain('if (!request.auth?.token?.admin)');
    expect(source).toContain("defineSecret('OPENAI_API_KEY')");
    expect(source).toContain('secrets: [OPENAI_API_KEY]');
    expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK_OPENAI');
    expect(source).not.toContain('enforceAppCheck: true');
  });

  test('в OpenAI не уходит ничего, что опознаёт автора', () => {
    const promptFn = source.slice(source.indexOf('function buildPrompt'), source.indexOf('function chunk'));
    expect(promptFn).not.toMatch(/authorStableId|submissionId|packId|uid|email/i);
  });

  test('каждый ранний выход логируется с причиной, немого catch нет', () => {
    expect(source).toContain('[PACK-TR] ранний выход: OPENAI_API_KEY не настроен');
    expect(source).toContain('[PACK-TR] ранний выход: карточек нет');
    expect(source).toContain('[PACK-TR] ранний выход: набор изменился во время перевода');
    expect(source).toContain('[PACK-TR] модель вернула не-JSON');
    expect(source).not.toMatch(/catch\s*\{\s*\}/);
  });

  test('запись одной транзакцией — набор не остаётся переведённым наполовину', () => {
    expect(source).toContain('db.runTransaction');
    expect(source).toContain('freshCards.length !== cards.length');
  });

  test('читает текст локали из нужного места', () => {
    const card = { ru: 'Привет', sourceLocales: { pl: 'Cześć' } };
    expect(readLocaleText(card, { code: 'ru', flat: true })).toBe('Привет');
    expect(readLocaleText(card, { code: 'pl', flat: false })).toBe('Cześć');
    expect(readLocaleText(card, { code: 'vi', flat: false })).toBe('');
  });

  test('исходник ищется по ТЕКСТУ, а не по имени поля', () => {
    // Правило владельца: «поле не имеет значения». Если в ru пусто, а текст
    // лежит в uk — берём его, а не считаем карточку пустой.
    const card = { ru: '', uk: 'Привіт' };
    expect(pickSourceText(card, 'ru').text).toBe('Привіт');
    expect(pickSourceText(card, 'ru').code).toBe('uk');
  });

  test('перевод НЕ затирает то, что автор написал сам', () => {
    const card = { ru: 'Матч отменён', uk: 'Матч скасовано' };
    const next = withTranslations(card, { ru: 'ДРУГОЕ', uk: 'ІНШЕ', pl: 'Mecz odwołany' });
    expect(next.ru).toBe('Матч отменён');
    expect(next.uk).toBe('Матч скасовано');
    expect((next.sourceLocales as Record<string, string>).pl).toBe('Mecz odwołany');
  });

  test('исходная карточка не мутируется', () => {
    const card = { ru: 'Привет', sourceLocales: { pl: 'Cześć' } };
    const next = withTranslations(card, { tr: 'Merhaba' });
    expect((card.sourceLocales as Record<string, string>).tr).toBeUndefined();
    expect((next.sourceLocales as Record<string, string>).tr).toBe('Merhaba');
    expect((next.sourceLocales as Record<string, string>).pl).toBe('Cześć');
  });

  test('пустой перевод не записывается', () => {
    const card = { ru: 'Привет' };
    const next = withTranslations(card, { tr: '   ', pl: '' });
    expect(next.sourceLocales).toBeUndefined();
  });
});
