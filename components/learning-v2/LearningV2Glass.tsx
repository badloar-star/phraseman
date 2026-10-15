import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { ThemeAccentFill } from '../v2/ThemeAccentFill';
import { actionBoxShadow, plateBoxShadow, raisedBoxShadow, RAISED_LIFT } from '../v2/ShadowSurface';
import { hapticTap } from '../../hooks/use-haptics';
import { useTheme } from '../ThemeContext';

// зачем (владелец 2026-09-30): весь Learning V2 (карта, окна, интро, шесть режимов занятия,
// итог) переносится 1 в 1 по макету learning-v2.html (Liquid Glass). Общие детали — чип-слово,
// плита-вариант `.opt`, главная кнопка `.cta`, пояснение `.expl`, карточка — собраны здесь один
// раз вместо разрозненных копий цветов в каждом из ~20 файлов. Только ВИД: проверка ответов,
// энергия, попытки, награды и озвучка остаются в экранах. Цвета — токены темы; «верно/неверно»
// взяты из kit.css макета (--good/--bad). Обводок у контейнеров НЕТ (стиль «Тень», владелец 12.10):
// плашку отделяют тень и заливка из components/v2/ShadowSurface; кольцо остаётся только у исхода «верно/неверно». Хаптик — только на управляющих кнопках (CTA); чипы-слова и плиты — без него
// сверх уже имеющегося (правило владельца: на плитках/буквах вибрация, но не клик-звук).

/** kit.css: --good / --bad. */
export const LV2_GOOD = '#6FD08C'; // theme-exempt: запасное значение для кода вне темы; экраны берут g.good из токенов темы
export const LV2_BAD = '#F2766B'; // theme-exempt: запасное значение для кода вне темы; экраны берут g.bad из токенов темы

/** #RRGGBB + альфа 0..1 -> #RRGGBBAA. Не-hex значения возвращаются как есть. */
export function lv2Alpha(hex: string, opacity: number): string {
  if (!/^#[0-9a-fA-F]{6}$/u.test(hex)) return hex;
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

export type Lv2Glass = ReturnType<typeof liquidGlassTokens> & {
  readonly good: string;
  readonly bad: string;
  /** Заливка верного (.18 у чипа, .12 у плиты). */
  readonly goodFill: string;
  readonly goodSoft: string;
  readonly goodEdge: string;
  readonly badFill: string;
  readonly badSoft: string;
  readonly badEdge: string;
  /** Тонкая тень-«полка» под чипом (0 3px 0). */
  readonly plate: string;
};

/** Токены стекла активной темы + цвета вердикта. Мемоизировано по id темы. */
export function useLv2Glass(): Lv2Glass {
  const { liquidGlassThemeId } = useTheme();
  // зачем (темы 2.0): токены зависят ещё от уровня цвета и оформления — мемо по самому объекту токенов.
  const g = liquidGlassTokens(liquidGlassThemeId);
  return useMemo(() => {
    return {
      ...g,
      // зачем (релизный пол 10.10): вердикт «верно/неверно» берёт цвет темы (токены good/bad, контраст ≥ 4.5 на всех поверхностях);
      // в тёмной «Спокойно» это ≈ прежние #6FD08C / #F2766B, в светлых темах — глубже и читается.
      good: g.good,
      bad: g.bad,
      goodFill: lv2Alpha(g.good, 0.18),
      goodSoft: lv2Alpha(g.good, 0.12),
      goodEdge: lv2Alpha(g.good, 0.45),
      badFill: lv2Alpha(g.bad, 0.18),
      badSoft: lv2Alpha(g.bad, 0.12),
      badEdge: lv2Alpha(g.bad, 0.45),
      plate: 'rgba(0,0,0,0.34)', // theme-exempt: тень-«полка» под чипом — чёрная в любой теме, как в макете
    };
  }, [g]);
}

/**
 * Краски узла карты по состоянию (макет `.node.done/.cur/.next/.plus`): пройденный — светлая
 * площадка, текущий — белая, следующий — тёмная плита, закрытый — самая тёмная; значок и номер
 * читаются на своей площадке. `available` — материал есть и узел можно открыть.
 */
export function lv2NodePaint(
  g: Lv2Glass,
  state: 'completed' | 'current' | 'next' | 'locked',
  available: boolean,
): { readonly face: string; readonly ink: string } {
  // зачем (темы 2.0): пройденный узел карты — цвет темы (это «прогресс»); в «Спокойно» = cta.
  if (state === 'completed') return { face: g.accent, ink: g.accentInk };
  if (state === 'current' && available) return { face: g.text, ink: g.ctaInk };
  if (available) return { face: g.opaqueControl, ink: g.text };
  if (state === 'next') return { face: g.opaqueControl, ink: g.secondary };
  // зачем (сверка с learning-v2.html, 04.10): закрытый узел был цвета самой карточки главы (opaqueCard) и сливался с ней —
  // в макете у него виден кружок. Заливка как у «следующего», замок приглушённый.
  return { face: g.opaqueControl, ink: g.mutedText };
}

export type Lv2Verdict = 'idle' | 'ok' | 'bad' | 'dim';

/** Карточка `.card`/`.expl`: радиус 16, непрозрачная заливка и тень плашки — без обводки (стиль «Тень»). */
export function lv2CardStyle(g: Lv2Glass, radius = 16): ViewStyle {
  // зачем (владелец 12.10, «Тень»): кромка 1 px убрана, плашку отделяет тень; плоская заливка вместо градиента — функция отдаёт только стиль
  return {
    backgroundColor: g.plateFillFrom,
    borderRadius: radius,
    boxShadow: plateBoxShadow(g),
  };
}

/**
 * Чип-слово `.chip`: высота 46 (в компактном режиме 44), радиус 14, слово 17/600,
 * «полка» 3 px снизу. Верно — зелёная заливка, неверно — красная, как в макете.
 * Слово переносится, а не сжимается и не обрезается.
 */
export const Lv2Chip = memo(function Lv2Chip({
  children, onPress, verdict = 'idle', disabled, compact, accessibilityLabel, textStyle, style, selected,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  verdict?: Lv2Verdict;
  disabled?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  selected?: boolean;
}) {
  const g = useLv2Glass();
  const ok = verdict === 'ok';
  const bad = verdict === 'bad';
  // зачем (темы 2.0): выбранный вариант в цвете темы; в «Спокойно» accentSoft = selected.
  const bg = ok ? g.goodFill : bad ? g.badFill : selected ? g.accentSoft : g.opaqueControl;
  const ink = ok ? g.good : bad ? g.bad : g.text;
  const plate = ok ? lv2Alpha(LV2_GOOD, 0.25) : bad ? lv2Alpha(LV2_BAD, 0.25) : g.plate;
  return (
    <View style={[styles.chipPlate, { backgroundColor: plate, opacity: verdict === 'dim' ? 0.45 : 1 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: !!disabled || verdict === 'dim', selected: !!selected || ok }}
        disabled={disabled || verdict === 'dim'}
        onPress={() => {
          if (disabled) return;
          // Плитки/слова — вибрация, НЕ клик-звук (правило владельца).
          void hapticTap();
          onPress?.();
        }}
        hitSlop={{ top: 2, bottom: 2, left: 2, right: 2 }}
        style={({ pressed }) => [
          styles.chip,
          compact && styles.chipCompact,
          { backgroundColor: bg, transform: [{ translateY: pressed ? 2 : 0 }] },
        ]}
      >
        <Text style={[styles.chipText, { color: ink }, textStyle]}>{children}</Text>
      </Pressable>
    </View>
  );
});

/**
 * Плита-вариант `.opt`/`.mc`: высота от 56, текст по центру 17/600, отметка верно/неверно справа.
 * Выбранный вариант приподнят (тень и сдвиг вверх); верный/неверный — заливка .12 и кольцо исхода 1 px того же цвета.
 */
export const Lv2Option = memo(function Lv2Option({
  label, onPress, verdict = 'idle', selected, disabled, compact, accessibilityLabel, textStyle, style, showMark = true, testID,
}: {
  label: React.ReactNode;
  onPress?: () => void;
  verdict?: Lv2Verdict;
  selected?: boolean;
  disabled?: boolean;
  compact?: boolean;
  accessibilityLabel?: string;
  textStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  showMark?: boolean;
  testID?: string;
}) {
  const g = useLv2Glass();
  const ok = verdict === 'ok';
  const bad = verdict === 'bad';
  // зачем (темы 2.0): выбор в цвете темы; «верно/ошибка» темой не красятся никогда.
  // зачем (владелец 12.10, «Тень»): у плиты нет обводки; кольцо остаётся ТОЛЬКО у исхода ответа верно/неверно, выбранное приподнято тенью и сдвигом.
  const bg = ok ? g.goodSoft : bad ? g.badSoft : selected ? g.accentSoft : g.plateFillFrom;
  const edge = ok ? g.goodEdge : bad ? g.badEdge : null;
  const lifted = !!selected && !ok && !bad;
  const ink = ok ? g.good : bad ? g.bad : g.text;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (typeof label === 'string' ? label : undefined)}
      accessibilityState={{ disabled: !!disabled || verdict === 'dim', selected: !!selected || ok }}
      disabled={disabled || verdict === 'dim'}
      onPress={() => {
        if (disabled) return;
        void hapticTap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.opt,
        compact && styles.optCompact,
        {
          backgroundColor: bg,
          borderColor: edge ?? 'transparent',
          borderWidth: edge ? StyleSheet.hairlineWidth : 0, // shadow-ok: кольцо исхода ответа верно/неверно
          boxShadow: lifted ? raisedBoxShadow(g) : plateBoxShadow(g),
          transform: lifted ? [{ translateY: RAISED_LIFT }] : [],
          opacity: verdict === 'dim' ? 0.45 : pressed ? 0.86 : 1,
          paddingRight: showMark && (ok || bad) ? 48 : 18,
          paddingLeft: showMark && (ok || bad) ? 48 : 18,
        },
        style,
      ]}
    >
      <Text style={[styles.optText, { color: ink }, textStyle]}>{label}</Text>
      {showMark && (ok || bad) ? (
        <View style={styles.optMark} pointerEvents="none">
          <Ionicons name={ok ? 'checkmark' : 'close'} size={20} color={ink} />
        </View>
      ) : null}
    </Pressable>
  );
});

/**
 * Главная кнопка `.cta`: высота 52, радиус 26, надпись 17/700, цвет из токенов темы.
 * Недоступная — глухая плита (`.cta.dis`), без вибрации.
 */
export const Lv2Cta = memo(function Lv2Cta({
  children, onPress, disabled, ghost, style, accessibilityLabel, testID, right,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  /** Контурная кнопка `.cta.gh`. */
  ghost?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
  right?: React.ReactNode;
}) {
  const g = useLv2Glass();
  // зачем (темы 2.0): главная кнопка в цвете темы; в «Спокойно» accent/accentInk = cta/ctaInk.
  // зачем (владелец 12.10, «Тень»): контурная кнопка `.cta.gh` стала плашкой с малой тенью; кнопка действия — цветная тень темы
  // зачем (владелец 13.10, №35): токены кнопок темы — отключённая buttonFillDisabled/buttonInkDisabled (>= 4,5), вторичная buttonFill (>= 1,6 к поверхностям), главная ctaFill
  const bg = disabled ? g.buttonFillDisabled : ghost ? g.buttonFill : g.ctaFill;
  const ink = disabled ? g.buttonInkDisabled : ghost ? g.text : g.ctaFillInk;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        // Хаптик только на управляющих кнопках — правило владельца.
        void hapticTap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.cta,
        {
          backgroundColor: bg,
          boxShadow: disabled ? undefined : ghost ? plateBoxShadow(g) : actionBoxShadow(g),
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      {!disabled && !ghost ? <ThemeAccentFill glass={g} radius={26} /> : null}
      <Text style={[styles.ctaText, { color: ink }]}>{children}</Text>
      {right ? <View style={styles.ctaRight}>{right}</View> : null}
    </Pressable>
  );
});

/** Пояснение `.expl`: значок-лампочка и текст 15/21 в карточке. */
export const Lv2Explain = memo(function Lv2Explain({
  children, icon = 'bulb-outline', style, testID,
}: {
  children: React.ReactNode;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const g = useLv2Glass();
  return (
    <View testID={testID} accessibilityLiveRegion="polite" style={[styles.expl, lv2CardStyle(g), style]}>
      <Ionicons name={icon} size={20} color={g.secondary} style={styles.explIcon} />
      <Text style={[styles.explText, { color: g.text }]}>{children}</Text>
    </View>
  );
});

const styles = StyleSheet.create({
  chipPlate: { borderRadius: 14, paddingBottom: 3, alignSelf: 'flex-start' },
  chip: { minHeight: 46, paddingHorizontal: 18, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  chipCompact: { minHeight: 44, paddingHorizontal: 14 },
  // `.chip` 17/600 (D145 → 16).
  chipText: { fontSize: 16, lineHeight: 21, fontWeight: '600' },
  opt: {
    minHeight: 58, borderRadius: 14,
    paddingVertical: 12, alignItems: 'center', justifyContent: 'center',
  },
  optCompact: { minHeight: 48, paddingVertical: 8 },
  optText: { fontSize: 16, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  optMark: { position: 'absolute', right: 16, top: 0, bottom: 0, justifyContent: 'center' },
  cta: { minHeight: 52, borderRadius: 26, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 12 },
  ctaText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  ctaRight: { position: 'absolute', right: 22 },
  expl: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  explIcon: { marginTop: 1 },
  explText: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 22, fontWeight: '400' },
});
