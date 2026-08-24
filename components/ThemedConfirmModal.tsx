import React, { memo, useEffect, useMemo, useRef } from 'react';
import { LinearGradient } from './SafeLinearGradient';
import { Animated, Modal, PanResponder, Pressable, Text, TouchableOpacity, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeContext';
import { hapticTap, hapticWarning } from '../hooks/use-haptics';
import GoldBevel from './GoldBevel';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import { OLIVE_GRADIENTS, OLIVE_RICH, oliveShadow } from '../constants/oliveTheme';
import HybridAlertShell, { CascadeItem } from './modal_fx/HybridAlertShell';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM, TOAST } from '../constants/motionHybrid';

type Props = {
  visible: boolean;
  title: string;
  message?: string;
  /** JSX alternative to message — use when you need inline images/icons */
  messageNode?: React.ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  /** Accent confirm button (e.g. go to shop) */
  confirmVariant?: 'default' | 'accent';
  testIDPrefix?: string;
  /** Production default — hybrid; explicit `classic` is the rollback/QA path. */
  motionVariant?: 'classic' | 'hybrid';
  /** Деструктивное действие (например, «Удалить») — на подтверждение играет
   * одна дрожь TOAST.errorShakePx (макет M1: «приглушённый тон + дрожь»). */
  destructive?: boolean;
};

function ThemedConfirmModal({
  visible,
  title,
  message,
  messageNode,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmVariant = 'accent',
  testIDPrefix,
  motionVariant = 'hybrid',
  destructive = false,
}: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const reduceMotion = useReduceMotion();
  const isHybrid = motionVariant === 'hybrid';
  const shakeX = useSharedValue(0);

  useEffect(() => {
    return () => cancelAnimation(shakeX);
  }, [shakeX]);

  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const runDangerShake = () => {
    if (!isHybrid || !destructive || reduceMotion) return;
    const [a, b, c, d, e] = TOAST.errorShakePx;
    shakeX.value = withSequence(
      withTiming(a, { duration: TOAST.errorShakeStepMs }),
      withTiming(b, { duration: TOAST.errorShakeStepMs }),
      withTiming(c, { duration: TOAST.errorShakeStepMs }),
      withTiming(d, { duration: TOAST.errorShakeStepMs }),
      withTiming(e, { duration: TOAST.errorShakeStepMs }),
    );
  };
  const dim = 'rgba(0,0,0,0.60)';
  const isGoldTheme = themeMode === 'gold';
  const isOliveTheme = themeMode === 'olive';
  const modalColors = isGoldTheme
    ? GOLD_GRADIENTS.premiumPanel
    : isOliveTheme ? OLIVE_GRADIENTS.quietPanel
    : ([t.bgCard, t.bgCard, t.bgCard] as [string, string, string]);
  const confirmBg = confirmVariant === 'accent' ? t.accent : t.bgSurface;
  const confirmText = confirmVariant === 'accent' ? t.correctText : t.textPrimary;
  const confirmBorder = confirmVariant === 'accent' ? t.accent : t.border;
  const confirmColors = isGoldTheme
    ? confirmVariant === 'accent'
      ? GOLD_GRADIENTS.primaryButton
      : GOLD_GRADIENTS.raisedTile
    : isOliveTheme && confirmVariant === 'accent'
      ? OLIVE_GRADIENTS.primaryButton
      : ([confirmBg, confirmBg, confirmBg] as [string, string, string]);
  const modalRadius = 16;
  const buttonRadius = 12;

  // Свайп-вниз по карточке = закрыть (в дополнение к тапу по фону и кнопке
  // «Отмена»). Лёгкая версия на встроенном PanResponder — без reanimated и
  // gesture-handler, чтобы не тащить тяжёлую машинерию в общий компонент.
  // Тянем только вниз; отпустил ниже порога/резким движением — закрыли, иначе
  // карточка пружинит назад.
  const dragY = useRef(new Animated.Value(0)).current;

  // Сброс позиции при каждом открытии — иначе после закрытия свайпом карточка
  // осталась бы «уехавшей» вниз на следующем показе.
  useEffect(() => {
    if (visible) dragY.setValue(0);
  }, [visible, dragY]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        // Перехватываем жест только на явном вертикальном движении вниз, чтобы
        // не мешать нажатиям на кнопки внутри карточки.
        onMoveShouldSetPanResponder: (_evt, g) =>
          g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderMove: (_evt, g) => {
          // Только вниз (вверх не тянем — чуть-чуть сопротивления, если дёрнули вверх).
          dragY.setValue(g.dy > 0 ? g.dy : g.dy * 0.12);
        },
        onPanResponderRelease: (_evt, g) => {
          const shouldClose = g.dy > 90 || g.vy > 1.2;
          if (shouldClose) {
            Animated.timing(dragY, {
              toValue: 600,
              duration: 180,
              useNativeDriver: true,
            }).start(() => {
              hapticTap();
              onCancel();
            });
          } else {
            Animated.spring(dragY, {
              toValue: 0,
              damping: 16,
              stiffness: 180,
              mass: 0.9,
              useNativeDriver: true,
            }).start();
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, {
            toValue: 0,
            damping: 16,
            stiffness: 180,
            mass: 0.9,
            useNativeDriver: true,
          }).start();
        },
      }),
    [dragY, onCancel],
  );

  const panelContent = (
    <Reanimated.View style={isHybrid ? shakeStyle : undefined}>
      <LinearGradient
        testID={testIDPrefix ? `${testIDPrefix}-modal` : undefined}
        colors={modalColors}
        locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
        start={isGoldTheme ? { x: 0, y: 0 } : undefined}
        end={isGoldTheme ? { x: 1, y: 1 } : undefined}
        style={{
          borderRadius: modalRadius,
          padding: 22,
          width: '100%',
          borderWidth: 0,
          borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : t.border,
          overflow: 'hidden',
          ...(isGoldTheme ? goldShadow(3) : isOliveTheme ? oliveShadow(3) : {}),
        }}
      >
        {isGoldTheme && <GoldBevel radius={16} intensity="strong" />}
        <CascadeItem delay={isHybrid ? LUM.ladder[2] : 0} reduceMotion={!isHybrid || reduceMotion}>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 10, zIndex: 10 }}>
            {title}
          </Text>
        </CascadeItem>
        <CascadeItem delay={isHybrid ? LUM.ladder[2] + 96 : 0} reduceMotion={!isHybrid || reduceMotion}>
          {messageNode ? (
            <View style={{ zIndex: 10, marginBottom: 22 }}>{messageNode}</View>
          ) : (
            <Text
              style={{
                color: t.textMuted,
                fontSize: f.body,
                lineHeight: f.body * 1.5,
                marginBottom: 22,
                zIndex: 10,
              }}
            >
              {message}
            </Text>
          )}
        </CascadeItem>
        {/* Единый стандарт: primary (confirm) на всю ширину сверху, отмена —
            центрированная текстовая кнопка под ней. */}
        <CascadeItem delay={isHybrid ? LUM.ladder[2] + 192 : 0} reduceMotion={!isHybrid || reduceMotion}>
          <View style={{ flexDirection: 'column', gap: 4, zIndex: 10 }}>
            <TouchableOpacity
              testID={testIDPrefix ? `${testIDPrefix}-confirm` : undefined}
              onPress={() => {
                if (isHybrid && destructive) {
                  hapticWarning();
                  runDangerShake();
                } else {
                  hapticTap();
                }
                onConfirm();
              }}
              style={{
                width: '100%',
                borderRadius: buttonRadius,
                borderWidth: 0,
                borderColor: isGoldTheme
                  ? confirmVariant === 'accent' ? GOLD_RICH.edgeLight : GOLD_RICH.hairline
                  : confirmBorder,
                overflow: 'hidden',
                ...(isGoldTheme && confirmVariant === 'accent' ? goldShadow(1) : isOliveTheme && confirmVariant === 'accent' ? oliveShadow(1) : {}),
              }}
            >
              <LinearGradient
                colors={confirmColors}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : undefined}
                start={isGoldTheme ? { x: 0, y: 0 } : undefined}
                end={isGoldTheme ? { x: 1, y: 1 } : undefined}
                style={{ paddingVertical: 14, paddingHorizontal: 14, alignItems: 'center' }}
              >
                {isGoldTheme && <GoldBevel radius={12} intensity={confirmVariant === 'accent' ? 'strong' : 'quiet'} />}
                <Text
                  style={{
                    color: (isGoldTheme || isOliveTheme) && confirmVariant === 'accent'
                      ? (isOliveTheme ? OLIVE_RICH.piano : GOLD_RICH.blackPiano)
                      : confirmText,
                    fontWeight: '700',
                    textAlign: 'center',
                    fontSize: f.body,
                    zIndex: 10,
                  }}
                >
                  {confirmLabel}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              testID={testIDPrefix ? `${testIDPrefix}-cancel` : undefined}
              onPress={() => {
                hapticTap();
                onCancel();
              }}
              style={{
                alignSelf: 'center',
                paddingVertical: 10,
                paddingHorizontal: 20,
                minHeight: 40,
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: t.textMuted, fontWeight: '600', textAlign: 'center', fontSize: f.body }}>
                {cancelLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </CascadeItem>
      </LinearGradient>
    </Reanimated.View>
  );

  // зачем: гибрид переиспользует общий шелл семьи (свет без отскока, единый
  // бэкдроп/закрытие) — свайп-вниз здесь не переносим, у шелла уже есть тап по
  // бэкдропу и аппаратное «назад»; свайп остаётся только в classic (без него
  // тестировать регресс на живых экранах владелец не просил).
  if (isHybrid) {
    return (
      <HybridAlertShell
        visible={visible}
        onRequestClose={onCancel}
        shadowColor={isGoldTheme ? GOLD_RICH.hairlineStrong : isOliveTheme ? undefined : '#000000'}
        testID={testIDPrefix ? `${testIDPrefix}-modal-hybrid` : 'themed-confirm-modal-hybrid'}
      >
        {panelContent}
      </HybridAlertShell>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {/* Тап по затемнённому фону = отмена. На iOS нет аппаратной кнопки «назад»,
          так что тап-снаружи — привычный способ закрыть диалог одним касанием.
          Тап по самой карточке НЕ закрывает (Pressable ниже гасит всплытие). */}
      <Pressable
        onPress={() => {
          hapticTap();
          onCancel();
        }}
        accessibilityLabel={cancelLabel}
        style={{
          flex: 1,
          backgroundColor: dim,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
        }}
      >
        <Animated.View
          {...panResponder.panHandlers}
          style={{ width: '100%', maxWidth: 360, transform: [{ translateY: dragY }] }}
        >
        <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '100%' }}>
          {panelContent}
        </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export default memo(ThemedConfirmModal);
