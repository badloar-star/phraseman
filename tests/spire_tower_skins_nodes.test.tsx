// зачем (координатор 13.10): премиальный наряд башни добавляет не больше 55 узлов SVG против прежнего вида; <Defs> в счёт не идёт
// (градиенты и паттерн — не узлы сцены). Считаем настоящую сборку SpireTowerSvg со всеми 12 нарядами, в обычном состоянии и на вершине недели.
import React from 'react';
import { render } from '@testing-library/react-native';
import SpireTowerSvg from '../components/spire/SpireTowerSvg';
import { SPIRE_DEFAULT_SKIN, SPIRE_LEAGUE_SKINS, type SpireTowerSkin } from '../modules/spire/tower_skins';

jest.unmock('react-native');

jest.mock('react-native-svg', () => {
  const ReactModule = jest.requireActual('react');
  const make = (name: string) => {
    const Comp = (props: { children?: unknown }) => ReactModule.createElement(name, props, props.children);
    Comp.displayName = name;
    return Comp;
  };
  // Text без строки-ребёнка: тестовый рендерер запрещает текст вне <Text>
  const mod: Record<string, unknown> = { __esModule: true, default: make('Svg'), Svg: make('Svg'), Text: () => ReactModule.createElement('SvgText'), Defs: () => null };
  for (const n of ['Circle', 'ClipPath', 'Ellipse', 'G', 'Line', 'LinearGradient', 'Mask', 'Path', 'Pattern', 'Polygon', 'RadialGradient', 'Rect', 'Stop']) mod[n] = make(n);
  return mod;
});

type JsonNode = { type: string; children?: (JsonNode | string)[] | null };
function countNodes(node: JsonNode | JsonNode[] | null): number {
  if (!node) return 0;
  if (Array.isArray(node)) return node.reduce((s, n) => s + countNodes(n), 0);
  const kids = (node.children ?? []).filter((c): c is JsonNode => typeof c !== 'string');
  return 1 + kids.reduce((s, k) => s + countNodes(k), 0);
}

const tower = (myFloor: number, skin?: SpireTowerSkin) => (
  <SpireTowerSvg lang="ru" myFloor={myFloor} selected={myFloor} onSelect={() => undefined} width={390} skin={skin} />
);
const weekTop = (myFloor: number, skin: SpireTowerSkin) => (
  <SpireTowerSvg variant="weekTop" lang="ru" myFloor={myFloor} selected={0} onSelect={() => undefined} width={58} skin={skin} />
);

describe('наряды башни: бюджет узлов', () => {
  it('без пропа skin башня рисуется так же, как с наряда по умолчанию', async () => {
    const view = await render(tower(7));
    const withoutProp = countNodes(view.toJSON() as unknown as JsonNode | JsonNode[] | null);
    await view.rerender(tower(7, SPIRE_DEFAULT_SKIN));
    expect(withoutProp).toBeGreaterThan(300);
    expect(countNodes(view.toJSON() as unknown as JsonNode | JsonNode[] | null)).toBe(withoutProp);
  });

  it('каждая из 12 лиг добавляет не больше 55 узлов (обычно и на вершине недели)', async () => {
    const view = await render(tower(7, SPIRE_DEFAULT_SKIN));
    for (const floor of [7, 15]) {
      await view.rerender(tower(floor, SPIRE_DEFAULT_SKIN));
      const base = countNodes(view.toJSON() as unknown as JsonNode | JsonNode[] | null);
      for (const skin of SPIRE_LEAGUE_SKINS) {
        await view.rerender(tower(floor, skin));
        const delta = countNodes(view.toJSON() as unknown as JsonNode | JsonNode[] | null) - base;
        console.log(`[SPIRE-SKIN-NODES] ${skin.id} floor=${floor} +${delta}`); // guard-ok: замер бюджета узлов
        expect(delta).toBeGreaterThan(30);
        expect(delta).toBeLessThanOrEqual(55);
      }
    }
  });

  // зачем (макет «Итог недели»): мини-башня карточки — 2 этажа + барабан + конус, около 60 узлов вместо ≈450 полной башни
  it('мини-башня «Итога недели» рисует не больше 90 узлов у каждой из 12 лиг (повышение и остаёшься)', async () => {
    const full = countNodes((await render(tower(7, SPIRE_DEFAULT_SKIN))).toJSON() as unknown as JsonNode | JsonNode[] | null);
    const view = await render(weekTop(15, SPIRE_LEAGUE_SKINS[0]));
    for (const floor of [15, 1]) {
      for (const skin of SPIRE_LEAGUE_SKINS) {
        await view.rerender(weekTop(floor, skin));
        const n = countNodes(view.toJSON() as unknown as JsonNode | JsonNode[] | null);
        console.log(`[SPIRE-SKIN-NODES] weekTop ${skin.id} floor=${floor} nodes=${n}`); // guard-ok: замер бюджета узлов
        expect(n).toBeGreaterThan(40);
        expect(n).toBeLessThanOrEqual(90);
        expect(n).toBeLessThan(full / 3);
      }
    }
  });
});
