import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  View,
  type ViewStyle,
  type StyleProp,
} from 'react-native';

import { InternalFlowText } from './FlowText';
import type { Rect, TextProvenance } from './types';

export const MIN_READABLE_BODY = 44;
export const SCROLL_BOUNDARY_TOLERANCE = 2;

export type ScrollBoundaryState = { atStart: boolean; atEnd: boolean };

export function computeScrollBoundaries(
  event: Pick<NativeScrollEvent, 'contentOffset' | 'layoutMeasurement' | 'contentSize'>,
): ScrollBoundaryState | null {
  const rawY = event.contentOffset.y;
  const viewportHeight = event.layoutMeasurement.height;
  const contentHeight = event.contentSize.height;
  if (![rawY, viewportHeight, contentHeight].every(Number.isFinite)
    || viewportHeight < 0 || contentHeight < 0) return null;
  const y = Math.max(0, rawY);
  return {
    atStart: y <= SCROLL_BOUNDARY_TOLERANCE,
    atEnd: y + viewportHeight >= contentHeight - SCROLL_BOUNDARY_TOLERANCE,
  };
}

export type ScrollableTextRegionProps = {
  testID: string;
  text: string;
  provenance: TextProvenance;
  availableViewport: Rect;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onBodyScrollBoundaryChange?: (state: ScrollBoundaryState) => void;
  onInsufficientViewport?: (availableBodyHeight: number) => void;
};

export function ScrollableTextRegion({
  testID,
  text,
  provenance,
  availableViewport,
  header,
  footer,
  style,
  onBodyScrollBoundaryChange,
  onInsufficientViewport,
}: ScrollableTextRegionProps) {
  const [headerHeight, setHeaderHeight] = useState(0);
  const [footerHeight, setFooterHeight] = useState(0);
  const lastBoundary = useRef<ScrollBoundaryState>();
  const deliveredBoundaryCallback = useRef<typeof onBodyScrollBoundaryChange>();
  const deliveredInsufficientCallback = useRef<typeof onInsufficientViewport>();
  const scrollMetrics = useRef<{ offset: number; viewport?: number; content?: number }>({ offset: 0 });
  const scrollHostMode = useRef<'normal' | 'fallback'>('normal');
  const viewportHeight = Number.isFinite(availableViewport.height) && availableViewport.height > 0
    ? availableViewport.height
    : 0;
  const availableBodyHeight = Math.max(0, viewportHeight - headerHeight - footerHeight);
  const needsFallback = availableBodyHeight < MIN_READABLE_BODY;
  const hostMode = needsFallback ? 'fallback' : 'normal';
  if (scrollHostMode.current !== hostMode) {
    scrollHostMode.current = hostMode;
    scrollMetrics.current = { offset: 0 };
    lastBoundary.current = undefined;
    deliveredBoundaryCallback.current = undefined;
  }

  useEffect(() => {
    if (!needsFallback) {
      deliveredInsufficientCallback.current = undefined;
      return;
    }
    if (!onInsufficientViewport) {
      deliveredInsufficientCallback.current = undefined;
      return;
    }
    if (onInsufficientViewport && deliveredInsufficientCallback.current !== onInsufficientViewport) {
      onInsufficientViewport(availableBodyHeight);
      deliveredInsufficientCallback.current = onInsufficientViewport;
    }
  }, [availableBodyHeight, needsFallback, onInsufficientViewport]);

  useEffect(() => {
    if (!onBodyScrollBoundaryChange) {
      deliveredBoundaryCallback.current = undefined;
      return;
    }
    if (lastBoundary.current && onBodyScrollBoundaryChange
      && deliveredBoundaryCallback.current !== onBodyScrollBoundaryChange) {
      onBodyScrollBoundaryChange(lastBoundary.current);
      deliveredBoundaryCallback.current = onBodyScrollBoundaryChange;
    }
  }, [onBodyScrollBoundaryChange]);

  const measure = useCallback((setter: React.Dispatch<React.SetStateAction<number>>) => (
    event: LayoutChangeEvent,
  ) => {
    const next = event.nativeEvent.layout.height;
    if (Number.isFinite(next) && next >= 0) setter((current) => current === next ? current : next);
  }, []);
  const onHeaderLayout = useMemo(() => measure(setHeaderHeight), [measure]);
  const onFooterLayout = useMemo(() => measure(setFooterHeight), [measure]);
  const publishBoundary = useCallback((metrics: { offset: number; viewport?: number; content?: number }) => {
    if (metrics.viewport === undefined || metrics.content === undefined) return;
    const next = computeScrollBoundaries({
      contentOffset: { x: 0, y: metrics.offset },
      layoutMeasurement: { width: 0, height: metrics.viewport },
      contentSize: { width: 0, height: metrics.content },
    });
    if (!next) return;
    const previous = lastBoundary.current;
    if (!previous || previous.atStart !== next.atStart || previous.atEnd !== next.atEnd
      || deliveredBoundaryCallback.current !== onBodyScrollBoundaryChange) {
      lastBoundary.current = next;
      onBodyScrollBoundaryChange?.(next);
      deliveredBoundaryCallback.current = onBodyScrollBoundaryChange;
    }
  }, [onBodyScrollBoundaryChange]);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = computeScrollBoundaries(event.nativeEvent);
    if (!next) return;
    scrollMetrics.current = {
      offset: Math.max(0, event.nativeEvent.contentOffset.y),
      viewport: event.nativeEvent.layoutMeasurement.height,
      content: event.nativeEvent.contentSize.height,
    };
    publishBoundary(scrollMetrics.current);
  }, [publishBoundary]);
  const onScrollLayout = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    if (!Number.isFinite(height) || height < 0) return;
    scrollMetrics.current = { ...scrollMetrics.current, viewport: height };
    publishBoundary(scrollMetrics.current);
  }, [publishBoundary]);
  const onContentSizeChange = useCallback((_width: number, height: number) => {
    if (!Number.isFinite(height) || height < 0) return;
    scrollMetrics.current = { ...scrollMetrics.current, content: height };
    publishBoundary(scrollMetrics.current);
  }, [publishBoundary]);

  const headerRegion = header
    ? <View testID={`${testID}-header`} onLayout={onHeaderLayout}>{header}</View>
    : null;
  const footerRegion = footer
    ? <View testID={`${testID}-footer`} onLayout={onFooterLayout}>{footer}</View>
    : null;
  const bodyText = (
    <InternalFlowText testID={`${testID}-text`} provenance={provenance} semanticMode="scroll">
      {text}
    </InternalFlowText>
  );

  return (
    <View
      testID={testID}
      style={[style, { flexShrink: 1, height: viewportHeight, maxHeight: viewportHeight }]}
    >
      {needsFallback ? (
        <ScrollView
          testID={`${testID}-fallback-scroll`}
          style={{ flex: 1, maxHeight: viewportHeight }}
          nestedScrollEnabled
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          scrollEventThrottle={16}
          onScroll={onScroll}
          onLayout={onScrollLayout}
          onContentSizeChange={onContentSizeChange}
        >
          {headerRegion}
          <View testID={`${testID}-fallback-body`}>{bodyText}</View>
          {footerRegion}
        </ScrollView>
      ) : (
        <>
          {headerRegion}
          <ScrollView
            testID={`${testID}-scroll`}
            style={[{ flexShrink: 1 }, { maxHeight: availableBodyHeight }]}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            scrollEventThrottle={16}
            onScroll={onScroll}
            onLayout={onScrollLayout}
            onContentSizeChange={onContentSizeChange}
          >
            {bodyText}
          </ScrollView>
          {footerRegion}
        </>
      )}
    </View>
  );
}
