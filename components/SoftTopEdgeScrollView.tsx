import React, { forwardRef, useCallback, useRef } from 'react';
import { Animated, Platform, ScrollView, StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps } from 'react-native';

import ScrollTopEdgeFade from './ScrollTopEdgeFade';

/** Как у верхней маски вкладок (TopFadeMask / useTopFadeScrolled / useSoftTopEdge): порог и длительности одни на всё приложение. */
const SHOW_THRESHOLD = 6;
const SHOW_MS = 180;
const HIDE_MS = 260;
/** Частота события прокрутки, если экран не задал свою: порог нужен примерно, а не покадрово. */
const DEFAULT_THROTTLE_MS = 32;

const styles = StyleSheet.create({
  // зачем: как у самого ScrollView (flexGrow 1, flexShrink 1) — обёртка занимает то же место, что занимал список
  wrap: { flexGrow: 1, flexShrink: 1 },
  fill: { flex: 1 },
});

/**
 * Обычный ScrollView экрана с мягким верхним краем: после начала прокрутки верхние 20 px растворяются, в покое вид прежний.
 *
 * зачем (владелец 11.11: «во всех экранах… всё что под сейф зону уходит так же должно с размытым фейд краем быть»): замена
 * один в один для страницы на простом ScrollView — без своей проводки прокрутки на каждом экране. Только для прокрутки ВСЕЙ
 * страницы под безопасной зоной / полосой «Назад»; шторкам, окнам и горизонтальным лентам не ставить. Экраны на
 * BouncyScrollView включают то же словом softTopEdge.
 *
 * Внешний стиль списка (flex, отступы, minHeight) переезжает на обёртку-маску, сам список заполняет её целиком — раскладка
 * экрана не меняется. JS зовётся событием прокрутки с частотой экрана (по умолчанию раз в 32 мс), состояние React не трогается:
 * прозрачность накладки меняется только при пересечении порога, нативным драйвером (на Android — одним шагом).
 */
const SoftTopEdgeScrollView = forwardRef<ScrollView, ScrollViewProps>(function SoftTopEdgeScrollView(
  { style, onScroll, scrollEventThrottle, children, ...rest },
  ref,
) {
  const cover = useRef(new Animated.Value(1)).current;
  const shownRef = useRef(false);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrolled = e.nativeEvent.contentOffset.y > SHOW_THRESHOLD;
      if (scrolled !== shownRef.current) {
        shownRef.current = scrolled;
        const toValue = scrolled ? 0 : 1;
        if (Platform.OS === 'android') cover.setValue(toValue);
        else Animated.timing(cover, { toValue, duration: scrolled ? SHOW_MS : HIDE_MS, useNativeDriver: true }).start();
      }
      if (typeof onScroll === 'function') onScroll(e);
    },
    [cover, onScroll],
  );

  return (
    <ScrollTopEdgeFade cover={cover} style={[styles.wrap, style]}>
      <ScrollView ref={ref} style={styles.fill} onScroll={handleScroll} scrollEventThrottle={scrollEventThrottle ?? DEFAULT_THROTTLE_MS} {...rest} decelerationRate="fast">
        {children}
      </ScrollView>
    </ScrollTopEdgeFade>
  );
});

export default SoftTopEdgeScrollView;
