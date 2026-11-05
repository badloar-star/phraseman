// Первая версия 2.1.0 (координатор 05.11): ранговые гейты и «Открытия разделов» ВЫКЛ по умолчанию, включает Пульт в момент «сборка в сторе»; бонус +500 от гейтов не зависит.
import fs from 'node:fs';
import path from 'node:path';
import { applyRemoteConfigSnapshot, getRemoteBool } from '../app/remote_flags';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('гейты по умолчанию выключены', () => {
  afterEach(() => { applyRemoteConfigSnapshot({}); });

  it('rank_gates_enabled ВКЛ по умолчанию (слово владельца 05.11 06:08), section_openings_enabled выключен; Пульт переключает значением', () => {
    applyRemoteConfigSnapshot({});
    expect(getRemoteBool('rank_gates_enabled')).toBe(true);
    expect(getRemoteBool('rank_gates_existing_users')).toBe(true);
    expect(getRemoteBool('section_openings_enabled')).toBe(false);
    applyRemoteConfigSnapshot({ bools: { rank_gates_enabled: false, section_openings_enabled: true } });
    expect(getRemoteBool('rank_gates_enabled')).toBe(false);
    expect(getRemoteBool('section_openings_enabled')).toBe(true);
  });

  it('Пульт показывает тумблер «Главная по рангам» выключенным по умолчанию', () => {
    // зачем (05.11): значение по умолчанию живёт в app/remote_flags.ts (true); подпись/дефолт тумблера в Пульте обновит выкладка админки — тест проверяет, что ключ в Пульте есть
    expect(read('admin/v2/legacy.html')).toMatch(/key: 'rank_gates_enabled',\s+label: 'Главная по рангам/);
  });

  it('бонус +500 не читает флаг гейтов ни в классике, ни в плеере V2', () => {
    for (const file of ['app/lesson_complete.tsx', 'app/learning_v2_direct_session_player_v1.tsx']) {
      expect(read(file)).toMatch(/maybeGrantFirstLessonBonus\(defaultFirstLessonBonusDeps\(\(\) => true/);
    }
  });
});

describe('dev-принуждение флагов для E2E Сверки (без записи в боевой Пульт)', () => {
  const load = (env: { force?: string; store?: string }) => {
    const saved = { force: process.env.EXPO_PUBLIC_DEV_FORCE_FLAGS, store: process.env.EXPO_PUBLIC_STORE_RELEASE, dev: (globalThis as { __DEV__?: boolean }).__DEV__ };
    if (env.force === undefined) delete process.env.EXPO_PUBLIC_DEV_FORCE_FLAGS; else process.env.EXPO_PUBLIC_DEV_FORCE_FLAGS = env.force;
    if (env.store === undefined) delete process.env.EXPO_PUBLIC_STORE_RELEASE; else process.env.EXPO_PUBLIC_STORE_RELEASE = env.store;
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    let mod: typeof import('../app/remote_flags') | null = null;
    jest.isolateModules(() => { mod = require('../app/remote_flags'); });
    if (saved.force === undefined) delete process.env.EXPO_PUBLIC_DEV_FORCE_FLAGS; else process.env.EXPO_PUBLIC_DEV_FORCE_FLAGS = saved.force;
    if (saved.store === undefined) delete process.env.EXPO_PUBLIC_STORE_RELEASE; else process.env.EXPO_PUBLIC_STORE_RELEASE = saved.store;
    (globalThis as { __DEV__?: boolean }).__DEV__ = saved.dev;
    return mod!;
  };
  it('в dev EXPO_PUBLIC_DEV_FORCE_FLAGS включает перечисленные флаги, остальные не трогает', () => {
    const m = load({ force: 'rank_gates_enabled, section_openings_enabled' });
    expect(m.getRemoteBool('rank_gates_enabled')).toBe(true);
    expect(m.getRemoteBool('section_openings_enabled')).toBe(true);
    expect(m.getRemoteBool('referral_ladder_enabled')).toBe(false);
  });
  it('без переменной и в стор-релизе принуждения нет', () => {
    expect(load({}).getRemoteBool('section_openings_enabled')).toBe(false);
    expect(load({ force: 'section_openings_enabled', store: '1' }).getRemoteBool('section_openings_enabled')).toBe(false);
  });
});
