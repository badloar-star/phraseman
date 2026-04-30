import React, { forwardRef, memo } from 'react';
import Svg, { Defs, G, LinearGradient, Path, RadialGradient, Rect, Stop, Text } from 'react-native-svg';
import { getStreakCardCopy, type ShareCardLang } from './streakCardCopy';
import { formatLessonScore, getCefrLine, getLessonLine, getLessonSharePraise } from './lessonCardCopy';

const FLAME_OUTER_D =
  'M394.23,197.56a300.43,300.43,0,0,0-53.37-90C301.2,61.65,249.05,32,208,32a16,16,0,0,0-15.48,20c13.87,53-14.88,97.07-45.31,143.72C122,234.36,96,274.27,96,320c0,88.22,71.78,160,160,160s160-71.78,160-160C416,276.7,408.68,235.51,394.23,197.56Z';
const FLAME_INNER_D =
  'M288.33,418.69C278,429.69,265.05,432,256,432s-22-2.31-32.33-13.31S208,390.24,208,368c0-25.14,8.82-44.28,17.34-62.78,4.95-10.74,10-21.67,13-33.37a8,8,0,0,1,12.49-4.51A126.48,126.48,0,0,1,275,292c18.17,24,29,52.42,29,76C304,390.24,298.58,407.77,288.33,418.69Z';
const FLAME_SCALE = 252 / 512;
const FLAME_X = 414;
/** Нижняя треть кадра: не пересекается с блоком оценки / «Блестяще!» (baseline 640) */
const FLAME_Y = 700;

function clipCefr(s: string, max = 32) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '\u2026';
}

export type LessonShareCardSvgProps = {
  lessonId: number;
  score: number;
  cefr: string;
  lang: ShareCardLang;
  layoutSize?: number;
};

const LessonShareCardSvg = memo(
  forwardRef<InstanceType<typeof Svg>, LessonShareCardSvgProps>(function LessonShareCardSvg(
    { lessonId, score, cefr, lang, layoutSize = 1080 },
    ref
  ) {
    const tag = getStreakCardCopy(lang);
    const lessonLine = getLessonLine(lessonId, lang);
    const scoreStr = formatLessonScore(score);
    const praise = getLessonSharePraise(score, lang);
    const cefrText = clipCefr(getCefrLine(cefr, lang));
    const numSize = scoreStr.length > 3 ? 200 : 280;

    return (
      <Svg ref={ref} width={layoutSize} height={layoutSize} viewBox="0 0 1080 1080">
        <Defs>
          <LinearGradient id="lesBg" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#0a1f28" />
            <Stop offset="45%" stopColor="#06141b" />
            <Stop offset="100%" stopColor="#020a0e" />
          </LinearGradient>
          <RadialGradient id="lesGlow" cx="50%" cy="40%" r="55%">
            <Stop offset="0%" stopColor="#10b981" stopOpacity={0.22} />
            <Stop offset="100%" stopColor="#06141b" stopOpacity={0} />
          </RadialGradient>
          <LinearGradient id="lesBar" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0%" stopColor="#34d399" />
            <Stop offset="100%" stopColor="#d4a017" />
          </LinearGradient>
          <LinearGradient id="lesNum" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#6ee7b7" />
            <Stop offset="100%" stopColor="#f97316" />
          </LinearGradient>
          <LinearGradient id="lesFlameOut" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0%" stopColor="#fb923c" />
            <Stop offset="100%" stopColor="#c2410c" />
          </LinearGradient>
          <LinearGradient id="lesFlameIn" x1="0.5" y1="0" x2="0.5" y2="1">
            <Stop offset="0%" stopColor="#fef9c3" />
            <Stop offset="100%" stopColor="#fbbf24" />
          </LinearGradient>
        </Defs>
        <Rect width={1080} height={1080} fill="url(#lesBg)" />
        <Rect width={1080} height={1080} fill="url(#lesGlow)" />
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
          {lessonLine}
        </Text>
        <Text
          x={540}
          y={430}
          textAnchor="middle"
          fill="url(#lesNum)"
          fontFamily="System"
          fontSize={numSize}
          fontWeight="800"
        >
          {scoreStr}
        </Text>
        <Text
          x={540}
          y={500}
          textAnchor="middle"
          fill="#94a3b8"
          fontFamily="System"
          fontSize={32}
          fontWeight="600"
        >
          ★
        </Text>
        <Text
          x={540}
          y={560}
          textAnchor="middle"
          fill="#5c7a86"
          fontFamily="System"
          fontSize={26}
          fontWeight="500"
        >
          {cefrText}
        </Text>
        <Text
          x={540}
          y={640}
          textAnchor="middle"
          fill="#34d399"
          fontFamily="System"
          fontSize={28}
          fontWeight="700"
        >
          {praise}
        </Text>
        <G transform={`translate(${FLAME_X},${FLAME_Y}) scale(${FLAME_SCALE})`}>
          <Path fill="url(#lesFlameOut)" d={FLAME_OUTER_D} />
          <Path fill="url(#lesFlameIn)" d={FLAME_INNER_D} />
        </G>
        <Rect x={120} y={990} width={840} height={3} rx={1.5} fill="url(#lesBar)" opacity={0.5} />
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

export default LessonShareCardSvg;
