// зачем (владелец 21.10, эталон chapter-exam-season.html): плитки ответов и блок разбора берут вид из ОДНОГО файла токенов — числа и тона экзамена.
jest.mock('../components/v2/ShadowSurface', () => ({ plateBoxShadow: () => 'PLATE' }));
jest.mock('../components/learning-v2/LearningV2Glass', () => ({ lv2Alpha: (hex: string, a: number) => `${hex}@${a}` }));

import {
  LV2_TASK_TILE, lv2TaskAmber, lv2TaskTileLook, lv2TaskVerdictBlockLook,
} from '../components/learning-v2/learning_v2_task_layout_tokens';
import { semanticInk } from '../constants/liquidGlassSemanticInk';

// зачем (4 · ТЕМЫ 25.10): текст «верно» — semanticInk (тон темы, доведённый до 4,55 на всех подложках); ему нужны настоящие цвета,
// поэтому у тона, текста и подложек — настоящие hex, у остальных полей — метки для сравнения
const glass = (isLight: boolean) => ({
  isLight, good: '#2B8A5E', bad: '#C0392B', goodSoft: '#2B8A5E1F', badSoft: '#C0392B1F', goodEdge: 'GE', accentSoft: 'AS',
  opaqueCard: '#FFFFFF', opaqueControl: '#EEEEF2', bg: '#F3F3F5', text: '#15161B', secondary: 'SEC',
});
const g = (isLight: boolean) => glass(isLight) as never;
const goodText = semanticInk(glass(true)).goodText;

describe('плитки ответов по эталону экзамена', () => {
  it('числа плитки из CSS .opt', () => {
    expect(LV2_TASK_TILE).toMatchObject({ minHeight: 58, radius: 14, gap: 13, padH: 48, textSize: 16, lift: 2, markSize: 20, markRight: 16 });
  });
  it('тёплый тон: светлая 190,118,28 / .12, тёмная 230,160,60 / .14; линия .45', () => {
    expect(lv2TaskAmber(g(true))).toEqual({ fill: 'rgba(190,118,28,0.12)', edge: 'rgba(190,118,28,0.45)' });
    expect(lv2TaskAmber(g(false))).toEqual({ fill: 'rgba(230,160,60,0.14)', edge: 'rgba(230,160,60,0.45)' });
  });
  it('нейтральная — тон карточки и рельефный край, без линии', () => {
    expect(lv2TaskTileLook(g(false), 'neutral')).toEqual({ backgroundColor: '#FFFFFF', color: '#15161B', edgeColor: null, boxShadow: 'PLATE', lifted: false });
  });
  it('выбранная приподнята и тоже с рельефом', () => {
    expect(lv2TaskTileLook(g(false), 'selected')).toMatchObject({ backgroundColor: 'AS', lifted: true, boxShadow: 'PLATE' });
  });
  it('верная — бледно-зелёный фон, зелёный текст, линия; неверная — тёплый фон и линия, текст обычный', () => {
    expect(lv2TaskTileLook(g(true), 'ok')).toMatchObject({ backgroundColor: '#2B8A5E1F', color: goodText, edgeColor: 'GE', boxShadow: undefined });
    expect(lv2TaskTileLook(g(true), 'no')).toMatchObject({ backgroundColor: 'rgba(190,118,28,0.12)', color: '#15161B', edgeColor: 'rgba(190,118,28,0.45)' });
  });
  // 4 · ТЕМЫ 25.10 (замер L11/L17): заголовок «верно» — semanticInk, пояснение — text (secondary на заливке блока < 4,5)
  it('блок разбора: верный — зелёный, неверный — тот же тёплый тон, без рамки; пояснение цветом текста', () => {
    expect(lv2TaskVerdictBlockLook(g(true), true)).toEqual({ backgroundColor: '#2B8A5E1F', titleColor: goodText, bodyColor: '#15161B' });
    expect(lv2TaskVerdictBlockLook(g(false), false)).toEqual({ backgroundColor: 'rgba(230,160,60,0.14)', titleColor: '#15161B', bodyColor: '#15161B' });
  });
});
