import React, { memo } from 'react';
import Svg, { ClipPath, Defs, G, Image as SvgImage, Polygon } from 'react-native-svg';
import { AVATAR100_FITS, type Avatar100Fit } from '../constants/avatar100_fits';

// зачем: единый слой отрисовки Avatar100 — раньше каждая карточка полагалась на
// ручную таблицу масштабов, новых ID в ней не было, и портреты выходили кто
// крошечный, кто огромный (замер по 106 файлам дал разброс 2.1x). Здесь повторены
// правила макета-эталона (.codex-tmp/avatar-regeneration-v3/final-showcase/index.html):
//   1. силуэт каждого выреза приведён к одному размеру (таблица avatar100_fits);
//   2. ТОЛЬКО нижняя V — жёсткий ограничитель: тело обрезается по её ДИАГОНАЛЯМ,
//      а не по горизонтали, поэтому у краёв не появляется прямой срез;
//   3. верхняя и боковые линии гекса остаются ЗА портретом, поэтому носы, уши,
//      грива и крылья ложатся поверх них и не «перерезаются» белой полосой;
//   4. верхний вылет ограничен 20% размера гекса.
// В вебе это делал clip-path; в React Native тот же многоугольник даёт SVG ClipPath.

/** Геометрия гекса — те же точки, что у макета и у SVG-подложки бейджа. */
export const AVATAR100_HEX_POINTS = '50,3.5 93,26 93,74 50,96.5 7,74 7,26';
/** Линия нижней V: от левого «плеча» к нижней точке и вправо. */
export const AVATAR100_LOWER_V_POINTS = '7,74 50,96.5 93,74';
export const AVATAR100_HEX_STROKE = 'rgba(255,255,255,0.58)';
export const AVATAR100_HEX_STROKE_WIDTH = 3.5;

/**
 * Клип тела: сверху и по бокам с запасом (портрет свободно выходит за верхнюю и
 * боковые линии), снизу — ровно по диагоналям нижней V. Совпадает с макетом:
 * polygon(-20% 0, 120% 0, 120% 74%, 93% 74%, 50% 96.5%, 7% 74%, -20% 74%).
 */
const BODY_CLIP_POINTS = '-30,-30 130,-30 130,74 93,74 50,96.5 7,74 -30,74';
/** Клип верхней зоны: всё выше 62% — как inset(-20% -20% 62% -20%) в макете. */
const UPPER_CLIP_POINTS = '-30,-30 130,-30 130,62 -30,62';

// зачем: холст SVG обязан быть БОЛЬШЕ гекса, иначе уши, рога и гривы,
// поднявшиеся выше y=0, физически не помещаются в область отрисовки и
// срезаются ровной линией по верхней кромке (overflow:'visible' на нативе
// этого не лечит). Запас берём с той же щедростью, что и клипы.
const CANVAS_MARGIN = 30;
const CANVAS_SPAN = 100 + CANVAS_MARGIN * 2;
const CANVAS_VIEWBOX = `${-CANVAS_MARGIN} ${-CANVAS_MARGIN} ${CANVAS_SPAN} ${CANVAS_SPAN}`;

export function avatar100FitFor(
  avatarId: string,
  logoColor: 'black' | 'white',
): Avatar100Fit | undefined {
  return AVATAR100_FITS[`${avatarId}:${logoColor}`];
}

type Zone = 'body' | 'upper';

type Props = {
  /** URI картинки: арт Avatar100 раздаётся с хостинга, локальных require нет. */
  uri: string;
  size: number;
  fit: Avatar100Fit;
  /**
   * 'body'  — рисуется ПОД линиями гекса, обрезан по нижней V;
   * 'upper' — рисуется ПОВЕРХ линий, чтобы морда/уши/крылья не перерезались.
   */
  zone: Zone;
};

/**
 * Одна зона портрета. Обе зоны показывают ОДНО изображение с одинаковым
 * преобразованием, поэтому шва между ними нет — меняется только видимая часть.
 * Слой декоративный: имя и цену озвучивает карточка вокруг гекса.
 */
function Avatar100Portrait({ uri, size, fit, zone }: Props) {
  const clipId = React.useMemo(
    () => `a100${zone}${Math.round(Math.random() * 1_000_000)}`,
    [zone],
  );

  // Таблица хранит доли, а не пиксели: размер гекса на разных экранах разный.
  // Порядок как в CSS transform макета: сдвиг, затем масштаб от центра.
  const transform = [
    `translate(${(fit.translateX * 100).toFixed(3)} ${(fit.translateY * 100).toFixed(3)})`,
    'translate(50 50)',
    `scale(${fit.scale})`,
    'translate(-50 -50)',
  ].join(' ');

  return (
    <Svg
      width={size * (CANVAS_SPAN / 100)}
      height={size * (CANVAS_SPAN / 100)}
      viewBox={CANVAS_VIEWBOX}
      // Холст шире гекса, поэтому сдвигаем его влево-вверх на тот же запас —
      // гекс остаётся ровно на своём месте, а вылет получает место для отрисовки.
      style={{
        position: 'absolute',
        left: -size * (CANVAS_MARGIN / 100),
        top: -size * (CANVAS_MARGIN / 100),
      }}
      pointerEvents="none"
      accessible={false}
    >
      <Defs>
        <ClipPath id={clipId}>
          <Polygon points={zone === 'body' ? BODY_CLIP_POINTS : UPPER_CLIP_POINTS} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clipId})`}>
        <SvgImage
          href={{ uri }}
          x={0}
          y={0}
          width={100}
          height={100}
          preserveAspectRatio="xMidYMid meet"
          transform={transform}
        />
      </G>
    </Svg>
  );
}

export default memo(Avatar100Portrait);
