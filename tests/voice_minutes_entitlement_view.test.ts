// зачем (владелец 2026-09-02, скрин: Главная «20м», раздел уроков «0 минут» на
// одном аккаунте): цифру минут считали два экрана двумя способами. Теперь —
// одна чистая функция; этот сторож фиксирует правило владельца «3 минуты для
// всех, кто не купил, и точное число, а не рандом».
import {
  resolveVoiceMinutesView,
  trialCapSecFrom,
  voiceMinutesToDisplay,
  VOICE_TRIAL_CAP_SEC_DEFAULT,
} from '../modules/voice_minutes/entitlement_view';

describe('resolveVoiceMinutesView — единый источник цифры минут', () => {
  it('купленные минуты идут первыми, остаток без вычета резерва', () => {
    expect(resolveVoiceMinutesView({ walletSec: 5873 + 620, access: 'paid_minutes' }))
      .toEqual({ seconds: 6493, source: 'paid' });
    // Даже если превью ещё думает, что доступ пробный, — кошелёк важнее.
    expect(resolveVoiceMinutesView({ walletSec: 120, access: 'trial' }))
      .toEqual({ seconds: 120, source: 'paid' });
  });

  it('пробник цел → кап пробника (3 мин), а не дневной пул и не ноль кошелька', () => {
    expect(resolveVoiceMinutesView({ walletSec: 0, access: 'trial', sessionCapSec: { scenario: 300, trial: 180, tutor: 600 } }))
      .toEqual({ seconds: 180, source: 'trial' });
    expect(resolveVoiceMinutesView({ walletSec: 0, access: 'trial', dayRemainingSec: 1200 }))
      .toEqual({ seconds: VOICE_TRIAL_CAP_SEC_DEFAULT, source: 'trial' });
  });

  it('пробник сожжён и минут нет → честный ноль', () => {
    expect(resolveVoiceMinutesView({ walletSec: 0, access: 'none' }))
      .toEqual({ seconds: 0, source: 'trial_used' });
  });

  it('доступ неизвестен → null: без бейджа и с прочерком, а не выдуманное число', () => {
    expect(resolveVoiceMinutesView({ walletSec: null, access: null }))
      .toEqual({ seconds: null, source: 'unknown' });
    expect(resolveVoiceMinutesView({ walletSec: 0, access: null }))
      .toEqual({ seconds: null, source: 'unknown' });
  });

  it("устаревший 'admin' от старого сервера/кэша показывает дневной остаток, а не 3 мин", () => {
    expect(resolveVoiceMinutesView({ walletSec: 0, access: 'admin', dayRemainingSec: 1200 }))
      .toEqual({ seconds: 1200, source: 'day_pool' });
    expect(resolveVoiceMinutesView({ walletSec: 0, access: 'admin' }))
      .toEqual({ seconds: null, source: 'unknown' });
  });

  it('платный доступ по серверу при пустом/непрочитанном кошельке — ноль, не пробник', () => {
    expect(resolveVoiceMinutesView({ walletSec: null, access: 'paid_minutes' }))
      .toEqual({ seconds: 0, source: 'paid' });
  });

  it('кошелёк меньше минуты платным не считается', () => {
    expect(resolveVoiceMinutesView({ walletSec: 45, access: 'trial' }))
      .toEqual({ seconds: 180, source: 'trial' });
  });
});

describe('trialCapSecFrom', () => {
  it('число, объект по форматам, мусор → дефолт', () => {
    expect(trialCapSecFrom(240)).toBe(240);
    expect(trialCapSecFrom({ trial: 200 })).toBe(200);
    expect(trialCapSecFrom({ tutor: 600 })).toBe(VOICE_TRIAL_CAP_SEC_DEFAULT);
    expect(trialCapSecFrom('180')).toBe(VOICE_TRIAL_CAP_SEC_DEFAULT);
    expect(trialCapSecFrom(undefined)).toBe(VOICE_TRIAL_CAP_SEC_DEFAULT);
  });
});

describe('voiceMinutesToDisplay', () => {
  it('floor до минут, null пробрасывается', () => {
    expect(voiceMinutesToDisplay({ seconds: 180, source: 'trial' })).toBe(3);
    expect(voiceMinutesToDisplay({ seconds: 119, source: 'paid' })).toBe(1);
    expect(voiceMinutesToDisplay({ seconds: null, source: 'unknown' })).toBeNull();
  });
});
