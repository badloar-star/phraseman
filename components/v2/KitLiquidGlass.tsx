import React, { memo } from 'react';
import { StyleSheet, View, type BoxShadowValue } from 'react-native';
import { actionBoxShadow, PlateFill } from './ShadowSurface';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useTheme } from '../ThemeContext';

/**
 * «Жидкое стекло» макетов 2.0 — один в один с docs/design/v2-app/kit.css (блок «LIQUID GLASS»):
 *   --lg-sheen: linear-gradient(150deg, белый .10 → .035 → 0 → .02 → .055)
 *   --lg-rim:   inset 1px 1.5px 0 -.2px белый .22, inset -1px -1.5px 0 -.2px чёрный .45, inset 0 0 0 1px белый .055
 *   --lg-drop:  0 10px 28px -12px чёрный .7 (только крупные поверхности: карточки, шторки, панели)
 *
 * зачем (владелец 04.10, сверка «только 100%»): в макетах КАЖДАЯ карточка, пилюля, круглая кнопка и вариант
 * ответа — стекло с бликом по верхне-левой кромке и тёмной нижней (толщина стекла), а в приложении они были
 * плоскими. Слой ложится поверх заливки, но ПОД содержимым (ставить первым ребёнком), ничего не перекрывает.
 * Статично: ноль работы после первого кадра (без размытия — Android BlurView даёт артефакты).
 *
 * зачем (владелец 12.10, «второй вариант делаем», стиль «Тень»): контейнеры БЕЗ обводок. Слой стекла больше не рисует ни кромку
 * (`--lg-rim`), ни диагональный блик 150° — это плашка: градиент 180° из токенов темы (components/v2/ShadowSurface). Тень ставит сам контейнер
 * (`plateBoxShadow(g)`). Ниже старые константы KIT_GLASS_* остались только как значения по умолчанию для мест без доступа к теме.
 *
 * зачем (замечание владельца 10.10): блик, кромка и тень берутся из токенов выбранной темы (mediaInk / bevelHi / bevelLo /
 * hairlineSoft / dropShadow), а не белым и чёрным «под Аврору». Константы KIT_GLASS_* ниже — значения по умолчанию
 * для мест без доступа к теме; слой стекла и глянец кнопки читают тему сами.
 */

/** Тень крупных поверхностей (`--lg-drop`). Ставить на САМ контейнер: `boxShadow: KIT_GLASS_DROP`. */
export const KIT_GLASS_DROP: BoxShadowValue[] = [
  { offsetX: 0, offsetY: 16, blurRadius: 28, spreadDistance: -14, color: 'rgba(0,0,0,0.75)' }, // theme-exempt: значение по умолчанию без темы (плашка «Тень», тёмная)
];

/** Главная белая кнопка (`.cta`): светлее сверху, блик по верхней кромке, тень снизу. */
export const KIT_CTA_GRADIENT = ['#FFFFFF', '#F2F1F6', '#E3E2E8'] as const; // theme-exempt: эталон глянца для cta #F2F1F6 («Спокойно»); у других тем градиент считается от их cta
export const KIT_CTA_GRADIENT_LOCATIONS = [0, 0.48, 1] as const;
const mixHex6 = (hex: string, to: number, k: number): string => {
  const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16);
  if (!Number.isFinite(n)) return hex;
  const ch = (shift: number) => Math.round(((n >> shift) & 255) * (1 - k) + to * k).toString(16).padStart(2, '0');
  return `#${ch(16)}${ch(8)}${ch(0)}`.toUpperCase();
};

/**
 * Цвета глянца `.cta` от цвета кнопки темы. Для `--cta #F2F1F6` — ровно макет (kit.css:197);
 * для тонированных тем та же форма: верх светлее, низ на ~6 % темнее (#F2F1F6 → #E3E2E8).
 */
export function kitCtaGlossColors(cta: string): readonly [string, string, string] {
  const base = cta.slice(0, 7).toUpperCase();
  if (base === KIT_CTA_GRADIENT[1]) return KIT_CTA_GRADIENT;
  return [mixHex6(base, 255, 0.85), base, mixHex6(base, 0, 0.062)];
}

/**
 * Подложка кнопки действия в стиле «Тень»: цветная тень `0 14 24 −10` цвета кнопки 60 % — и всё. Глянцевый градиент, блик по верхней
 * кромке и тёмная нижняя кромка убраны (обводки/кромки запрещены). Первым ребёнком кнопки с тем же скруглением; статична.
 * Тень обрежется, если у кнопки overflow: hidden. Имя `KitCtaGloss` оставлено, чтобы не переписывать 5 вызывающих.
 */
export const KitCtaGloss = memo(function KitCtaGloss({ cta, radius }: { cta: string; radius: number }) {
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, boxShadow: actionBoxShadow({ accent: cta }) }]} />;
});

/**
 * Слой плашки: градиент 180° из токенов темы (стиль «Тень»). Первым ребёнком контейнера с тем же скруглением.
 * `rim` оставлен для совместимости вызовов и ничего не меняет: кромки больше нет.
 */
export const KitGlassLayer = memo(function KitGlassLayer({ radius, raised = false }: { radius: number; rim?: boolean; raised?: boolean }) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  return <PlateFill g={g} radius={radius} raised={raised} />;
});
