// зачем (владелец 13.10: одна башня Оникса в 12 премиальных «нарядах», сборка 16.10): таблица «лига → наряд» одна и совпадает с лигами,
// палитры выведены из камня по рецепту спеки (SPIRE_LEAGUE_TOWERS_SPEC.md), выбор по tier безопасен для битых значений,
// башня красится только из skin, dev-подмена лиги не просочится в стор-сборку.
import fs from 'node:fs';
import path from 'node:path';
import {
  SPIRE_DEFAULT_SKIN, SPIRE_LEAGUE_SKINS, SPIRE_LEAGUE_SKINS_ENABLED, SPIRE_LEAGUE_SPECS, mixHex, spireSkinForTier,
} from '../modules/spire/tower_skins';
import { SPIRE_TIER_COUNT, SPIRE_TIER_NAMES } from '../modules/spire/tier_names';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
const svg = read('components/spire/SpireTowerSvg.tsx');
const finial = read('components/spire/SpireTowerFinial.tsx');
const textures = read('components/spire/SpireTowerTextures.tsx');
const tower = read('components/spire/SpireTower.tsx');
const home = read('components/spire/SpireHomeScreen.tsx');
const fixtures = read('app/dev_state_fixtures.ts');
const weekCard = read('components/spire/SpireWeekResultCard.tsx');
const devTier = read('app/dev_spire_tier.ts');
const bundlerConfig = read(['metro', 'config.js'].join('.'));
const HEX = /^#[0-9A-Fa-f]{6}$/;
const lower = (a: readonly string[]) => a.map((c) => c.toLowerCase());

describe('наряды башни Шпиля', () => {
  it('таблица лиг — по числу лиг и в порядке tier_names (id = английское имя лиги)', () => {
    expect(SPIRE_LEAGUE_SKINS).toHaveLength(SPIRE_TIER_COUNT);
    expect(SPIRE_LEAGUE_SPECS.map((s) => s.id)).toEqual(SPIRE_TIER_NAMES.en.map((n) => n.toLowerCase()));
    expect(SPIRE_LEAGUE_SKINS.map((s) => s.id)).toEqual(SPIRE_LEAGUE_SPECS.map((s) => s.id));
  });

  it('наряд по умолчанию — прежний вид башни: без текстуры, блика, металла и деталей', () => {
    expect(SPIRE_DEFAULT_SKIN.premium).toBe(false);
    expect(SPIRE_DEFAULT_SKIN.cyl).toEqual(['#1F1F23', '#3D3D44', '#5A5A62', '#46464D', '#2C2C31', '#18181B']);
    expect(SPIRE_DEFAULT_SKIN.sky).toEqual(['#101013', '#17171A', '#0E0E10']);
    expect(SPIRE_DEFAULT_SKIN.lit).toBe('#EEF0F6');
    expect(SPIRE_DEFAULT_SKIN.glowR).toBe(34);
    expect([SPIRE_DEFAULT_SKIN.tex, SPIRE_DEFAULT_SKIN.rim, SPIRE_DEFAULT_SKIN.finial, SPIRE_DEFAULT_SKIN.pennant]).toEqual([null, 'none', 'plain', null]);
    // зубцы Стража: прежняя формула rgb(c, c, c+5), c = 66 + 44·свет
    expect(mixHex(SPIRE_DEFAULT_SKIN.merlonLo, SPIRE_DEFAULT_SKIN.merlonHi, 0)).toBe('#424247');
    expect(mixHex(SPIRE_DEFAULT_SKIN.merlonLo, SPIRE_DEFAULT_SKIN.merlonHi, 1)).toBe('#6e6e73');
  });

  it('выбор по лиге: tier 0..11 → свой наряд; нет лиги, мусор или выключатель → прежний Оникс; вне диапазона прижимается', () => {
    expect(SPIRE_LEAGUE_SKINS_ENABLED).toBe(true);
    expect(spireSkinForTier(0).id).toBe('granite');
    expect(spireSkinForTier(6).id).toBe('onyx');
    expect(spireSkinForTier(6).premium).toBe(true);
    expect(spireSkinForTier(11).id).toBe('diamond');
    expect(spireSkinForTier(99).id).toBe('diamond');
    expect(spireSkinForTier(-3).id).toBe('granite');
    for (const bad of [null, undefined, 'x', Number.NaN, {}]) expect(spireSkinForTier(bad)).toBe(SPIRE_DEFAULT_SKIN);
    expect(spireSkinForTier(2, false)).toBe(SPIRE_DEFAULT_SKIN);
    expect(spireSkinForTier(2)).toBe(spireSkinForTier(2)); // стабильная ссылка — memo башни не просыпается зря
  });

  it('палитра цилиндра выведена из камня ровно по таблице спеки (6 стопов)', () => {
    const spec: Record<string, string> = {
      granite: '#1a1a1c #35363a #55575E #414247 #26272a #131315',
      marble: '#65625d #98938c #D4CEC4 #aea9a1 #7d7973 #585551',
      onyx: '#0d0d0f #1b1b20 #2C2C33 #212127 #141417 #0a0a0b',
      obsidian: '#08080a #111014 #1C1A20 #151418 #0d0c0e #060607',
      diamond: '#1c232e #39495e #5C7698 #465a74 #293544 #141a21',
    };
    for (const [id, stops] of Object.entries(spec)) {
      const skin = SPIRE_LEAGUE_SKINS.find((s) => s.id === id);
      expect(lower(skin?.cyl ?? [])).toEqual(lower(stops.split(' ')));
    }
  });

  it('все цвета валидный hex, объекты заморожены; у каждой лиги текстура, блик, металл и навершие', () => {
    for (const sk of [SPIRE_DEFAULT_SKIN, ...SPIRE_LEAGUE_SKINS]) {
      for (const c of [...sk.cyl, ...sk.cylG, ...sk.corn, ...sk.cone, ...sk.sky, ...sk.ground, sk.lit, sk.glow, sk.edge, sk.metal, sk.gem, sk.winPast, sk.winDark, sk.winSill, sk.merlonLo, sk.merlonHi]) expect(c).toMatch(HEX);
      expect(Object.isFrozen(sk)).toBe(true);
    }
    for (const sk of SPIRE_LEAGUE_SKINS) {
      expect(sk.premium).toBe(true);
      expect(sk.tex).not.toBeNull();
      expect(sk.rim).not.toBe('none');
      expect(sk.finial).not.toBe('plain');
      expect(sk.spec).toBeGreaterThan(0);
      expect(sk.spec).toBeLessThanOrEqual(1);
    }
    expect(new Set(SPIRE_LEAGUE_SKINS.map((s) => s.tex)).size).toBe(SPIRE_TIER_COUNT); // 12 разных материалов
  });

  it('светлый камень (Мрамор, Опал) красится мягче: швы и тень светлее, чем у тёмного', () => {
    expect(spireSkinForTier(2).light).toBe(true);
    expect(spireSkinForTier(8).light).toBe(true);
    expect(spireSkinForTier(6).light).toBe(false);
    expect(spireSkinForTier(2).seam).toBeLessThan(spireSkinForTier(6).seam);
    expect(spireSkinForTier(2).underTop).toBeLessThan(spireSkinForTier(6).underTop);
  });

  it('нет стержня между навершием и крышей (приёмка Макетов SK1): древко только у флаговых лиг и только выше навершия', () => {
    expect(svg).not.toContain('y1={apex + 4}'); // прежний стержень от острия до флага
    expect(svg).toContain('skin.pennant && poleBase > poleTop');
    expect(svg).toContain('spireFinialTopY(skin.finial, apex - 16, big)');
    expect(finial).toContain('export function spireFinialTopY');
  });

  it('башня красится из skin и по рецепту спеки: один Pattern, отлив и ободки одним узлом, без фильтров', () => {
    for (const piece of ['skin = SPIRE_DEFAULT_SKIN', 'stopColor={skin.cyl[i]}', 'stopColor={skin.cylG[i]}', 'stopColor={skin.corn[i]}', 'stopColor={skin.cone[i]}',
      'skin.sky[2]', 'skin.ground[1]', 'id="spireGloss"', 'id="spireMetal"', 'url(#spireGloss)', 'skinTextureDefs(skin.tex)', 'skin.rim === \'full\' ? <CornRims />',
      'skin.glowR * 2.6', '<SpireTowerFinial', 'skin.pennant']) {
      expect(svg).toContain(piece);
    }
    expect(svg).not.toContain('#3D3D44'); // старые зашитые стопы ушли в SPIRE_DEFAULT_SKIN
    for (const src of [svg, finial, textures]) {
      expect(src).not.toMatch(/sfilter=|<Filter|<FeGaussianBlur/); // комментарий про замену feGaussianBlur градиентами не в счёт — ищем настоящие теги
      expect(src).not.toMatch(/\bBlurView\b/);
    }
    expect(textures.match(/<Pattern /g)?.length).toBe(1); // создаётся ровно один Pattern (внутри функции)
    expect(textures).toContain('patternUnits="userSpaceOnUse"');
  });

  it('экран Шпиля передаёт лигу в башню; SpireTower выбирает наряд мемо по лиге, с dev-подменой для Сверки', () => {
    expect(home).toContain('tier={game.tier ?? week?.tier ?? null}');
    expect(tower).toContain('getDevSpireTierOverride()');
    expect(tower).toContain('const skin = useMemo(() => spireSkinForTier(devTier ?? tier), [devTier, tier]);');
    expect(tower).toContain('skin={skin}');
  });

  it('dev-подмена лиги: параметр ссылки, заглушка в стор-сборке, только __DEV__', () => {
    expect(fixtures).toContain("spireTier?: number | 'off';");
    expect(fixtures).toContain("import('./dev_spire_tier')");
    expect(bundlerConfig).toContain("'dev_spire_tier'");
    expect(devTier).toContain('__DEV__ === true && !IS_STORE_RELEASE');
    const stub = read('store_release_stubs/dev_state/dev_spire_tier_stub.ts');
    expect(stub).toContain('export function setDevSpireTierOverride(): boolean { return false; }');
    expect(stub).toContain('export function getDevSpireTierOverride(): null { return null; }');
  });

  it('«Итог недели»: слева верхушка башни лиги НОВОЙ недели, монета ранга — значок 26 с кольцом цвета карточки (макет Макетов 13.10)', () => {
    expect(weekCard).toContain('variant="weekTop"');
    expect(weekCard).toContain('spireSkinForTier(result.newTier)');
    expect(weekCard).toContain('result.promoted ? SPIRE_FLOOR_COUNT : 1'); // повышение — вершина недели, иначе окна тёмные
    for (const piece of ['const TOWER_W = 58;', 'const TOWER_H = 103;', 'const COIN = 26;', 'const COIN_RING = 3;', 'size={COIN}', 'backgroundColor: p.cardRaised']) {
      expect(weekCard).toContain(piece);
    }
    expect(weekCard).not.toContain('size={52}'); // прежней монеты 52 нет
    expect(weekCard).toContain('testID="spire-week-result-pop"'); // выпрыгивание переехало на блок башни, а не пропало
    expect(weekCard).toContain('useMemo(() => spireSkinForTier(result.newTier), [result.newTier])');
    // мини-башня: узкий viewBox образца, без неба, земли и маркера, края — маска внутри SVG
    expect(svg).toContain("variant === 'weekTop'");
    expect(svg).toContain('geom.top - 236');
    expect(svg).toContain('WEEK_TOP_W = 192');
    expect(svg).toContain('WEEK_TOP_H = 342');
    expect(svg).toContain('<Mask id="spireWeekFade"');
    expect(svg).toContain('rx="0.72" ry="0.62"');
  });
});
