import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTheme } from '../ThemeContext';
import { hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

// ─── Таббар · «жидкое золото» — ЖИВАЯ превью-копия для витрины движения ───
// зачем: макет-эталон .motion-mockups/phraseman-hybrid.html, сцена B5
// «Таббар · жидкое золото» — редизайн с нуля (НЕ капсула текущего
// app/(tabs)/_layout.tsx). Капля-подсветка перетекает между вкладками с
// растяжением по ходу движения, в прибывшую иконку падает капля-акцент,
// соседи отзываются лёгкой волной по пути пролёта. Это ЛОКАЛЬНАЯ копия с
// демо-переключением (без роутера, без изменения боевого таббара) — точки
// вживления в _layout.tsx описаны в комментарии внизу файла.
//
// Переносит хореографию макета вточную:
//  - блоб: translateX пружиной (эквивалент RS(.9,15,160) → stiffness/damping/mass),
//    вытяжение scaleX 1+dist×0.22 за 160мс на разгоне, посадка пружиной (эквивалент RS(.6,11,170));
//  - капля в иконку: 90мс opacity-появление (задержка 200мс) → 170мс bezier(.6,0,.9,.6) падение,
//    иконка отвечает pop .9→1 пружиной по приземлению капли;
//  - волна соседей: кивок 2.5px, шаг 55мс по пути пролёта от текущей к целевой вкладке;
//  - подпись — ТОЛЬКО у активной вкладки, высота зарезервирована заранее (layout stability).
const TAB_DEFS = [
  { key: 'home', icon: 'home-outline' as const, active: 'home' as const, label: 'Дом' },
  { key: 'lessons', icon: 'book-outline' as const, active: 'book' as const, label: 'Уроки' },
  { key: 'arena', icon: 'flash-outline' as const, active: 'flash' as const, label: 'Вызовы' },
  { key: 'friends', icon: 'people-outline' as const, active: 'people' as const, label: 'Друзья' },
  { key: 'settings', icon: 'settings-outline' as const, active: 'settings' as const, label: 'Ещё' },
] as const;

const BAR_HEIGHT = 64;
const ICON_SIZE = 24;
const LABEL_HEIGHT = 14;
const BLOB_SIZE = 44;
const DROP_SIZE = 6;
const WAVE_NUDGE_PX = 2.5;
const WAVE_STEP_MS = 55;
const STRETCH_DURATION_MS = 160;
const DROP_APPEAR_MS = 90;
const DROP_APPEAR_DELAY_MS = 200;
const DROP_FALL_MS = 170;
/** Эквиваленты RS(mass,damping,stiffness) макета в терминах RN Animated.spring. */
const BLOB_TRAVEL_SPRING = { stiffness: 160, damping: 15, mass: 0.9 };
const BLOB_SETTLE_SPRING = { stiffness: 170, damping: 11, mass: 0.6 };
const ICON_POP_SPRING = { stiffness: 200, damping: 9, mass: 0.5 };
const WAVE_RETURN_SPRING = { stiffness: 210, damping: 12, mass: 0.5 };

function withAlpha(color: string, alpha: number): string {
  if (color[0] !== '#') return color;
  let hex = color.slice(1);
  if (hex.length === 3) hex = hex.split('').map((c) => c + c).join('');
  if (hex.length === 8) hex = hex.slice(0, 6);
  if (hex.length !== 6) return color;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

interface TabBarHybridPreviewProps {
  /** Начальный индекс активной вкладки (по умолчанию 0). Демо-режим — переключение локальное. */
  initialActiveIndex?: number;
  onActiveChange?: (index: number) => void;
}

function TabBarHybridPreview({ initialActiveIndex = 0, onActiveChange }: TabBarHybridPreviewProps) {
  const { theme: t } = useTheme();
  const reduceMotion = useReduceMotion();
  const [activeIndex, setActiveIndex] = useState(initialActiveIndex);
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;
  const [slotWidth, setSlotWidth] = useState(0);

  const blobX = useRef(new Animated.Value(initialActiveIndex)).current;
  const blobScaleX = useRef(new Animated.Value(1)).current;
  const blobScaleY = useRef(new Animated.Value(1)).current;
  const dropOpacity = useRef(new Animated.Value(0)).current;
  const dropY = useRef(new Animated.Value(-6)).current;
  const iconPopScales = useRef(TAB_DEFS.map(() => new Animated.Value(1))).current;
  const waveNudges = useRef(TAB_DEFS.map(() => new Animated.Value(0))).current;

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      blobX.stopAnimation();
      blobScaleX.stopAnimation();
      blobScaleY.stopAnimation();
      dropOpacity.stopAnimation();
      dropY.stopAnimation();
      iconPopScales.forEach((v) => v.stopAnimation());
      waveNudges.forEach((v) => v.stopAnimation());
    };
  }, [blobScaleX, blobScaleY, blobX, dropOpacity, dropY, iconPopScales, waveNudges]);

  const onBarLayout = useCallback((e: LayoutChangeEvent) => {
    setSlotWidth(e.nativeEvent.layout.width / TAB_DEFS.length);
  }, []);

  const runReduceMotionSwitch = useCallback((idx: number) => {
    blobX.setValue(idx);
  }, [blobX]);

  const runHybridSwitch = useCallback((idx: number, fromIdx: number) => {
    const dist = Math.abs(idx - fromIdx);

    // Блоб вытягивается по ходу движения и сжимается при посадке (метабол-ощущение).
    Animated.timing(blobScaleX, {
      toValue: 1 + dist * 0.22,
      duration: STRETCH_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !isMountedRef.current) return;
      Animated.spring(blobScaleX, { toValue: 1, ...BLOB_SETTLE_SPRING, useNativeDriver: true }).start();
    });
    Animated.timing(blobScaleY, {
      toValue: 0.82,
      duration: STRETCH_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !isMountedRef.current) return;
      Animated.spring(blobScaleY, { toValue: 1, ...BLOB_SETTLE_SPRING, useNativeDriver: true }).start();
    });
    Animated.spring(blobX, { toValue: idx, ...BLOB_TRAVEL_SPRING, useNativeDriver: true }).start();

    // Капля падает в прибывшую иконку.
    dropOpacity.setValue(0);
    dropY.setValue(-6);
    Animated.timing(dropOpacity, {
      toValue: 1,
      duration: DROP_APPEAR_MS,
      delay: DROP_APPEAR_DELAY_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
    Animated.timing(dropY, {
      toValue: 10,
      duration: DROP_FALL_MS,
      delay: DROP_APPEAR_DELAY_MS,
      easing: Easing.bezier(0.6, 0, 0.9, 0.6),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || !isMountedRef.current) return;
      dropOpacity.setValue(0);
      const popScale = iconPopScales[idx];
      if (!popScale) return;
      popScale.setValue(0.9);
      Animated.spring(popScale, { toValue: 1, ...ICON_POP_SPRING, useNativeDriver: true }).start();
    });

    // Волна: соседние вкладки по пути пролёта кивают и возвращаются.
    const lo = Math.min(fromIdx, idx);
    const hi = Math.max(fromIdx, idx);
    for (let m = lo; m <= hi; m++) {
      if (m === idx) continue;
      const nudge = waveNudges[m];
      if (!nudge) continue;
      Animated.timing(nudge, {
        toValue: WAVE_NUDGE_PX,
        duration: 110,
        delay: 60 + (m - lo) * WAVE_STEP_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (!finished || !isMountedRef.current) return;
        Animated.spring(nudge, { toValue: 0, ...WAVE_RETURN_SPRING, useNativeDriver: true }).start();
      });
    }
  }, [blobScaleX, blobScaleY, blobX, dropOpacity, dropY, iconPopScales, waveNudges]);

  const handleTabPress = useCallback((idx: number) => {
    const fromIdx = activeIndexRef.current;
    if (idx === fromIdx) return;
    hapticTap();
    setActiveIndex(idx);
    onActiveChange?.(idx);
    if (reduceMotion) {
      runReduceMotionSwitch(idx);
      return;
    }
    runHybridSwitch(idx, fromIdx);
  }, [onActiveChange, reduceMotion, runHybridSwitch, runReduceMotionSwitch]);

  const blobTranslateX = useMemo(() => {
    if (slotWidth <= 0) return blobX;
    return blobX.interpolate({
      inputRange: TAB_DEFS.map((_, i) => i),
      outputRange: TAB_DEFS.map((_, i) => i * slotWidth + (slotWidth - BLOB_SIZE) / 2),
    });
  }, [blobX, slotWidth]);

  return (
    <View style={[styles.wrap, { backgroundColor: t.bgCard, shadowColor: t.shadowDark }]}>
      <View style={styles.bar} onLayout={onBarLayout}>
        {slotWidth > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.blob,
              {
                backgroundColor: withAlpha(t.accent, 0.16),
                transform: [
                  { translateX: blobTranslateX },
                  { scaleX: blobScaleX },
                  { scaleY: blobScaleY },
                ],
              },
            ]}
          />
        ) : null}
        {TAB_DEFS.map((tab, idx) => {
          const focused = idx === activeIndex;
          const color = focused ? t.accent : withAlpha(t.textSecond, 0.62);
          return (
            <Animated.View
              key={tab.key}
              style={[styles.tabBtn, { transform: [{ translateY: waveNudges[idx] ?? 0 }] }]}
            >
              <Pressable
                accessible
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: focused }}
                onPress={() => handleTabPress(idx)}
                style={styles.tabTouchable}
              >
                <View style={styles.iconSlot}>
                  {focused ? (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        styles.drop,
                        {
                          backgroundColor: t.accent,
                          opacity: dropOpacity,
                          transform: [{ translateY: dropY }],
                        },
                      ]}
                    />
                  ) : null}
                  <Animated.View style={{ transform: [{ scale: iconPopScales[idx] ?? 1 }] }}>
                    <Ionicons name={focused ? tab.active : tab.icon} size={ICON_SIZE} color={color} />
                  </Animated.View>
                </View>
                <View style={styles.labelSlot}>
                  {focused ? (
                    <Animated.Text
                      numberOfLines={1}
                      style={[styles.label, { color: t.accent, opacity: focused ? 1 : 0 }]}
                    >
                      {tab.label}
                    </Animated.Text>
                  ) : null}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: BAR_HEIGHT / 2,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 12,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: BAR_HEIGHT,
  },
  blob: {
    position: 'absolute',
    width: BLOB_SIZE,
    height: BLOB_SIZE,
    borderRadius: BLOB_SIZE / 2,
    top: (BAR_HEIGHT - BLOB_SIZE) / 2,
  },
  tabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  tabTouchable: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' },
  iconSlot: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  drop: {
    position: 'absolute',
    top: -8,
    width: DROP_SIZE,
    height: DROP_SIZE,
    borderRadius: DROP_SIZE / 2,
  },
  labelSlot: { height: LABEL_HEIGHT, justifyContent: 'center' },
  label: { fontSize: 11, fontWeight: '700' },
});

export default memo(TabBarHybridPreview);

// ─── Точки вживления в app/(tabs)/_layout.tsx (НЕ применено — витрина/демо-компонент) ───
// 1. Флаг: const TABBAR_MOTION_VARIANT: 'classic' | 'hybrid' = 'classic' (dev-переключатель
//    из витрины движения читал бы persisted-значение через тот же канал, что и остальные
//    dev-флаги — DevHub, не проп экрана: таббар не принимает variant-проп от роутера).
// 2. Капсула активной вкладки (s.tabActivePill, строки ~646-666 _layout.tsx) заменяется
//    на блоб-градиент: translateX той же интерполяцией по tabHighlightAnim (уже есть),
//    но с добавлением scaleX/scaleY на разгоне/посадке — как здесь.
// 3. Капля-акцент — новый Animated.View поверх иконки таба, синхронизированная с уже
//    существующим tabPressAnim/iconScale по приходу.
// 4. Волна соседей — новый массив Animated.Value по числу табов (TAB_BAR_TABS.length),
//    запускается в том же эффекте, что и Animated.spring(tabHighlightAnim, ...).
// 5. LUM/PRESS токены (constants/motionHybrid.ts) — базовые тайминги посадки/пресса,
//    сверх уже откалиброванных tabHighlightAnim spring(18/4)/tabPressAnim остаются как есть
//    до отдельной задачи миграции.
