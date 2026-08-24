import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
} from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { LUM, SURVEY_HYBRID } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';

type SurveyQuestionTransitionProps = {
  transitionKey: string;
  direction: 'forward' | 'backward';
  children: React.ReactNode;
};

type QuestionFrame = SurveyQuestionTransitionProps;

type TestableContainerProps = ComponentProps<typeof View> & {
  testOnly_startX?: number;
};

const TestableContainer = View as ComponentType<TestableContainerProps>;

export default function SurveyQuestionTransition({
  transitionKey,
  direction,
  children,
}: SurveyQuestionTransitionProps) {
  const reduceMotion = useReduceMotion();
  const incomingFrame = { transitionKey, direction, children };
  const desiredRef = useRef<QuestionFrame>(incomingFrame);
  desiredRef.current = incomingFrame;
  const [currentFrame, setCurrentFrame] = useState<QuestionFrame>(() => incomingFrame);
  const [previousFrame, setPreviousFrame] = useState<QuestionFrame | null>(null);
  const currentFrameRef = useRef(currentFrame);
  const transitionVersionRef = useRef(0);
  const progress = useSharedValue(0);
  const startX = reduceMotion
    ? 0
    : direction === 'forward'
      ? SURVEY_HYBRID.questionShiftPx
      : -SURVEY_HYBRID.questionShiftPx;
  const exitX = -startX;
  const duration = reduceMotion ? LUM.heroFadeMs : LUM.contentMs;

  const completeTransition = useCallback((version: number) => {
    if (version !== transitionVersionRef.current) return;
    setPreviousFrame(null);
  }, []);

  const animateProgress = useCallback((version: number) => {
    cancelAnimation(progress);
    progress.value = 0;
    progress.value = withTiming(
      1,
      { duration, easing: Easing.out(Easing.cubic) },
      (finished) => {
        if (finished) scheduleOnRN(completeTransition, version);
      },
    );
  }, [completeTransition, duration, progress]);

  const animateToLatest = useCallback(() => {
    const next = desiredRef.current;
    if (next.transitionKey === currentFrameRef.current.transitionKey) return;
    const version = transitionVersionRef.current + 1;
    transitionVersionRef.current = version;
    setPreviousFrame(currentFrameRef.current);
    currentFrameRef.current = next;
    setCurrentFrame(next);
    animateProgress(version);
  }, [animateProgress]);

  useEffect(() => {
    const version = transitionVersionRef.current + 1;
    transitionVersionRef.current = version;
    animateProgress(version);
    return () => cancelAnimation(progress);
  }, [animateProgress, progress]);

  useEffect(() => {
    animateToLatest();
  }, [animateToLatest, transitionKey]);

  const currentStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateX: startX * (1 - progress.value) }],
  }));
  const previousStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateX: exitX * progress.value }],
  }));

  return (
    <TestableContainer
      testID="survey-question-transition"
      testOnly_startX={process.env.NODE_ENV === 'test' ? startX : undefined}
      style={styles.container}
    >
      {previousFrame ? (
        <Reanimated.View
          testID="survey-question-transition-previous"
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[styles.previousLayer, previousStyle]}
        >
          {previousFrame.children}
        </Reanimated.View>
      ) : null}
      <Reanimated.View testID="survey-question-transition-current" style={currentStyle}>
        {currentFrame.transitionKey === transitionKey ? children : currentFrame.children}
      </Reanimated.View>
    </TestableContainer>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  previousLayer: { ...StyleSheet.absoluteFillObject },
});
