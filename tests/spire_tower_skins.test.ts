// зачем (владелец 13.10: одна башня Оникса в 12 «нарядах»): каркас скинов не меняет прежний вид башни,
// таблица «лига → наряд» одна и совпадает с числом лиг, выбор по tier безопасен для битых значений.
import fs from 'node:fs';
import path from 'node:path';
import {
  SPIRE_DEFAULT_SKIN, SPIRE_LEAGUE_SKINS, SPIRE_LEAGUE_SKINS_ENABLED, spireSkinForTier,
} from '../modules/spire/tower_skins';
import { SPIRE_TIER_COUNT } from '../modules/spire/tier_names';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const svg = read('components/spire/SpireTowerSvg.tsx');
const tower = read('components/spire/SpireTower.tsx');
const home = read('components/spire/SpireHomeScreen.tsx');
const HEX = /^#[0-9A-Fa-f]{6}$/;

describe('наряды башни Шпиля', () => {
  it('таблица лиг — ровно по числу лиг, Оникс (6) без наряда', () => {
    expect(SPIRE_LEAGUE_SKINS).toHaveLength(SPIRE_TIER_COUNT);
    expect(SPIRE_LEAGUE_SKINS[6]).toBeNull();
  });

  it('наряд по умолчанию — прежний вид (цвета перенесены из башни без изменений)', () => {
    expect(SPIRE_DEFAULT_SKIN.cyl).toEqual(['#1F1F23', '#3D3D44', '#5A5A62', '#46464D', '#2C2C31', '#18181B']);
    expect(SPIRE_DEFAULT_SKIN.sky).toEqual(['#101013', '#17171A', '#0E0E10']);
    expect(SPIRE_DEFAULT_SKIN.lit).toBe('#EEF0F6');
    expect(SPIRE_DEFAULT_SKIN.merlonTint).toEqual([0, 0, 5]);
    expect(SPIRE_DEFAULT_SKIN.texture).toBeNull();
    expect(SPIRE_DEFAULT_SKIN.details).toBeNull();
  });

  it('выключатель: пока палитры не приняты, все лиги видят Оникс', () => {
    expect(SPIRE_LEAGUE_SKINS_ENABLED).toBe(false);
    for (let t = 0; t < SPIRE_TIER_COUNT; t += 1) expect(spireSkinForTier(t)).toBe(SPIRE_DEFAULT_SKIN);
  });

  it('при включении: Гранит и Мрамор носят свои наряды, остальные — Оникс; мусор не роняет', () => {
    expect(spireSkinForTier(0, true).id).toBe('granite');
    expect(spireSkinForTier(2, true).id).toBe('marble');
    expect(spireSkinForTier(6, true)).toBe(SPIRE_DEFAULT_SKIN);
    expect(spireSkinForTier(7, true)).toBe(SPIRE_DEFAULT_SKIN);
    expect(spireSkinForTier(null, true)).toBe(SPIRE_DEFAULT_SKIN);
    expect(spireSkinForTier(undefined, true)).toBe(SPIRE_DEFAULT_SKIN);
    expect(spireSkinForTier('x', true).id).toBe('granite'); // clampSpireTierIndex: нечисло → 0
    expect(spireSkinForTier(99, true)).toBe(SPIRE_DEFAULT_SKIN); // 99 → 11 (Алмаз, наряда пока нет)
  });

  it('все цвета в нарядах — валидный hex, стабильная ссылка (memo по лиге)', () => {
    for (const sk of [SPIRE_DEFAULT_SKIN, ...SPIRE_LEAGUE_SKINS.filter((x): x is NonNullable<typeof x> => x !== null)]) {
      for (const c of [...sk.cyl, ...sk.cylG, ...sk.corn, ...sk.cone, ...sk.sky, sk.lit, sk.glow]) expect(c).toMatch(HEX);
      expect(Object.isFrozen(sk)).toBe(true);
    }
    expect(spireSkinForTier(0, true)).toBe(spireSkinForTier(0, true));
  });

  it('башня красится из skin, а не из зашитых цветов; число узлов от skin не зависит', () => {
    expect(svg).toContain('skin = SPIRE_DEFAULT_SKIN');
    for (const piece of ['skin.cyl[0]', 'skin.cylG[5]', 'skin.corn[3]', 'skin.cone[3]', 'skin.sky[2]', 'stopColor={skin.glow}', 'lit={skin.lit}', 'tint={skin.merlonTint}']) {
      expect(svg).toContain(piece);
    }
    expect(svg).not.toContain('#3D3D44'); // старые зашитые стопы ушли в SPIRE_DEFAULT_SKIN
    expect(svg).not.toContain('filter='); // blur на кладке запрещён
  });

  it('экран Шпиля передаёт лигу игрока в башню, SpireTower выбирает наряд мемо по tier', () => {
    expect(home).toContain('tier={game.tier ?? week?.tier ?? null}');
    expect(tower).toContain('const skin = useMemo(() => spireSkinForTier(tier), [tier]);');
    expect(tower).toContain('skin={skin}');
  });
});
