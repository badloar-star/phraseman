// зачем (Сверка 06.11): `adb shell am start -d "…?a=1&b=2"` теряет всё после «&»; составная ссылка set=a:1,b:2 без «&» задаёт несколько состояний.
import { expandDevStateCompound, parseDevStateParams } from '../app/dev_state_fixtures';

beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
afterEach(() => jest.restoreAllMocks());

describe('dev_state: составная ссылка set=', () => {
  it('раскрывается в обычные пары', () => {
    expect(expandDevStateCompound({ set: 'newbie:1,onboarding:pending,plus:off' })).toMatchObject({ newbie: '1', onboarding: 'pending', plus: 'off' });
  });

  it('явный параметр сильнее раскрытого', () => {
    expect(expandDevStateCompound({ set: 'plus:off,newbie:1', plus: 'on' })).toMatchObject({ plus: 'on', newbie: '1' });
  });

  it('без set ссылка не меняется; мусорные пары пропускаются', () => {
    const plain = { energy: '0' };
    expect(expandDevStateCompound(plain)).toBe(plain);
    expect(expandDevStateCompound({ set: 'bad,:x,newbie:1' })).toEqual({ set: 'bad,:x,newbie:1', newbie: '1' });
  });

  it('parseDevStateParams понимает newbie и onboarding из одной составной ссылки', () => {
    const { request } = parseDevStateParams({ set: 'newbie:1,onboarding:pending,plus:off' });
    expect(request.newbie).toBe('on');
    expect(request.onboarding).toBe('pending');
    expect(request.plus).toBe('off');
  });

  it('newbie=0 и off выключают ключ', () => {
    expect(parseDevStateParams({ newbie: '0' }).request.newbie).toBe('off');
    expect(parseDevStateParams({ set: 'newbie:off' }).request.newbie).toBe('off');
  });
});
