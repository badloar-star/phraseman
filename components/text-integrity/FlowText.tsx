import React, { forwardRef, useCallback } from 'react';
import { Text, type NativeSyntheticEvent, type TextLayoutEventData, type TextProps } from 'react-native';
import { usePathname } from 'expo-router';

import { useLang } from '../LangContext';
import { useTextIntegrityProbe } from './use_text_integrity_probe';
import type { TextProvenance, TextSemanticMode } from './types';

type MeasurableRef = React.RefObject<{
  measureInWindow(callback: (x: number, y: number, width: number, height: number) => void): void;
} | null>;

type UnsafeNativeTextProp =
  | 'numberOfLines'
  | 'ellipsizeMode'
  | 'allowFontScaling'
  | 'adjustsFontSizeToFit'
  | 'minimumFontScale';

export type FlowTextProps = Omit<TextProps, UnsafeNativeTextProp> & {
  testID: string;
  provenance: TextProvenance;
  integrityText?: string;
  integrityHostRef?: MeasurableRef;
  integrityActionRef?: MeasurableRef;
};

type InternalFlowTextProps = FlowTextProps
  & { semanticMode: TextSemanticMode }
  & Partial<Pick<TextProps, UnsafeNativeTextProp>>;

function extractPlainText(value: React.ReactNode): string | undefined {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) {
    const parts = value.map(extractPlainText);
    return parts.every((part): part is string => part !== undefined) ? parts.join('') : undefined;
  }
  if (value === null || value === undefined || typeof value === 'boolean') return '';
  if (React.isValidElement(value) && value.type === React.Fragment) {
    const fragment = value as React.ReactElement<{ children?: React.ReactNode }>;
    return extractPlainText(fragment.props.children);
  }
  return undefined;
}

function runInOrder(first: () => void, second: () => void): void {
  let firstError: unknown;
  let failed = false;
  try { first(); } catch (error) { firstError = error; failed = true; }
  try { second(); } catch (error) { if (!failed) { firstError = error; failed = true; } }
  if (failed) throw firstError;
}

function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null): void {
  if (typeof ref === 'function') ref(value);
  else if (ref) (ref as React.MutableRefObject<T | null>).current = value;
}

const InternalFlowText = forwardRef<Text, InternalFlowTextProps>(function InternalFlowText(
  {
    children,
    integrityText,
    integrityHostRef,
    integrityActionRef,
    onTextLayout,
    provenance,
    semanticMode,
    testID,
    numberOfLines: _numberOfLines,
    ellipsizeMode: _ellipsizeMode,
    allowFontScaling: _allowFontScaling,
    adjustsFontSizeToFit: _adjustsFontSizeToFit,
    minimumFontScale: _minimumFontScale,
    ...textProps
  },
  forwardedRef,
) {
  const route = usePathname();
  const { lang } = useLang();
  const text = integrityText ?? extractPlainText(children);
  const probe = useTextIntegrityProbe({
    route,
    testID,
    locale: lang,
    semanticMode,
    provenance,
    text,
    ...(integrityHostRef ? { hostRef: integrityHostRef } : {}),
    ...(integrityActionRef ? { actionRef: integrityActionRef } : {}),
  });

  const mergedRef = useCallback((node: Text | null) => {
    probe.ref.current = node;
    assignRef(forwardedRef, node);
  }, [forwardedRef, probe.ref]);

  const handleTextLayout = useCallback((event: NativeSyntheticEvent<TextLayoutEventData>) => {
    runInOrder(
      () => probe.onTextLayout(event),
      () => onTextLayout?.(event),
    );
  }, [onTextLayout, probe]);

  return (
    <Text {...textProps} ref={mergedRef} testID={testID} onTextLayout={handleTextLayout}>
      {children}
    </Text>
  );
});

export const FlowText = forwardRef<Text, FlowTextProps>(function FlowText(props, ref) {
  return <InternalFlowText {...props} ref={ref} semanticMode="flow" />;
});

export { InternalFlowText };
