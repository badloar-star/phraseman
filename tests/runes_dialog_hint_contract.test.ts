import fs from 'fs';
import path from 'path';

const economy = fs.readFileSync(path.join(process.cwd(), 'app', 'ai_dialog_hint_economy.ts'), 'utf8');
const sheet = fs.readFileSync(path.join(process.cwd(), 'components', 'dialogs', 'DialogWhySheet.tsx'), 'utf8');
const session = fs.readFileSync(path.join(process.cwd(), 'app', 'ai_dialog_session.tsx'), 'utf8');

// зачем: владелец (2026-09-17, экран 4 макета docs/design/runes/MAKET.html) —
// готовые ответы «как ответить»: 3 в день бесплатно, дальше 80 рун. Контракт
// сторожит то, что молча превратило бы обучение в платную стену: плату за
// перевод, ожидание там, где текст уже загружен, и повторное списание за
// одну и ту же реплику.
describe('Runes dialog hint contract', () => {
  it('prices the hint at 80 runes with 3 free per day', () => {
    expect(economy).toContain('export const DIALOG_HINT_PRICE_RUNES = 80');
    expect(economy).toContain('export const FREE_DIALOG_HINTS_PER_DAY = 3');
  });

  // Главное требование макета: платные ТОЛЬКО готовые ответы. Плата за перевод
  // заставила бы человека закрыть шторку и потерять обучающую часть целиком.
  it('never gates the translation or the explanation behind runes', () => {
    const translationBlock = sheet.slice(
      sheet.indexOf('coach.translation ?'),
      sheet.indexOf('coach.suggestions.length > 0'),
    );
    expect(translationBlock.length).toBeGreaterThan(0);
    expect(translationBlock).not.toMatch(/hintEconomy/);
    const noteBlock = sheet.slice(sheet.indexOf('coach.note ?'), sheet.indexOf('coach.translation ?'));
    expect(noteBlock).not.toMatch(/hintEconomy/);
  });

  // Подсказки приезжают вместе с репликой — покупка снимает занавес с уже
  // загруженного текста. Любой сетевой вызов здесь вернул бы запрещённое
  // владельцем ожидание «Готовим подсказку…».
  it('unlocking a hint never touches the network', () => {
    const start = economy.indexOf('export async function buyDialogHintLocally');
    expect(start).toBeGreaterThan(-1);
    const body = economy.slice(start);
    expect(body).not.toMatch(/httpsCallable|fetch\(|getFunctions/);
    expect(sheet).not.toMatch(/ActivityIndicator/);
  });

  // Раскрытие привязано к конкретной реплике: общий флаг открыл бы ответы на
  // всех последующих репликах бесплатно либо списал бы за уже открытую.
  it('tracks revealed hints per message index, not as a single flag', () => {
    expect(session).toMatch(/hintRevealedFor.*Set<number>|Set<number>>\(\(\) => new Set\(\)\)/s);
    expect(session).toMatch(/hintRevealedFor\.has\(/);
  });

  // Двойной тап: состояние во втором тапе того же кадра ещё старое, поэтому
  // защита обязана быть на ref, а не на useState.
  it('guards against a double tap with a ref', () => {
    expect(session).toMatch(/hintBuyingRef = useRef\(false\)/);
    expect(session).toMatch(/if \(hintBuyingRef\.current \|\| hintRevealedFor\.has\(index\)\) return;/);
  });

  // Бесплатная подсказка не должна трогать руны, платная — не должна
  // расходовать дневной остаток.
  it('spends the free allowance before charging runes', () => {
    const start = session.indexOf('const buyHint = useCallback');
    expect(start).toBeGreaterThan(-1);
    const body = session.slice(start, session.indexOf('}, [hintsLeftToday', start));
    const freeBranch = body.indexOf('if (hintsLeftToday > 0)');
    const paidCall = body.indexOf('buyDialogHintLocally');
    expect(freeBranch).toBeGreaterThan(-1);
    expect(freeBranch).toBeLessThan(paidCall);
  });

  it('logs every early return and swallowed error', () => {
    const catches = economy.match(/catch\s*\(/g) ?? [];
    const logs = economy.match(/DebugLogger\.(error|info)/g) ?? [];
    expect(catches.length).toBeGreaterThan(0);
    expect(logs.length).toBeGreaterThanOrEqual(catches.length);
  });
});
