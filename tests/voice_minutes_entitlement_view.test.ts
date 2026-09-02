// зачем (владелец 2026-09-02, скрин: Главная «20м», раздел уроков «0 минут» на
// одном аккаунте): цифру минут считали два экрана двумя способами. Теперь —
// одна чистая функция; этот сторож фиксирует правило владельца «3 минуты для
// всех, кто не купил, и точное число, а не рандом».
import {
  preferFreshAccess,
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

  // зачем (ревью 2026-09-02): раньше здесь возвращался ноль — платящий на
  // Главной (кошелёк там не читают) видел красный «0м» вместо своего остатка,
  // хотя сервер прислал его в том же ответе.
  it('платный доступ без прочитанного кошелька берёт остаток от сервера, а не ноль', () => {
    expect(resolveVoiceMinutesView({ walletSec: null, access: 'paid_minutes', dayRemainingSec: 5893 }))
      .toEqual({ seconds: 5893, source: 'paid' });
  });

  it('платный доступ без кошелька И без ответа сервера — прочерк, НЕ ноль', () => {
    expect(resolveVoiceMinutesView({ walletSec: null, access: 'paid_minutes' }))
      .toEqual({ seconds: null, source: 'unknown' });
  });

  it('кошелёк меньше минуты платным не считается', () => {
    expect(resolveVoiceMinutesView({ walletSec: 45, access: 'trial' }))
      .toEqual({ seconds: 180, source: 'trial' });
  });

  // зачем (ревью 2026-09-02): сиротский резерв 620с давал кошелёк
  // available=0/reserved=620. Клиент по сумме считал доступ платным и обещал
  // «10 минут», а сервер (он смотрит available) отдавал пробник или пейвол.
  it('платность решает available, показ — сумма с резервом', () => {
    // Висит сиротский резерв: сервер платным этот доступ НЕ считает.
    expect(resolveVoiceMinutesView({ walletSec: 620, walletAvailableSec: 0, access: 'trial' }))
      .toEqual({ seconds: 180, source: 'trial' });
    // Живой звонок платящего: available 5873 + резерв 620 → показываем сумму.
    expect(resolveVoiceMinutesView({ walletSec: 6493, walletAvailableSec: 5873, access: 'paid_minutes' }))
      .toEqual({ seconds: 6493, source: 'paid' });
  });
});

// зачем (ревью 2026-09-02): у сожжённого пробника рефреш превью ВСЕГДА падает
// (voice_max_required), и в кэше навсегда остаётся 'trial' — бейдж показывал
// «3м» там, где минут нет.
describe('preferFreshAccess — свежий вердикт сервера сильнее устаревшего кэша', () => {
  it("подтверждённый 'none' перебивает устаревший 'trial' из превью", () => {
    expect(preferFreshAccess('trial', 'none')).toBe('none');
  });

  it("купленные минуты из peek перебивают устаревший 'trial'", () => {
    expect(preferFreshAccess('trial', 'paid_minutes')).toBe('paid_minutes');
  });

  it('в остальных случаях превью ведёт, peek — запасной', () => {
    expect(preferFreshAccess('trial', null)).toBe('trial');
    expect(preferFreshAccess(null, 'trial')).toBe('trial');
    expect(preferFreshAccess('paid_minutes', 'trial')).toBe('paid_minutes');
    expect(preferFreshAccess(null, null)).toBeNull();
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
