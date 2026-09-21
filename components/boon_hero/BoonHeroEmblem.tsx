// Объёмная эмблема бонуса дня — один движок, пять символов.
//
// зачем (владелец, 2026-09-21): «×2» в модале Супервоскресенья работает потому,
// что это ОДИН крупный знак с металлическим переливом, а не иконка в рамке.
// Владелец попросил такой же модал остальным бонусам и своё лицо каждому.
// Поэтому градиент, глубина (подложка со смещением) и пропорции здесь ровно те
// же, что в DoubleRewardSheet, а меняется только геометрия символа —
// иначе пять экранов слились бы в один.
//
// Символы намеренно рисуются контуром, а не эмодзи: эмодзи не примет металл,
// и на Android покажет системный шрифт вместо нашего языка форм.

import React, { memo, useId } from 'react';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import type { BoonId } from '../../app/boons/boon_types';

/**
 * Геометрия символов в системе координат 300×220 — общий холст с эталоном,
 * чтобы орбита и блик совпадали пиксель в пиксель.
 * Каждый путь центрирован на (150, 108) и вписан примерно в 132×132.
 */
const SYMBOL_PATHS: Record<string, string> = {
  // Щит: серия под защитой.
  shield:
    'M150 42 L212 68 L212 112 C212 152 186 176 150 190 C114 176 88 152 88 112 L88 68 Z',
  // Молния: заряд не тратится.
  bolt: 'M168 40 L104 118 L142 118 L132 190 L196 110 L158 110 Z',
  // Двойной шеврон: восстановление вдвое быстрее.
  // зачем сдвиг на +5 по X: замер bbox в макете показал центр 145 против 150 у
  // всех остальных символов — эмблема стояла левее и «сползала» с орбиты.
  // Раскрыт по высоте (112→148) — иначе рядом со щитом читался как мелкий значок.
  chevrons:
    'M101 41 L155 115 L101 189 L79 160 L113 115 L79 70 Z M167 41 L221 115 L167 189 L145 160 L179 115 L145 70 Z',
  // Стопка карточек: колода в подарок.
  // Верхняя карта выше и ниже прежнего (48→190), чтобы рост совпал с щитом и
  // молнией: замер показывал 120 против 148 — стопка смотрелась мелкой.
  cards:
    'M104 48 L196 48 A10 10 0 0 1 206 58 L206 128 A10 10 0 0 1 196 138 L104 138 A10 10 0 0 1 94 128 L94 58 A10 10 0 0 1 104 48 Z M118 156 L182 156 A10 10 0 0 1 192 166 L192 180 A10 10 0 0 1 182 190 L118 190 A10 10 0 0 1 108 180 L108 166 A10 10 0 0 1 118 156 Z',
  // Звуковая волна: день голоса.
  wave:
    'M142 44 L158 44 L158 172 L142 172 Z M110 72 L126 72 L126 144 L110 144 Z M174 72 L190 72 L190 144 L174 144 Z M78 96 L94 96 L94 120 L78 120 Z M206 96 L222 96 L222 120 L206 120 Z',
};

const SYMBOL_FOR_BOON: Partial<Record<BoonId, keyof typeof SYMBOL_PATHS>> = {
  streak_saver: 'shield',
  energy_free_window: 'bolt',
  turbo_regen: 'chevrons',
  flashcard_friday: 'cards',
  speaking_saturday: 'wave',
};

/** Есть ли у бонуса своя эмблема (иначе модал-герой ему не положен). */
export function hasBoonHeroEmblem(boon: BoonId): boolean {
  return SYMBOL_FOR_BOON[boon] !== undefined;
}

interface BoonHeroEmblemProps {
  boon: BoonId;
  /** Основной тон металла (t.accent). */
  accent: string;
  /** Тень/провал металла (t.btnShadow). */
  shade: string;
  /** Светлая грань перелива — на тёмной теме это textPrimary, на светлой accent. */
  highlight: string;
}

function BoonHeroEmblem({ boon, accent, shade, highlight }: BoonHeroEmblemProps) {
  const symbol = SYMBOL_FOR_BOON[boon];
  // зачем: useId даёт уникальный id градиента на каждый экземпляр — два открытых
  // модала (редко, но возможно при смене дня) иначе делят один <Defs> и второй
  // красится чужим металлом.
  const gradientId = `boonHero${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  if (!symbol) return null;
  const path = SYMBOL_PATHS[symbol];

  return (
    <Svg width="100%" height="100%" viewBox="0 0 300 220" testID={`boon-hero-emblem-${symbol}`}>
      <Defs>
        <SvgGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="65%">
          <Stop offset="0" stopColor={shade} />
          <Stop offset="0.24" stopColor={accent} />
          <Stop offset="0.36" stopColor={highlight} />
          <Stop offset="0.45" stopColor={accent} />
          <Stop offset="0.58" stopColor={shade} />
          <Stop offset="0.72" stopColor={highlight} />
          <Stop offset="1" stopColor={accent} />
        </SvgGradient>
      </Defs>
      {/* Подложка со смещением на 6px вниз — та же глубина, что у «×2». */}
      <Path d={path} fill={shade} transform="translate(0, 6)" />
      <Path d={path} fill={`url(#${gradientId})`} />
    </Svg>
  );
}

export default memo(BoonHeroEmblem);
