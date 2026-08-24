// зачем 2026-08-24 (владелец): «чтобы не тратить деньги» — пробный звонок
// 3 минуты выключается из админки отдельно для Free / Плюса / Про. Пробник
// платный (OpenAI Realtime), поэтому здесь сторожим ДЕНЬГИ:
//   1) выключенный тир НЕ получает пробник ни при каких данных дока;
//   2) сбой/мусор в конфиге НЕ гасит пробник молча (дефолт — включён);
//   3) дорогой обход идентичностей не делается, пока флаги Плюса и Про равны
//      (иначе +1 чтение Firestore на КАЖДЫЙ звонок).
import { clampMaxVoiceConfig, MAX_VOICE_CONFIG_DEFAULTS } from './max_voice_config';
import { isTrialEnabledForTier } from './max_voice_mint';

jest.mock('./premium_status', () => ({
  resolveIsLifetimePlan: jest.fn(),
  resolveIsMaxTier: jest.fn(),
  resolvePremiumAccess: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveIsLifetimePlan } = require('./premium_status') as {
  resolveIsLifetimePlan: jest.Mock;
};

const NOW = 1_756_000_000_000;
const db = {} as any;

function configWith(patch: Record<string, unknown>) {
  return clampMaxVoiceConfig({ ...MAX_VOICE_CONFIG_DEFAULTS, ...patch });
}

beforeEach(() => {
  resolveIsLifetimePlan.mockReset();
});

describe('дефолты — пробник никуда не пропадает сам по себе', () => {
  it('включён на всех трёх тирах в дефолтном конфиге', () => {
    expect(MAX_VOICE_CONFIG_DEFAULTS.trialEnabledFree).toBe(true);
    expect(MAX_VOICE_CONFIG_DEFAULTS.trialEnabledPlus).toBe(true);
    expect(MAX_VOICE_CONFIG_DEFAULTS.trialEnabledPro).toBe(true);
  });

  it('мусор и отсутствие полей в доке клампятся к «включён», а не к «выключен»', () => {
    const clamped = clampMaxVoiceConfig({
      trialEnabledFree: 'нет',
      trialEnabledPlus: null,
      // trialEnabledPro отсутствует вовсе
    });
    expect(clamped.trialEnabledFree).toBe(true);
    expect(clamped.trialEnabledPlus).toBe(true);
    expect(clamped.trialEnabledPro).toBe(true);
  });

  it('явный false сохраняется — это единственный способ погасить пробник', () => {
    const clamped = clampMaxVoiceConfig({ trialEnabledFree: false });
    expect(clamped.trialEnabledFree).toBe(false);
    expect(clamped.trialEnabledPlus).toBe(true);
  });
});

describe('Free — тир без активного премиума', () => {
  it('получает пробник, пока флаг Free включён', async () => {
    const config = configWith({ trialEnabledFree: true });
    await expect(isTrialEnabledForTier(db, 'u1', 'a1', false, config, NOW)).resolves.toBe(true);
  });

  it('НЕ получает пробник при выключенном флаге Free', async () => {
    const config = configWith({ trialEnabledFree: false });
    await expect(isTrialEnabledForTier(db, 'u1', 'a1', false, config, NOW)).resolves.toBe(false);
  });

  it('флаги платных тиров не влияют на Free и не стоят ни одного чтения', async () => {
    const config = configWith({
      trialEnabledFree: false, trialEnabledPlus: true, trialEnabledPro: true,
    });
    await expect(isTrialEnabledForTier(db, 'u1', 'a1', false, config, NOW)).resolves.toBe(false);
    expect(resolveIsLifetimePlan).not.toHaveBeenCalled();
  });
});

describe('экономия чтений Firestore — главный риск по стоимости', () => {
  it('не ходит за тиром, пока Плюс и Про включены оба', async () => {
    const config = configWith({ trialEnabledPlus: true, trialEnabledPro: true });
    await expect(isTrialEnabledForTier(db, 'u1', 'a1', true, config, NOW)).resolves.toBe(true);
    expect(resolveIsLifetimePlan).not.toHaveBeenCalled();
  });

  it('не ходит за тиром, пока Плюс и Про выключены оба', async () => {
    const config = configWith({ trialEnabledPlus: false, trialEnabledPro: false });
    await expect(isTrialEnabledForTier(db, 'u1', 'a1', true, config, NOW)).resolves.toBe(false);
    expect(resolveIsLifetimePlan).not.toHaveBeenCalled();
  });
});

describe('Плюс и Про различаются только когда флаги разошлись', () => {
  it('Про выключен, Плюс включён: пожизненный доступ пробник не получает', async () => {
    resolveIsLifetimePlan.mockResolvedValue(true);
    const config = configWith({ trialEnabledPlus: true, trialEnabledPro: false });
    await expect(isTrialEnabledForTier(db, 'u1', 'a1', true, config, NOW)).resolves.toBe(false);
    expect(resolveIsLifetimePlan).toHaveBeenCalledTimes(1);
  });

  it('Про выключен, Плюс включён: подписчик пробник получает', async () => {
    resolveIsLifetimePlan.mockResolvedValue(false);
    const config = configWith({ trialEnabledPlus: true, trialEnabledPro: false });
    await expect(isTrialEnabledForTier(db, 'u1', 'a1', true, config, NOW)).resolves.toBe(true);
  });

  it('Плюс выключен, Про включён: обратная развилка тоже работает', async () => {
    resolveIsLifetimePlan.mockResolvedValue(true);
    const config = configWith({ trialEnabledPlus: false, trialEnabledPro: true });
    await expect(isTrialEnabledForTier(db, 'u1', 'a1', true, config, NOW)).resolves.toBe(true);

    resolveIsLifetimePlan.mockResolvedValue(false);
    await expect(isTrialEnabledForTier(db, 'u1', 'a1', true, config, NOW)).resolves.toBe(false);
  });

  it('сбой чтения тира считает человека Плюсом, а не раздаёт платный пробник вслепую', async () => {
    resolveIsLifetimePlan.mockRejectedValue(new Error('firestore unavailable'));
    // Плюс выключен, Про включён → при сбое обязан получиться отказ.
    const config = configWith({ trialEnabledPlus: false, trialEnabledPro: true });
    await expect(isTrialEnabledForTier(db, 'u1', 'a1', true, config, NOW)).resolves.toBe(false);
  });
});
