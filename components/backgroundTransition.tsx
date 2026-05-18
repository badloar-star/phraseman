import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { scheduleAnimatedStateUpdate, type ScheduledAnimatedStateUpdate } from './animationScheduling';

export const BACKGROUND_BLUR_SWITCH_MAX_RADIUS = 0;
export const BACKGROUND_BLUR_SWITCH_IN_MS = 0;
export const BACKGROUND_BLUR_SWITCH_OUT_MS = 0;
export const BACKGROUND_LAYER_FADE_MS = 720;

export function backgroundTransitionKey(value: unknown): string {
  if (value == null) return 'none';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

type BackgroundBlurSwitchOptions<T> = {
  value: T;
  transitionKey: string;
  initialValue?: T;
  initialTransitionKey?: string;
  maxBlurRadius?: number;
  blurInDuration?: number;
  blurOutDuration?: number;
  disabled?: boolean;
};

export type PersistentBackgroundLayer<T> = {
  id: number;
  key: string;
  value: T;
  opacity: Animated.Value;
};

type PersistentBackgroundLayersOptions<T> = {
  value: T;
  transitionKey: string;
  initialValue?: T;
  initialTransitionKey?: string;
  maxBlurRadius?: number;
  blurInDuration?: number;
  blurOutDuration?: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  fadeOutDelay?: number;
  disabled?: boolean;
  maxLayers?: number;
};

export function useBackgroundBlurSwitch<T>({
  value,
  transitionKey,
  initialValue,
  initialTransitionKey,
  disabled = false,
}: BackgroundBlurSwitchOptions<T>) {
  const activeKeyRef = useRef(initialTransitionKey ?? transitionKey);
  const pendingValueRef = useRef(value);
  const [activeValue, setActiveValue] = useState<T>(initialValue ?? value);
  const activeValueRef = useRef<T>(initialValue ?? value);
  const blurProgress = useRef(new Animated.Value(0)).current;

  pendingValueRef.current = value;
  activeValueRef.current = activeValue;

  useEffect(() => {
    if (activeKeyRef.current === transitionKey) return undefined;
    activeKeyRef.current = transitionKey;

    const nextValue = pendingValueRef.current;
    blurProgress.stopAnimation();
    blurProgress.setValue(0);
    activeValueRef.current = nextValue;
    setActiveValue(nextValue);

    return undefined;
  }, [blurProgress, disabled, transitionKey]);

  return { activeValue, blurRadius: 0, blurProgress };
}

export function usePersistentBackgroundLayers<T>({
  value,
  transitionKey,
  initialValue,
  initialTransitionKey,
  fadeInDuration = BACKGROUND_LAYER_FADE_MS,
  fadeOutDuration = BACKGROUND_LAYER_FADE_MS,
  fadeOutDelay = fadeInDuration,
  disabled = false,
  maxLayers = 3,
}: PersistentBackgroundLayersOptions<T>) {
  const layerSeqRef = useRef(0);
  const activeKeyRef = useRef(initialTransitionKey ?? transitionKey);
  const pendingValueRef = useRef(value);
  const cleanupTasksRef = useRef<ScheduledAnimatedStateUpdate[]>([]);
  const initialKey = initialTransitionKey ?? transitionKey;
  const [layers, setLayers] = useState<PersistentBackgroundLayer<T>[]>(() => [{
    id: 0,
    key: initialKey,
    value: initialValue ?? value,
    opacity: new Animated.Value(1),
  }]);
  const layersRef = useRef(layers);
  const blurProgress = useRef(new Animated.Value(0)).current;

  pendingValueRef.current = value;

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => () => {
    cleanupTasksRef.current.forEach(task => task.cancel());
    cleanupTasksRef.current = [];
  }, []);

  useEffect(() => {
    if (activeKeyRef.current === transitionKey) return;
    activeKeyRef.current = transitionKey;

    const nextLayer: PersistentBackgroundLayer<T> = {
      id: ++layerSeqRef.current,
      key: transitionKey,
      value: pendingValueRef.current,
      opacity: new Animated.Value(disabled ? 1 : 0),
    };

    const previousLayers = layersRef.current;
    previousLayers.forEach(layer => {
      layer.opacity.stopAnimation();
    });

    if (disabled) {
      setLayers([nextLayer]);
      return;
    }

    const exitAnimations = previousLayers.map(layer => {
      const fadeOut = Animated.sequence([
        Animated.delay(fadeOutDelay),
        Animated.timing(layer.opacity, {
          toValue: 0,
          duration: fadeOutDuration,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]);

      fadeOut.start(({ finished }) => {
        if (!finished) return;
        let scheduled: ScheduledAnimatedStateUpdate | null = null;
        scheduled = scheduleAnimatedStateUpdate(() => {
          if (scheduled) {
            cleanupTasksRef.current = cleanupTasksRef.current.filter(task => task !== scheduled);
          }
          setLayers(current => current.filter(item => item.id !== layer.id || item.key === activeKeyRef.current));
        });
        cleanupTasksRef.current.push(scheduled);
      });

      return fadeOut;
    });

    setLayers(current => {
      const withoutSameKey = current.filter(layer => layer.key !== nextLayer.key);
      return [...withoutSameKey.slice(-(maxLayers - 1)), nextLayer];
    });

    Animated.timing(nextLayer.opacity, {
      toValue: 1,
      duration: fadeInDuration,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start();

    return () => {
      exitAnimations.forEach(anim => anim.stop());
    };
  }, [disabled, fadeInDuration, fadeOutDelay, fadeOutDuration, maxLayers, transitionKey]);

  return { layers, blurRadius: 0, blurProgress };
}
