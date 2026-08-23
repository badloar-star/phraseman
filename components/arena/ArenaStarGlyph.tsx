import React, { memo } from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

/**
 * Золотая звезда ранга — единый глиф для пипсов, полёта и модалок.
 *
 * зачем: владелец (2026-08-23) принял премиум-макет
 * `.motion-mockups/phraseman-arena-stars.html` — звезда из «настоящего
 * золота»: трёхстоповый градиент (слоновая кость → золото → латунь) с
 * внутренним бликом и мягким свечением. Плоская иконка Ionicons такой
 * глубины не даёт. Стопы 1:1 из макета.
 *
 * Пустой слот — тихий контур: он не спорит с горящими звёздами.
 */

let uid = 0;

export const ArenaStarGlyph = memo(function ArenaStarGlyph({ lit, size = 24, glow = true }: Readonly<{
  lit: boolean;
  size?: number;
  /** Свечение позади звезды. Выключается там, где глифов много и мелко. */
  glow?: boolean;
}>) {
  // Стабильные id градиентов на инстанс: без них два глифа на экране
  // подхватывают чужие defs (известная ловушка react-native-svg).
  const idRef = React.useRef(`arst${++uid}`);
  const id = idRef.current;
  if (!lit) {
    return (
      <Svg width={size} height={size} viewBox="0 0 24 24">
        <Path
          d="M12 2.6l2.66 5.68 6.22.72-4.6 4.26 1.23 6.14L12 16.32 6.49 19.4l1.23-6.14-4.6-4.26 6.22-.72z"
          fill="none"
          stroke="#4A6353"
          strokeWidth={1.7}
          strokeLinejoin="round"
          opacity={0.55}
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id={`${id}g`} x1="0" y1="0" x2="0.35" y2="1">
          <Stop offset="0" stopColor="#FFF3C4" />
          <Stop offset="0.45" stopColor="#FFD43B" />
          <Stop offset="1" stopColor="#D19E1D" />
        </LinearGradient>
        <RadialGradient id={`${id}h`} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor="#FFD43B" stopOpacity={0.5} />
          <Stop offset="1" stopColor="#FFD43B" stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {glow ? <Circle cx={12} cy={12} r={12} fill={`url(#${id}h)`} /> : null}
      <Path
        d="M12 2.6l2.66 5.68 6.22.72-4.6 4.26 1.23 6.14L12 16.32 6.49 19.4l1.23-6.14-4.6-4.26 6.22-.72z"
        fill={`url(#${id}g)`}
        stroke="#8A6A12"
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
      {/* Внутренний блик: холодная искра на левом луче, как на макете. */}
      <Path d="M12 4.6l1.6 3.4-3.6 5.2-1.4-1.3 3.4-7.3z" fill="#FFF8DC" opacity={0.5} />
    </Svg>
  );
});
