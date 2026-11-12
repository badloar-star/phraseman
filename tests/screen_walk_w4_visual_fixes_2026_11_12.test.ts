/**
 * Обход экранов 12.11, заход 4 — две вёрсточные находки (снимки до/после в docs/phraseman-2.0/evidence/screen-walk).
 *
 * 1) «Достижения»: шов поперёк витрины — строка стыка маски мягкого края (20 dp = 52,5 px) выходила прозрачной, пиксель шва = цвет фона страницы.
 *    Полка «чёрным клином» — react-native-svg не берёт альфу из rgba в stopColor: 20–32 % цвета текста рисовались непрозрачно.
 * 2) «Диалоги»: энергия считала цвета от светлого фона страницы и лежала на тёмной сцене (контраст значка 2,09 → после 7,13).
 */
import fs from 'fs';
import path from 'path';

import { achievementShelfMaterials } from '../components/achievements/achievementShelfMaterials';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

const theme = {
  bgPrimary: '#F4FBFA', bgCard: '#FFFFFF', bgSurface: '#EEF6F4', bgSurface2: '#E2EFEC', textPrimary: '#0F1F1A',
  border: 'rgba(0,0,0,0.07)', borderHighlight: 'rgba(15,31,26,0.18)', cardShadow: 'rgba(0,0,0,0.25)', shadowDark: '#000000',
};

describe('обход 12.11 · Достижения: полка без чёрного клина', () => {
  it('цвет дальнего края полки — непрозрачный, прозрачность отдельно (32 % светлая тема, 20 % тёмная)', () => {
    const light = achievementShelfMaterials(theme, false);
    expect(light.shelfTopStart).toBe('#0F1F1A');
    expect(light.shelfTopStartOpacity).toBe(0.32);
    expect(achievementShelfMaterials(theme, true).shelfTopStartOpacity).toBe(0.2);
  });

  it('градиент полки берёт прозрачность через stopOpacity, а не из rgba в stopColor', () => {
    expect(read('components/achievements/AchievementShelfStageArt.tsx'))
      .toContain('<Stop offset="0" stopColor={materials.shelfTopStart} stopOpacity={materials.shelfTopStartOpacity} />');
  });
});

describe('обход 12.11 · мягкий верхний край: без прозрачной строки на стыке маски', () => {
  it('components/ScrollTopEdgeFade.tsx: сплошная часть маски заходит под полосу растворения на 1 dp', () => {
    const src = read('components/ScrollTopEdgeFade.tsx');
    expect(src).toContain("opaque: { position: 'absolute', top: FADE_HEIGHT - 1, left: 0, right: 0, bottom: 0, backgroundColor: 'black' }");
    expect(src).not.toContain("opaque: { flex: 1, backgroundColor: 'black' }");
  });

  it('накладка покоя перекрывает стык тоже', () => {
    expect(read('components/ScrollTopEdgeFade.tsx')).toContain('height: FADE_HEIGHT + 1');
  });
});

describe('обход 12.11 · Диалоги: энергия чернилами сцены', () => {
  it('сцена отдаёт значку цвет текста сцены и подложку верха', () => {
    expect(read('components/dialogs/scene/DialogsSceneStage.tsx'))
      .toContain("typeof p.topEnd === 'function' ? p.topEnd({ color: c.text, fills: [c.top] }) : p.topEnd ?? null");
  });

  it('хаб «Диалогов» рисует энергию через чернила сцены', () => {
    const hub = read('components/dialogs/scene/DialogsSceneHub.tsx');
    expect(hub).toContain('<EnergyBar size={30} glass solidBolt ink={ink} />');
    expect(hub).toContain('topEnd={renderSceneEnergy}');
  });

  it('EnergyBar с чернилами: число и молния цветом сцены, «мало/перезаряд» доводятся до контраста к подложке сцены', () => {
    const bar = read('components/EnergyBar.tsx');
    expect(bar).toContain('const valueColor = ink ? ink.color : (glass ? lg.text : (lg.isLight ? lg.text : COLORS.value));');
    expect(bar).toContain('lowChargeInk(COLORS.overcharge, ink.fills, ink.color)');
    expect(bar).toContain('lowChargeInk(COLORS.low, ink.fills, ink.color)');
    expect(bar).toContain('themeColor={boltColor}');
  });
});
