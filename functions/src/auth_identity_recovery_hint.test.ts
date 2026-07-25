import { buildRecoveryHintFromUserData, maskEmailForRecoveryHint } from './auth_identity';

describe('maskEmailForRecoveryHint', () => {
  it('маскирует локальную часть до 3 символов, домен сохраняет', () => {
    expect(maskEmailForRecoveryHint('uskovavalya52@gmail.com')).toBe('usk***@gmail.com');
    expect(maskEmailForRecoveryHint('ab@outlook.com')).toBe('ab***@outlook.com');
    expect(maskEmailForRecoveryHint('a@icloud.com')).toBe('a***@icloud.com');
  });

  it('поддерживает apple privaterelay-адреса', () => {
    expect(maskEmailForRecoveryHint('dpdcnf87nu@privaterelay.appleid.com'))
      .toBe('dpd***@privaterelay.appleid.com');
  });

  it('возвращает null для мусора вместо email', () => {
    expect(maskEmailForRecoveryHint(null)).toBeNull();
    expect(maskEmailForRecoveryHint(undefined)).toBeNull();
    expect(maskEmailForRecoveryHint('')).toBeNull();
    expect(maskEmailForRecoveryHint('no-at-sign')).toBeNull();
    expect(maskEmailForRecoveryHint('@domain.com')).toBeNull();
    expect(maskEmailForRecoveryHint('local@')).toBeNull();
  });
});

describe('buildRecoveryHintFromUserData', () => {
  it('возвращает провайдера и маску для привязанного аккаунта', () => {
    const hint = buildRecoveryHintFromUserData({
      linkedAuth: { provider: 'google', providerUid: 'uid-1', email: 'uskovavalya52@gmail.com' },
    });
    expect(hint).toEqual({
      found: true,
      linked: true,
      provider: 'google',
      maskedEmail: 'usk***@gmail.com',
    });
  });

  it('не выдумывает email, если его нет в linkedAuth', () => {
    const hint = buildRecoveryHintFromUserData({
      linkedAuth: { provider: 'apple', providerUid: 'uid-2', email: null },
    });
    expect(hint).toEqual({ found: true, linked: true, provider: 'apple', maskedEmail: null });
  });

  it('linked=false для аккаунта без provider-привязки', () => {
    expect(buildRecoveryHintFromUserData({ progress: { xp: 100 } }))
      .toEqual({ found: true, linked: false, provider: null, maskedEmail: null });
    expect(buildRecoveryHintFromUserData({ linkedAuth: { provider: 'password' } }))
      .toEqual({ found: true, linked: false, provider: null, maskedEmail: null });
  });

  it('found=false для отсутствующего документа', () => {
    expect(buildRecoveryHintFromUserData(undefined))
      .toEqual({ found: false, linked: false, provider: null, maskedEmail: null });
  });
});
