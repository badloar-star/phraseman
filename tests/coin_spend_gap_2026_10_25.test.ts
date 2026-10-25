// Разрыв «показано ≠ можно потратить» ([COIN-SPEND-GAP], координатор 25.10): показано 1140 (кошелёк + ожидающие Пика), тратимо 690.
// зачем: покупка за 800 не должна говорить «не хватает монет» — сначала досылка очереди Пика и один повтор; нет сети — «монеты ещё сохраняются».
import fs from 'node:fs';
import path from 'node:path';
import { coinsSavingMessage, coinsSavingToast, purchaseWithSpendGap, resolveCoinSpendGap, type CoinSpendGapDeps } from '../app/coin_spend_gap';

type R = { ok: true } | { ok: false; reason: 'insufficient_runes' | 'coins_saving' };
const PRICE = 800;

function deps(over: Partial<CoinSpendGapDeps> & { wallet?: { v: number } } = {}): CoinSpendGapDeps & { flush: jest.Mock } {
  const wallet = over.wallet ?? { v: 690 };
  return {
    peekSpendable: () => wallet.v,
    peekDisplayed: () => 1140,
    flush: jest.fn(over.flush ?? (async () => 'sent' as const)),
    waitSpendable: over.waitSpendable ?? (async (price) => wallet.v >= price),
    ...(over.peekDisplayed ? { peekDisplayed: over.peekDisplayed } : {}),
  } as CoinSpendGapDeps & { flush: jest.Mock };
}

beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
afterEach(() => jest.restoreAllMocks());

describe('[COIN-SPEND-GAP] разрыв показа и трат', () => {
  it('не разрыв: цены хватает в кошельке или она больше показанного — сеть не трогаем', async () => {
    const d = deps({ wallet: { v: 900 } });
    await expect(resolveCoinSpendGap('t', PRICE, d)).resolves.toBe('not_gap');
    await expect(resolveCoinSpendGap('t', 2000, deps())).resolves.toBe('not_gap');
    expect(d.flush).not.toHaveBeenCalled();
  });

  it('разрыв + досылка влила монеты → покупка повторяется сама и проходит (без второго тапа)', async () => {
    const wallet = { v: 690 };
    const d = deps({ wallet, flush: async () => { wallet.v = 1140; return 'sent'; } });
    const attempts: R[] = [];
    const attempt = jest.fn(async (): Promise<R> => {
      const r: R = wallet.v >= PRICE ? { ok: true } : { ok: false, reason: 'insufficient_runes' };
      attempts.push(r);
      return r;
    });
    const result = await purchaseWithSpendGap<R>('t', attempt, (r) => (!r.ok && r.reason === 'insufficient_runes' ? PRICE : null), (r) => (r.ok ? r : { ok: false, reason: 'coins_saving' }), d);
    expect(result).toEqual({ ok: true });
    expect(attempt).toHaveBeenCalledTimes(2);
    const line = (console.log as jest.Mock).mock.calls.map((c) => c.map(String).join(' ')).find((l) => l.includes('[COIN-SPEND-GAP]'));
    expect(line).toContain('"flush":"ok"');
    expect(line).toContain('"price":800');
    expect(line).toContain('"displayed":1140');
    expect(line).toContain('"spendable":690');
  });

  it('нет сети → «монеты ещё сохраняются», не «не хватает»; повтора нет', async () => {
    const d = deps({ flush: async () => 'offline' });
    const attempt = jest.fn(async (): Promise<R> => ({ ok: false, reason: 'insufficient_runes' }));
    const result = await purchaseWithSpendGap<R>('t', attempt, () => PRICE, () => ({ ok: false, reason: 'coins_saving' }), d);
    expect(result).toEqual({ ok: false, reason: 'coins_saving' });
    expect(attempt).toHaveBeenCalledTimes(1);
    const line = (console.log as jest.Mock).mock.calls.map((c) => c.map(String).join(' ')).find((l) => l.includes('[COIN-SPEND-GAP]'));
    expect(line).toContain('"flush":"offline"');
  });

  it('досылка ушла, но кошелёк не дорос → fail, «монеты ещё сохраняются»', async () => {
    await expect(resolveCoinSpendGap('t', PRICE, deps({ flush: async () => 'sent', waitSpendable: async () => false }))).resolves.toBe('flush_failed');
  });

  it('текст на 9 языках; нет языка → английский; тост несёт все 9', () => {
    for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) expect(coinsSavingMessage(lang).length).toBeGreaterThan(20);
    expect(coinsSavingMessage('xx')).toBe(coinsSavingMessage('en'));
    expect(coinsSavingMessage('ru')).toBe('Монеты ещё сохраняются — нужна связь, попробуй через минуту');
    expect(Object.values(coinsSavingToast()).every((v) => typeof v === 'string' && v.length > 0)).toBe(true);
  });
});

describe('все пять покупок за монеты идут через разрыв и показывают coins_saving', () => {
  const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8').replace(/\r\n/g, '\n');
  it.each([
    ['app/coin_rank_upgrade_v1.ts', "'coin_rank'"],
    ['app/profile_card_pro_v1.ts', "'profile_card_pro'"],
    ['app/community_packs/packPurchase.ts', "'community_pack'"],
    ['app/ai_dialog_hint_economy.ts', "'dialog_hint'"],
    ['app/ai_mistake_explain_limit_session.ts', "'mistake_explain'"],
  ])('%s', (file, label) => {
    const src = read(file);
    expect(src).toContain('purchaseWithSpendGap');
    expect(src).toContain(label);
    expect(src).toContain("reason: 'coins_saving' as const");
  });
  it.each([
    'app/ai_dialog_session.tsx', 'app/coin_rank.tsx', 'app/flashcards_collection.tsx',
    'components/profile-card/useSelfProfileCard.ts', 'app/use_mistake_explain.ts',
  ])('экран %s показывает тост coins_saving', (file) => {
    const src = read(file);
    expect(src).toContain("'coins_saving'");
    expect(src).toContain('coinsSavingToast()');
  });
});
