// Контракт AI-проверки наборов сообщества.
//
// Повод (владелец 2026-09-21): кнопка «Запустить AI» в админке жила с 18.08.2026
// и звала callable `adminCommunityPackQaReview`, которого НЕ СУЩЕСТВОВАЛО. Ни
// один тест этого не поймал, потому что никто не проверял связь «клиент зовёт ↔
// сервер экспортирует». Этот сторож закрывает именно ту дыру.
import { readFileSync } from 'fs';
import { join } from 'path';

const source = readFileSync(join(__dirname, 'admin_community_pack_qa.ts'), 'utf8');
const index = readFileSync(join(__dirname, 'index.ts'), 'utf8');
const adminHtml = readFileSync(join(__dirname, '..', '..', 'admin', 'v2', 'legacy.html'), 'utf8');

describe('admin community pack QA review', () => {
  test('экспортирует оба callable и подключает их в index', () => {
    expect(source).toContain('export const adminCommunityPackQaReview = onCall({');
    expect(source).toContain('export const adminCommunityPackApplyQaFixes = onCall({');
    expect(index).toContain(
      "export { adminCommunityPackQaReview, adminCommunityPackApplyQaFixes } from './admin_community_pack_qa';",
    );
  });

  test('имя callable совпадает с тем, что зовёт админка', () => {
    // Ровно та связь, разрыв которой и был багом: ENDPOINT в legacy.html должен
    // указывать на реально существующий экспорт.
    expect(adminHtml).toContain("const ENDPOINT='adminCommunityPackQaReview'");
    expect(source).toContain('export const adminCommunityPackQaReview');
  });

  test('админка больше не прячет кнопку AI-проверки', () => {
    // Заплатка phase6StrictBrowserRemediation скрывала кнопку и писала, что
    // функции нет. Функция появилась — сокрытие обязано быть снято.
    expect(adminHtml).not.toContain('скрыта до появления защищённого adminCommunityPackQaReview');
    expect(adminHtml).not.toMatch(/запустить\\s\+ai\|ai\[-\\s\]\?провер/i);
  });

  test('оба callable доступны только админу', () => {
    const guards = source.match(/if \(!request\.auth\?\.token\?\.admin\)/g) ?? [];
    expect(guards.length).toBe(2);
    expect(source).toContain("throw new HttpsError('permission-denied', 'admin_only')");
  });

  test('ключ OpenAI живёт в секретах и только у проверяющего callable', () => {
    expect(source).toContain("defineSecret('OPENAI_API_KEY')");
    expect(source).toContain('secrets: [OPENAI_API_KEY]');
    // Применение правок к Firestore не имеет доступа к ключу — ему он не нужен.
    expect(source).toMatch(/adminCommunityPackApplyQaFixes = onCall\(\{[^}]*\}/s);
  });

  test('в OpenAI не уходит ничего, что опознаёт автора', () => {
    // Правило проекта: во внешние каналы не уходят ни имена, ни uid.
    // Промпт собирается только из карточек, заголовков и описаний.
    const promptFn = source.slice(source.indexOf('function buildPrompt'), source.indexOf('const CATEGORY_LABEL'));
    expect(promptFn).not.toMatch(/authorStableId|submissionId|uid|email/i);
  });

  test('App Check не включается — пломба владельца 2026-08-17', () => {
    expect(source).toContain('enforceAppCheck: ENFORCE_APP_CHECK_OPENAI');
    expect(source).not.toContain('enforceAppCheck: true');
  });

  test('правки применяются только к ожидающей заявке', () => {
    expect(source).toContain("if (doc.status !== 'pending')");
  });

  test('каждый ранний выход и отказ логируется с причиной', () => {
    // Правило владельца «сперва логи»: немых отказов быть не должно.
    expect(source).toContain('[PACK-QA] ранний выход: OPENAI_API_KEY не настроен');
    expect(source).toContain('[PACK-QA] ранний выход: нечего проверять');
    expect(source).toContain('[PACK-QA] модель вернула не-JSON');
    expect(source).toContain('[PACK-QA-APPLY] ранний выход: заявка не найдена');
    expect(source).toContain('[PACK-QA-APPLY] ранний выход: статус не pending');
    expect(source).not.toMatch(/catch\s*\{\s*\}/);
  });

  test('стоимость проверки считается по реальным токенам, а не выдумывается', () => {
    expect(source).toContain('gen.promptTokens');
    expect(source).toContain('gen.completionTokens');
    expect(source).toContain('PRICE_INPUT_PER_MTOK');
  });
});
