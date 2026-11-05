/**
 * Замки владельца на ЖИВОЙ экран Пика B (Ревизор, 05.11.2026; инцидент: Пик B обошёл замки, потому что старые сторожи читают
 * SpireScene / SpireScenePedestal, а в сборке (PEAK_SCREEN_V2_ENABLED = true) рисуются PeakScreenV2 → PeakTopRow / PeakMyCounter / SpireTower…).
 *
 * зачем: сторож смотрит на то, что реально рисуется. Слова про «ступени» уже держит owner_locks_peak_coins_only_2026_11_05 (Дизайн/Моменты) —
 * здесь НЕ дублируются. Здесь: состав живого дерева Пика B, обводки, ник целиком с переносом (замок 22.10 №39 «ник полностью»),
 * монеты на башне (№41/№67 — башня B та же SpireTower, что у старых сторожей) и замок 05.11 №90 «цифры этажей слева — убрать»
 * (башня в B в режиме «scene»: подписи этажей и слова зон скрыты). Реестр покрытия — docs/work/release/OWNER_LOCKS_COVERAGE_2026-11-05.md.
 */
import * as fs from 'fs';
import * as path from 'path';

const read = (rel: string): string => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');
/** Код без комментариев (построчные и блочные, в том числе {/* … *\/} в JSX). */
const stripComments = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[\s;{(,])\/\/[^\n]*/g, '$1');

const LIVE_PEAK_FILES = [
  'components/spire/peak/PeakScreenV2.tsx',
  'components/spire/peak/PeakTopRow.tsx',
  'components/spire/peak/PeakMyCounter.tsx',
  'components/spire/peak/PeakTopSkeleton.tsx',
  'components/spire/peak/PeakTour.tsx',
  'components/spire/peak/PeakTourFull.tsx',
  'components/spire/peak/PeakStepChips.tsx',
  'components/spire/peak/PeakFloorStepper.tsx',
  'components/spire/peak/PeakStepSheet.tsx',
];

describe('ЗАМКИ на живой Пик B — состав и вид', () => {
  it('Пик B включён флагом и SpireHomeScreen рисует PeakScreenSlot → PeakScreenV2 (иначе замки ниже смотрят не туда)', () => {
    expect(read('components/spire/peak/peak_screen_flag.ts')).toMatch(/PEAK_SCREEN_V2_ENABLED: boolean = true/);
    expect(read('components/spire/SpireHomeScreen.tsx')).toMatch(/peakScreenV2On\(\) \? <PeakScreenSlot /);
    expect(read('components/spire/peak/PeakScreenSlot.tsx')).toContain("require('./PeakScreenV2')");
  });

  it('состав PeakScreenV2 закреплён: башня SpireTower, строки PeakTopRow, счётчик PeakMyCounter, тур PeakTour (смена состава = пересмотр замков в реестре покрытия)', () => {
    const src = read('components/spire/peak/PeakScreenV2.tsx');
    for (const needle of [
      "import SpireTower from '../SpireTower'", "import PeakMyCounter from './PeakMyCounter'", "import PeakTopRow from './PeakTopRow'",
      "import PeakTourFull from './PeakTourFull'", "import PeakStepSheet from './PeakStepSheet'",
    ]) expect(src).toContain(needle);
  });

  it('башня B — та же SpireTower с теми же SpireTowerMarker и SpireTowerRivals, что проверяют замки «монеты на башне без обводки» (№41/№67)', () => {
    const tower = read('components/spire/SpireTower.tsx');
    expect(tower).toContain("from './SpireTowerMarker'");
    expect(tower).toContain("from './SpireTowerRivals'");
  });

  it.each(LIVE_PEAK_FILES)('%s: без обводок контейнеров (borderWidth/borderColor)', (file) => {
    expect(`${file}: ${/borderWidth|borderColor/.test(stripComments(read(file)))}`).toBe(`${file}: false`);
  });

  it('строка топа B: монета ранга SpireRankCoin и ник ЦЕЛИКОМ с переносом, а не «Мак…» в одну строку (замок 22.10 №39 «ник полностью»)', () => {
    const row = stripComments(read('components/spire/peak/PeakTopRow.tsx'));
    expect(row).toContain('<SpireRankCoin');
    expect(row).toMatch(/<Text numberOfLines=\{2\}[^>]*>\{row\.name\}<\/Text>/);
    expect(row).not.toMatch(/numberOfLines=\{1\}[^>]*>\{row\.name\}/);
  });

  it('PeakScreenV2 не рисует колонку цифр этажей и подписи зон сам (панель справа — заголовок этажа, пилюля, счётчик, топ, кнопка) — замок 05.11 №90', () => {
    const src = stripComments(read('components/spire/peak/PeakScreenV2.tsx'));
    expect(src).not.toMatch(/ВЕРШИНА|НАД ОБЛАКАМИ|СТРАЖ|Array\.from\(\{ length: 15 \}\)/);
    expect(src).not.toMatch(/floorNumbers|floorColumn|zoneLabels/i);
  });

  it('башня в B вызывается в режиме «scene» (подписи этажей скрыты через hideFloorLabels={sceneMode}) и со скрытыми словами зон — замок 05.11 №90', () => {
    const v2 = stripComments(read('components/spire/peak/PeakScreenV2.tsx'));
    const home = stripComments(read('components/spire/SpireHomeScreen.tsx'));
    const sceneVariant = /variant[=:]\s*\{?\s*['"]scene['"]/;
    expect(sceneVariant.test(v2) || /towerProps=\{\{[^}]*variant:\s*['"]scene['"]/.test(home)).toBe(true);
    expect(/hideFloorWords/.test(v2) || /towerProps=\{\{[^}]*hideFloorWords/.test(home)).toBe(true);
    expect(stripComments(read('components/spire/SpireTower.tsx'))).toContain('hideFloorLabels={sceneMode}');
  });
});
