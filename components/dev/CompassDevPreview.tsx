import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  beginCompassSheetClose,
  completeCompassSheetClose,
  IDLE_COMPASS_SHEET,
  openCompassSheet,
  type CompassSheetLifecycle,
} from '../../app/compass_sheet_lifecycle';
import { hapticTap } from '../../hooks/use-haptics';
import { useLang } from '../LangContext';
import CompassQuickSheet from '../compass/CompassQuickSheet';
import CompassSurface from '../compass/CompassSurface';
import { buildCompassDevSeed, type CompassDevSeedId } from './compassDevSeeds';

type Props = Readonly<{
  visible: boolean;
  seed: CompassDevSeedId;
  run: number;
  onClose: () => void;
}>;

export default function CompassDevPreview({ visible, seed, run, onClose }: Props) {
  const { lang } = useLang();
  const [sheet, setSheet] = useState<CompassSheetLifecycle>(IDLE_COMPASS_SHEET);
  const sheetRef = useRef<CompassSheetLifecycle>(IDLE_COMPASS_SHEET);
  const closeSequenceRef = useRef(0);
  const completedRef = useRef(false);
  const headingRef = useRef<Text>(null);
  const seededState = useMemo(() => buildCompassDevSeed(seed, lang), [lang, seed]);

  useEffect(() => {
    completedRef.current = false;
    const next = visible ? openCompassSheet('home_control') : IDLE_COMPASS_SHEET;
    sheetRef.current = next;
    setSheet(next);
  }, [run, seed, visible]);

  const requestClose = useCallback(() => {
    const current = sheetRef.current;
    if (current.phase !== 'open') return;
    hapticTap();
    closeSequenceRef.current += 1;
    const next = beginCompassSheetClose(current, closeSequenceRef.current);
    sheetRef.current = next;
    setSheet(next);
  }, []);

  const completeClose = useCallback((closeId: number) => {
    const completed = completeCompassSheetClose(sheetRef.current, closeId);
    if (!completed.accepted) return;
    completedRef.current = true;
    sheetRef.current = completed.next;
    setSheet(completed.next);
  }, []);

  useEffect(() => {
    if (sheet.phase !== 'idle' || !completedRef.current) return;
    completedRef.current = false;
    onClose();
  }, [onClose, sheet.phase]);

  return (
    <View
      testID="dev-compass-preview-host"
      pointerEvents={visible ? 'box-none' : 'none'}
      accessibilityElementsHidden={!visible}
      importantForAccessibility={visible ? 'auto' : 'no-hide-descendants'}
      style={StyleSheet.absoluteFill}
    >
      <CompassQuickSheet
        granted={visible}
        phase={sheet.phase}
        closeId={sheet.phase === 'closing' ? sheet.closeId : null}
        onRequestClose={requestClose}
        onClosed={completeClose}
        focusTargetRef={headingRef}
      >
        {expanded => (
          <CompassSurface
            presentation={expanded ? 'expanded' : 'compact'}
            active={visible && sheet.phase === 'open'}
            recommendation={seededState.recommendation}
            onPrimary={requestClose}
            headingRef={headingRef}
          />
        )}
      </CompassQuickSheet>
    </View>
  );
}
