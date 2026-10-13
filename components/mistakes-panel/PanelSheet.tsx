/**
 * Нижняя шторка раздела «Мои ошибки» (макет kit.css «.sheet»: фон #1B1B1D, верхние углы 28, ручка 44×5, поля 12/18/40).
 *
 * зачем: «Перед отработкой» и меню ошибки в макете — одна и та же шторка поверх затемнения 60 %. Рисуем её слоем внутри экрана
 * (а не системным Modal), чтобы затемнение и шторка двигались раздельно: затемнение проявляется 260 мс, шторка выезжает снизу 440 мс
 * cubic-bezier(.2,1,.3,1) в обе стороны — числа kit.css `.sheet`/`.dim` из KIT_MOTION (координатор 05.10, Motion п.8).
 */
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, View } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { KIT_MOTION } from '../../constants/motionHybrid';
import { shadowSheetGradient } from '../v2/shadow_sheet_paint';
import { LinearGradient } from '../SafeLinearGradient';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useLv2Glass } from '../learning-v2/LearningV2Glass';
import { useLang } from '../LangContext';
import { triLang } from '../../constants/i18n';

const SHEET_EASE = Easing.bezier(...KIT_MOTION.sheetEase);

export const PanelSheet = memo(function PanelSheet({ visible, onClose, children, testID }: Readonly<{ visible: boolean; onClose: () => void; children: React.ReactNode; testID?: string }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();
  // зачем (замечание владельца 10.10): подложка шторки и кромка — токены выбранной темы, а не #1B1B1D под «Аврору»
  const g = useLv2Glass();
  // зачем (Сверка mistakes-panel-004, замер по пикселям кадра): в макете под шторкой хаб почти не виден — эффективный скрим ≈ .78 (в коде был .6),
  // а фон шторки — тёмный градиент в тоне темы (слева зелёный, справа глубже), у приложения — плоская серо-зелёная плита. В тёмном оформлении
  // берём скрим .78; заливка шторки — см. sheetGradient ниже (стиль «Тень»); светлое оформление не меняется.
  const dimColor = g.isLight ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.78)'; // theme-exempt: затемнение под шторкой — чёрный скрим в любой теме
  // зачем (Макеты 7c831a193, mistakes-panel-021): в стиле «Тень» шторка — нейтральный градиент при любой теме (shadow-skin.css `.ph .sheet`), а не тон «Авроры»;
  // прежний градиент из bgGlow (Сверка mistakes-panel-004) относился к образцу до стиля «Тень». Светлое оформление не меняется (null).
  const sheetGradient = useMemo(() => shadowSheetGradient(g.isLight), [g.isLight]);
  // зачем: Reduce Motion = один финальный кадр (AGENTS.md Motion п.6)
  const reduceMotion = useReduceMotion();
  const dimMs = reduceMotion ? 0 : KIT_MOTION.dimMs;
  const sheetMs = reduceMotion ? 0 : KIT_MOTION.sheetMs;
  // зачем (R1_DIFF_ONE_FIX, cards-034 / cards-section-010, список Макетов 12.10): слой шторки — absoluteFill РОДИТЕЛЯ, а родитель начинается под статус-баром, поэтому затемнение не доходило до верха
  // (светлая полоса y<120). Меряем верх родителя в окне и тянем затемнение вверх на эту величину; сама шторка стоит у нижнего края как раньше.
  const rootRef = useRef<View>(null);
  const [scrimExtend, setScrimExtend] = useState(0);
  useEffect(() => {
    if (!visible) return;
    rootRef.current?.measureInWindow((_x, y) => {
      const extend = Math.max(0, Math.round(y));
      if (typeof __DEV__ !== 'undefined' && __DEV__) console.log(`[PANEL-SHEET] scrim testID=${String(testID)} rootWindowY=${Math.round(y)} → затемнение тянется вверх на ${extend}`); // guard-ok: числа раскладки
      setScrimExtend(extend);
    });
  }, [testID, visible]);
  useEffect(() => {
    if (!visible) return undefined;
    // зачем: системная кнопка «назад» закрывает шторку, а не уводит с экрана.
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onClose(); return true; });
    return () => sub.remove();
  }, [onClose, visible]);
  if (!visible) return null;
  return (
    <View ref={rootRef} collapsable={false} style={StyleSheet.absoluteFill} pointerEvents="box-none" testID={testID}>
      <Animated.View entering={FadeIn.duration(dimMs)} exiting={FadeOut.duration(dimMs)} style={[styles.dim, { backgroundColor: dimColor, top: -scrimExtend }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={triLang(lang, { ru: 'Закрыть', uk: 'Закрити', en: 'Close', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' })} style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        entering={SlideInDown.duration(sheetMs).easing(SHEET_EASE)}
        exiting={SlideOutDown.duration(sheetMs).easing(SHEET_EASE)}
        style={[styles.sheet, { backgroundColor: g.opaqueSheet, paddingBottom: Math.max(24, insets.bottom + 16) }]}>
        {sheetGradient ? (
          <LinearGradient
            pointerEvents="none"
            colors={sheetGradient}
            locations={[0, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
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
