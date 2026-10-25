// Координатор 26.10, аудит скорости Моментов: №1 — башня окна этажа строится после первого кадра окна, а не в нём; №3 — арт монеты
// прогревается при входе в Пик (один раз на ранг и вариант); №9 — модули ленивых окон итога грузятся заранее.
import fs from 'node:fs';
import path from 'node:path';

const mockLoadAsync = jest.fn((_source: unknown) => Promise.resolve({}));
jest.mock('expo-image', () => ({ Image: { loadAsync: (source: unknown) => mockLoadAsync(source) } }));
jest.mock('react-native', () => ({ PixelRatio: { get: () => 3 } }));
jest.mock('../app/coin_rank_table_v1', () => ({
  coinRankSourceForSize: (rank: number, size: number, ratio: number) => {
    const px = size * ratio;
    const variant = px <= 96 ? 's96' : px <= 192 ? 's192' : 'full';
    return { source: `${rank}-${variant}`, variant };
  },
}));

import { __resetMomentCoinPrewarmForTests, MOMENT_COIN_PREWARM_SIZES, prewarmMomentCoin } from '../components/moments/moment_coin_prewarm';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('прогрев монеты моментов', () => {
  beforeEach(() => {
    mockLoadAsync.mockClear();
    __resetMomentCoinPrewarmForTests();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('греет каждый нужный вариант арта один раз; повтор с тем же рангом — без работы', () => {
    expect(MOMENT_COIN_PREWARM_SIZES).toEqual([56, 96, 110, 120]);
    prewarmMomentCoin(7, 'test');
    // 56×3 = 168 → s192; 96/110/120 × 3 > 192 → full
    expect(mockLoadAsync.mock.calls.map((c) => c[0]).sort()).toEqual(['7-full', '7-s192']);
    prewarmMomentCoin(7, 'test-again');
    expect(mockLoadAsync).toHaveBeenCalledTimes(2);
  });

  it('ранга нет — ничего не грузим', () => {
    prewarmMomentCoin(null, 'test');
    expect(mockLoadAsync).not.toHaveBeenCalled();
  });

  it('сбой загрузки — пишет причину и даёт попробовать снова', async () => {
    mockLoadAsync.mockImplementationOnce(() => Promise.reject(new Error('decode')));
    prewarmMomentCoin(3, 'test');
    await new Promise((r) => setTimeout(r, 0));
    expect(console.warn).toHaveBeenCalledWith('[MOMENT-COIN-PREWARM]', 'failed', expect.stringContaining('decode'));
    mockLoadAsync.mockClear();
    prewarmMomentCoin(3, 'retry');
    expect(mockLoadAsync.mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});

describe('проводка', () => {
  it('окно этажа: башня монтируется после первого кадра, рамка того же размера стоит сразу; замер в журнале', () => {
    const floor = read('components/spire/moments/SpireFloorMoment.tsx');
    expect(floor).toContain('const [towerReady, setTowerReady] = useState(false);');
    expect(floor).toContain('{towerReady ? <SpireTowerSvg lang={lang} myFloor={litFloor}');
    expect(floor).toContain('[FLOOR-MOMENT] первый кадр окна через');
    expect(floor).toMatch(/<View style=\{\[s\.window, \{ width: TOWER_W, height: TOWER_H \}\]\} testID=\{`\$\{testID\}-tower`\}>/);
  });

  it('слой Пика греет свою монету и модули окон итога при входе', () => {
    const layer = read('components/spire/moments/SpireMomentsLayer.tsx');
    expect(layer).toContain("prewarmMomentCoin(coinRank, 'spire_layer_mount');");
    expect(layer).toContain("Promise.all([import('./SpireStepResultMoment'), import('./SpireFloorMoment')])");
  });
});
