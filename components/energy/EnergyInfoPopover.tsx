import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { triLang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useLang } from '../LangContext';
import { FONT_SCALE, useTheme } from '../ThemeContext';
import { LinearGradient } from '../SafeLinearGradient';
import {
  computeEnergyInfoPopoverLayout,
  createEnergyPopoverLifecycleGate,
  MAX_POPOVER_WIDTH,
  type EnergyInfoPopoverAnchor,
} from './energy_info_popover_layout';

export {
  createEnergyPopoverRequestGate,
  type EnergyInfoPopoverAnchor,
} from './energy_info_popover_layout';

export type EnergyInfoPopoverProps = Readonly<{
  anchor: EnergyInfoPopoverAnchor | null;
  visible: boolean;
  onClose: () => void;
  current: number;
  capacity: number;
  recoveryIntervalMs: number;
  formattedTime: string;
  isUnlimited: boolean;
}>;

function copyForLang(lang: Parameters<typeof triLang>[0], recoveryMinutes: number) {
  return {
    cadence: triLang(lang, {
      ru: `1 энергия каждые ${recoveryMinutes} мин`, uk: `1 енергія кожні ${recoveryMinutes} хв`,
      en: `+1 energy point every ${recoveryMinutes} min`, es: `+1 punto de energía cada ${recoveryMinutes} min`,
      'pt-BR': `+1 ponto de energia a cada ${recoveryMinutes} min`, vi: `+1 điểm năng lượng mỗi ${recoveryMinutes} phút`,
      id: `+1 poin energi setiap ${recoveryMinutes} mnt`, tr: `Her ${recoveryMinutes} dakikada +1 enerji puanı`,
      pl: `+1 punkt energii co ${recoveryMinutes} min`,
    }),
    in: triLang(lang, {
      ru: 'Через', uk: 'Через', en: 'In', es: 'En', 'pt-BR': 'Em', vi: 'Trong', id: 'Dalam', tr: 'İçinde', pl: 'Za',
    }),
    stockFull: triLang(lang, {
      ru: 'запас полон', uk: 'запас повний', en: 'stock full', es: 'reserva llena',
      'pt-BR': 'reserva cheia', vi: 'đã đầy', id: 'cadangan penuh', tr: 'depo dolu', pl: 'zapas pełny',
    }),
    unlimited: triLang(lang, {
      ru: 'Энергия безлимитная', uk: 'Енергія безлімітна', en: 'Unlimited energy', es: 'Energía ilimitada',
      'pt-BR': 'Energia ilimitada', vi: 'Năng lượng không giới hạn', id: 'Energi tak terbatas',
      tr: 'Sınırsız enerji', pl: 'Nieograniczona energia',
    }),
    close: triLang(lang, {
      ru: 'Закрыть информацию об энергии', uk: 'Закрити інформацію про енергію', en: 'Close energy information',
      es: 'Cerrar información de energía', 'pt-BR': 'Fechar informações de energia', vi: 'Đóng thông tin năng lượng',
      id: 'Tutup informasi energi', tr: 'Enerji bilgisini kapat', pl: 'Zamknij informacje o energii',
    }),
  };
}

export const EnergyInfoPopover = memo(function EnergyInfoPopover({
  anchor,
  visible,
  onClose,
  current,
  capacity,
  recoveryIntervalMs,
  formattedTime,
  isUnlimited,
}: EnergyInfoPopoverProps) {
  const { liquidGlassThemeId, fontSize, uiScale } = useTheme();
  const { lang } = useLang();
  const { width, height, fontScale } = useWindowDimensions();
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const textScale = (FONT_SCALE[fontSize] / FONT_SCALE.medium) * uiScale;
  const animation = useRef(new Animated.Value(0)).current;
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onCloseRef = useRef(onClose);
  const reduceMotionRef = useRef(reduceMotion);
  const lifecycleGateRef = useRef(createEnergyPopoverLifecycleGate());
  const lifecycleGate = lifecycleGateRef.current;
  const [measured, setMeasured] = useState<Readonly<{ key: string; height: number }> | null>(null);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
    reduceMotionRef.current = reduceMotion;
  }, [onClose, reduceMotion]);

  const recoveryMinutes = Math.max(1, Math.round(recoveryIntervalMs / 60_000));
  const copy = copyForLang(lang, recoveryMinutes);
  const isRecovering = !isUnlimited && current < capacity;
  const measurementKey = [
    width,
    height,
    insets.top,
    insets.right,
    insets.bottom,
    insets.left,
    lang,
    textScale,
    fontScale,
    recoveryMinutes,
    Boolean(formattedTime),
    current,
    capacity,
    isUnlimited ? 'unlimited' : isRecovering ? 'recovering' : 'full',
  ].join(':');
  const geometryReady = measured?.key === measurementKey;
  const layout = computeEnergyInfoPopoverLayout({
    windowWidth: width,
    windowHeight: height,
    insets,
    anchor,
    measuredHeight: geometryReady ? measured.height : 0,
  });

  const clearCloseTimer = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const closeForGeneration = useCallback((generation: number) => {
    if (!lifecycleGate.startClosing(generation)) return;
    clearCloseTimer();
    animation.stopAnimation();
    if (reduceMotionRef.current) {
      onCloseRef.current();
      return;
    }
    Animated.timing(animation, { toValue: 0, duration: 220, useNativeDriver: true }).start(({ finished }) => {
      if (finished && lifecycleGate.isCurrent(generation)) onCloseRef.current();
    });
  }, [animation, clearCloseTimer, lifecycleGate]);

  const requestClose = useCallback(() => {
    if (!lifecycleGate.canEnter()) return;
    const generation = lifecycleGate.begin();
    closeForGeneration(generation);
  }, [closeForGeneration, lifecycleGate]);

  useEffect(() => {
    animation.stopAnimation();
    clearCloseTimer();
    if (!visible) {
      lifecycleGate.invalidate();
      animation.setValue(0);
      setMeasured(null);
      return undefined;
    }

    const generation = lifecycleGate.begin();
    animation.setValue(0);
    closeTimer.current = setTimeout(() => {
      closeForGeneration(generation);
    }, 5000);

    return () => {
      lifecycleGate.invalidate();
      clearCloseTimer();
      animation.stopAnimation();
    };
  }, [animation, clearCloseTimer, closeForGeneration, lifecycleGate, visible]);

  useEffect(() => {
    if (!visible || !geometryReady) return undefined;
    if (!lifecycleGate.canEnter()) return undefined;
    animation.stopAnimation();
    if (reduceMotion) {
      animation.setValue(1);
      return undefined;
    }
    const enter = Animated.spring(animation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    });
    enter.start();
    return () => {
      if (lifecycleGate.canEnter()) enter.stop();
    };
  }, [animation, geometryReady, lifecycleGate, reduceMotion, visible]);

  const handleContentSizeChange = useCallback((_contentWidth: number, contentHeight: number) => {
    if (!Number.isFinite(contentHeight) || contentHeight <= 0) return;
    const nextHeight = Math.max(1, contentHeight);
    setMeasured((previous) => (
      previous?.key === measurementKey && previous.height === nextHeight
        ? previous
        : { key: measurementKey, height: nextHeight }
    ));
  }, [measurementKey]);

  const heading = isUnlimited
    ? copy.unlimited
    : `${current}/${capacity} · ${isRecovering ? copy.cadence : copy.stockFull}`;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={requestClose} statusBarTranslucent>
      <View style={styles.viewport}>
        <Pressable
          style={styles.backdrop}
          onPress={requestClose}
          accessibilityRole="button"
          accessibilityLabel={copy.close}
        />
        <Animated.View
          testID="energy-info-popover"
          accessibilityViewIsModal
          onAccessibilityEscape={requestClose}
          accessibilityElementsHidden={!geometryReady}
          importantForAccessibility={geometryReady ? 'auto' : 'no-hide-descendants'}
          pointerEvents={geometryReady ? 'auto' : 'none'}
          style={[
            styles.positioner,
            {
              width: layout.width,
              maxWidth: MAX_POPOVER_WIDTH,
              top: layout.top,
              left: layout.left,
              opacity: geometryReady ? animation : 0,
              transform: [
                { translateY: animation.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) },
                { scale: animation.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
              ],
            },
          ]}
        >
          {layout.showArrow ? (
            <>
              <View
                style={[
                  styles.arrowOuter,
                  layout.placement === 'above' ? styles.arrowOuterAbove : styles.arrowOuterBelow,
                  layout.placement === 'above'
                    ? { left: layout.arrowLeft, borderTopColor: glass.glassEdge }
                    : { left: layout.arrowLeft, borderBottomColor: glass.glassEdge },
                ]}
              />
              <View
                style={[
                  styles.arrowInner,
                  layout.placement === 'above' ? styles.arrowInnerAbove : styles.arrowInnerBelow,
                  layout.placement === 'above'
                    ? { left: layout.arrowLeft + 1, borderTopColor: glass.opaqueCard }
                    : { left: layout.arrowLeft + 1, borderBottomColor: glass.opaqueCard },
                ]}
              />
            </>
          ) : null}
          <View style={[styles.cardShadow, { width: layout.width }]}>
            <ScrollView
              key={measurementKey}
              style={{ width: layout.width, maxHeight: layout.maxHeight }}
              contentContainerStyle={styles.scrollContent}
              onContentSizeChange={handleContentSizeChange}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={[styles.card, { backgroundColor: glass.opaqueCard, borderColor: glass.glassEdge }]}>
                <LinearGradient
                  pointerEvents="none"
                  colors={[glass.selected, 'transparent']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0.9, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View style={styles.primaryRow}>
                  <Ionicons name="flash" size={18} color={glass.cta} />
                  <Text
                    style={[
                      styles.primaryText,
                      { color: glass.text, fontSize: 13 * textScale, lineHeight: 18 * textScale },
                    ]}
                  >
                    {isUnlimited ? copy.unlimited : heading}
                  </Text>
                </View>
                {isRecovering && formattedTime ? (
                  <View style={[styles.countdownRow, { backgroundColor: glass.selected }]}>
                    <Text style={[styles.countdownLabel, { color: glass.secondary, fontSize: 12 * textScale, lineHeight: 17 * textScale }]}>
                      {copy.in}
                    </Text>
                    <Text style={[styles.countdownValue, { color: glass.text, fontSize: 15 * textScale, lineHeight: 20 * textScale }]}>
                      {formattedTime}
                    </Text>
                  </View>
                ) : null}
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  viewport: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  positioner: { position: 'absolute' },
  cardShadow: { borderRadius: 17, shadowColor: '#000', shadowOpacity: 0.48, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 20 },
  scrollContent: { flexGrow: 0 },
  card: { borderRadius: 17, paddingVertical: 13, paddingHorizontal: 15, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  arrowOuter: { position: 'absolute', width: 0, height: 0, borderLeftWidth: 7, borderRightWidth: 7, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  arrowOuterAbove: { bottom: -7, borderTopWidth: 7 },
  arrowOuterBelow: { top: -7, borderBottomWidth: 7 },
  arrowInner: { position: 'absolute', width: 0, height: 0, borderLeftWidth: 6, borderRightWidth: 6, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  arrowInnerAbove: { bottom: -5.5, borderTopWidth: 6 },
  arrowInnerBelow: { top: -5.5, borderBottomWidth: 6 },
  primaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, minWidth: 0 },
  primaryText: { flex: 1, flexShrink: 1, fontWeight: '700' },
  countdownRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginTop: 10, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, minWidth: 0 },
  countdownLabel: { flex: 1, flexShrink: 1 },
  countdownValue: { flexShrink: 1, textAlign: 'right', fontWeight: '800', fontVariant: ['tabular-nums'] },
});

export default EnergyInfoPopover;
