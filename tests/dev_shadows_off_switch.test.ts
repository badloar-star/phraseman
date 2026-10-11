// зачем (координатор 14.10, гипотеза падения qemu на размытых тенях): dev_state?shadows=off гасит все boxShadow «Тени» в памяти процесса.
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  actionShadowStyle, isDevShadowsOff, nestedShadowStyle, plateShadowStyle, raisedShadowStyle, setDevShadowsOff,
} from '../constants/liquidGlassShadowStyle';
import { parseDevStateParams } from '../app/dev_state_fixtures';

const g = {
  isLight: true, accent: '#4F8CFF', plateFillFrom: '#fff', plateFillTo: '#eee', raisedFillFrom: '#fff', raisedFillTo: '#eee',
  plateShadow: '#0003', plateShadowSoft: '#0001', nestedShadow: '#0002', raisedShadow: '#0004', raisedShadowSoft: '#0001',
} as const;

describe('dev-рубильник теней', () => {
  beforeAll(() => { (globalThis as { __DEV__?: boolean }).__DEV__ = true; });
  afterEach(() => { setDevShadowsOff(false); });

  it('по умолчанию тени есть, off гасит все четыре функции, on возвращает', () => {
    expect(isDevShadowsOff()).toBe(false);
    expect(plateShadowStyle(g).length).toBeGreaterThan(0);
    expect(setDevShadowsOff(true)).toBe(true);
    expect([plateShadowStyle(g), nestedShadowStyle(g), raisedShadowStyle(g), actionShadowStyle(g)].map((l) => l.length)).toEqual([0, 0, 0, 0]);
    expect(setDevShadowsOff(false)).toBe(true);
    expect(nestedShadowStyle(g).length).toBe(1);
    expect(actionShadowStyle(g).length).toBe(1);
  });

  it('ссылка dev_state?shadows=: off/on разбираются, мусор отбрасывается с причиной', () => {
    expect(parseDevStateParams({ shadows: 'off' }).request.shadows).toBe('off');
    expect(parseDevStateParams({ shadows: '1' }).request.shadows).toBe('on');
    const bad = parseDevStateParams({ shadows: 'blur' });
    expect(bad.request.shadows).toBeUndefined();
    expect(Object.keys(bad.rejected)).toEqual(['shadows']);
  });

  it('сеттер срабатывает только в dev-сборке и пишет [SHADOW-OFF]', () => {
    const src = readFileSync(join(__dirname, '..', 'constants', 'liquidGlassShadowStyle.ts'), 'utf8');
    expect(src).toMatch(/__DEV__ !== true/);
    expect(src).toMatch(/\[SHADOW-OFF\]/);
  });
});
