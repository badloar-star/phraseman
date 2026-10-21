// зачем (владелец 21.10, эталон chapter-exam-season.html): плитки ответов и блок разбора берут вид из ОДНОГО файла токенов — числа и тона экзамена.
jest.mock('../components/v2/ShadowSurface', () => ({ plateBoxShadow: () => 'PLATE' }));
jest.mock('../components/learning-v2/LearningV2Glass', () => ({ lv2Alpha: (hex: string, a: number) => `${hex}@${a}` }));

import {
  LV2_TASK_TILE, lv2TaskAmber, lv2TaskTileLook, lv2TaskVerdictBlockLook,
} from '../components/learning-v2/learning_v2_task_layout_tokens';

const g = (isLight: boolean) => ({
  isLight, good: '#2B8A5E', goodSoft: 'GS', goodEdge: 'GE', accentSoft: 'AS', opaqueCard: 'CARD', text: 'TX', secondary: 'SEC',
}) as never;

describe('плитки ответов по эталону экзамена', () => {
  it('числа плитки из CSS .opt', () => {
    expect(LV2_TASK_TILE).toMatchObject({ minHeight: 58, radius: 14, gap: 13, padH: 48, textSize: 16, lift: 2, markSize: 20, markRight: 16 });
  });
  it('тёплый тон: светлая 190,118,28 / .12, тёмная 230,160,60 / .14; линия .45', () => {
    expect(lv2TaskAmber(g(true))).toEqual({ fill: 'rgba(190,118,28,0.12)', edge: 'rgba(190,118,28,0.45)' });
    expect(lv2TaskAmber(g(false))).toEqual({ fill: 'rgba(230,160,60,0.14)', edge: 'rgba(230,160,60,0.45)' });
  });
  it('нейтральная — тон карточки и рельефный край, без линии', () => {
    expect(lv2TaskTileLook(g(false), 'neutral')).toEqual({ backgroundColor: 'CARD', color: 'TX', edgeColor: null, boxShadow: 'PLATE', lifted: false });
  });
  it('выбранная приподнята и тоже с рельефом', () => {
    expect(lv2TaskTileLook(g(false), 'selected')).toMatchObject({ backgroundColor: 'AS', lifted: true, boxShadow: 'PLATE' });
  });
  it('верная — бледно-зелёный фон, зелёный текст, линия; неверная — тёплый фон и линия, текст обычный', () => {
    expect(lv2TaskTileLook(g(true), 'ok')).toMatchObject({ backgroundColor: 'GS', color: '#2B8A5E', edgeColor: 'GE', boxShadow: undefined });
    expect(lv2TaskTileLook(g(true), 'no')).toMatchObject({ backgroundColor: 'rgba(190,118,28,0.12)', color: 'TX', edgeColor: 'rgba(190,118,28,0.45)' });
  });
  it('блок разбора: верный — зелёный, неверный — тот же тёплый тон, без рамки', () => {
    expect(lv2TaskVerdictBlockLook(g(false), true)).toEqual({ backgroundColor: 'GS', titleColor: '#2B8A5E', bodyColor: 'SEC' });
    expect(lv2TaskVerdictBlockLook(g(false), false)).toEqual({ backgroundColor: 'rgba(230,160,60,0.14)', titleColor: 'TX', bodyColor: 'SEC' });
  });
});
