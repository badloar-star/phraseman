import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import {
  useWindowDimensions,
  type NativeSyntheticEvent,
  type Text,
  type TextLayoutEventData,
} from 'react-native';

import type { Lang } from '../../constants/i18n';
import type {
  TextIntegrityRequestCoordinator,
  TextIntegrityProbeSession,
} from './text_integrity_probe';
import type { Rect, TextProvenance, TextSemanticMode } from './types';

type DevDependencies = typeof import('./text_integrity_probe');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const devDependencies = __DEV__ ? require('./text_integrity_probe') : undefined;

type MeasurableRef = React.RefObject<{ measureInWindow(callback: (x: number, y: number, width: number, height: number) => void): void } | null>;

export type UseTextIntegrityProbeInput = {
  route: string;
  testID: string;
  locale: Lang;
  semanticMode: TextSemanticMode;
  provenance: TextProvenance;
  text: string;
  hostRef?: MeasurableRef;
  actionRef?: MeasurableRef;
};

export type UseTextIntegrityProbeResult = {
  ref: React.RefObject<Text | null>;
  onTextLayout: (event: NativeSyntheticEvent<TextLayoutEventData>) => void;
};

const NOOP_TEXT_LAYOUT = () => undefined;
const devProbeSession: TextIntegrityProbeSession | undefined = devDependencies?.createTextIntegrityProbeSession();

function useNoopTextIntegrityProbe(): UseTextIntegrityProbeResult {
  const ref = useRef<Text>(null);
  return { ref, onTextLayout: NOOP_TEXT_LAYOUT };
}

function useDevTextIntegrityProbe(input: UseTextIntegrityProbeInput): UseTextIntegrityProbeResult {
  const dependencies = devDependencies as DevDependencies;
  const textRef = useRef<Text>(null);
  const mountedRef = useRef(true);
  const coordinatorRef = useRef<TextIntegrityRequestCoordinator | null>(null);
  if (!coordinatorRef.current) coordinatorRef.current = dependencies.createTextIntegrityRequestCoordinator();
  const window = useWindowDimensions();
  // Kept behind the statically selected dev hook so production never loads safe-area measurement code.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const useStableSafeAreaInsets = require('../../app/stable_safe_area_metrics')
    .useStableSafeAreaInsets as () => { top: number; right: number; bottom: number; left: number };
  const insets = useStableSafeAreaInsets();

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useLayoutEffect(() => {
    coordinatorRef.current?.invalidate();
  }, [
    input.route, input.testID, input.locale, input.semanticMode, input.provenance, input.text,
    input.hostRef, input.actionRef,
    window.width, window.height, window.fontScale,
    insets.top, insets.right, insets.bottom, insets.left,
  ]);

  const measure = useCallback((target?: MeasurableRef): Promise<Rect | undefined> => new Promise((resolve) => {
    const node = target?.current;
    if (!node) {
      resolve(undefined);
      return;
    }
    node.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  }), []);

  const onTextLayout = useCallback((event: NativeSyntheticEvent<TextLayoutEventData>) => {
    const request = coordinatorRef.current?.begin();
    if (!request) return;
    const intrinsicText = dependencies.convertTextLayoutLinesToIntrinsicMetrics(event.nativeEvent.lines, input.text);
    void Promise.all([measure(input.hostRef), measure(input.actionRef)]).then(([hostBounds, actionBounds]) => {
      if (!mountedRef.current || !request.isLatest() || !devProbeSession) return;
      const viewport = { x: 0, y: 0, width: window.width, height: window.height };
      void devProbeSession.inspect({
        route: input.route,
        testID: input.testID,
        locale: input.locale,
        window: { width: window.width, height: window.height },
        fontScale: window.fontScale,
        semanticMode: input.semanticMode,
        provenance: input.provenance,
        rawText: input.text,
        intrinsicText,
        ...(hostBounds ? { hostBounds } : {}),
        viewport,
        safeAreaViewport: dependencies.buildSafeAreaViewport(window, insets),
        ...(actionBounds ? { actionBounds } : {}),
      }, () => mountedRef.current && request.isLatest());
    }).catch(() => undefined);
  }, [dependencies, insets, input, measure, window]);

  return { ref: textRef, onTextLayout };
}

export const useTextIntegrityProbe = __DEV__ ? useDevTextIntegrityProbe : useNoopTextIntegrityProbe;
