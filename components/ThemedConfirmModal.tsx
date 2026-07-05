import React, { memo, useEffect, useMemo, useRef } from 'react';
import { LinearGradient } from './SafeLinearGradient';
import { Animated, Modal, PanResponder, Pressable, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from './ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import GoldBevel from './GoldBevel';
import { GOLD_GRADIENTS, GOLD_RICH, GOLD_SURFACE_LOCATIONS, goldShadow } from '../constants/goldTheme';
import CompassDepthSurface from './CompassDepthSurface';
import { COMPASS_GRADIENTS, COMPASS_RICH, COMPASS_SURFACE_LOCATIONS, compassShadow } from '../constants/compassTheme';

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
}: Props) {
  const { theme: t, themeMode, f } = useTheme();
  const dim = 'rgba(0,0,0,0.60)';
  const isGoldTheme = themeMode === 'gold';
  const isCompassTheme = false;
  const modalColors = isGoldTheme
    ? GOLD_GRADIENTS.premiumPanel
    : isCompassTheme
      ? COMPASS_GRADIENTS.premiumPanel
    : ([t.bgCard, t.bgCard, t.bgCard] as [string, string, string]);
  const confirmBg = confirmVariant === 'accent' ? t.accent : t.bgSurface;
  const confirmText = confirmVariant === 'accent' ? t.correctText : t.textPrimary;
  const confirmBorder = confirmVariant === 'accent' ? t.accent : t.border;
  const cancelColors = isGoldTheme
    ? GOLD_GRADIENTS.raisedTile
    : isCompassTheme
      ? COMPASS_GRADIENTS.recessedPanel
    : ([t.bgSurface, t.bgSurface, t.bgSurface] as [string, string, string]);
  const confirmColors = isGoldTheme
    ? confirmVariant === 'accent'
      ? GOLD_GRADIENTS.primaryButton
      : GOLD_GRADIENTS.raisedTile
    : isCompassTheme
      ? confirmVariant === 'accent'
        ? COMPASS_GRADIENTS.primaryButton
        : COMPASS_GRADIENTS.raisedTile
    : ([confirmBg, confirmBg, confirmBg] as [string, string, string]);
  const modalRadius = isCompassTheme ? 14 : 16;
  const buttonRadius = isCompassTheme ? 9 : 12;

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
        <LinearGradient
          testID={testIDPrefix ? `${testIDPrefix}-modal` : undefined}
          colors={modalColors}
          locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined}
          start={isGoldTheme || isCompassTheme ? { x: 0, y: 0 } : undefined}
          end={isGoldTheme || isCompassTheme ? { x: 1, y: 1 } : undefined}
          style={{
            borderRadius: modalRadius,
            padding: 22,
            width: '100%',
            borderWidth: 1,
            borderColor: isGoldTheme ? GOLD_RICH.hairlineStrong : isCompassTheme ? COMPASS_RICH.hairline : t.border,
            overflow: 'hidden',
            ...(isGoldTheme ? goldShadow(3) : isCompassTheme ? compassShadow(3) : {}),
          }}
        >
          {isGoldTheme && <GoldBevel radius={16} intensity="strong" />}
          {isCompassTheme && <CompassDepthSurface radius={modalRadius} selected />}
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 10, zIndex: 10 }}>
            {title}
          </Text>
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
          {/* Stacked full-width actions: equal flex:1 in a row forces identical
              narrow columns and awkward wraps for long localized labels. */}
          <View style={{ flexDirection: 'column', gap: 10, zIndex: 10 }}>
            <TouchableOpacity
              testID={testIDPrefix ? `${testIDPrefix}-cancel` : undefined}
              onPress={() => {
                hapticTap();
                onCancel();
              }}
              style={{
                width: '100%',
                borderRadius: buttonRadius,
                borderWidth: 1,
                borderColor: isGoldTheme ? GOLD_RICH.hairline : isCompassTheme ? COMPASS_RICH.hairlineQuiet : t.border,
                overflow: 'hidden',
                ...(isCompassTheme ? compassShadow(1) : {}),
              }}
            >
              <LinearGradient
                colors={cancelColors}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined}
                start={isGoldTheme || isCompassTheme ? { x: 0, y: 0 } : undefined}
                end={isGoldTheme || isCompassTheme ? { x: 1, y: 1 } : undefined}
                style={{ paddingVertical: 14, paddingHorizontal: 14, alignItems: 'center' }}
              >
                {isGoldTheme && <GoldBevel radius={12} intensity="quiet" />}
                {isCompassTheme && <CompassDepthSurface radius={buttonRadius} quiet />}
                <Text style={{ color: t.textPrimary, fontWeight: '600', textAlign: 'center', fontSize: f.body, zIndex: 10 }}>
                  {cancelLabel}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              testID={testIDPrefix ? `${testIDPrefix}-confirm` : undefined}
              onPress={() => {
                hapticTap();
                onConfirm();
              }}
              style={{
                width: '100%',
                borderRadius: buttonRadius,
                borderWidth: 1,
                borderColor: isGoldTheme
                  ? confirmVariant === 'accent' ? GOLD_RICH.edgeLight : GOLD_RICH.hairline
                  : isCompassTheme
                    ? confirmVariant === 'accent' ? COMPASS_RICH.hairlineStrong : COMPASS_RICH.hairline
                  : confirmBorder,
                overflow: 'hidden',
                ...(isGoldTheme && confirmVariant === 'accent' ? goldShadow(1) : isCompassTheme ? compassShadow(1) : {}),
              }}
            >
              <LinearGradient
                colors={confirmColors}
                locations={isGoldTheme ? GOLD_SURFACE_LOCATIONS : isCompassTheme ? COMPASS_SURFACE_LOCATIONS : undefined}
                start={isGoldTheme || isCompassTheme ? { x: 0, y: 0 } : undefined}
                end={isGoldTheme || isCompassTheme ? { x: 1, y: 1 } : undefined}
                style={{ paddingVertical: 14, paddingHorizontal: 14, alignItems: 'center' }}
              >
                {isGoldTheme && <GoldBevel radius={12} intensity={confirmVariant === 'accent' ? 'strong' : 'quiet'} />}
                {isCompassTheme && <CompassDepthSurface radius={buttonRadius} cream={confirmVariant === 'accent'} selected={confirmVariant !== 'accent'} />}
                <Text
                  style={{
                    color: isGoldTheme && confirmVariant === 'accent'
                      ? GOLD_RICH.blackPiano
                      : isCompassTheme && confirmVariant === 'accent'
                        ? COMPASS_RICH.textDark
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
          </View>
        </LinearGradient>
        </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

export default memo(ThemedConfirmModal);
