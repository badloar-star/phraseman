import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  Easing as REasing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import CustomAvatarBadge from '../CustomAvatarBadge';
import TapScale from '../TapScale';
import { useTheme } from '../ThemeContext';
import {
  CUSTOM_AVATAR_GRADIENTS,
  CUSTOM_AVATAR_RESTYLE_COST,
  type CustomAvatarDef,
  type CustomAvatarLogoColor,
} from '../../constants/custom_avatars';

export interface AvatarEditorSheetProps {
  visible: boolean;
  avatar: CustomAvatarDef | null;
  gradientId: string;
  logoColor: CustomAvatarLogoColor;
  owned: boolean;
  title: string;
  applyLabel: string;
  darkLabel: string;
  lightLabel: string;
  gradientLabel: (id: string) => string;
  onGradientChange: (id: string) => void;
  onLogoColorChange: (color: CustomAvatarLogoColor) => void;
  onConfirm: () => void;
  onClose: () => void;
}

const SHEET_HIDDEN = 320; // стартовая позиция листа под экраном (выезд/уезд)

export function AvatarEditorSheet(props: AvatarEditorSheetProps) {
  const { theme: t } = useTheme();
  const { height: viewportHeight } = useWindowDimensions();

  // Интерактивная шторка (единый стандарт, паттерн RegistrationPromptModal):
  // кастомный выезд снизу + drag-to-dismiss вместо нативной slide-анимации.
  const backdropO = useSharedValue(0);
  const sheetY = useSharedValue(SHEET_HIDDEN);
  const sheetOpacity = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);

  useEffect(() => {
    if (!props.visible) return;
    dragTranslateY.value = 0;
    backdropO.value = withTiming(1, { duration: 200, easing: REasing.out(REasing.cubic) });
    sheetY.value = SHEET_HIDDEN;
    sheetOpacity.value = withTiming(1, { duration: 220 });
    sheetY.value = withTiming(0, { duration: 380, easing: REasing.bezier(0.32, 0.72, 0, 1) });
  }, [props.visible, backdropO, sheetY, sheetOpacity, dragTranslateY]);

  const onCloseRef = useRef(props.onClose);
  onCloseRef.current = props.onClose;

  // Анимированное закрытие (фон/системная «назад»): лист уезжает вниз + подложка тает.
  const dismissSheet = useCallback(() => {
    backdropO.value = withTiming(0, { duration: 200 });
    sheetOpacity.value = withTiming(0, { duration: 180 });
    sheetY.value = withTiming(SHEET_HIDDEN, { duration: 240, easing: REasing.out(REasing.cubic) }, (finished) => {
      if (finished) runOnJS(onCloseRef.current)();
    });
  }, [backdropO, sheetOpacity, sheetY]);

  const closeAfterSwipe = useCallback(() => {
    onCloseRef.current();
  }, []);

  const swipeOffDistance = useMemo(() => Math.max(480, viewportHeight * 0.6), [viewportHeight]);

  // Тяга вниз 1:1, вверх — резина ×0.12; отпустил — spring обратно или
  // уезд вниз + закрытие (порог 88px / velocityY 900).
  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .failOffsetX([-32, 32])
        .onUpdate((e) => {
          'worklet';
          const ty = e.translationY;
          dragTranslateY.value = ty < 0 ? ty * 0.12 : ty;
        })
        .onEnd((e) => {
          'worklet';
          const shouldClose = dragTranslateY.value > 88 || e.velocityY > 900;
          if (shouldClose) {
            dragTranslateY.value = withTiming(swipeOffDistance, { duration: 260 }, (finished) => {
              if (finished) {
                runOnJS(closeAfterSwipe)();
              }
            });
          } else {
            dragTranslateY.value = withSpring(0, { damping: 22, stiffness: 300 });
          }
        }),
    [closeAfterSwipe, dragTranslateY, swipeOffDistance],
  );

  // Подложка слабеет при оттягивании листа вниз.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropO.value * (1 - Math.min(Math.max(dragTranslateY.value, 0) / 600, 0.5)),
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    opacity: sheetOpacity.value,
    transform: [{ translateY: sheetY.value + dragTranslateY.value }],
  }));

  return (
    <Modal visible={props.visible} transparent animationType="none" statusBarTranslucent onRequestClose={dismissSheet}>
      <GestureHandlerRootView style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissSheet}>
          <Animated.View style={[styles.backdropFill, backdropStyle]} />
        </Pressable>
        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.sheet, { backgroundColor: t.bgCard }, sheetStyle]}>
            <View style={[styles.handle, { backgroundColor: t.border }]} />
            <Text style={[styles.title, { color: t.textPrimary }]}>{props.title}</Text>
            {props.avatar ? <CustomAvatarBadge avatarId={props.avatar.id} gradientId={props.gradientId} logoColor={props.logoColor} size={104} /> : null}
            <View style={styles.gradientGrid}>
              {CUSTOM_AVATAR_GRADIENTS.map((gradient) => {
                const selected = gradient.id === props.gradientId;
                return (
                  <TapScale key={gradient.id} onPress={() => props.onGradientChange(gradient.id)}
                    style={[styles.gradient, { borderColor: selected ? t.accent : t.border, backgroundColor: gradient.colors[1] }]}
                    accessibilityState={{ selected }} accessibilityLabel={props.gradientLabel(gradient.id)}>
                    <Text style={styles.gradientText}>{props.gradientLabel(gradient.id)}</Text>
                  </TapScale>
                );
              })}
            </View>
            <View style={styles.colorRow}>
              {(['black', 'white'] as const).map((color) => (
                <TapScale key={color} onPress={() => props.onLogoColorChange(color)}
                  style={[styles.colorChoice, { borderColor: props.logoColor === color ? t.accent : t.border, backgroundColor: color === 'black' ? '#111827' : '#F8FAFC' }]}
                  accessibilityState={{ selected: props.logoColor === color }}>
                  <Text style={{ color: color === 'black' ? '#FFFFFF' : '#111827', fontWeight: '800' }}>{color === 'black' ? props.darkLabel : props.lightLabel}</Text>
                </TapScale>
              ))}
            </View>
            <Pressable onPress={props.onConfirm} style={[styles.confirm, { backgroundColor: t.accent }]}>
              <Text style={[styles.confirmText, { color: t.correctText }]}>{props.applyLabel}{props.owned ? ` · ${CUSTOM_AVATAR_RESTYLE_COST}` : ''}</Text>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdropFill: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.58)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20, alignItems: 'center', maxHeight: '90%' },
  handle: { width: 44, height: 5, borderRadius: 3, marginBottom: 16 },
  title: { fontSize: 21, lineHeight: 27, fontWeight: '900', marginBottom: 16 },
  gradientGrid: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  gradient: { width: '31%', minHeight: 48, borderRadius: 12, borderWidth: 2, justifyContent: 'center', paddingHorizontal: 6 },
  gradientText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', textAlign: 'center' },
  colorRow: { width: '100%', flexDirection: 'row', gap: 10, marginTop: 14 },
  colorChoice: { flex: 1, minHeight: 46, borderWidth: 2, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  confirm: { width: '100%', minHeight: 54, marginTop: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 16, fontWeight: '900' },
});
