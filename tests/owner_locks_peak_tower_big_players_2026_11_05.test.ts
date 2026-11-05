// Governance-ID: TG-59579F3AB225
// ЗАМОК ВЛАДЕЛЬЦА 05.11 07:4x (скрин эмулятора 14_peak_tower_small_emulator_0737): «башню сделать больше по возможности и опустить вниз». Реестр docs/work/OWNER_LOCKS.md, строки 05.11.
// Часть замка «на башне показывать иконки юзеров» (07:38) ОТМЕНЕНА словом владельца ~19:12 («с башни убирай иконки юзеров, не надо они там») — см. tests/owner_locks_peak_no_tower_icons_2026_11_05.test.ts.
// Остаётся замок на размер и посадку башни. Ослабить можно только по новому слову владельца: правка файла + реестра + KNOWN_GUARDS в tests/owner_locks_registry.test.cjs.
import { peakTowerFit, PEAK_TOWER_BODY_UNITS } from '../components/spire/peak/peak_tower_fit';
import { SPIRE_TOWER_GEOM } from '../components/spire/spire_tower_model';
import { readSource } from './helpers/read_source';

const code = (rel: string): string => readSource(rel).split(/\r?\n/).filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n').replace(/\/\/[^\n]*/g, '');
const HEADROOM = 300;

describe('ЗАМОК ВЛАДЕЛЬЦА 05.11 — башня Пика крупная, основание внизу', () => {
  it('башня занимает почти всю высоту колонки (корона → основание), на 412×915 и 375×667', () => {
    for (const [railW, railH] of [[128, 640], [116, 480], [112, 420]] as const) {
      const fit = peakTowerFit({ railWidth: railW, railHeight: railH, headroomUnits: HEADROOM });
      expect(`${railW}x${railH}: ${fit.heightShare >= 0.95}`).toBe(`${railW}x${railH}: true`);
      // тело нижнего этажа помещается в колонку
      expect(PEAK_TOWER_BODY_UNITS * fit.scale).toBeLessThanOrEqual(railW + 0.5);
    }
  });

  it('башня крупнее прежней (масштаб по ширине 31 % экрана давал ≈0,33): на 412×915 не меньше 0,5', () => {
    expect(peakTowerFit({ railWidth: 128, railHeight: 640, headroomUnits: HEADROOM }).scale).toBeGreaterThanOrEqual(0.5);
  });

  it('основание опущено вниз: рисунок уходит за низ колонки на долю нижнего поля, по горизонтали центрируется на колонке', () => {
    const fit = peakTowerFit({ railWidth: 128, railHeight: 640, headroomUnits: HEADROOM });
    expect(fit.sinkDown).toBeGreaterThan(0);
    expect(fit.sinkDown).toBeLessThanOrEqual(Math.round((SPIRE_TOWER_GEOM.height - SPIRE_TOWER_GEOM.base) * fit.scale));
    expect(fit.offsetLeft).toBeCloseTo(-(fit.width - 128) / 2, 5);
  });

  it('экран Пика B: масштаб башни — от высоты колонки, башня в цветах темы, прежние запреты на месте', () => {
    const src = code('components/spire/peak/PeakScreenV2.tsx');
    expect(src).toContain('windowHeight={towerFit.height}');
    expect(src).toContain('themeColors={towerTheme}'); // башня — в цветах темы экрана, не серая на светлом (Макеты 05.11)
    expect(src).toContain('bottom: -towerFit.sinkDown');
    // запреты: без цифр этажей слева и без «+N» (rivalsByFloor самой башне не передаём); иконок игроков на башне нет (19:12)
    expect(src).toContain('hideFloorWords rivalsByFloor={undefined}');
  });
});
