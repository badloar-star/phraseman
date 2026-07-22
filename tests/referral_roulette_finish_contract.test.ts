import { readFileSync } from 'fs';
import { join } from 'path';
import {
  __resetRemoteFlagsForTest,
  applyRemoteConfigSnapshot,
  isReferralRouletteEnabled,
} from '../app/remote_flags';
import { referralRouletteEnabledFromData } from '../functions/src/referral_roulette_flag';

function read(rel: string): string {
  return readFileSync(join(__dirname, '..', rel), 'utf8');
}

describe('referral roulette finish contract', () => {
  beforeEach(() => {
    __resetRemoteFlagsForTest();
  });

  it('uses a default-on live master flag from remote_config/app.numbers', () => {
    expect(isReferralRouletteEnabled()).toBe(true);
    applyRemoteConfigSnapshot({ numbers: { referral_roulette_enabled: false } });
    expect(isReferralRouletteEnabled()).toBe(false);
    applyRemoteConfigSnapshot({ numbers: {} });
    expect(isReferralRouletteEnabled()).toBe(true);

    const hook = read('app/referral_roulette_flag.ts');
    expect(hook).toContain("onAppEvent('remote_config_changed'");
    expect(hook).toContain('setEnabled(isReferralRouletteEnabled())');

    expect(referralRouletteEnabledFromData(undefined)).toBe(true);
    expect(referralRouletteEnabledFromData({ numbers: {} })).toBe(true);
    expect(referralRouletteEnabledFromData({ numbers: { referral_roulette_enabled: true } })).toBe(true);
    expect(referralRouletteEnabledFromData({ numbers: { referral_roulette_enabled: false } })).toBe(false);
  });

  it('removes fixed seven-day referral promises from every referral entry surface', () => {
    const targets = [
      'app/(tabs)/friends.tsx',
      'app/referrals.tsx',
      'app/referral_code_entry.tsx',
      'app/referral_invite_share.ts',
      'app/settings_invite_friend.tsx',
      'components/ReferralWelcomeHost.tsx',
      'components/EntitlementExpiredHost.tsx',
      'app/roulette_about.tsx',
    ];
    const source = targets.map(read).join('\n');
    const forbidden = [
      /7 дней полного/i,
      /7 днів повного/i,
      /7 días de acceso/i,
      /7 dias de acesso/i,
      /7 ngày truy cập/i,
      /7 hari akses/i,
      /7 gün tam erişim/i,
      /7 dni pełnego dostępu/i,
      /Plus можно забирать/i,
      /Plus можна забирати/i,
      /claimReferralVipDays/,
    ];
    for (const pattern of forbidden) expect(source).not.toMatch(pattern);

    expect(source).toContain('1 прокрут');
    expect(source).toContain('Plus от 1 дня до 365 дней');
    expect(read('app/referral_invite_share.ts')).toContain('${codeLabel}${code}');
  });

  it('gates referral UI, links, status badges and the welcome offer with the master flag', () => {
    const referrals = read('app/referrals.tsx');
    const friends = read('app/(tabs)/friends.tsx');
    const welcome = read('components/ReferralWelcomeHost.tsx');
    const entry = read('app/referral_code_entry.tsx');
    const expired = read('components/EntitlementExpiredHost.tsx');

    expect(referrals).toContain('const referralOfferOn = referralEnabled && rouletteOn');
    expect(referrals).toContain('{referralOfferOn && (');
    expect(friends).toContain('const referralOfferOn = referralEnabled && rouletteOn');
    expect(friends).toContain('referralOfferOn ? referralStatusByUid.get(profile.uid) : undefined');
    expect(friends).toContain('{referralOfferOn && (');
    expect(welcome).toContain('const rouletteOn = useReferralRouletteEnabled()');
    expect(welcome).toContain('const wantShow = rouletteOn &&');
    expect(entry).toContain('const rouletteOn = useReferralRouletteEnabled()');
    expect(entry).toContain('if (!rouletteOn)');
    expect(entry).toContain('testID="referral-code-entry-off"');
    expect(expired).toContain('const rouletteOn = useReferralRouletteEnabled()');
    expect(expired).toContain("kind === 'vip' && !rouletteOn ? 'premium' : kind");
  });

  it('puts one polished gated hero first, before the code card', () => {
    const source = read('app/referrals.tsx');
    const heroAt = source.indexOf('testID="referrals-roulette-hero"');
    const codeAt = source.indexOf('testID="referrals-my-code-card"');

    expect(heroAt).toBeGreaterThan(0);
    expect(codeAt).toBeGreaterThan(heroAt);
    expect(source.match(/testID="referrals-roulette-dev-grant"/g)).toHaveLength(1);
    expect(source).toContain('testID="referrals-roulette-preview"');
    expect(source).toContain('numberOfLines={1}');
    expect(source).toContain('testID="referrals-roulette-preview-rail"');
    expect(source).toContain('horizontal');
    expect(source).toContain('ROULETTE_PRIZES.map');
    expect(source).toContain('Plus от 1 дня до 365 дней');
    expect(source).not.toContain("transform: [{ rotate:");
    expect(source).not.toMatch(/fontWeight:\s*'[89]00'/);
  });

  it('keeps the roulette first frame static until assets and layout are ready', () => {
    const screen = read('app/roulette.tsx');
    const prizes = read('app/roulette_prizes.ts');

    expect(screen).toContain("import { Image } from 'expo-image'");
    expect(screen).toContain("from 'react-native-worklets'");
    expect(screen).toContain('scheduleOnRN(');
    expect(screen).not.toContain('runOnJS');
    expect(screen).toContain('useReducedMotion()');
    expect(screen).toContain('cancelAnimation(translateX)');
    expect(screen).toContain('const COPIES = 6');
    expect(screen).toContain('const [assetsReady, setAssetsReady]');
    expect(screen).toContain('const [layoutReady, setLayoutReady]');
    expect(screen).toContain('onLayout={onTapeLayout}');
    expect(screen).toContain('cachePolicy="memory-disk"');
    expect(screen).toContain('priority="high"');
    expect(screen).toContain('if (!assetsReady || !layoutReady)');
    expect(prizes).toContain('export async function preloadRoulettePrizeImages');
  });

  it('maps a server-side disable race distinctly and localizes the about screen', () => {
    const client = read('app/roulette_spin_client.ts');
    const screen = read('app/roulette.tsx');
    const about = read('app/roulette_about.tsx');

    expect(client).toContain("msg.includes('REFERRAL_ROULETTE_DISABLED')");
    expect(client).toContain("reason: 'disabled'");
    expect(screen).toContain("outcome.reason === 'disabled'");
    expect(screen).toContain("showToast(L('Рулетка временно недоступна'");
    expect(about).toContain('const { lang } = useLang()');
    expect(about).toContain('const L = makeL(lang as Lang)');
    expect(about).toContain('const rouletteOn = useReferralRouletteEnabled()');
    expect(about).toContain('if (!rouletteOn)');
    for (const marker of ['Рулетка Plus', 'Рулетка Plus', 'Ruleta Plus', 'Roleta Plus', 'Vòng quay Plus', 'Roulette Plus', 'Plus Ruleti', 'Ruletka Plus']) {
      expect(about).toContain(marker);
    }
  });

  it('rechecks the kill switch atomically inside every award transaction', () => {
    for (const rel of ['functions/src/referral_spin.ts', 'functions/src/referral_claim_spin.ts']) {
      const source = read(rel);
      const txStart = source.indexOf('runTransaction(async (tx)');
      const txBody = source.slice(txStart);
      const configRead = txBody.indexOf('tx.get(configRef)');
      const firstWrite = txBody.indexOf('tx.set(');

      expect(txStart).toBeGreaterThan(0);
      expect(source).toContain("db.collection('remote_config').doc('app')");
      expect(txBody).toContain('referralRouletteEnabledFromData');
      expect(txBody).toContain("'REFERRAL_ROULETTE_DISABLED'");
      expect(configRead).toBeGreaterThanOrEqual(0);
      expect(firstWrite).toBeGreaterThan(configRead);
    }
  });

  it('localizes roulette and invite flag-off/loading states for all eight locales', () => {
    const roulette = read('app/roulette.tsx');
    const invite = read('app/settings_invite_friend.tsx');

    expect(roulette).toContain("showToast(L('Карточки ещё готовятся — секунду'");
    expect(roulette).toContain("L('Готовим…'");
    expect(roulette).toContain("L('Раздел недоступен'");
    expect(invite).toContain("unavailable: 'Этот раздел временно недоступен.'");
    expect(invite).toContain("unavailable: 'Sekcja jest chwilowo niedostępna.'");
    expect(invite).toContain("preparing: 'Готовим приглашение…'");
    expect(invite).toContain("preparing: 'Przygotowujemy zaproszenie…'");
    expect(invite).toContain('{busy ? tx.preparing : tx.cta}');
    expect(invite).not.toContain("copyLang === 'ru' ?");
  });

  it('keeps the settings referral row honest in every locale', () => {
    const settings = read('app/(tabs)/settings.tsx');
    expect(settings).toContain("'1 прокрут · Plus от 1 до 365 дней'");
    expect(settings).toContain("'1 прокрут · Plus від 1 до 365 днів'");
    expect(settings).toContain("'1 giro · Plus de 1 a 365 días'");
    expect(settings).toContain("'1 giro · Plus de 1 a 365 dias'");
    expect(settings).toContain("'1 lượt quay · Plus từ 1 đến 365 ngày'");
    expect(settings).toContain("'1 putaran · Plus 1–365 hari'");
    expect(settings).toContain("'1 çevirme · 1–365 gün Plus'");
    expect(settings).toContain("'1 los · Plus od 1 do 365 dni'");
    expect(settings).not.toContain('Вы оба получите бонус');
  });

  it('wires a permissioned, idempotent and audited server/admin kill switch', () => {
    const referral = read('functions/src/referral.ts');
    const spin = read('functions/src/referral_spin.ts');
    const claim = read('functions/src/referral_claim_spin.ts');
    const admin = read('functions/src/admin_referrals.ts');
    const exports = read('functions/src/index.ts');
    const firebase = read('admin/v2/scripts/admin-firebase.js');
    const core = read('admin/v2/scripts/admin-core.js');

    expect(referral).toContain('return false;');
    expect(spin).toContain("new HttpsError('failed-precondition', 'REFERRAL_ROULETTE_DISABLED')");
    expect(claim).toContain("new HttpsError('failed-precondition', 'REFERRAL_ROULETTE_DISABLED')");
    expect(admin).toContain("hasPermission(role, 'application.config.write')");
    expect(admin).toContain("action: 'referral_roulette.enabled.set'");
    expect(admin).toContain("db.collection('admin_log').doc()");
    expect(admin).toContain("db.collection('admin_command_operations')");
    expect(exports).toContain('adminSetReferralRouletteEnabled');
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminSetReferralRouletteEnabled')");
    expect(core).toContain('data-action="set-referral-roulette-enabled"');
    expect(core).toContain('aria-pressed=');
    expect(core).toContain('data-tooltip=');
    expect(core).toContain('globalThis.confirm(');
  });
});
