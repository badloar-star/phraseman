import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (relative: string): string => fs.readFileSync(path.join(root, relative), 'utf8');

/**
 * Правило владельца «сперва логи, потом починка»: цепочка входа в тренировку
 * карточек падала молча, и экран врал «не удалось проверить лимит». Каждый catch
 * цепочки входа обязан печатать причину с единым префиксом.
 */
describe('вход в тренировку карточек — catch цепочки не немой', () => {
  test.each([
    ['app/flashcards_speaking_session.tsx', 'speaking entry:catch'],
    ['app/flashcards_blitz_session.tsx', 'blitz entry:catch'],
    ['app/flashcards_recall_session.tsx', 'recall entry:catch'],
    ['app/flashcards_swipe.tsx', 'swipe entry:catch'],
  ])('%s печатает [FC-TRAIN-ENTRY] %s с ошибкой', (relative, marker) => {
    const src = read(relative);
    expect(src).toContain(`[FC-TRAIN-ENTRY] ${marker}`);
    const at = src.indexOf(`[FC-TRAIN-ENTRY] ${marker}`);
    expect(src.slice(at, at + 400)).toContain('error: (error instanceof Error');
  });

  test('первое звено цепочки — pending-grant account — называет причину null', () => {
    const src = read('app/flashcard_training_pending_grant.ts');
    expect(src).toContain('[FC-TRAIN-ENTRY] pendingGrant:account → null');
    expect(src).not.toMatch(/resolvePhoneStateAccountContext\(stableUid, runtimeToken\);[\s\S]{0,200}\} catch \{\n\s*return null;/);
  });

  test('немой catch(async () => {…}) в цепочке входа устной тренировки не вернулся', () => {
    const src = read('app/flashcards_speaking_session.tsx');
    expect(src).not.toContain('})().catch(async () => {\n      if (cancelled) return;');
    expect(src).not.toContain('})().catch(async () => {\r\n      if (cancelled) return;');
  });
});
