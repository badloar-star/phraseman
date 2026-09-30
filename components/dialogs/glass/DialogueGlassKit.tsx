import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import PressableHybrid from '../../PressableHybrid';
import { useTheme } from '../../ThemeContext';
import { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';

// зачем (владелец 2026-09-30): V2-экраны «Диалогов» переносятся «1 в 1» по макету
// dialogs.html (Liquid Glass). Здесь один раз собраны презентационные части макета из
// токенов активной из 13 тем: круглая «‹» (.rb.l), квадратная «⋯» (.rb.sq), главная кнопка
// (.cta / .cta.sm / .cta.dis), стеклянная карточка (.bcard), системная плашка ошибки
// (.syserr) и экран-гейт (.gate). Только ВИД: что делает нажатие, решает экран/маршрут.
// Обводки — только 1 px полупрозрачная кромка темы (исключение PhraseMan 2.0).

export type DialogueGlass = ReturnType<typeof liquidGlassTokens>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Токены активной темы Liquid Glass (graphite по умолчанию). */
export function useDialogueGlass(): DialogueGlass {
  const { liquidGlassThemeId } = useTheme();
  return React.useMemo(() => liquidGlassTokens(liquidGlassThemeId), [liquidGlassThemeId]);
}

/** Карточка `.bcard`/`.goal`: непрозрачное стекло + 1 px кромка. */
export function dialogueGlassCardStyle(glass: DialogueGlass, radius = 18): ViewStyle {
  return {
    borderRadius: radius,
    backgroundColor: glass.opaqueCard,
    borderWidth: 1, // guard-ok: 1 px полупрозрачная кромка стекла (макет dialogs.html)
    borderColor: glass.glassEdge, // guard-ok: 1 px кромка стекла
    overflow: 'hidden',
  };
}

/** Тон кнопок шапки + 1 px кромка темы. */
function controlFill(glass: DialogueGlass): ViewStyle {
  return {
    backgroundColor: glass.opaqueControl,
    borderColor: glass.glassEdge, // guard-ok: 1 px полупрозрачная кромка PhraseMan 2.0
  };
}

/** Круглая «‹» (`.rb.l`) — 44 dp, плоский тон темы. */
export function DialogueGlassBackButton({
  glass, onPress, accessibilityLabel, testID, icon = 'chevron-back',
}: Readonly<{ glass: DialogueGlass; onPress: () => void; accessibilityLabel: string; testID?: string; icon?: IconName }>) {
  return (
    <PressableHybrid
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      withSound={false}
      variant="icon"
      style={styles.hit44}
      contentStyle={[styles.round44, controlFill(glass)]}
    >
      <Ionicons name={icon} size={20} color={glass.text} />
    </PressableHybrid>
  );
}

/** Квадратная кнопка шапки (`.rb.sq`, «⋯») — 44 dp, радиус 13. */
export function DialogueGlassSquareButton({
  glass, onPress, accessibilityLabel, icon, disabled, testID, children,
}: Readonly<{
  glass: DialogueGlass; onPress: () => void; accessibilityLabel: string; icon?: IconName;
  disabled?: boolean; testID?: string; children?: React.ReactNode;
}>) {
  return (
    <PressableHybrid
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      withSound={false}
      variant="icon"
      style={styles.hit44}
      contentStyle={[styles.square44, controlFill(glass), { opacity: disabled ? 0.55 : 1 }]}
    >
      {children ?? (icon ? <Ionicons name={icon} size={18} color={glass.text} /> : null)}
    </PressableHybrid>
  );
}

export interface DialogueGlassCtaProps {
  glass: DialogueGlass;
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  /** `.cta .ar` — стрелка справа («Начать диалог →»). */
  trailingArrow?: boolean;
  /** `.cta.sm` — компактная кнопка по центру (плашка ошибки). */
  size?: 'full' | 'small';
  /** `.cta.gh` — вторичная (тон темы вместо светлой заливки). */
  ghost?: boolean;
  icon?: IconName;
  testID?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Главная кнопка макета: 52/26 (`.cta`), 44/22 (`.cta.sm`); выключенная — `.cta.dis`. */
export function DialogueGlassCta({
  glass, label, onPress, disabled, trailingArrow, size = 'full', ghost, icon, testID, accessibilityLabel, style,
}: DialogueGlassCtaProps) {
  const small = size === 'small';
  const light = !disabled && !ghost;
  const ink = disabled ? glass.mutedText : light ? glass.ctaInk : glass.text;
  return (
    <PressableHybrid
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || !onPress}
      onPress={onPress}
      variant={light ? 'primary' : 'secondary'}
      withSound={false}
      style={[small ? styles.ctaSmallHit : styles.ctaHit, style]}
      contentStyle={[
        small ? styles.ctaSmall : styles.cta,
        { backgroundColor: light ? glass.cta : glass.opaqueControl, opacity: disabled ? 0.72 : 1 },
      ]}
    >
      {icon ? <Ionicons name={icon} size={small ? 18 : 20} color={ink} /> : null}
      <Text maxFontSizeMultiplier={1.3} style={[small ? styles.ctaSmallText : styles.ctaText, { color: ink }]}>{label}</Text>
      {trailingArrow ? (
        <View pointerEvents="none" style={styles.ctaArrow}>
          <Ionicons name="arrow-forward" size={20} color={ink} />
        </View>
      ) : null}
    </PressableHybrid>
  );
}

/** Системная плашка `.syserr` по центру ленты: не реплика персонажа. «Повторить» — если есть. */
export function DialogueGlassSysError({
  glass, message, retryLabel, onRetry, retryDisabled, testID,
}: Readonly<{
  glass: DialogueGlass; message: string; retryLabel?: string; onRetry?: () => void;
  retryDisabled?: boolean; testID?: string;
}>) {
  return (
    <View testID={testID} style={[dialogueGlassCardStyle(glass, 16), styles.sysErr]}>
      <View style={styles.sysErrRow} accessible accessibilityRole="alert" accessibilityLabel={message}>
        <Ionicons name="alert-circle-outline" size={18} color={glass.secondary} style={styles.sysErrIcon} />
        <Text maxFontSizeMultiplier={1.4} style={[styles.sysErrText, { color: glass.secondary }]}>{message}</Text>
      </View>
      {retryLabel && onRetry ? (
        <DialogueGlassCta
          glass={glass}
          size="small"
          icon="refresh"
          label={retryLabel}
          onPress={onRetry}
          disabled={retryDisabled}
          style={styles.sysErrCta}
        />
      ) : null}
    </View>
  );
}

/**
 * Экран-гейт `.gate` (загрузка, «Диалоги недоступны», «Нужен Plus»): «‹» сверху, круг со
 * значком 84, заголовок 26/32, текст, кнопка. Безопасные зоны сверху и снизу.
 */
export function DialogueGlassGate({
  glass, testID, backLabel, onBack, icon, title, message, loading, action, secondaryAction,
}: Readonly<{
  glass: DialogueGlass;
  testID: string;
  backLabel: string;
  onBack: () => void;
  icon?: IconName;
  title: string;
  message?: string;
  loading?: boolean;
  action?: Readonly<{ label: string; onPress: () => void; disabled?: boolean }>;
  secondaryAction?: Readonly<{ label: string; onPress: () => void }>;
}>) {
  return (
    <View testID={testID} style={[styles.fill, { backgroundColor: glass.bg }]}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.fill}>
        <View style={styles.gateTop}>
          <DialogueGlassBackButton glass={glass} onPress={onBack} accessibilityLabel={backLabel} />
        </View>
        <View style={styles.gateBody}>
          <View style={[styles.gateBig, { backgroundColor: glass.opaqueControl }]}>
            {loading ? (
              <ActivityIndicator color={glass.text} />
            ) : (
              <Ionicons name={icon ?? 'chatbubbles-outline'} size={38} color={glass.text} />
            )}
          </View>
          <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={[styles.gateTitle, { color: glass.text }]}>{title}</Text>
          {message ? (
            <Text maxFontSizeMultiplier={1.4} style={[styles.gateText, { color: glass.secondary }]}>{message}</Text>
          ) : null}
          {action ? (
            <DialogueGlassCta glass={glass} label={action.label} onPress={action.onPress} disabled={action.disabled} style={styles.gateCta} />
          ) : null}
          {secondaryAction ? (
            <DialogueGlassCta glass={glass} ghost label={secondaryAction.label} onPress={secondaryAction.onPress} style={styles.gateCta2} />
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hit44: { width: 44, height: 44 },
  round44: {
    width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, // guard-ok: 1 px полупрозрачная кромка PhraseMan 2.0
  },
  square44: {
    width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, // guard-ok: 1 px полупрозрачная кромка PhraseMan 2.0
  },
  ctaHit: { alignSelf: 'stretch' },
  cta: {
    minHeight: 52, borderRadius: 26, paddingHorizontal: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  ctaText: { fontSize: 17, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  ctaSmallHit: { alignSelf: 'center', width: 'auto' },
  ctaSmall: {
    minHeight: 44, borderRadius: 22, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaSmallText: { fontSize: 16, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  ctaArrow: { position: 'absolute', right: 22, top: 0, bottom: 0, justifyContent: 'center' },
  sysErr: { alignSelf: 'center', maxWidth: '92%', marginTop: 18, paddingHorizontal: 16, paddingVertical: 14 },
  sysErrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  sysErrIcon: { marginTop: 2 },
  sysErrText: { flexShrink: 1, fontSize: 15, lineHeight: 21 },
  sysErrCta: { marginTop: 12 },
  gateTop: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row' },
  gateBody: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  gateBig: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  gateTitle: { marginTop: 22, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  gateText: { marginTop: 10, fontSize: 17, lineHeight: 24, textAlign: 'center', paddingHorizontal: 8 },
  gateCta: { marginTop: 30 },
  gateCta2: { marginTop: 12 },
});
