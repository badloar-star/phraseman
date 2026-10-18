// ─── Грань монеты ранга (анфас) ─────────────────────────────────────────────
// зачем (PM-077): одна картинка = валюта и аватар (D03), в церемонии повышения её
// переворачивают кодом (scaleX), поэтому нужен только ровный анфас. Пока нет PNG от
// художника (PM-073) — процедурная монета из прототипа variant-b.html: металл
// градиентом, поясок, гурт с насечкой, центральный знак — пузырь речи из двух
// полукругов. Как только ассет готов, передай `source` — SVG не рисуется вовсе.
import React, { memo, useRef } from 'react';
import { type ImageSourcePropType, View } from 'react-native';
import { Image } from 'expo-image';
import { logMemCoin } from '../coins/mem_coin_probe';
import Svg, { Circle, ClipPath, Defs, G, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';
import type { CoinMetal } from './coin_metal_palette';

type Props = Readonly<{
  metal: CoinMetal;
  size: number;
  /** Картинка монеты ранга (квадрат, прозрачный фон, coin_rank_table_v1); если задана — процедурная графика не рисуется. */
  source?: ImageSourcePropType;
}>;

// Верхний большой полукруг и нижний поменьше, сдвинутый вправо, на одной линии — «реплика».
const EMBLEM = 'M -44 2 A 32 32 0 0 1 20 2 Z  M -10 2 A 24 24 0 0 0 38 2 Z';

let artSeq = 0;

function CoinFaceArt({ metal, size, source }: Props) {
  // зачем: id градиентов обязаны быть уникальны на экране — в церемонии одновременно
  // живут 4 монеты (две грани × отражение), общий id смешал бы их цвета.
  const idRef = useRef<string | null>(null);
  if (idRef.current === null) {
    artSeq += 1;
    idRef.current = `coin${artSeq}`;
  }
  const id = idRef.current;

  if (source) {
    // зачем (R129): в церемонии живут ~4 грани сразу — expo-image декодирует монету 768² под размер вида (до 240 dp), а не целиком каждую
    return <Image source={source} style={{ width: size, height: size }} contentFit="contain" accessible={false} onLoad={() => logMemCoin('level-up-coin-face', size)} />;
  }

  const { hi, mid, lo, deep, ring } = metal;
  return (
    <View style={{ width: size, height: size }} accessible={false} pointerEvents="none">
      <Svg width={size} height={size} viewBox="-110 -110 220 220">
        <Defs>
          <LinearGradient id={`${id}m`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={hi} />
            <Stop offset="0.42" stopColor={mid} />
            <Stop offset="0.78" stopColor={lo} />
            <Stop offset="1" stopColor={deep} />
          </LinearGradient>
          {ring ? (
            <LinearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={ring[0]} />
              <Stop offset="0.5" stopColor={ring[1]} />
              <Stop offset="1" stopColor={ring[2]} />
            </LinearGradient>
          ) : null}
          <RadialGradient id={`${id}k`} cx="34%" cy="28%" r="60%">
            <Stop offset="0" stopColor="#fff" stopOpacity={0.42} />{/* theme-exempt: иллюстрация лица монеты */}
            <Stop offset="0.55" stopColor="#fff" stopOpacity={0} />{/* theme-exempt: иллюстрация лица монеты */}
          </RadialGradient>
          <RadialGradient id={`${id}v`} cx="50%" cy="50%" r="50%">
            <Stop offset="0.72" stopColor="#000" stopOpacity={0} />{/* theme-exempt: иллюстрация лица монеты */}
            <Stop offset="1" stopColor="#000" stopOpacity={0.42} />{/* theme-exempt: иллюстрация лица монеты */}
          </RadialGradient>
          <LinearGradient id={`${id}e`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={hi} />
            <Stop offset="1" stopColor={mid} />
          </LinearGradient>
          <ClipPath id={`${id}c`}>
            <Circle cx={0} cy={0} r={98} />
          </ClipPath>
        </Defs>
        <G clipPath={`url(#${id}c)`}>
          {ring ? (
            <>
              <Circle cx={0} cy={0} r={98} fill={`url(#${id}r)`} />
              <Circle cx={0} cy={0} r={72} fill={`url(#${id}m)`} />
              <Circle cx={0} cy={0} r={72} fill="none" stroke={ring[2]} strokeOpacity={0.55} strokeWidth={1.2} />
              <Circle cx={0} cy={0} r={73.5} fill="none" stroke={ring[0]} strokeOpacity={0.35} strokeWidth={0.8} />
            </>
          ) : (
            <>
              <Circle cx={0} cy={0} r={98} fill={`url(#${id}m)`} />
              <Circle cx={0} cy={0} r={92} fill="none" stroke={deep} strokeOpacity={0.55} strokeWidth={5.5} strokeDasharray="2.2 2.2" />
              <Circle cx={0} cy={0} r={95.5} fill="none" stroke={hi} strokeOpacity={0.28} strokeWidth={0.9} />
              <Circle cx={0} cy={0} r={88.6} fill="none" stroke={hi} strokeOpacity={0.22} strokeWidth={0.8} />
              <Circle cx={0} cy={0} r={66} fill="none" stroke={deep} strokeOpacity={0.38} strokeWidth={1.6} />
              <Circle cx={0} cy={0} r={64.2} fill="none" stroke={hi} strokeOpacity={0.32} strokeWidth={0.7} />
            </>
          )}
          <Circle cx={0} cy={0} r={98} fill={`url(#${id}k)`} />
          <G transform="translate(3,2)">
            <Path d={EMBLEM} fill={deep} fillOpacity={0.6} transform="translate(2,2.4)" />
            <Path d={EMBLEM} fill="#fff" fillOpacity={0.38} transform="translate(-1.1,-1.3)" />{/* theme-exempt: иллюстрация лица монеты */}
            <Path d={EMBLEM} fill={`url(#${id}e)`} />
            <Path d="M -10 2 A 24 24 0 0 0 38 2 Z" fill={deep} fillOpacity={0.18} />
          </G>
          <Circle cx={0} cy={0} r={98} fill={`url(#${id}v)`} />
        </G>
      </Svg>
    </View>
  );
}

export default memo(CoinFaceArt);
