import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../ThemeContext';
import { hapticSuccess, hapticTap } from '../../hooks/use-haptics';
import { MOTION_SPRING_LEGACY } from '../../constants/motion';
import { rewardModalPanelBorder, rewardModalPanelColors } from '../RewardModalBackdrop';
import {
  RewardCardBody,
  rewardCardBackdropColor,
  rewardSemanticAccent,
  type RewardCardSemantic,
} from './RewardCardV2';

import { noAndroidOutline } from '../../constants/androidGlow';
/**
 * RewardStackV2 — очередь наград единого стандарта (утверждено 2026-06-10):
 * вместо парада модалок — ОДНА карточка с очередью-стопкой позади и точками «1 из N».
 * На карточке обычная «Забрать» (текущая награда), ПОД карточкой — стеклянная
 * «Забрать всё · N». По «Забрать всё»: стопка схлопывается, бэкдроп растворяется,
 * иконки наград выпархивают и веером улетают вверх к счётчикам шапки.
 * Макет-контракт: docs/reports/modal_redesign_mockups_2026-06-10.html (Reward Stack).
 */
export type StackReward = {
  key: string;
  /** Если не задан — компонент подставит счётчик counterLabel(i, n). */
  kicker?: string;
  /** Строка = эмодзи, иначе ReactNode (Image/SVG). */
  icon: React.ReactNode | string;
  title: string;
  value?: string;
  semantic?: RewardCardSemantic;
  accentColor?: string;
};

export type RewardStackV2Props = {
  visible: boolean;
  rewards: StackReward[];
  /** Начислить награду. Вызывается на «Забрать» и для каждой оставшейся при «Забрать всё». */
  onClaimReward: (reward: StackReward) => void;
  /** Очередь обработана (после анимации улёта) — родитель размонтирует/чистит состояние. */
  onFinished: () => void;
  claimLabel?: string;
  claimAllLabel?: string;
  counterLabel?: (index1: number, total: number) => string;
};

type FlyAnim = {
  reward: StackReward;
  y: Animated.Value;
  x: Animated.Value;
  scale: Animated.Value;
  opacity: Animated.Value;
  targetX: number;
};

const MAX_FLY_ICONS = 5;
const FLY_X_STEP = 78;

function RewardStackV2({
  visible,
  rewards,
  onClaimReward,
  onFinished,
  claimLabel = 'Забрать',
  claimAllLabel = 'Забрать всё',
  counterLabel = (i, n) => `Награда ${i} из ${n}`,
}: RewardStackV2Props) {
  const { theme: t, f, ds, themeMode } = useTheme();
  const [idx, setIdx] = useState(0);
  const [flying, setFlying] = useState(false);
  const flyAnimsRef = useRef<FlyAnim[]>([]);
  const backdropOpacity = useRef(new Animated.Value(1)).current;
  const columnScale = useRef(new Animated.Value(1)).current;
  const columnY = useRef(new Animated.Value(0)).current;
  const columnOpacity = useRef(new Animated.Value(1)).current;
  const finishedRef = useRef(onFinished);
  finishedRef.current = onFinished;
  /** Защита от двойного запуска (двойной тап по «Забрать всё» + фону). */
  const claimingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    setIdx(0);
    setFlying(false);
    claimingRef.current = false;
    flyAnimsRef.current = [];
    backdropOpacity.setValue(1);
    columnScale.setValue(1);
    columnY.setValue(0);
    columnOpacity.setValue(1);
  }, [backdropOpacity, columnOpacity, columnScale, columnY, visible]);

  /** Пустая очередь — нечего показывать. */
  useEffect(() => {
    if (visible && rewards.length === 0) finishedRef.current();
  }, [rewards.length, visible]);

  const flyHeight = Math.round(Dimensions.get('window').height * 0.55);

  const runFlyOut = useCallback(
    (toFly: StackReward[]) => {
      const icons = toFly.slice(0, MAX_FLY_ICONS);
      const k = icons.length;
      flyAnimsRef.current = icons.map((reward, i) => ({
        reward,
        y: new Animated.Value(0),
        x: new Animated.Value(0),
        scale: new Animated.Value(0.2),
        opacity: new Animated.Value(0),
        targetX: (i - (k - 1) / 2) * FLY_X_STEP,
      }));
      setFlying(true);

      const bubbleSeqs = flyAnimsRef.current.map((b, i) =>
        Animated.sequence([
          Animated.delay(i * 90),
          /** Pop: пузырь выпархивает в центре. */
          Animated.parallel([
            Animated.timing(b.opacity, { toValue: 1, duration: 140, useNativeDriver: true }),
            Animated.timing(b.scale, {
              toValue: 1.15,
              duration: 200,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(b.scale, { toValue: 0.96, duration: 110, useNativeDriver: true }),
          /** Улёт веером вверх к счётчикам шапки. */
          Animated.parallel([
            Animated.timing(b.y, {
              toValue: -flyHeight,
              duration: 640,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(b.x, {
              toValue: b.targetX,
              duration: 640,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: true,
            }),
            Animated.timing(b.scale, { toValue: 0.35, duration: 640, useNativeDriver: true }),
            Animated.sequence([
              Animated.delay(320),
              Animated.timing(b.opacity, { toValue: 0, duration: 320, useNativeDriver: true }),
            ]),
          ]),
        ]),
      );

      Animated.parallel([
        /** Стопка с кнопкой схлопываются вниз. */
        Animated.parallel([
          Animated.timing(columnScale, { toValue: 0.55, duration: 260, useNativeDriver: true }),
          Animated.timing(columnY, { toValue: 60, duration: 260, useNativeDriver: true }),
          Animated.timing(columnOpacity, { toValue: 0, duration: 240, useNativeDriver: true }),
        ]),
        /** Затемнение растворяется, пока летят награды. */
        Animated.sequence([
          Animated.delay(150),
          Animated.timing(backdropOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]),
        ...bubbleSeqs,
      ]).start(() => {
        finishedRef.current();
      });
    },
    [backdropOpacity, columnOpacity, columnScale, columnY, flyHeight],
  );

  const handleClaimAll = useCallback(() => {
    if (claimingRef.current) return;
    claimingRef.current = true;
    hapticSuccess();
    const rest = rewards.slice(idx);
    rest.forEach((r) => onClaimReward(r));
    runFlyOut(rest);
  }, [idx, onClaimReward, rewards, runFlyOut]);

  const handleClaimOne = useCallback(() => {
    if (claimingRef.current) return;
    const current = rewards[idx];
    if (!current) return;
    if (idx >= rewards.length - 1) {
      /** Последняя — тот же улёт, но с одной иконкой. */
      claimingRef.current = true;
      hapticSuccess();
      onClaimReward(current);
      runFlyOut([current]);
      return;
    }
    hapticTap();
    onClaimReward(current);
    setIdx((v) => v + 1);
  }, [idx, onClaimReward, rewards, runFlyOut]);

  if (!visible || rewards.length === 0) return null;

  const current = rewards[Math.min(idx, rewards.length - 1)];
  const remaining = rewards.length - idx;
  const total = rewards.length;
  const accent = current.accentColor ?? rewardSemanticAccent(current.semantic ?? 'gold', t, themeMode);
  const panelColors = rewardModalPanelColors(themeMode, t);
  const panelBorder = rewardModalPanelBorder(themeMode, t);
  const glassRadius = false ? 9 : ds.radius.lg;

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClaimAll}
    >
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: rewardCardBackdropColor(themeMode), opacity: backdropOpacity },
        ]}
      />
      {/* Тап по фону = «Забрать всё»: очередь наград не теряется. */}
      <Pressable style={styles.root} onPress={handleClaimAll}>
        <Animated.View
            style={[
              styles.column,
              { transform: [{ scale: columnScale }, { translateY: columnY }], opacity: columnOpacity },
            ]}
          >
            <View style={styles.stackWrap} onStartShouldSetResponder={() => true}>
              {remaining > 2 ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.under,
                    styles.under2,
                    { borderRadius: ds.radius.xxl, backgroundColor: panelColors[1], borderColor: panelBorder },
                  ]}
                />
              ) : null}
              {remaining > 1 ? (
                <View
                  pointerEvents="none"
                  style={[
                    styles.under,
                    styles.under1,
                    { borderRadius: ds.radius.xxl, backgroundColor: panelColors[1], borderColor: panelBorder },
                  ]}
                />
              ) : null}
              <RewardCardBody
                key={current.key}
                kicker={current.kicker ?? counterLabel(idx + 1, total)}
                icon={current.icon}
                title={current.title}
                value={current.value}
                semantic={current.semantic ?? 'gold'}
                accentColor={current.accentColor}
                ctaLabel={claimLabel}
                onCta={handleClaimOne}
              >
                {total > 1 ? (
                  <View style={styles.dots}>
                    {rewards.map((r, i) => (
                      <View
                        key={r.key}
                        style={[
                          styles.dot,
                          { backgroundColor: i === idx ? accent : t.textMuted },
                          i === idx ? styles.dotActive : styles.dotIdle,
                        ]}
                      />
                    ))}
                  </View>
                ) : null}
              </RewardCardBody>
            </View>
            {remaining > 1 ? (
              <Pressable
                onPress={handleClaimAll}
                style={({ pressed }) => [
                  styles.claimAll,
                  {
                    borderRadius: glassRadius,
                    minHeight: ds.buttonHeight,
                    backgroundColor: `${t.bgCard}B8`,
                    borderColor: t.border,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.claimAllText, { color: t.textPrimary, fontSize: f.body }]}>
                  {claimAllLabel}
                </Text>
                <View style={[styles.counter, { backgroundColor: t.accentBg }]}>
                  <Text style={[styles.counterText, { color: t.accent, fontSize: f.caption }]}>
                    {remaining}
                  </Text>
                </View>
              </Pressable>
            ) : null}
        </Animated.View>
        {flying ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            {flyAnimsRef.current.map((b) => (
              <Animated.View
                key={b.reward.key}
                style={[
                  styles.bubbleHost,
                  {
                    opacity: b.opacity,
                    transform: [{ translateX: b.x }, { translateY: b.y }, { scale: b.scale }],
                  },
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    {
                      backgroundColor: panelColors[0],
                      borderColor: rewardSemanticAccent(b.reward.semantic ?? 'gold', t, themeMode),
                    },
                  ]}
                >
                  {typeof b.reward.icon === 'string' ? (
                    <Text style={styles.bubbleEmoji}>{b.reward.icon}</Text>
                  ) : (
                    b.reward.icon
                  )}
                </View>
              </Animated.View>
            ))}
          </View>
        ) : null}
      </Pressable>
    </Modal>
  );
}

export default memo(RewardStackV2);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
  },
  column: {
    alignItems: 'center',
    gap: 14,
  },
  stackWrap: {
    alignItems: 'center',
  },
  under: {
    position: 'absolute',
    borderWidth: 0,
  },
  under1: {
    top: -9,
    bottom: 6,
    left: 14,
    right: 14,
    opacity: 0.6,
  },
  under2: {
    top: -17,
    bottom: 14,
    left: 27,
    right: 27,
    opacity: 0.32,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotIdle: {
    width: 6,
    opacity: 0.35,
  },
  dotActive: {
    width: 18,
    opacity: 1,
  },
  claimAll: {
    alignSelf: 'stretch',
    minWidth: 300,
    borderWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  claimAllText: {
    fontWeight: '800',
  },
  counter: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: {
    fontWeight: '900',
  },
  bubbleHost: {
    position: 'absolute',
    left: '50%',
    top: '46%',
    marginLeft: -30,
    marginTop: -30,
  },
  bubble: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    ...noAndroidOutline,
  },
  bubbleEmoji: {
    fontSize: 26,
  },
});
