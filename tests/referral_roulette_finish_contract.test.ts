import { readFileSync } from 'fs';
import { join } from 'path';
import {
  __resetRemoteFlagsForTest,
  applyRemoteConfigSnapshot,
  isReferralRouletteEmergencyStopped,
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
    expect(hook).toContain('setPolicy((current) =>');
    expect(hook).toContain('isReferralRouletteEmergencyStopped()');

    applyRemoteConfigSnapshot({ numbers: {
      referral_roulette_enabled: true,
      referral_roulette_emergency_stop: true,
    } });
    expect(isReferralRouletteEnabled()).toBe(true);
    expect(isReferralRouletteEmergencyStopped()).toBe(true);
    expect(referralRouletteEnabledFromData({ numbers: {
      referral_roulette_enabled: true,
      referral_roulette_emergency_stop: true,
    } })).toBe(false);

    expect(referralRouletteEnabledFromData(undefined)).toBe(true);
    expect(referralRouletteEnabledFromData({ numbers: {} })).toBe(true);
    expect(referralRouletteEnabledFromData({ numbers: { referral_roulette_enabled: true } })).toBe(true);
    expect(referralRouletteEnabledFromData({ numbers: { referral_roulette_enabled: false } })).toBe(false);
  });

  it('removes fixed seven-day referral promises from every referral entry surface', () => {
    // зачем: экраны ввода/приглашения/объяснялки схлопнуты в шиты единого экрана
    // (2026-07-25) — проверяем те же обещания на новых поверхностях.
    const targets = [
      'app/(tabs)/friends.tsx',
      'app/referrals.tsx',
      'app/referral_invite_share.ts',
      'components/ReferralWelcomeHost.tsx',
      'components/EntitlementExpiredHost.tsx',
      'components/referral_code_sheet.tsx',
      'components/referral_how_sheet.tsx',
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

    expect(source).toContain('получу ключ');
    expect(source).toContain('Plus от 1 дня до 365 дней');
    expect(read('app/referral_invite_share.ts')).toContain('${codeLabel}${code}');
  });

  it('gates referral UI, links, status badges and the welcome offer with the master flag', () => {
    const referrals = read('app/referrals.tsx');
    const friends = read('app/(tabs)/friends.tsx');
    const welcome = read('components/ReferralWelcomeHost.tsx');
    const expired = read('components/EntitlementExpiredHost.tsx');

    expect(referrals).toContain('const marketingVisible = referralSurface.marketingVisible');
    expect(referrals).toContain('selectReferralSurfaceState');
    expect(referrals).toContain('const drainVisible = referralSurface.drainVisible');
    expect(referrals).toContain('{referralUiVisible && (');
    expect(referrals).toContain('{marketingVisible && (');
    // Шит ввода кода открывается только при живом маркетинге (флаг вкл):
    // и по ссылке на экране, и по ?enter=1 из настроек.
    expect(referrals).toContain("params.enter === '1' && marketingVisible");
    expect(friends).toContain('const referralMarketingVisible = referralSurface.marketingVisible');
    expect(friends).toContain('selectReferralSurfaceState');
    // Из «Друзей» реферальный UI убран (owner 2026-07-24): статусные чипы и
    // мегафон-вход удалены; маркетинговый флаг остался только для прогрева
    // реф-кода и модалки окончания доступа.
    expect(friends).not.toContain('referralStatusByUid');
    expect(friends).not.toContain('friends-open-referrals');
    expect(welcome).toContain('const rouletteOn = useReferralRouletteEnabled()');
    expect(welcome).toContain('const wantShow = rouletteOn &&');
    expect(expired).toContain('const rouletteOn = useReferralRouletteEnabled()');
    expect(expired).toContain("kind === 'vip' && !rouletteOn ? 'premium' : kind");
  });

  it('puts one polished gated hero first, before the code card', () => {
    const source = read('app/referrals.tsx');
    const arc = read('components/prize_arc.tsx');
    const heroAt = source.indexOf('testID="referrals-roulette-hero"');
    const codeAt = source.indexOf('testID="referrals-my-code-card"');

    expect(heroAt).toBeGreaterThan(0);
    expect(codeAt).toBeGreaterThan(heroAt);
    expect(source.match(/testID="referrals-roulette-dev-grant"/g)).toHaveLength(1);
    // зачем: превью-лента заменена дугой карточек (Kimi-стиль, 2026-07-25).
    expect(source).toContain('<PrizeArc');
    expect(arc).toContain('testID="prize-arc"');
    expect(arc).toContain('ROULETTE_PRIZES[');
    expect(source).toContain('Plus от 1 дня до 365 дней');
    expect(source).not.toContain("transform: [{ rotate:");
    expect(source).not.toMatch(/fontWeight:\s*'[89]00'/);
  });

  it('keeps the prize arc first frame static until assets are ready', () => {
    const arc = read('components/prize_arc.tsx');
    const prizes = read('app/roulette_prizes.ts');

    expect(arc).toContain("from 'expo-image'");
    expect(arc).toContain("from 'react-native-worklets'");
    expect(arc).toContain('scheduleOnRN(');
    expect(arc).not.toContain('runOnJS(');
    expect(arc).toContain('useReducedMotion()');
    expect(arc).toContain('cancelAnimation(rotation)');
    // зачем: рендер карточек НЕ гейтится прелоадом (падение Asset.loadAsync
    // оставляло дугу пустой навсегда) и вход не прячет дугу через opacity.
    expect(arc).not.toContain('assetsReady &&');
    expect(arc).not.toMatch(/opacity:\s*enter\.value/);
    expect(arc).toContain('preloadRoulettePrizeImages()');
    expect(arc).toContain('cachePolicy="memory-disk"');
    // Высота зоны фиксирована — первый кадр равен финальной геометрии.
    expect(arc).toContain('export const PRIZE_ARC_HEIGHT');
    expect(prizes).toContain('export async function preloadRoulettePrizeImages');
  });

  it('cannot lose a successful award behind asset preload or a missing animation callback', () => {
    const referrals = read('app/referrals.tsx');
    const arc = read('components/prize_arc.tsx');

    // Карточки уже рендерятся через expo-image: preload — только прогрев и не имеет
    // права задерживать серверный spin до бесконечности.
    expect(referrals).not.toContain('await preloadRoulettePrizeImages().catch(() => {});');
    expect(referrals).toContain('void preloadRoulettePrizeImages().catch(() => {});');

    // После server ok показ приза ограничен JS-дедлайном и не зависит от того,
    // доставит ли UI-thread callback завершения анимации.
    expect(referrals).toContain('settlePrizeArcAnimation');
    expect(referrals).toContain('Promise.race');
    expect(referrals).toContain('arcRef.current?.spinTo(outcome.prizeIndex)');

    // Сам imperative-контракт дуги тоже fail-safe: interruption и потерянный
    // callback освобождают pending Promise, а fallback доводит карточку до приза.
    expect(arc).toContain('SPIN_SETTLE_GRACE_MS');
    expect(arc).toContain('setTimeout(finishSpin');
    expect(arc).toContain('clearTimeout(spinFallbackTimerRef.current)');
    expect(arc).not.toContain('if (finished) scheduleOnRN(finishSpin)');
  });

  it('maps a server-side disable race distinctly and localizes the how-it-works sheet', () => {
    const client = read('app/roulette_spin_client.ts');
    const referrals = read('app/referrals.tsx');
    const how = read('components/referral_how_sheet.tsx');

    expect(client).toContain("msg.includes('REFERRAL_ROULETTE_EMERGENCY_STOP')");
    expect(client).toContain("reason: 'disabled'");
    expect(referrals).toContain("outcome.reason === 'disabled'");
    expect(referrals).toContain("setMessage(L('Награды временно недоступны'");
    expect(how).toContain('const { lang } = useLang()');
    expect(how).toContain('const L = makeL(lang as Lang)');
    for (const marker of ['Награда за друга', 'Нагорода за друга', 'Recompensa por amigo', 'Phần thưởng mời bạn', 'Hadiah undang teman', 'Arkadaş ödülü', 'Nagroda za znajomego']) {
      expect(referrals).toContain(marker);
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
      expect(txBody).toContain('referralRoulettePolicyFromData');
      expect(txBody).toContain("'REFERRAL_ROULETTE_EMERGENCY_STOP'");
      expect(configRead).toBeGreaterThanOrEqual(0);
      expect(firstWrite).toBeGreaterThan(configRead);
    }
  });

  it('localizes spin and sheet states for all eight locales', () => {
    const referrals = read('app/referrals.tsx');
    const codeSheet = read('components/referral_code_sheet.tsx');
    const howSheet = read('components/referral_how_sheet.tsx');

    expect(referrals).toContain("L('Открываем…'");
    expect(referrals).toContain("L('Забрать награду'");
    expect(referrals).toContain("'Odbierz nagrodę'");
    expect(codeSheet).toContain("L('Применить код'");
    expect(codeSheet).toContain("'Zastosuj kod'");
    expect(howSheet).toContain("'Jak to działa'");
  });

  it('keeps the settings invite banner honest in every locale', () => {
    const settings = read('app/(tabs)/settings.tsx');
    expect(settings).toContain('testID="settings-plus-row"');
    // зачем: владелец (2026-07-26) — ряд «Ввести реферальный код» из настроек
    // убран, ввод кода живёт кнопкой на /referrals; в настройках — баннер.
    expect(settings).not.toContain('testID="settings-referral-code-row"');
    expect(settings).toContain('testID="settings-invite-banner"');
    expect(settings).toContain("pathname: '/referrals'");
    for (const marker of [
      "'Пригласи друга — выиграй Plus'",
      "'Запроси друга — виграй Plus'",
      "'Invita a un amigo y gana Plus'",
      "'Convide um amigo e ganhe Plus'",
      "'M\u1eddi b\u1ea1n b\u00e8 \u2014 th\u1eafng Plus'",
      "'Undang teman — menangkan Plus'",
      "'Arkadaşını davet et — Plus kazan'",
      "'Zaproś znajomego — wygraj Plus'",
    ]) {
      expect(settings).toContain(marker);
    }
    expect(settings).toContain('Когда друг оформит Plus или Pro');
    // На самом баннере слова «рулетка»/«крут»/«прокрут» запрещены (owner 2026-07-24).
    const bannerAt = settings.indexOf('testID="settings-invite-banner"');
    const bannerEnd = settings.indexOf(') : null}', bannerAt);
    const bannerBlock = settings.slice(bannerAt, bannerEnd);
    expect(bannerBlock).not.toMatch(/рулетк|прокрут|крут/i);
    expect(settings).not.toContain('Вы оба получите бонус');
  });

  // зачем: владелец (2026-07-25) запретил слова «рулетка»/«прокрут»/«крутить» во ВСЁМ
  // интерфейсе, а не только на баннере настроек. Механика называется «Награда за друга»,
  // единица счёта — «ключ». Здесь ловим возврат старых слов в видимые строки: берём
  // только строковые литералы (комментарии/имена файлов и роутов менять не просили).
  it('keeps roulette wording out of every user-visible referral string', () => {
    const screens = [
      'app/referrals.tsx',
      'app/referral_invite_share.ts',
      'app/referral_sunset_copy.ts',
      'components/EntitlementExpiredHost.tsx',
      'components/ReferralWelcomeHost.tsx',
      'components/referral_code_sheet.tsx',
      'components/referral_how_sheet.tsx',
      'components/referral_sheet_shell.tsx',
      'components/prize_arc.tsx',
    ];
    const banned = /рулетк|прокрут|крутить|крути\b/i;
    const offenders: string[] = [];
    for (const rel of screens) {
      const source = read(rel);
      source.split('\n').forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
        const literals = code.match(/'[^']*'|`[^`]*`/g) ?? [];
        for (const lit of literals) {
          if (banned.test(lit)) offenders.push(`${rel}:${i + 1} ${lit.slice(0, 60)}`);
        }
      });
    }
    expect(offenders).toEqual([]);
  });

  it('wires a permissioned, idempotent and audited server kill switch', () => {
    const referral = read('functions/src/referral.ts');
    const spin = read('functions/src/referral_spin.ts');
    const claim = read('functions/src/referral_claim_spin.ts');
    const admin = read('functions/src/admin_referrals.ts');
    const exports = read('functions/src/index.ts');

    expect(referral).toContain('return false;');
    expect(spin).toContain("new HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP')");
    expect(claim).toContain("new HttpsError('failed-precondition', 'REFERRAL_ROULETTE_EMERGENCY_STOP')");
    expect(admin).toContain("hasPermission(role, 'application.config.write')");
    expect(admin).toContain("action: 'referral_roulette.enabled.set'");
    expect(admin).toContain("db.collection('admin_log').doc()");
    expect(admin).toContain("db.collection('admin_command_operations')");
    expect(exports).toContain('adminSetReferralRouletteEnabled');
  });
});
