// зачем (координатор 11.10, робот-съёмка): phraseman://dev_state?… выставляет состояния для Maestro. Сторож держит
// формат ссылки и то, что маршрута нет в стор-сборке.
jest.mock('../app/dev_energy_tools', () => ({ devSetEnergy: jest.fn(async () => true), setDevEnergyModeOverride: jest.fn(async () => true) }));
jest.mock('../app/dev_plus_controls', () => ({ setDevLocalPlusOverride: jest.fn(async () => undefined) }));
jest.mock('../app/dev_as_free_flag', () => ({ setDevAsFreeFlag: jest.fn(async () => true) }));
jest.mock('../app/stable_id', () => ({ getStableId: jest.fn(async () => 'stable-1') }));
jest.mock('../app/spire_tab_flag', () => ({ setSpireTabDevOverride: jest.fn(async () => undefined) }));
jest.mock('../app/spire_gate_refresh', () => ({ forceRefreshSpireGatesNow: jest.fn(async () => ({ tab: true, config: true })) }));

/* eslint-disable import/first */
import fs from 'node:fs';
import path from 'node:path';
import { parseDevStateParams } from '../app/dev_state_fixtures';

describe('dev_state: разбор ссылки', () => {
  test('все поддержанные параметры', () => {
    const { request, rejected } = parseDevStateParams({
      energy: '0', mode: 'B', plus: 'off', spire: 'open', onboarding: 'done', free: 'on', next: '/(tabs)/home',
    });
    expect(request).toEqual({ energy: 0, mode: 'b', plus: 'off', spire: 'open', onboarding: 'done', free: 'on', next: '/(tabs)/home' });
    expect(rejected).toEqual({});
  });
  test('мусор отбрасывается с причиной, остальное применяется', () => {
    const { request, rejected } = parseDevStateParams({ energy: '9', mode: 'c', plus: 'on', next: 'home' });
    expect(request.plus).toBe('on');
    expect(request.energy).toBeUndefined();
    expect(Object.keys(rejected).sort()).toEqual(['energy', 'mode', 'next']);
  });
  test('пустые параметры — пустой запрос', () => {
    expect(parseDevStateParams({}).request).toEqual({});
  });
});

describe('dev_state: в стор-сборке маршрута нет', () => {
  test('router.ctx.js вырезает dev_state из стор-ветки', () => {
    const router = fs.readFileSync(path.join(__dirname, '..', 'router.ctx.js'), 'utf8');
    const storeBranch = router.split(': require.context(')[0] ?? '';
    const literal = /\n\s*\/(\^[\s\S]*?)\/,\s*\n/.exec(storeBranch)?.[1] ?? '';
    const storeRegex = new RegExp(literal);
    expect(storeRegex.test('./dev_state.tsx')).toBe(false);
    expect(storeRegex.test('./(tabs)/home.tsx')).toBe(true);
  });
  test('маршрут сам проверяет dev-сборку', () => {
    const route = fs.readFileSync(path.join(__dirname, '..', 'app', 'dev_state.tsx'), 'utf8');
    expect(route).toMatch(/if \(!available\) return <Redirect href="\/" \/>;/);
    const fixtures = fs.readFileSync(path.join(__dirname, '..', 'app', 'dev_state_fixtures.ts'), 'utf8');
    expect(fixtures).toMatch(/__DEV__ === true && !IS_STORE_RELEASE/);
    expect(fixtures).not.toMatch(/@react-native-firebase|httpsCallable\(/);
  });
});
