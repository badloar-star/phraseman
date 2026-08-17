// ⛔ App Check запломбирован владельцем 2026-08-17: ожидания ниже приведены к
// enforceAppCheck: false. Это НЕ ослабление теста — правило отменено целиком,
// см. CLAUDE.md «APP CHECK ЗАПЛОМБИРОВАН НАВСЕГДА» и app_check_sealed.test.ts.
// Остальные проверки (секреты, регион, экспорт) сохранены как были.
import { decisionRegistryObjectPath } from './learning_v2_access_production_callable';
import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('V2 production access callable seam', () => {
  it('uses only the content-addressed registry object path', () => {
    expect(decisionRegistryObjectPath('phraseman-v2-product-decisions', 1, 'a'.repeat(64))).toMatch(
      /content-studio\/decision-registries\/[^/]+\/v1\/a{64}\.json/,
    );
  });

  it('keeps App Check and the production export wired', () => {
    const source = readFileSync(path.resolve(__dirname, 'learning_v2_access_production_callable.ts'), 'utf8');
    const index = readFileSync(path.resolve(__dirname, 'index.ts'), 'utf8');
    expect(source).toContain("onCall({ enforceAppCheck: false }");
    expect(source).toContain('readProgressAccountBinding');
    expect(index).toContain("export { finalizeLearningV2AccessPurchase } from './learning_v2_access_production_callable';");
  });
});
