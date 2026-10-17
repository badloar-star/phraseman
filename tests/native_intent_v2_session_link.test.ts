// зачем (координатор 17.10, [V2-HANDOFF]): внешняя ссылка прямо в занятие V2 идёт мимо карты. Неканонический id давал «Сессия недоступна» —
// теперь ведёт на карту курса; канонический id пропускается к плееру (он строит локатор из id). Строка журнала — на каждый такой вход.
jest.mock('../app/initial_deep_link_store', () => ({ rememberInitialDeepLinkTarget: jest.fn() }));
jest.mock('../app/learning_v2_visibility_switch', () => ({
  LEARNING_V2_HIDDEN_REDIRECT: '/home',
  isLearningV2Hidden: () => false,
  logLearningV2Hidden: jest.fn(),
}));

/* eslint-disable import/first */
import { redirectSystemPath } from '../app/+native-intent';
/* eslint-enable import/first */

describe('[V2-HANDOFF] внешняя ссылка в занятие V2 (не стор-сборка)', () => {
  const prev = process.env.EXPO_PUBLIC_STORE_RELEASE;
  beforeAll(() => { delete process.env.EXPO_PUBLIC_STORE_RELEASE; });
  afterAll(() => { process.env.EXPO_PUBLIC_STORE_RELEASE = prev; });
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('неканонический id → карта курса, а не «Сессия недоступна»', () => {
    expect(redirectSystemPath({ path: '/learning-v2/session/en-l01-s01', initial: true })).toBe('/learning-v2/course');
  });

  it('канонический id пропускается к плееру', () => {
    const out = redirectSystemPath({ path: '/learning-v2/session/lesson-01:session:07', initial: false });
    expect(out).toContain('/learning-v2/session/lesson-01:session:07');
  });

  it('журнал [V2-HANDOFF] deep_link с решением', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    redirectSystemPath({ path: '/learning-v2/session/en-l01-s01', initial: true });
    expect(spy.mock.calls.some((c) => c[0] === '[V2-HANDOFF] deep_link' && String(c[1]).includes('"action":"course_map"'))).toBe(true);
  });
});
