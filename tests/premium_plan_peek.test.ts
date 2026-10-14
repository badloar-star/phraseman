// зачем: в jest DeviceEventEmitter из react-native — пустая заглушка, emitAppEvent никого не будит. Подменяем модуль событий
// живой минимальной шиной с тем же API, чтобы проверить настоящую подписку premium_plan_peek на premium_deactivated.
jest.mock('../app/events', () => {
  const handlers = new Map<string, Set<(payload?: unknown) => void>>();
  return {
    onAppEvent: (event: string, handler: (payload?: unknown) => void) => {
      const set = handlers.get(event) ?? new Set();
      set.add(handler);
      handlers.set(event, set);
      return { remove: () => { set.delete(handler); } };
    },
    emitAppEvent: (event: string, payload?: unknown) => {
      for (const handler of [...(handlers.get(event) ?? [])]) handler(payload);
    },
  };
});

import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import { emitAppEvent } from '../app/events';
import {
  __resetPremiumPlanPeekForTests,
  forgetPremiumPlan,
  peekPremiumPlan,
  rememberPremiumPlan,
} from '../app/premium_plan_peek';

// зачем (PM-214, координатор 13.10): экран «Подписка Plus» без ?plan= берёт план из памяти на первом кадре. Память обязана
// отдавать план только текущему аккаунту и не затираться пустым значением, иначе первый кадр покажет чужой или «никакой» план.
describe('premium plan peek (first frame of «Подписка Plus»)', () => {
  beforeEach(() => {
    __resetAccountGenerationForTests();
    __resetPremiumPlanPeekForTests();
  });

  it('returns the remembered plan for the same account generation, without IO', () => {
    beginAccountGeneration('stable-a');
    expect(peekPremiumPlan()).toBeNull();
    rememberPremiumPlan(' Yearly ', 'phraseman_plus_yearly', 'rc_persist');
    expect(peekPremiumPlan()).toMatchObject({ plan: 'yearly', productId: 'phraseman_plus_yearly', source: 'rc_persist' });
  });

  it('forgets the plan after an account switch (another generation)', () => {
    beginAccountGeneration('stable-a');
    rememberPremiumPlan('monthly', null, 'guard_refresh');
    beginAccountGeneration('stable-b');
    expect(peekPremiumPlan()).toBeNull();
  });

  it('does not overwrite a known plan with an empty value', () => {
    beginAccountGeneration('stable-a');
    rememberPremiumPlan('lifetime', null, 'manage_local');
    rememberPremiumPlan('', null, 'manage_local');
    rememberPremiumPlan(null, null, 'manage_local');
    expect(peekPremiumPlan()?.plan).toBe('lifetime');
  });

  // зачем (замечание Ядра к eac42c3e0, координатор 13.10): подписка кончилась в том же процессе — первый кадр не должен
  // показывать «Plus». Подтверждённое «нет» пишется в память, peek отдаёт null → прежний скелет.
  it('plan existed → subscription expired → first frame has no plan', () => {
    beginAccountGeneration('stable-a');
    rememberPremiumPlan('yearly', 'phraseman_plus_yearly', 'rc_persist');
    expect(peekPremiumPlan()?.plan).toBe('yearly');
    emitAppEvent('premium_deactivated');
    expect(peekPremiumPlan()).toBeNull();
  });

  it('a storage read (weak source) does not bring the old plan back over a confirmed «none»', () => {
    beginAccountGeneration('stable-a');
    rememberPremiumPlan('monthly', null, 'guard_refresh');
    forgetPremiumPlan('premium_deactivated');
    // premium_plan в хранилище после окончания подписки остаётся — экран читает его и пытается запомнить
    rememberPremiumPlan('monthly', null, 'manage_local');
    expect(peekPremiumPlan()).toBeNull();
  });

  it('a confirmed purchase (strong source) replaces «none» again', () => {
    beginAccountGeneration('stable-a');
    forgetPremiumPlan('premium_deactivated');
    rememberPremiumPlan('yearly', 'phraseman_plus_yearly', 'rc_persist');
    expect(peekPremiumPlan()?.plan).toBe('yearly');
  });

  it('«none» of a previous account does not block a weak read on the new account', () => {
    beginAccountGeneration('stable-a');
    forgetPremiumPlan('premium_deactivated');
    beginAccountGeneration('stable-b');
    rememberPremiumPlan('lifetime', null, 'manage_local');
    expect(peekPremiumPlan()?.plan).toBe('lifetime');
  });
});
