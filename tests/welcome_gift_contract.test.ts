import fs from 'fs';
import path from 'path';

const client = fs.readFileSync(path.join(process.cwd(), 'app', 'welcome_gift.ts'), 'utf8');
const shards = fs.readFileSync(path.join(process.cwd(), 'app', 'shards_system.ts'), 'utf8');
const server = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'welcome_gift.ts'), 'utf8');
const ledger = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'stars_ledger.ts'), 'utf8');
const fnIndex = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'index.ts'), 'utf8');

// зачем: владелец (2026-08-26) — стартовый подарок новичку (+100 жемчужин,
// +300 рун) из приветственной модалки. Контракт сторожит чек-лист класса
// «награду показали, но не начислили» и то, что суммы клиента и сервера не
// разъезжаются (клиент рисует константы, сервер начисляет свои).
//
// зачем (владелец, 2026-08-26, той же правкой — «зафиксируй жёстко что этот
// модал 1 раз на аккаунт»): строгость держится на ДВУХ независимых
// детерминированных ключах, ни один из которых не зависит от устройства/
// сессии/времени — только от stableId аккаунта:
//   - жемчужины: operationId = sha256('welcome_gift:welcome_gift_v1') внутри
//     awardOneTimeVariable → журнал client_shard_operation_ledger мержит
//     журналы РАЗНЫХ устройств одного аккаунта по этому operationId
//     («Replaying an identical operation is success with no second economic
//     effect», docs/economy/ECONOMY_CONSTITUTION.md §4-5) — второе устройство
//     того же аккаунта не может задублировать сумму НАВСЕГДА, даже если
//     локально применит её раньше, чем успела прийти синхронизация;
//   - руны: opId = `welcome_gift:${stableUid}` + claim-документ
//     reward_claims/welcome_gift — сервер авторитетен, транзакция Firestore
//     физически не даст создать вторую выдачу для одного uid.
describe('Welcome gift economics contract', () => {
  it('client and server grant the same amounts', () => {
    expect(client).toContain('export const WELCOME_GIFT_PEARLS = 100');
    expect(client).toContain('export const WELCOME_GIFT_RUNES = 300');
    expect(server).toContain('export const WELCOME_GIFT_RUNES = 300');
  });

  it('pearls go through the one-time wallet rail, idempotent by event key', () => {
    // Жемчужины клиентски-авторитетны: awardOneTimeVariable = мгновенно, офлайн,
    // идемпотентно, журнал сам синхронизируется в облако.
    expect(client).toContain("export const WELCOME_GIFT_PEARLS_EVENT_KEY = 'welcome_gift_v1'");
    expect(client).toMatch(/awardOneTimeVariable\(\s*WELCOME_GIFT_PEARLS_EVENT_KEY,\s*WELCOME_GIFT_PEARLS,\s*'welcome_gift',?\s*\)/);
    expect(shards).toContain("export type OneTimeVariableSource = 'fc_checkpoint' | 'fc_milestone' | 'welcome_gift'");
  });

  it('runes stay server-authoritative: no client-side star writer, only merge', () => {
    // Единственный клиентский писатель рун — level_spin_star_grants (спины).
    // Подарок его НЕ трогает: callable начисляет, клиент только мерджит ответ.
    expect(client).not.toContain('enqueueLevelSpinStarGrant');
    expect(client).toContain('mergeLevelSpinServerStars(token');
    expect(client).toContain("'welcomeGiftClaim'");
  });

  it('server grants through stars_ledger as a grant, not an earn', () => {
    // grant: balance растёт, earnedTotal/weekEarned/seasonEarned не двигаются —
    // подарок не влияет на сезонный и соревновательный прогресс.
    expect(ledger).toMatch(/welcome_gift: 'grant'/);
    expect(server).toContain('prepareStarOperations');
    expect(server).toContain('commitStarOperations');
    expect(server).toContain("reason: 'welcome_gift'");
  });

  it('server is idempotent twice over: fixed claim doc and fixed ledger opId', () => {
    expect(server).toContain("userRef.collection('reward_claims').doc('welcome_gift')");
    expect(server).toContain('opId: `welcome_gift:${stableUid}`');
    // Повторный вызов реплеит прежний ответ, а не бросает и не выдаёт заново.
    expect(server).toMatch(/if \(claimSnap\.exists\) \{[\s\S]*?alreadyClaimed: true/);
  });

  it('done-markers are written only AFTER a successful grant (retry survives crash)', () => {
    // Чек-лист наград, п.4: маркер после успеха; провал оставляет pending,
    // resumeWelcomeGiftIfPending дожимает при следующем запуске.
    expect(client).toMatch(/if \(next\.pearls === 'pending' && await grantPearlsLocal\(\)\) \{/);
    expect(client).toMatch(/if \(next\.runes === 'pending' && await claimRunesFromServer\(\)\) \{/);
    expect(client).toContain('export async function resumeWelcomeGiftIfPending');
  });

  it('runes claim keeps a persisted requestId until the server confirms', () => {
    expect(client).toContain("const RUNES_REQUEST_KEY = 'welcome_gift_runes_request_v1'");
    expect(client).toContain('getOrCreateRunesRequestId');
  });

  it('the callable is registered and App Check stays sealed', () => {
    expect(fnIndex).toContain('export { welcomeGiftClaim } from "./welcome_gift"');
    // Пломба владельца: только общий ENFORCE_APP_CHECK, никакого enforceAppCheck: true.
    expect(server).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    expect(server).not.toContain('enforceAppCheck: true');
  });

  it('strictly once per account: neither idempotency key is device- or time-derived', () => {
    // Ключи не должны содержать Date.now()/Math.random()/deviceId — иначе
    // «строго 1 раз на аккаунт» превращается в «1 раз на устройство/сессию».
    expect(client).toContain("export const WELCOME_GIFT_PEARLS_EVENT_KEY = 'welcome_gift_v1'");
    expect(client).not.toMatch(/WELCOME_GIFT_PEARLS_EVENT_KEY\s*=.*(Date\.now|Math\.random|deviceId)/);
    expect(server).toContain('opId: `welcome_gift:${stableUid}`');
    expect(server).not.toMatch(/opId:\s*`welcome_gift:.*(Date\.now|Math\.random|requestId)/);
  });
});
