import React, { memo } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

/** Вершины плоского сверху шестиугольника: ширина w, высота h = w·√3/2 */
export function flatTopHexPoints(w: number, h: number): string {
  const yM = h / 2;
  return `0,${yM} ${w / 4},0 ${(3 * w) / 4},0 ${w},${yM} ${(3 * w) / 4},${h} ${w / 4},${h}`;
}

type Props = {
  width: number;
  height: number;
  fill: string;
  style?: StyleProp<ViewStyle>;
};

/** Сплошная заливка без стыков (в отличие от трёх View с border). */
function FlatTopHexFill({ width: w, height: h, fill, style }: Props) {
  return (
    <Svg width={w} height={h} style={style}>
      <Polygon points={flatTopHexPoints(w, h)} fill={fill} />
    </Svg>
  );
}

export default memo(FlatTopHexFill);
