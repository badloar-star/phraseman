import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, StyleSheet, type ViewStyle } from 'react-native';

import { useReduceMotion } from '../hooks/use_reduce_motion';
import { getModalMotionPlan } from './modal_motion_plan';
import { completeModalClose, nextModalTransition, type ModalPresentationState } from './modal_motion_state';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  panelStyle?: ViewStyle;
  testID?: string;
};

export default function MotionModal({ visible, onRequestClose, children, panelStyle, testID }: Props) {
  const reduceMotion = useReduceMotion();
  const plan = getModalMotionPlan(reduceMotion);
  const progress = useRef(new Animated.Value(visible ? 1 : 0)).current;
  const [presented, setPresented] = useState(visible);
  const presentationRef = useRef<ModalPresentationState>({ presented: visible, closeRun: 0 });

  useEffect(() => {
    progress.stopAnimation();
    const transition = nextModalTransition(presentationRef.current, visible);
    presentationRef.current = transition.state;
    if (transition.kind === 'open') {
      setPresented(true);
      Animated.timing(progress, { toValue: 1, duration: plan.openMs, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
      return () => progress.stopAnimation();
    }
    if (transition.kind !== 'close') return () => progress.stopAnimation();
    const run = transition.run;
    Animated.timing(progress, { toValue: 0, duration: plan.closeMs, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
      if (!finished) return;
      presentationRef.current = completeModalClose(presentationRef.current, run);
      if (!presentationRef.current.presented) setPresented(false);
    });
    return () => progress.stopAnimation();
  }, [plan.closeMs, plan.openMs, presented, progress, visible]);

  return (
    <Modal transparent visible={presented} animationType="none" onRequestClose={onRequestClose} statusBarTranslucent>
      <Animated.View
        testID={testID}
        onAccessibilityEscape={onRequestClose}
        style={[styles.backdrop, { opacity: progress }]}
      >
        <Animated.View
          style={[
            styles.panel,
            panelStyle,
            {
              opacity: progress,
              transform: [
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [plan.translateY, 0] }) },
                { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [plan.scaleFrom, 1] }) },
              ],
            },
          ]}
        >
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.42)' },
  panel: { flex: 1 },
});
