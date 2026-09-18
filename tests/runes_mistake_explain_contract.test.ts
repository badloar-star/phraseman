import fs from 'fs';
import path from 'path';

const limit = fs.readFileSync(path.join(process.cwd(), 'app', 'ai_mistake_explain_limit_session.ts'), 'utf8');
const hook = fs.readFileSync(path.join(process.cwd(), 'app', 'use_mistake_explain.ts'), 'utf8');

// зачем: владелец (2026-09-17, экран 5 макета docs/design/runes/MAKET.html) —
// разбор промаха: 3 в день бесплатно, дальше 120 рун. Решения этой сессии:
// автозагрузка СОХРАНЯЕТСЯ, считается каждый показ, счётчик ЕДИНЫЙ на уроки,
// диалоги и «Мои ошибки». Контракт сторожит то, что молча стоит денег или
// ломает обучение: списание за неудавшийся запрос, три отдельных счётчика,
// повторная плата за уже оплаченный разбор.
describe('Runes mistake explain contract', () => {
  it('prices the breakdown at 120 runes with 3 free per day', () => {
    expect(limit).toContain('export const MISTAKE_EXPLAIN_PRICE_RUNES = 120');
    expect(limit).toContain('FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT');
  });

  // ЕДИНЫЙ счётчик: три отдельных дали бы 9 бесплатных разборов в сутки.
  it('keeps one shared daily counter for every surface', () => {
    expect(limit).toContain("DAILY_AI_MISTAKE_EXPLAIN_KEY = 'ai_mistake_explain_session_v1'");
    const keys = limit.match(/ai_mistake_explain_session_v\d+/g) ?? [];
    expect(new Set(keys).size).toBe(1);
  });

  // Списываем на ПОКАЗЕ, а не на запросе: упавший запрос не должен съедать
  // бесплатный разбор — человек не увидел ничего, но заплатил бы попыткой.
  it('charges the free allowance on a successful render, not on request', () => {
    const readyAt = hook.indexOf("setAiMistakeState('ready')");
    const markAt = hook.indexOf('markAiMistakeExplainUsed()');
    expect(readyAt).toBeGreaterThan(-1);
    expect(markAt).toBeGreaterThan(readyAt);
    // И не в ветке ошибки.
    const catchAt = hook.indexOf('} catch (error) {', readyAt);
    expect(markAt).toBeLessThan(catchAt);
  });

  // Автозагрузка сохранена (решение владельца), но останавливается, когда
  // бесплатные кончились и разбор не оплачен.
  it('stops the autoload only when free runs out and nothing is paid', () => {
    expect(hook).toMatch(/if \(freeExplainsLeft <= 0 && paidUnlockedForPhrase !== phraseKey\)/);
    expect(hook).toMatch(/\[MISTAKE-BUY\] autoload:stopped/);
  });

  // Оплата привязана к КОНКРЕТНОЙ фразе: общий флаг открыл бы все следующие
  // промахи даром либо заставил платить за уже оплаченный.
  it('binds a paid unlock to the phrase, not to a global flag', () => {
    expect(hook).toMatch(/paidUnlockedForPhrase.*useState<string \| null>/);
    expect(hook).toMatch(/setPaidUnlockedForPhrase\(phraseKey\)/);
  });

  it('guards the purchase against a double tap with a ref', () => {
    expect(hook).toMatch(/explainBuyingRef = useRef\(false\)/);
    expect(hook).toMatch(/if \(explainBuyingRef\.current \|\| paidUnlockedForPhrase === phraseKey\) return;/);
  });

  // Покупка решается телефоном и мгновенно: сеть в самом списании запрещена.
  it('never touches the network inside the purchase itself', () => {
    const start = limit.indexOf('export async function buyMistakeExplainLocally');
    expect(start).toBeGreaterThan(-1);
    expect(limit.slice(start)).not.toMatch(/httpsCallable|fetch\(|getFunctions/);
  });

  // Немой catch запрещён: тихий сбой чтения раздал бы разборы даром или,
  // наоборот, показал платную стену тому, у кого бесплатные есть.
  it('logs every swallowed error in the limit module', () => {
    const catches = limit.match(/catch\s*\(/g) ?? [];
    const logs = limit.match(/DebugLogger\.(error|info)/g) ?? [];
    expect(catches.length).toBeGreaterThan(0);
    expect(logs.length).toBeGreaterThanOrEqual(catches.length);
  });

  // Сам разбор не переделан — владелец: «они уже идеальны».
  it('does not change how the breakdown itself is produced', () => {
    expect(hook).toContain('callExplainMistake(buildArgs(');
    expect(hook).toContain("buildArgs('eli5')");
  });
});
