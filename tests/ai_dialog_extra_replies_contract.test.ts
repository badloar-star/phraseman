import fs from 'fs';
import path from 'path';

const client = fs.readFileSync(path.join(process.cwd(), 'app', 'ai_dialog_extra_replies_client.ts'), 'utf8');
const server = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'ai_dialog_extra_replies.ts'), 'utf8');
const premiumDialog = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'premium_dialog.ts'), 'utf8');
const fnIndex = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'index.ts'), 'utf8');
const session = fs.readFileSync(path.join(process.cwd(), 'app', 'ai_dialog_session.tsx'), 'utf8');
const starsLedger = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'stars_ledger.ts'), 'utf8');

// зачем: владелец (2026-09-17) — докупка +10 реплик диалога за 300 рун,
// покупок в день сколько угодно. Контракт сторожит две вещи, разойдясь в
// которых код молча обманывает игрока: (1) цена/количество на клиенте и
// сервере обязаны совпадать буквально — иначе экран покажет одну цену, а
// спишется другая; (2) extraCapToday реально расширяет enforceDailyQuota,
// иначе руны спишутся, а следующая реплика всё равно упрётся в старый лимит.
describe('AI dialog extra replies economics contract', () => {
  it('client and server agree on price and grant amount', () => {
    expect(client).toContain('export const DIALOG_EXTRA_REPLIES_PRICE_RUNES = 300');
    expect(client).toContain('export const DIALOG_EXTRA_REPLIES_COUNT = 10');
    expect(server).toContain('export const DIALOG_EXTRA_REPLIES_PRICE_RUNES = 300');
    expect(server).toContain('export const DIALOG_EXTRA_REPLIES_COUNT = 10');
  });

  it('the callable is exported from functions index', () => {
    expect(fnIndex).toMatch(/export \{ aiDialogBuyExtraReplies \} from ['"]\.\/ai_dialog_extra_replies['"]/);
  });

  it('enforceDailyQuota actually reads extraCapToday written by the purchase', () => {
    expect(server).toMatch(/QUOTA_COLLECTION/);
    expect(premiumDialog).toMatch(/extraCapToday/);
    expect(premiumDialog).toMatch(/effectiveCap\s*=\s*dailyCap\s*\+\s*extraCapToday/);
  });

  it('purchase writes are idempotent by requestId, not re-charged on replay', () => {
    expect(server).toMatch(/reward_claims'\)\.doc\(`dialog_extra_replies_\$\{requestId\}`\)/);
    expect(server).toMatch(/opId: `dialog_extra_replies:\$\{stableUid\}:\$\{requestId\}`/);
  });

  it('local purchase is instant (no network await before returning ok)', () => {
    const start = client.indexOf('export async function buyDialogExtraRepliesLocally');
    expect(start).toBeGreaterThan(-1);
    const body = client.slice(start, client.indexOf('\nfunction callable()', start));
    expect(body).not.toMatch(/callable\(\)/);
    expect(body).not.toMatch(/httpsCallable/);
  });

  it('background sync failure is logged, never a silent catch', () => {
    const start = client.indexOf('export async function syncDialogExtraRepliesPurchase');
    expect(start).toBeGreaterThan(-1);
    const body = client.slice(start);
    expect(body).toMatch(/catch \(error\) \{[\s\S]*DebugLogger\.error/);
  });

  it('the dialog screen wires the buy button to the local-first flow', () => {
    expect(session).toMatch(/buyDialogExtraRepliesLocally/);
    expect(session).toMatch(/syncDialogExtraRepliesPurchase/);
  });

  // зачем: класс операции решает, двигает ли трата соревновательный earnedTotal
  // лиг. 'spend' — трата языковой валюты, не заработок. Если бы это случайно
  // стало 'earn'/'grant', игрок мог бы поднимать место в лиге, просто покупая
  // себе реплики за руны — деньги превращались бы в очки соревнования.
  it('dialog_extra_replies is classified as spend, not earn/grant, in the ledger', () => {
    expect(starsLedger).toMatch(/\|\s*'dialog_extra_replies'/);
    const classStart = starsLedger.indexOf('export const STAR_OP_CLASS');
    expect(classStart).toBeGreaterThan(-1);
    const classBody = starsLedger.slice(classStart, starsLedger.indexOf('\n});', classStart));
    expect(classBody).toMatch(/dialog_extra_replies:\s*'spend'/);
  });
});
