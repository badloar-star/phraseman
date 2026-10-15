import React from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import PressableHybrid from '../../PressableHybrid';
import { useTheme } from '../../ThemeContext';
import { liquidGlassTokens } from '../../../constants/liquidGlassThemePalette';
import { actionBoxShadow, nestedBoxShadow, plateBoxShadow } from '../../v2/ShadowSurface';
import { ThemeAccentFill } from '../../v2/ThemeAccentFill';
import SkeletonBlock from '../../SkeletonShimmer';
import { glassTone } from './glassTone';

// зачем (владелец 2026-09-30): V2-экраны «Диалогов» переносятся «1 в 1» по макету
// dialogs.html (Liquid Glass). Здесь один раз собраны презентационные части макета из
// токенов активной из 13 тем: круглая «‹» (.rb.l), квадратная «⋯» (.rb.sq), главная кнопка
// (.cta / .cta.sm / .cta.dis), стеклянная карточка (.bcard), системная плашка ошибки
// (.syserr) и экран-гейт (.gate). Только ВИД: что делает нажатие, решает экран/маршрут.
// зачем (стиль «Тень», владелец 12.10): контейнеры БЕЗ обводок и внутренних кромок — плашку отделяет тень
// (docs/design/v2-app/SHADOW_STYLE_SPEC.md, эталон shadow-style-etalon.html «Диалоги»); числа берутся из components/v2/ShadowSurface.

export type DialogueGlass = ReturnType<typeof liquidGlassTokens>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Токены активной темы Liquid Glass (graphite по умолчанию). */
export function useDialogueGlass(): DialogueGlass {
  const { liquidGlassThemeId } = useTheme();
  // зачем (темы 2.0): без useMemo — токены зависят ещё от уровня цвета и оформления; поиск кэширован.
  return liquidGlassTokens(liquidGlassThemeId);
}

/** Карточка `.bcard`/`.goal`: плашка стиля «Тень» — заливка плашки и тень вниз, без обводки и кромки. */
export function dialogueGlassCardStyle(glass: DialogueGlass, radius = 18): ViewStyle {
  // зачем (стиль «Тень»): прежняя кромка (borderWidth, bevelHi/bevelLo, hairlineSoft) снята — плашку отделяет plateBoxShadow;
  // overflow: 'hidden' убран, иначе тень обрезается на iOS (содержимое карточек — текст и кнопки, скругление им не нужно).
  return {
    borderRadius: radius,
    backgroundColor: glass.plateFillFrom,
    boxShadow: plateBoxShadow(glass),
  };
}

/** Тон кнопок шапки: вложенная плашка стиля «Тень» — тон и малая тень, без кромки. */
function controlFill(glass: DialogueGlass): ViewStyle {
  return {
    backgroundColor: glass.opaqueControl,
    boxShadow: nestedBoxShadow(glass),
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
  /** Действие идёт (R52): тапы не принимаются, кнопка приглушена и без стрелки; как primaryBusy у V2DoneScreen. */
  busy?: boolean;
}

/** Главная кнопка макета: 52/26 (`.cta`), 44/22 (`.cta.sm`); выключенная — `.cta.dis`. */
export function DialogueGlassCta({
  glass, label, onPress, disabled, trailingArrow, size = 'full', ghost, icon, testID, accessibilityLabel, style, busy = false,
}: DialogueGlassCtaProps) {
  const small = size === 'small';
  const light = !disabled && !ghost;
  // зачем (темы 2.0): главная кнопка в цвете темы; в «Спокойно» accent/accentInk = cta/ctaInk.
  const ink = disabled ? glass.mutedText : light ? glass.accentInk : glass.text;
  return (
    <PressableHybrid
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled, busy }}
      disabled={disabled || busy || !onPress}
      onPress={onPress}
      variant={light ? 'primary' : 'secondary'}
      withSound={false}
      style={[small ? styles.ctaSmallHit : styles.ctaHit, style]}
      contentStyle={[
        small ? styles.ctaSmall : styles.cta,
        {
          backgroundColor: light ? glass.accent : glass.opaqueControl,
          // зачем (стиль «Тень»): главная — цветная тень темы, вторичная — малая тень; выключенная плоская
          boxShadow: disabled ? undefined : light ? actionBoxShadow(glass) : nestedBoxShadow(glass),
          opacity: disabled || busy ? 0.72 : 1,
        },
      ]}
    >
      {light ? <ThemeAccentFill glass={glass} radius={small ? 22 : 26} /> : null}
      {icon ? <Ionicons name={icon} size={small ? 18 : 20} color={ink} /> : null}
      <Text maxFontSizeMultiplier={1.3} style={[small ? styles.ctaSmallText : styles.ctaText, { color: ink }]}>{label}</Text>
      {/* зачем (аудит кнопок R52): занятость — приглушение и отказ от тапов (как primaryBusy у V2DoneScreen); спиннеров в наборе диалогов нет (E2) */}
      {trailingArrow && !busy ? (
        // зачем (R1 dialogs-005, Макеты 12.10): у маленькой кнопки ширина «по тексту» — абсолютная стрелка (right: 22, как у полной 52/26) наезжала на «м» в «К урокам».
        // Стрелка идёт обычным элементом строки после текста через gap, как в образце (`.cta.sm`: текст + стрелка 18).
        <View pointerEvents="none" style={small ? undefined : styles.ctaArrow}>
          <Ionicons name="arrow-forward" size={small ? 18 : 20} color={ink} />
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
/** Скелет экрана диалога под настоящей шапкой: заголовок, карточка цели, два пузыря, поле ввода — формы будущего содержимого, без спиннера. */
function DialogueGlassSceneSkeleton({ glass, label, testID }: Readonly<{ glass: DialogueGlass; label: string; testID: string }>) {
  const base = glassTone(glass.text, 0.09);
  const highlight = glassTone(glass.text, 0.15);
  return (
    <View testID={testID} accessible accessibilityLabel={label} accessibilityState={{ busy: true }} style={{ flex: 1, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16 }}>
      <SkeletonBlock width="58%" height={30} borderRadius={10} baseColor={base} highlightColor={highlight} />
      <View style={{ height: 10 }} />
      <SkeletonBlock width="38%" height={16} borderRadius={8} baseColor={base} highlightColor={highlight} />
      <View style={[dialogueGlassCardStyle(glass, 22), { marginTop: 22, paddingHorizontal: 16, paddingVertical: 16, gap: 10 }]}>
        <SkeletonBlock width="30%" height={14} borderRadius={7} baseColor={base} highlightColor={highlight} />
        <SkeletonBlock width="88%" height={20} borderRadius={8} baseColor={base} highlightColor={highlight} />
      </View>
      <View style={{ marginTop: 22, gap: 12 }}>
        <SkeletonBlock width="72%" height={64} borderRadius={20} baseColor={base} highlightColor={highlight} />
        <View style={{ alignItems: 'flex-end' }}>
          <SkeletonBlock width="56%" height={48} borderRadius={20} baseColor={base} highlightColor={highlight} />
        </View>
      </View>
      <View style={{ flex: 1 }} />
      <SkeletonBlock width="100%" height={52} borderRadius={26} baseColor={base} highlightColor={highlight} />
    </View>
  );
}

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
        {loading ? (
          // зачем (E2, координатор 12.10; правило владельца «никаких спиннеров на весь экран»): загрузка — скелет экрана на месте будущего содержимого (заголовок, цель, пузыри, поле ввода),
          // а не круг со спиннером и «Загружаем диалоги…». Шапка с «назад» уже настоящая; подпись загрузки остаётся только для озвучки экрана.
          <DialogueGlassSceneSkeleton glass={glass} label={title} testID={`${testID}-skeleton`} />
        ) : (
        <View style={styles.gateBody}>
          <View style={[styles.gateBig, { backgroundColor: glass.opaqueControl }]}>
            <Ionicons name={icon ?? 'chatbubbles-outline'} size={38} color={glass.text} />
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
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  hit44: { width: 44, height: 44 },
  round44: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  square44: { width: 44, height: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  ctaHit: { alignSelf: 'stretch' },
  cta: {
    minHeight: 52, borderRadius: 26, paddingHorizontal: 52,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  ctaText: { fontSize: 16, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  ctaSmallHit: { alignSelf: 'center', width: 'auto' },
  // зачем (эмулятор 02.10): обёртка PressableHybrid даёт содержимому width:100%, а у маленькой кнопки
  // ширина «по содержимому» — Android раздувал плашку и прижимал «Ещё раз» вправо. Ширина — по тексту.
  ctaSmall: {
    width: 'auto', minHeight: 44, borderRadius: 22, paddingHorizontal: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  ctaSmallText: { fontSize: 16, lineHeight: 21, fontWeight: '600', textAlign: 'center' },
  ctaArrow: { position: 'absolute', right: 22, top: 0, bottom: 0, justifyContent: 'center' },
  sysErr: { alignSelf: 'center', maxWidth: '92%', marginTop: 18, paddingHorizontal: 16, paddingVertical: 14 },
  sysErrRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  sysErrIcon: { marginTop: 2 },
  sysErrText: { flexShrink: 1, fontSize: 16, lineHeight: 22 },
  sysErrCta: { marginTop: 12 },
  gateTop: { paddingHorizontal: 16, paddingTop: 8, flexDirection: 'row' },
  // зачем (R1_DIFF_ONE_FIX, dialogs-gap-010 / dialogs-gap-003: блок на ≈100 dp ниже образца): макет `.gate { margin-top: 150px }` — блок стоит сверху на фиксированном отступе, а не по центру высоты; 194 = 150 макета + шапка со статус-баром
  // зачем (разбор размеров реестра 13.10, dialogs-033; замер кадра: значок на 296 dp при 246 css px в образце): `.gate { margin-top: 150px }` считается ПОСЛЕ строки шапки с «назад», а здесь шапка (`gateTop`) уже отдельный блок над телом — 194 (= 150 + шапка 44) считали шапку второй раз. Верно 150.
  gateBody: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 150, paddingHorizontal: 24, paddingBottom: 40 },
  gateBig: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center' },
  gateTitle: { marginTop: 22, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0.3, textAlign: 'center' },
  gateText: { marginTop: 10, fontSize: 16, lineHeight: 22, textAlign: 'center', paddingHorizontal: 8 },
  gateCta: { marginTop: 30 },
  gateCta2: { marginTop: 12 },
});
