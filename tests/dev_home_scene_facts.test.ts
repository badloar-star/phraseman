// зачем (координатор 25.10, «приложение = макет» на настоящем экране): dev_state?homefacts=<герой> подставляет на БОЕВОЙ Главной факты
// эталона (часы, разрыв заходов, история дней, прогресс урока). Энергия, Plus и сеть остаются настоящими. Сторож:
// - имена героев — те же, что у pickHomeSceneState;
// - для 6 героев, которых тестовый аккаунт честно не даёт, факты эталона с энергией и сетью аккаунта дают ровно этого героя;
// - подмена только в памяти;
// - HomeScene подключает её до решения и гасит на время подмены особые сцены;
// - ссылка разбирается dev_state.
import fs from 'fs';
import path from 'path';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(async () => null), setItem: jest.fn(async () => undefined), removeItem: jest.fn(async () => undefined), multiSet: jest.fn(async () => undefined), multiGet: jest.fn(async () => []), multiRemove: jest.fn(async () => undefined) },
}));

import { DEV_HOME_SCENE_FACT_STATES, getDevHomeSceneFacts, setDevHomeSceneFacts } from '../app/dev_home_scene_facts';
import { parseDevStateParams } from '../app/dev_state_fixtures';
import { homeScenePreviewSetup } from '../components/home/v2/scene/home_scene_preview_fixtures';
import { HOME_SCENE_STATES, pickHomeSceneState } from '../components/home/v2/scene/home_scene_state';

const LIVE_HOME_ONLY = ['streak_risk', 'day_done', 'exam_ready', 'streak_lost', 'welcome_back', 'all_done'] as const;

describe('dev-подмена фактов «Сцены» на боевой Главной', () => {
  // зачем: подмена работает только в dev-сборке (__DEV__ && !IS_STORE_RELEASE); в jest __DEV__ не задан
  beforeAll(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = true; });
  afterEach(() => { setDevHomeSceneFacts(null); });

  it('имена героев те же, что у функции выбора', () => {
    expect([...DEV_HOME_SCENE_FACT_STATES]).toEqual([...HOME_SCENE_STATES]);
  });

  it.each(LIVE_HOME_ONLY)('%s: факты эталона с энергией 5 и сетью аккаунта дают ровно этого героя', (state) => {
    const setup = homeScenePreviewSetup(state, false);
    // как в HomeScene: факты сцены — из эталона, энергия/Plus/сеть — настоящие
    const decision = pickHomeSceneState({ ...setup.input, plus: false, energy: 5, offline: false });
    expect(decision.state).toBe(state);
  });

  it('подмена только в памяти: задать → прочитать → снять', () => {
    expect(getDevHomeSceneFacts()).toBeNull();
    expect(setDevHomeSceneFacts('welcome_back')).toBe(true);
    expect(getDevHomeSceneFacts()).toBe('welcome_back');
    expect(setDevHomeSceneFacts(null)).toBe(true);
    expect(getDevHomeSceneFacts()).toBeNull();
  });

  it('dev_state разбирает homefacts=<герой>|off и отвергает чужое', () => {
    expect(parseDevStateParams({ homefacts: 'streak_lost' }).request.homefacts).toBe('streak_lost');
    expect(parseDevStateParams({ homefacts: 'off' }).request.homefacts).toBe('off');
    expect(parseDevStateParams({ homefacts: 'nope' }).rejected.homefacts).toBeTruthy();
  });

  it('HomeScene: подмена входа до решения, особые сцены выключены на время подмены, «до полуночи» — из эталона', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'components/home/v2/scene/HomeScene.tsx'), 'utf8');
    expect(src).toContain('useSyncExternalStore(subscribeDevHomeSceneFacts, getDevHomeSceneFacts, getDevHomeSceneFacts)');
    expect(src).toContain('? { ...devSetup.input, plus: p.plus, energy: p.energy, offline }');
    expect(src).toContain('const special = devSetup ? null : specialLive;');
    expect(src).toContain('minutesToMidnight={devSetup?.minutesToMidnight}');
    expect(src).toContain("console.log('[DEV-HOME-FACTS] applied'");
    // моки эталона грузятся лениво — только при подмене
    expect(src).not.toMatch(/^import \{[^}]*homeScenePreviewSetup[^}]*\} from '\.\/home_scene_preview_fixtures'/m);
  });
});
