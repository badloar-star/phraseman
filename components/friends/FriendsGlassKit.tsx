import React from 'react';
import { ActivityIndicator, Image as RNImage, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { coinRankRowForDisplay, isValidCoinRank } from '../../app/coin_rank_table_v1';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { ThemeAccentFill } from '../v2/ThemeAccentFill';
import { ThemeGlassSmoke } from '../v2/ThemeGlassSmoke';
import { nestedBoxShadow, plateBoxShadow } from '../v2/ShadowSurface';
import PressableHybrid from '../PressableHybrid';
import { LinearGradient } from '../SafeLinearGradient';
import { FONT_SCALE, useTheme } from '../ThemeContext';
import { FlowText } from '../text-integrity';

// зачем (владелец 2026-09-29): вкладка «Друзья» переносится 1 в 1 по макету community.html
// (COM-04, Liquid Glass). Общие кирпичи собраны здесь один раз: плашка, монета/кружок с
// инициалом, кнопки cta / ghost / round, заголовок секции. Токены — только из
// liquidGlassTokens (13 тем); обводки — лишь тонкая полупрозрачная 1 px (glassEdge) как в макете.

export type FriendsGlass = ReturnType<typeof liquidGlassTokens>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Токены активной темы + множитель шрифта (как у FriendStudyInviteModal): крупный шрифт растёт вместе с ОС-настройкой. */
export function useFriendsGlass(): { glass: FriendsGlass; textScale: number } {
  const { fontSize, liquidGlassThemeId, uiScale } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  return { glass, textScale: (FONT_SCALE[fontSize] / FONT_SCALE.medium) * uiScale };
}

/** `.card.list-row` макета: минимум 64, радиус 14, поля 10/14, зазор 14. */
export function friendsCardStyle(glass: FriendsGlass): ViewStyle {
  return {
    minHeight: 64,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 14,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: glass.opaqueCard,
    boxShadow: plateBoxShadow(glass), // зачем (владелец 12.10, стиль «Тень»): без обводки — отделяют тон и малая внешняя тень (плашка списка друзей)
    overflow: 'hidden',
  };
}

/** Плашка-контейнер с мягким бликом (то же устройство, что SettingsGlassCard). */
export function FriendsCard({ glass, children, testID, style }: {
  glass: FriendsGlass;
  children: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View testID={testID} style={[friendsCardStyle(glass), style]}>
      <LinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }} />
      {/* зачем (темы 2.0): цветная дымка внутри карточки — только «Максимум». */}
      <ThemeGlassSmoke glass={glass} />
      {children}
    </View>
  );
}

/** Монета ранга друга; данных ранга нет — нейтральный кружок с инициалом (ранги не выдумываем). */
export function FriendsCoin({ coinRank, name, size, glass }: {
  coinRank?: number | null;
  name: string;
  size: number;
  glass: FriendsGlass;
}) {
  const row = isValidCoinRank(coinRank) ? coinRankRowForDisplay(coinRank) : null;
  if (row) {
    return (
      <RNImage
        testID="friends-coin"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no"
        resizeMode="contain"
        source={row.source}
        style={{ width: size, height: size }}
      />
    );
  }
  const initial = String(name ?? '').trim().slice(0, 1).toUpperCase() || '—';
  return (
    <View
      testID="friends-initial"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: glass.opaqueControl }}
    >
      <Text style={{ color: glass.text, fontSize: Math.round(size * 0.42), fontWeight: '700' }}>{initial}</Text>
    </View>
  );
}

/** `.section-title`: 19/24, жирный. */
export function FriendsSectionTitle({ glass, textScale, children }: { glass: FriendsGlass; textScale: number; children: React.ReactNode }) {
  return (
    <FlowText testID="friends-section-title" provenance="authored" accessibilityRole="header" style={{ flexShrink: 1, color: glass.text, fontSize: 19 * textScale, lineHeight: 24 * textScale, fontWeight: '700' }}>
      {children}
    </FlowText>
  );
}

type ButtonProps = {
  glass: FriendsGlass;
  textScale: number;
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  /** `.cta.sm`: 42 по макету, но область нажатия не меньше 44 dp. */
  compact?: boolean;
  disabled?: boolean;
  icon?: IconName;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/** `.cta` / `.cta.gh` макета: капсула, светлая заливка темы или прозрачная с тонким контуром. */
export function FriendsGlassButton({ glass, textScale, label, onPress, variant = 'primary', compact = false, disabled = false, icon, testID, accessibilityLabel, style }: ButtonProps) {
  const primary = variant === 'primary';
  const height = compact ? 44 : 48;
  // зачем (темы 2.0): главная кнопка в цвете темы; в «Спокойно» accent/accentInk = cta/ctaInk.
  // зачем (владелец 13.10, №35 «кнопки не сливаются»): заливки — токены кнопок темы: отключённая buttonFillDisabled/buttonInkDisabled (подпись >= 4,5), вторичная buttonFill, главная ctaFill
  const ink = disabled ? glass.buttonInkDisabled : primary ? glass.accentInk : glass.text;
  return (
    <PressableHybrid
      testID={testID}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      withSound={false}
      variant={primary ? 'primary' : 'secondary'}
      style={style}
      contentStyle={{
        minHeight: height,
        borderRadius: height / 2,
        paddingHorizontal: compact ? 18 : 22,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        overflow: 'hidden',
        backgroundColor: disabled ? glass.buttonFillDisabled : primary ? glass.ctaFill : glass.buttonFill,
        boxShadow: primary && !disabled ? undefined : nestedBoxShadow(glass), // зачем (владелец 12.10, стиль «Тень»): без обводки — отделяют тон и малая внешняя тень (ghost-кнопка)
      }}
    >
      {/* зачем (координатор 05.10): в «Спокойно-тёмном» — общий глянец .cta макета из ThemeAccentFill, а не свой градиент. */}
      {primary && !disabled ? <ThemeAccentFill glass={glass} radius={height / 2} /> : null}
      {icon ? <Ionicons name={icon} size={18} color={ink} /> : null}
      <FlowText testID="friends-button-label" provenance="authored" style={{ flexShrink: 1, textAlign: 'center', color: ink, fontSize: (compact ? 16 : 17) * textScale, lineHeight: (compact ? 21 : 22) * textScale, fontWeight: compact ? '600' : '700', includeFontPadding: false }}>
        {label}
      </FlowText>
    </PressableHybrid>
  );
}

/** `.rb` макета: круглая кнопка-значок, 44 dp (макет 42 + запас под область нажатия). */
export function FriendsRoundButton({ glass, icon, onPress, label, testID, disabled = false, size = 44, radius, bare = false, haptic = true, style }: {
  glass: FriendsGlass;
  icon: IconName;
  onPress: () => void;
  label: string;
  testID?: string;
  disabled?: boolean;
  size?: number;
  radius?: number;
  /** `.rb.bare` — без подложки (крестик в карточке). */
  bare?: boolean;
  /** false — вызывающий обработчик уже даёт тактильный отклик сам. */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <PressableHybrid
      testID={testID}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      withHaptic={haptic}
      withSound={false}
      variant="icon"
      style={[{ width: size, height: size }, style]}
      contentStyle={{
        width: size,
        height: size,
        borderRadius: radius ?? size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: bare ? 'transparent' : glass.opaqueControl,
        boxShadow: bare ? undefined : nestedBoxShadow(glass), // зачем (владелец 12.10, стиль «Тень»): без обводки — отделяют тон и малая внешняя тень (круглая кнопка)
        opacity: disabled ? 0.48 : 1,
      }}
    >
      <Ionicons name={icon} size={20} color={glass.text} />
    </PressableHybrid>
  );
}

/** `.cf-feedback` макета: значок + 13/18, ошибка — цвет ошибки темы, успех — цвет успеха темы (семантика не перекрашивается). */
export function FriendsFeedbackRow({ tone, text, testID, textScale, style }: {
  /** `pending` — «Отправляем заявку…» (решение владельца 12.10, п.81 (13), community-010): тихий тон и крутилка вместо значка результата. */
  tone: 'error' | 'success' | 'pending';
  text: string;
  testID?: string;
  textScale: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme: t } = useTheme();
  const color = tone === 'error' ? t.wrong : tone === 'pending' ? t.textMuted : t.correct;
  const nl = text.indexOf('\n');
  const title = nl < 0 ? text : text.slice(0, nl);
  const hint = nl < 0 ? '' : text.slice(nl + 1).trim();
  return (
    <View testID={testID} accessibilityRole="alert" accessibilityLiveRegion="polite" style={[{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }, style]}>
      {tone === 'pending'
        ? <ActivityIndicator size="small" color={color} style={{ width: 18, height: 18 }} />
        : <Ionicons name={tone === 'error' ? 'flag-outline' : 'checkmark-circle-outline'} size={18} color={color} />}
      {/* зачем (community.html, телефон 9 «Ответы поиска»): ответ = заголовок + короткая подсказка;
          вторая строка приходит через \n, без неё остаётся прежний однострочный вид. */}
      <View style={{ flex: 1 }}>
        <Text style={{ color, fontSize: 13 * textScale, lineHeight: 18 * textScale, fontWeight: hint ? '700' : '400' }}>{title}</Text>
        {hint ? <Text style={{ color, opacity: 0.8, fontSize: 13 * textScale, lineHeight: 18 * textScale }}>{hint}</Text> : null}
      </View>
    </View>
  );
}
