import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import type { ThemeMode } from '../constants/theme';
import LevelBadge from './LevelBadge';
import { LinearGradient } from './SafeLinearGradient';
import { getLevelUpThresholdPalette } from './levelUpThresholdTheme';
import { SpinRewardPlaque } from './SpinRewardPlaque';

type ThresholdRewardRowProps = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  color: string;
  surface: string;
  border: string;
};

function ThresholdRewardRow({ icon, label, value, color, surface, border }: ThresholdRewardRowProps) {
  return (
    <View style={[styles.rewardRow, { backgroundColor: surface, borderColor: border }]}> 
      <View style={[styles.rewardIcon, { backgroundColor: `${color}1F` }]}> 
        <Ionicons name={icon} size={17} color={color} />
      </View>
      <View style={styles.rewardCopy}>
        <Text style={[styles.rewardLabel, { color }]}>{label}</Text>
        <Text style={[styles.rewardValue, { color }]}>{value}</Text>
      </View>
    </View>
  );
}

export type LevelUpPreviewVariant = 'standard' | 'milestone';

export type LevelUpThresholdModalProps = {
  visible: boolean;
  variant?: LevelUpPreviewVariant;
  level: number;
  themeMode: ThemeMode;
  kicker: string;
  headline: string;
  message: string;
  xpLabel: string;
  xpValue: string;
  titleLabel: string;
  titleReward?: string;
  titleColor?: string;
  energyLabel: string;
  energyReward?: number;
  energyValue: (amount: number) => string;
  spinReward: boolean;
  spinReceiptId: string;
  continueLabel: string;
  opacity: Animated.Value;
  translateY: Animated.Value;
  glow: Animated.Value;
  onShow: () => void;
  onContinue: () => void;
};

export default function LevelUpThresholdModal({
  visible,
  variant = 'standard',
  level,
  themeMode,
  kicker,
  headline,
  message,
  xpLabel,
  xpValue,
  titleLabel,
  titleReward,
  titleColor,
  energyLabel,
  energyReward,
  energyValue,
  spinReward,
  spinReceiptId,
  continueLabel,
  opacity,
  translateY,
  glow,
  onShow,
  onContinue,
}: LevelUpThresholdModalProps) {
  const { height, width } = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const palette = getLevelUpThresholdPalette(themeMode);
  const compact = height < 720;
  const milestone = variant === 'milestone';
  const portalSize = Math.min(compact ? 154 : 206, width - 104);
  const badgeSize = compact ? 82 : 108;

  const entranceStyle = useMemo<Animated.WithAnimatedValue<ViewStyle>>(() => {
    if (reduceMotion) return { opacity: 1 };
    return {
      opacity,
      transform: [
        { translateY },
        { scale: opacity.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
      ] as const,
    };
  }, [opacity, reduceMotion, translateY]);

  const portalStyle: Animated.WithAnimatedValue<ViewStyle> | undefined = reduceMotion
    ? undefined
    : {
      opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.58, 1] }),
      transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }] as const,
    };
  const milestoneFlareStyle: Animated.WithAnimatedValue<ViewStyle> | undefined = reduceMotion || !milestone
    ? undefined
    : {
      opacity: glow.interpolate({ inputRange: [0, 0.36, 1], outputRange: [0, 0.45, 1] }),
      transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }] as const,
    };
  const rewardRevealStyle: Animated.WithAnimatedValue<ViewStyle> | undefined = reduceMotion
    ? undefined
    : {
      opacity: glow.interpolate({ inputRange: [0, 0.30, 1], outputRange: [0, 0, 1] }),
      transform: [{ translateY: glow.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] as const,
    };
  const actionRevealStyle: Animated.WithAnimatedValue<ViewStyle> | undefined = reduceMotion
    ? undefined
    : {
      opacity: glow.interpolate({ inputRange: [0, 0.38, 1], outputRange: [0, 0, 1] }),
      transform: [{ translateY: glow.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] as const,
    };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      statusBarTranslucent
      onShow={onShow}
      onRequestClose={() => {}}
    >
      <View
        accessibilityViewIsModal
        style={styles.screen}
      >
        <LinearGradient
          pointerEvents="none"
          colors={palette.background}
          locations={[0, 0.56, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={[styles.ambientTop, { backgroundColor: palette.ambient }]} />
        <View pointerEvents="none" style={[styles.ambientBottom, { backgroundColor: `${palette.accentSecondary}17` }]} />
        <View pointerEvents="none" style={[styles.horizon, { backgroundColor: palette.portalBorder }]} />

        <ScrollView
          bounces={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, compact && styles.scrollContentCompact]}
        >
          <Animated.View testID="level-up-modal" style={[styles.stage, entranceStyle]}>
            <Text style={[styles.kicker, { color: palette.accent }]}>{kicker}</Text>

            <Animated.View
              testID={`level-up-portal-${variant}`}
              style={[
                styles.portalStage,
                milestone && styles.portalStageMilestone,
                portalStyle,
                { width: portalSize, height: portalSize },
              ]}
            >
              <View
                pointerEvents="none"
                style={[
                  styles.portalHalo,
                  {
                    width: portalSize,
                    height: portalSize,
                    borderRadius: portalSize / 2,
                    backgroundColor: palette.ambient,
                  },
                ]}
              />
              <LinearGradient
                colors={palette.portalFill}
                start={{ x: 0.18, y: 0 }}
                end={{ x: 0.82, y: 1 }}
                style={[
                  styles.portal,
                  {
                    width: portalSize - 18,
                    height: portalSize - 18,
                    borderRadius: (portalSize - 18) / 2,
                    borderColor: palette.portalBorder,
                  },
                ]}
              >
                <View
                  pointerEvents="none"
                  style={[
                    styles.portalInnerRing,
                    {
                      width: portalSize - 44,
                      height: portalSize - 44,
                      borderRadius: (portalSize - 44) / 2,
                      borderColor: `${palette.accent}42`,
                    },
                  ]}
                />
                <View style={styles.badgeWrap}>
                  <LevelBadge level={level} size={badgeSize} autoplay={false} />
                </View>
              </LinearGradient>
              <View pointerEvents="none" style={[styles.thresholdNotchTop, { backgroundColor: palette.accent }]} />
              <View pointerEvents="none" style={[styles.thresholdNotchBottom, { backgroundColor: palette.accentSecondary }]} />
              {milestone ? (
                <Animated.View pointerEvents="none" style={[styles.milestoneFlare, milestoneFlareStyle]}>
                  <Ionicons name="sparkles" size={compact ? 22 : 28} color={palette.accent} />
                </Animated.View>
              ) : null}
            </Animated.View>

            <Text accessibilityRole="header" style={[styles.headline, compact && styles.headlineCompact, { color: palette.textPrimary }]}>
              {headline}
            </Text>
            <Text style={[styles.message, compact && styles.messageCompact, { color: palette.textMuted }]}>
              {message}
            </Text>

            <Animated.View style={[styles.rewardStack, rewardRevealStyle]}>
              <ThresholdRewardRow
                icon="sparkles"
                label={xpLabel}
                value={xpValue}
                color={palette.accent}
                surface={palette.rewardSurface}
                border={palette.rewardBorder}
              />

              {titleReward && (
                <ThresholdRewardRow
                  icon="ribbon"
                  label={titleLabel}
                  value={titleReward}
                  color={titleColor ?? palette.accentSecondary}
                  surface={palette.rewardSurface}
                  border={palette.rewardBorder}
                />
              )}

              {energyReward !== undefined && (
                <ThresholdRewardRow
                  icon="flash"
                  label={energyLabel}
                  value={energyValue(energyReward)}
                  color={palette.accentSecondary}
                  surface={palette.rewardSurface}
                  border={palette.rewardBorder}
                />
              )}

              {spinReward && (
                <SpinRewardPlaque
                  amount={1}
                  receiptId={spinReceiptId}
                  visible={visible && Boolean(spinReceiptId)}
                  onComplete={() => {}}
                  testID="level-up-spin-plaque"
                />
              )}
            </Animated.View>

            <Animated.View style={[styles.actions, actionRevealStyle]}>
              <Pressable
                testID="level-up-dismiss"
                accessibilityRole="button"
                accessibilityLabel={continueLabel}
                onPress={onContinue}
                style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={palette.button}
                  locations={[0, 0.52, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <View pointerEvents="none" style={styles.buttonHighlight} />
                <Text style={[styles.primaryButtonText, { color: palette.buttonText }]}>{continueLabel}</Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
  },
  scrollContent: {
    minHeight: '100%',
    paddingHorizontal: 22,
    paddingTop: 48,
    paddingBottom: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContentCompact: {
    paddingTop: 24,
    paddingBottom: 22,
  },
  stage: {
    width: '100%',
    maxWidth: 410,
    alignItems: 'center',
  },
  ambientTop: {
    position: 'absolute',
    top: -110,
    alignSelf: 'center',
    width: 390,
    height: 390,
    borderRadius: 195,
    opacity: 0.38,
    transform: [{ scaleX: 1.18 }],
  },
  ambientBottom: {
    position: 'absolute',
    bottom: -170,
    right: -100,
    width: 360,
    height: 360,
    borderRadius: 180,
  },
  horizon: {
    position: 'absolute',
    top: '37%',
    left: 28,
    right: 28,
    height: StyleSheet.hairlineWidth,
    opacity: 0.22,
  },
  kicker: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  portalStage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  portalStageMilestone: {
    shadowOpacity: 0.48,
    shadowRadius: 34,
    elevation: 22,
  },
  milestoneFlare: {
    position: 'absolute',
    top: 4,
    right: 0,
  },
  portalHalo: {
    position: 'absolute',
    opacity: 0.52,
  },
  portal: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.46,
    shadowRadius: 30,
    elevation: 18,
    overflow: 'hidden',
  },
  portalInnerRing: {
    position: 'absolute',
    borderWidth: StyleSheet.hairlineWidth,
  },
  badgeWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  thresholdNotchTop: {
    position: 'absolute',
    top: -5,
    width: 2,
    height: 18,
    borderRadius: 2,
  },
  thresholdNotchBottom: {
    position: 'absolute',
    bottom: -5,
    width: 2,
    height: 18,
    borderRadius: 2,
  },
  headline: {
    marginTop: 22,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
    letterSpacing: -1.2,
    textAlign: 'center',
  },
  headlineCompact: {
    marginTop: 14,
    fontSize: 30,
    lineHeight: 34,
  },
  message: {
    maxWidth: 340,
    marginTop: 8,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '400',
    textAlign: 'center',
  },
  messageCompact: {
    marginTop: 5,
    fontSize: 14,
    lineHeight: 19,
  },
  rewardStack: {
    width: '100%',
    marginTop: 22,
    gap: 8,
  },
  rewardRow: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rewardCopy: {
    flex: 1,
    minWidth: 0,
  },
  rewardLabel: {
    fontSize: 9,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.72,
  },
  rewardValue: {
    marginTop: 1,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  actions: {
    width: '100%',
    marginTop: 14,
  },
  primaryButton: {
    width: '100%',
    minHeight: 58,
    borderRadius: 19,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    paddingHorizontal: 20,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 0.30,
    shadowRadius: 14,
    elevation: 9,
  },
  primaryButtonPressed: {
    opacity: 0.92,
    transform: [{ translateY: 2 }, { scale: 0.992 }],
  },
  buttonHighlight: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.60)',
  },
  primaryButtonText: {
    fontSize: 15,
    lineHeight: 19,
    fontWeight: '700',
    letterSpacing: 0.45,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  secondaryButtonPressed: {
    opacity: 0.62,
  },
  secondaryButtonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
});
