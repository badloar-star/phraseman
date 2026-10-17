import React, { memo } from 'react';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';

import type { LearningV2IconShape } from './learningV2IconData.generated';

// зачем (владелец 17.10): иконки уроков и глав V2 — рисованные, система иконок Диалогов из макетов: холст 24, линия 1,8,
// концы и стыки скруглены, заливки нет, цвет — один (currentColor макета → проп color). Фигуры приходят готовыми структурами
// из learningV2IconData.generated.ts — телефон ничего не разбирает.

/** Фигуры → элементы react-native-svg. Общая для иконки и узора (узор кладёт их в Pattern). */
export function renderLearningV2Shapes(shapes: readonly LearningV2IconShape[], keyPrefix: string): React.ReactElement[] {
  return shapes.map((shape, index) => {
    const a = shape.a as Record<string, string | number>;
    const key = `${keyPrefix}-${index}`;
    if (shape.t === 'path') return <Path key={key} d={String(a.d)} strokeWidth={a.strokeWidth as number | undefined} transform={a.transform as string | undefined} />;
    if (shape.t === 'rect') return <Rect key={key} x={a.x as number} y={a.y as number} width={a.width as number} height={a.height as number} rx={a.rx as number | undefined} strokeWidth={a.strokeWidth as number | undefined} transform={a.transform as string | undefined} />;
    if (shape.t === 'circle') return <Circle key={key} cx={a.cx as number} cy={a.cy as number} r={a.r as number} strokeWidth={a.strokeWidth as number | undefined} transform={a.transform as string | undefined} />;
    return <Ellipse key={key} cx={a.cx as number} cy={a.cy as number} rx={a.rx as number} ry={a.ry as number} strokeWidth={a.strokeWidth as number | undefined} transform={a.transform as string | undefined} />;
  });
}

type Props = Readonly<{ shapes: readonly LearningV2IconShape[]; size: number; color: string; opacity?: number }>;

/** Одна иконка урока/главы. memo: на карте 7–8 штук, при прокрутке не перерисовываются. */
export const LearningV2Glyph = memo(function LearningV2Glyph({ shapes, size, color, opacity = 1 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity} pointerEvents="none">
      <G fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        {renderLearningV2Shapes(shapes, 'g')}
      </G>
    </Svg>
  );
});
