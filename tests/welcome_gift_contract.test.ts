import fs from 'fs';
import path from 'path';

const client = fs.readFileSync(path.join(process.cwd(), 'app', 'welcome_gift.ts'), 'utf8');
const server = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'welcome_gift.ts'), 'utf8');
const ledger = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'stars_ledger.ts'), 'utf8');
const fnIndex = fs.readFileSync(path.join(process.cwd(), 'functions', 'src', 'index.ts'), 'utf8');

// зачем: владелец (2026-08-26) — стартовый подарок (+100 жемчужин, +300 рун)
// из приветственной модалки, СТРОГО один раз на аккаунт. Контракт сторожит
// уроки двух инцидентов одного дня:
//   утро — «награду показали, но не начислили» (гонка событий хоста);
//   вечер — «вижу нули постоянно» (девайс-глобальные маркеры наследовались
//   чужим аккаунтом при restore-входе + выдача стартовала до готовности
//   account_generation и молча падала в stale_account_generation).
describe('Welcome gift economics contract', () => {
  it('client and server grant the same amounts', () => {
    expect(client).toContain('export const WELCOME_GIFT_PEARLS = 100');
    expect(client).toContain('export const WELCOME_GIFT_RUNES = 300');
    expect(server).toContain('export const WELCOME_GIFT_RUNES = 300');
  });

  it('pearls bypass the device-global one-time registry and rely on the per-account ledger', () => {
    // Корень инцидента-вечер: awardOneTimeVariable сверялся с девайс-глобальным
    // shards_one_time_events — restored-аккаунт получал ложный alreadyClaimed.
    // Теперь кредит идёт напрямую в commitShardCreditOperation: идемпотентность
    // решает аккаунт-скоупный леджер по детерминированному operationId.
    // Слово живёт в комментариях-объяснениях — запрещён именно ВЫЗОВ/ИМПОРТ.
    expect(client).not.toMatch(/awardOneTimeVariable\s*\(/);
    expect(client).not.toMatch(/import[^;]*awardOneTimeVariable/);
    expect(client).toContain('commitShardCreditOperation({');
    expect(client).toMatch(/operationId: `one-time:\$\{eventHash\.slice\(0, 40\)\}`/);
    // Тот же вывод хэша, что строил awardOneTimeVariable: sha256('welcome_gift:welcome_gift_v1').
    // Аккаунты, выданные старым путём, получают already-applied, а не второй кредит.
    expect(client).toMatch(/Crypto\.digestStringAsync\(\s*Crypto\.CryptoDigestAlgorithm\.SHA256,\s*`welcome_gift:\$\{WELCOME_GIFT_PEARLS_EVENT_KEY\}`,?\s*\)/);
  });

  it('grant state and runes requestId are scoped per account, never per device', () => {
    expect(client).toMatch(/welcome_gift_state_v2:\$\{encodeURIComponent\(stableId\)\}/);
    expect(client).toMatch(/welcome_gift_runes_request_v2:\$\{encodeURIComponent\(stableId\)\}/);
    // Старые девайс-глобальные ключи только подчищаются, никогда не читаются.
    expect(client).toMatch(/multiRemove\(\[LEGACY_STATE_KEY, LEGACY_RUNES_REQUEST_KEY\]\)/);
    expect(client).not.toMatch(/getItem\(\s*LEGACY_STATE_KEY/);
  });

  it('granting waits for an active account generation instead of failing silently', () => {
    // Корень №2: выдача на монтировании хоста стартовала до active-фазы и
    // молча ловила stale_account_generation при каждом запуске.
    expect(client).toContain('waitForActiveAccountGeneration(15_000)');
    // Отказы больше не молчат: и жемчужины, и общий прогон пишут причину.
    expect(client).toMatch(/DebugLogger\.error\(\s*'welcome_gift:pearls'/);
    expect(client).toContain("DebugLogger.error('welcome_gift:run', new Error('account_not_active_in_15s')");
  });

  it('runes stay server-authoritative: no client-side star writer, only merge', () => {
    expect(client).not.toContain('enqueueLevelSpinStarGrant');
    expect(client).toContain('mergeLevelSpinServerStars(token');
    expect(client).toContain("'welcomeGiftClaim'");
  });

  it('server grants through stars_ledger as a grant, not an earn', () => {
    expect(ledger).toMatch(/welcome_gift: 'grant'/);
    expect(server).toContain('prepareStarOperations');
    expect(server).toContain('commitStarOperations');
    expect(server).toContain("reason: 'welcome_gift'");
  });

  it('server is idempotent twice over: fixed claim doc and fixed ledger opId', () => {
    expect(server).toContain("userRef.collection('reward_claims').doc('welcome_gift')");
    expect(server).toContain('opId: `welcome_gift:${stableUid}`');
    expect(server).toMatch(/if \(claimSnap\.exists\) \{[\s\S]*?alreadyClaimed: true/);
  });

  it('done-markers are written only AFTER a successful grant (retry survives crash)', () => {
    expect(client).toMatch(/if \(next\.pearls === 'pending' && await grantPearlsLocal\(token\)\) \{/);
    expect(client).toMatch(/if \(next\.runes === 'pending' && await claimRunesFromServer\(token, stableId\)\) \{/);
    expect(client).toContain('export async function ensureWelcomeGiftGranted');
  });

  it('money never depends on the ceremony: absence of per-account state means "grant now"', () => {
    // «Сделай чтобы все получили» — деньги первичны, модалка только празднует.
    // Отсутствующий/битый per-account ключ читается как pending, не как done.
    expect(client).toMatch(/if \(!raw\) return FRESH_STATE;/);
    expect(client).toMatch(/pearls: 'pending', runes: 'pending'/);
  });

  it('the admin kill switch gates granting inside the grant path itself', () => {
    expect(client).toMatch(/if \(!getRemoteBool\('onboarding_welcome_sheet_enabled'\)\) return;/);
  });

  it('the callable is registered and App Check stays sealed', () => {
    expect(fnIndex).toContain('export { welcomeGiftClaim } from "./welcome_gift"');
    expect(server).toContain('enforceAppCheck: ENFORCE_APP_CHECK');
    expect(server).not.toContain('enforceAppCheck: true');
  });

  it('strictly once per account: neither idempotency key is device- or time-derived', () => {
    expect(client).toContain("export const WELCOME_GIFT_PEARLS_EVENT_KEY = 'welcome_gift_v1'");
    expect(client).not.toMatch(/WELCOME_GIFT_PEARLS_EVENT_KEY\s*=.*(Date\.now|Math\.random|deviceId)/);
    expect(server).toContain('opId: `welcome_gift:${stableUid}`');
    expect(server).not.toMatch(/opId:\s*`welcome_gift:.*(Date\.now|Math\.random|requestId)/);
  });
});
