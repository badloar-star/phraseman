/**
 * Нижняя шторка раздела «Мои ошибки» (макет kit.css «.sheet»: фон #1B1B1D, верхние углы 28, ручка 44×5, поля 12/18/40).
 *
 * зачем: «Перед отработкой» и меню ошибки в макете — одна и та же шторка поверх затемнения 60 %. Рисуем её слоем внутри экрана
 * (а не системным Modal), чтобы затемнение и шторка двигались раздельно: затемнение проявляется 260 мс, шторка выезжает снизу 440 мс
 * cubic-bezier(.2,1,.3,1) в обе стороны — числа kit.css `.sheet`/`.dim` из KIT_MOTION (координатор 05.10, Motion п.8).
 */
import React, { memo, useEffect, useMemo } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { KIT_MOTION } from '../../constants/motionHybrid';
import { mixSurfaceHex } from '../../constants/liquidGlassSurfaceRoles';
import { LinearGradient } from '../SafeLinearGradient';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useLv2Glass } from '../learning-v2/LearningV2Glass';

const SHEET_EASE = Easing.bezier(...KIT_MOTION.sheetEase);

export const PanelSheet = memo(function PanelSheet({ visible, onClose, children, testID }: Readonly<{ visible: boolean; onClose: () => void; children: React.ReactNode; testID?: string }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const insets = useStableSafeAreaInsets();
  // зачем (замечание владельца 10.10): подложка шторки и кромка — токены выбранной темы, а не #1B1B1D под «Аврору»
  const g = useLv2Glass();
  // зачем (Сверка mistakes-panel-004, замер по пикселям кадра): в макете под шторкой хаб почти не виден — эффективный скрим ≈ .78 (в коде был .6),
  // а фон шторки — тёмный градиент в тоне темы (слева зелёный, справа глубже), у приложения — плоская серо-зелёная плита. В тёмном оформлении
  // берём скрим .78 и градиент из токенов темы (opaqueSheet, затемнённый, + свечения фона bgGlow); светлое оформление не меняется.
  const dimColor = g.isLight ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.78)'; // theme-exempt: затемнение под шторкой — чёрный скрим в любой теме
  const sheetGradient = useMemo(() => {
    if (g.isLight) return null;
    const base = mixSurfaceHex(g.opaqueSheet, '#000000', 0.42); // theme-exempt: затемнение токена шторки к чёрному
    // доля свечения = его собственная альфа (в «Спокойно» свечений нет — градиент почти плоский, как в макете «Спокойно»)
    const alphaOf = (c: string) => (/^#[0-9A-Fa-f]{8}$/.test(c) ? Number.parseInt(c.slice(7, 9), 16) / 255 : 0);
    const tint = (c: string, k: number) => (/^#[0-9A-Fa-f]{6}/.test(c) ? mixSurfaceHex(base, c.slice(0, 7), k * alphaOf(c)) : base);
    return [tint(g.bgGlow[0], 0.42), base, tint(g.bgGlow[1], 0.32)] as const;
  }, [g.isLight, g.opaqueSheet, g.bgGlow]);
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
      <Animated.View entering={FadeIn.duration(dimMs)} exiting={FadeOut.duration(dimMs)} style={[styles.dim, { backgroundColor: dimColor }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="close" style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(sheetMs).easing(SHEET_EASE)}
        exiting={SlideOutDown.duration(sheetMs).easing(SHEET_EASE)}
        style={[styles.sheet, { backgroundColor: g.opaqueSheet, paddingBottom: Math.max(24, insets.bottom + 16) }]}>
        {sheetGradient ? (
          <LinearGradient
            pointerEvents="none"
            colors={sheetGradient}
            locations={[0, 0.5, 1]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[StyleSheet.absoluteFill, styles.edge]}
          />
        ) : null}
        <View style={[styles.grab, { backgroundColor: `${g.text}40` }]} />
        {children}
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
