/**
 * Нижняя шторка раздела «Мои ошибки» (макет kit.css «.sheet»: фон #1B1B1D, верхние углы 28, ручка 44×5, поля 12/18/40).
 *
 * зачем: «Перед отработкой» и меню ошибки в макете — одна и та же шторка поверх затемнения 60 %. Рисуем её слоем внутри экрана
 * (а не системным Modal), чтобы затемнение и шторка двигались раздельно: затемнение проявляется, шторка выезжает снизу (ease-out 260 мс).
 */
import React, { memo, useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export const PanelSheet = memo(function PanelSheet({ visible, onClose, children, testID }: Readonly<{ visible: boolean; onClose: () => void; children: React.ReactNode; testID?: string }>) {
  const insets = useSafeAreaInsets();
  useEffect(() => {
    if (!visible) return undefined;
    // зачем: системная кнопка «назад» закрывает шторку, а не уводит с экрана.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [onClose, visible]);
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID={testID}>
      <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(200)} style={styles.dim}>
        <Pressable accessibilityRole="button" accessibilityLabel="close" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(260).easing(EASE_OUT)}
        exiting={SlideOutDown.duration(200)}
        style={[styles.sheet, { paddingBottom: Math.max(24, insets.bottom + 16) }]}>
        <View style={styles.grab} />
        {children}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.edge, {
          boxShadow: [
            { inset: true, offsetX: 0, offsetY: 1.5, blurRadius: 0, spreadDistance: -0.2, color: 'rgba(255,255,255,0.2)' },
            { inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: 'rgba(255,255,255,0.05)' },
          ],
        }]} />
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 18, backgroundColor: '#1B1B1D' },
  edge: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  grab: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#4A4A4E', alignSelf: 'center', marginBottom: 26 },
});
