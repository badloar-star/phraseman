/**
 * Нижняя шторка раздела «Мои ошибки» (макет kit.css «.sheet»: фон #1B1B1D, верхние углы 28, ручка 44×5, поля 12/18/40).
 *
 * зачем: «Перед отработкой» и меню ошибки в макете — одна и та же шторка поверх затемнения 60 %. Рисуем её слоем внутри экрана
 * (а не системным Modal), чтобы затемнение и шторка двигались раздельно: затемнение проявляется 260 мс, шторка выезжает снизу 440 мс
 * cubic-bezier(.2,1,.3,1) в обе стороны — числа kit.css `.sheet`/`.dim` из KIT_MOTION (координатор 05.10, Motion п.8).
 */
import React, { memo, useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { KIT_MOTION } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useLv2Glass } from '../learning-v2/LearningV2Glass';

const SHEET_EASE = Easing.bezier(...KIT_MOTION.sheetEase);

export const PanelSheet = memo(function PanelSheet({ visible, onClose, children, testID }: Readonly<{ visible: boolean; onClose: () => void; children: React.ReactNode; testID?: string }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const insets = useStableSafeAreaInsets();
  // зачем (замечание владельца 10.10): подложка шторки и кромка — токены выбранной темы, а не #1B1B1D под «Аврору»
  const g = useLv2Glass();
  // зачем: Reduce Motion = один финальный кадр (AGENTS.md Motion п.6)
  const reduceMotion = useReduceMotion();
  const dimMs = reduceMotion ? 0 : KIT_MOTION.dimMs;
  const sheetMs = reduceMotion ? 0 : KIT_MOTION.sheetMs;
  useEffect(() => {
    if (!visible) return undefined;
    // зачем: системная кнопка «назад» закрывает шторку, а не уводит с экрана.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [onClose, visible]);
  if (!visible) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID={testID}>
      <Animated.View entering={FadeIn.duration(dimMs)} exiting={FadeOut.duration(dimMs)} style={styles.dim}>
        <Pressable accessibilityRole="button" accessibilityLabel="close" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(sheetMs).easing(SHEET_EASE)}
        exiting={SlideOutDown.duration(sheetMs).easing(SHEET_EASE)}
        style={[styles.sheet, { backgroundColor: g.opaqueSheet, paddingBottom: Math.max(24, insets.bottom + 16) }]}>
        <View style={[styles.grab, { backgroundColor: `${g.text}40` }]} />
        {children}
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.edge, {
          boxShadow: [
            { inset: true, offsetX: 0, offsetY: 1.5, blurRadius: 0, spreadDistance: -0.2, color: g.bevelHi },
            { inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: g.hairlineSoft },
          ],
        }]} />
      </Animated.View>
    </View>
  );
});

const baseStyles = StyleSheet.create({
  dim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' }, // theme-exempt: затемнение под шторкой — тёмный скрим в любой теме
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 12, paddingHorizontal: 18 },
  edge: { borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  grab: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 26 },
});
