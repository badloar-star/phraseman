import React, { forwardRef, memo } from 'react';
import Svg, { Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text } from 'react-native-svg';
import { getStreakCardCopy, type ShareCardLang } from './streakCardCopy';
import { clipAchievementTitle, getAchievementCardHeadline } from './achievementCardCopy';

const FLAME_OUTER_D =
  'M394.23,197.56a300.43,300.43,0,0,0-53.37-90C301.2,61.65,249.05,32,208,32a16,16,0,0,0-15.48,20c13.87,53-14.88,97.07-45.31,143.72C122,234.36,96,274.27,96,320c0,88.22,71.78,160,160,160s160-71.78,160-160C416,276.7,408.68,235.51,394.23,197.56Z';
const FLAME_INNER_D =
  'M288.33,418.69C278,429.69,265.05,432,256,432s-22-2.31-32.33-13.31S208,390.24,208,368c0-25.14,8.82-44.28,17.34-62.78,4.95-10.74,10-21.67,13-33.37a8,8,0,0,1,12.49-4.51A126.48,126.48,0,0,1,275,292c18.17,24,29,52.42,29,76C304,390.24,298.58,407.77,288.33,418.69Z';
const FLAME_SCALE = 252 / 512;
const FLAME_X = 414;
const FLAME_Y = 618;

export type AchievementShareCardSvgProps = {
  title: string;
  lang: ShareCardLang;
  layoutSize?: number;
};

const AchievementShareCardSvg = memo(
  forwardRef<InstanceType<typeof Svg>, AchievementShareCardSvgProps>(function AchievementShareCardSvg(
    { title, lang, layoutSize = 1080 },
    ref
  ) {
    const tag = getStreakCardCopy(lang);
    const head = getAchievementCardHeadline(lang);
    const line = clipAchievementTitle(title, 36);
    return (
      <Svg ref={ref} width={layoutSize} height={layoutSize} viewBox="0 0 1080 1080">
        <Defs>
          <LinearGradient id="achBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#0a1f28" />
            <Stop offset="45%" stopColor="#06141b" />
            <Stop offset="100%" stopColor="#020a0e" />
          </LinearGradient>
          <RadialGradient id="achGlow" cx="50%" cy="40%" r="55%">
            <Stop offset="0%" stopColor="#a855f7" stopOpacity={0.2} />
            <Stop offset="100%" stopColor="#06141b" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="achBar" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#c084fc" />
            <Stop offset="100%" stopColor="#d4a017" />
          </LinearGradient>
          <LinearGradient id="achFlameOut" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#fb923c" />
            <Stop offset="100%" stopColor="#c2410c" />
          </LinearGradient>
          <LinearGradient id="achFlameIn" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0%" stopColor="#fef9c3" />
            <Stop offset="100%" stopColor="#fbbf24" />
          </LinearGradient>
        </Defs>
        <Rect width={1080} height={1080} fill="url(#achBg)" />
        <Rect width={1080} height={1080} fill="url(#achGlow)" />
        <G opacity={0.07} stroke="#7ab8cc" strokeWidth={1}>
          <Path d="M0 180 H1080 M0 360 H1080 M0 540 H1080 M0 720 H1080 M0 900 H1080" />
          <Path d="M180 0 V1080 M360 0 V1080 M540 0 V1080 M720 0 V1080 M900 0 V1080" />
        </G>
        <Text
          x={540}
          y={110}
          textAnchor="middle"
          fill="#8aa8b4"
          fontFamily="System"
          fontSize={28}
          fontWeight="600"
          letterSpacing={5.6}
        >
          PHRASEMAN
        </Text>
        <Text
          x={540}
          y={168}
          textAnchor="middle"
          fill="#3d5a66"
          fontFamily="System"
          fontSize={24}
          fontWeight="600"
        >
          {head}
        </Text>
        <Text x={540} y={300} textAnchor="middle" fontSize="100" fontFamily="System">
          🏆
        </Text>
        <Text
          x={540}
          y={460}
          textAnchor="middle"
          fill="#e9d5ff"
          fontFamily="System"
          fontSize={line.length > 22 ? 34 : 40}
          fontWeight="800"
        >
          {line}
        </Text>
        <G transform={`translate(${FLAME_X},${FLAME_Y}) scale(${FLAME_SCALE})`}>
          <Path fill="url(#achFlameOut)" d={FLAME_OUTER_D} />
          <Path fill="url(#achFlameIn)" d={FLAME_INNER_D} />
        </G>
        <Rect x={120} y={990} width={840} height={3} rx={1.5} fill="url(#achBar)" opacity={0.5} />
        <Text
          x={540}
          y={1038}
          textAnchor="middle"
          fill="#5c7a86"
          fontFamily="System"
          fontSize={24}
          fontWeight="500"
        >
          {tag.tagline}
        </Text>
      </Svg>
    );
  })
);

export default AchievementShareCardSvg;
