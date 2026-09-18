import fs from 'fs';
import path from 'path';

const scenarios = fs.readFileSync(path.join(process.cwd(), 'app', 'ai_dialog_scenarios.ts'), 'utf8');
const ownership = fs.readFileSync(path.join(process.cwd(), 'app', 'ai_dialog_ownership.ts'), 'utf8');
const lock = fs.readFileSync(path.join(process.cwd(), 'app', 'ai_dialog_level_lock.ts'), 'utf8');
const server = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'ai_dialog_sync_purchase.ts'), 'utf8');
const ledger = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'stars_ledger.ts'), 'utf8');
const fnIndex = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'index.ts'), 'utf8');

// зачем: владелец (2026-09-17, docs/design/runes/MAKET.html) — руны покупают
// ЯЗЫК, а не игру. Доступ к диалогу стоит 5 000 (обычный) или 10 000
// (интересный/сложный). Контракт сторожит то, что молча ломается и обманывает
// человека на деньги: расхождение цены показанной и списанной, двойное
// списание, потерю оплаченного доступа после окончания Plus и ожидание сети
// там, где владелец прямо потребовал мгновенный отклик.
describe('Runes dialog purchase contract', () => {
  it('has exactly two price tiers, 5000 and 10000', () => {
    expect(scenarios).toContain('export const DIALOG_PRICE_RUNES = 5000');
    expect(scenarios).toContain('export const DIALOG_PRICE_RUNES_HARD = 10000');
  });

  // Три стартовых сценария бесплатны по решению владельца — цена у них
  // означала бы, что новичок упирается в платную стену на первом шаге.
  it('keeps the three starter scenarios free', () => {
    for (const id of ['coffee', 'grocery', 'clothes_shop']) {
      const start = scenarios.indexOf(`id: '${id}',`);
      expect(start).toBeGreaterThan(-1);
      const objectEnd = scenarios.indexOf('\n  },', start);
      expect(scenarios.slice(start, objectEnd)).not.toMatch(/priceRunes:/);
    }
  });

  // Сценарий без цены, но и не бесплатный по списку, был бы невидимо
  // недоступен: плитка показала бы замок, а купить его было бы нечем.
  it('prices every paid scenario with one of the two tiers', () => {
    const prices = scenarios.match(/priceRunes: DIALOG_PRICE_RUNES(_HARD)?,/g) ?? [];
    const idCount = (scenarios.match(/^    id: '/gm) ?? []).length;
    expect(prices.length).toBe(idCount - 3);
    const unknown = scenarios.match(/priceRunes: (?!DIALOG_PRICE_RUNES(_HARD)?,)/g);
    expect(unknown).toBeNull();
  });

  // Одна функция цены на показ и на списание: два источника разошлись бы, и
  // в каталоге стояла бы одна цифра, а списалась другая.
  it('exposes a single source of truth for the price', () => {
    expect(scenarios).toMatch(/export function scenarioPriceRunes\(/);
  });

  it('purchase is idempotent by a stable operation id', () => {
    expect(ownership).toMatch(/export function dialogUnlockOperationId\(/);
    expect(ownership).toMatch(/`dialog_unlock:\$\{stableId\}:\$\{scenarioId\}`/);
    expect(server).toMatch(/opId: `dialog_unlock:\$\{stableUid\}:\$\{p\.scenarioId\}`/);
  });

  // зачем: владелец дословно — «сервер не принимает участия, он только
  // синхронизация! Главный телефон только». Ожидание сети до открытия доступа
  // вернуло бы запрещённые состояния «идёт списание» и «нет сети».
  it('local purchase never awaits the network before granting access', () => {
    const start = ownership.indexOf('export async function buyDialogAccessLocally');
    expect(start).toBeGreaterThan(-1);
    const body = ownership.slice(start, ownership.indexOf('\nfunction callable()', start));
    expect(body).not.toMatch(/callable\(\)/);
    expect(body).not.toMatch(/httpsCallable/);
  });

  // Купленное за руны переживает окончание подписки — иначе человек платит
  // валютой за то, что у него отберут вместе с Plus.
  it('rune-bought access survives premium expiry', () => {
    const start = lock.indexOf('export function isScenarioUnlockedForAccount');
    expect(start).toBeGreaterThan(-1);
    const body = lock.slice(start, lock.indexOf('\n}', start));
    const ownedCheck = body.indexOf('ownedScenarioIds?.has(scenarioId)');
    // Сравниваем с ВЕТКОЙ подписки в теле, а не с именем параметра в сигнатуре:
    // иначе тест меряет позицию объявления и падает на верном коде.
    const premiumBranch = body.indexOf('if (hasPremiumAccess) return true;');
    expect(ownedCheck).toBeGreaterThan(-1);
    expect(premiumBranch).toBeGreaterThan(-1);
    // Владение проверяется РАНЬШЕ подписки.
    expect(ownedCheck).toBeLessThan(premiumBranch);
  });

  // Класс операции решает, двигает ли трата очки лиги. Владелец 17.09: лиги
  // считают приток рун, трата на них не влияет.
  it('dialog_unlock is classified as spend in the ledger', () => {
    expect(ledger).toMatch(/\|\s*'dialog_unlock'/);
    const classStart = ledger.indexOf('export const STAR_OP_CLASS');
    const classBody = ledger.slice(classStart, ledger.indexOf('\n});', classStart));
    expect(classBody).toMatch(/dialog_unlock:\s*'spend'/);
  });

  it('the sync callable is exported from functions index', () => {
    expect(fnIndex).toMatch(/export \{ aiDialogSyncPurchase \} from ['"]\.\/ai_dialog_sync_purchase['"]/);
  });

  // Сервер догоняет, а не решает: отказ задним числом отнял бы у человека
  // уже открытый и оплаченный доступ.
  it('server never rejects a purchase for insufficient balance', () => {
    expect(server).not.toMatch(/insufficient/i);
  });

  // Владение — ОДИН документ игрока: коллекция из документа на сценарий
  // стоила бы N чтений при каждом входе в раздел.
  it('stores ownership in a single document, not one per scenario', () => {
    expect(server).toMatch(/collection\('dialog_access'\)\.doc\('owned'\)/);
  });

  // Очередь офлайна уходит одним вызовом: N вызовов дали бы N транзакций.
  it('syncs the whole outbox in one call', () => {
    expect(ownership).toMatch(/purchases: readonly \{ scenarioId: string; priceRunes: number \}\[\]/);
  });

  // Немой catch запрещён правилом владельца: молчаливая потеря покупки — это
  // потеря денег человека без единого следа в журнале.
  it('logs every swallowed error', () => {
    const catches = ownership.match(/catch\s*\(/g) ?? [];
    const logs = ownership.match(/DebugLogger\.(error|info)/g) ?? [];
    expect(catches.length).toBeGreaterThan(0);
    expect(logs.length).toBeGreaterThanOrEqual(catches.length);
  });
});
