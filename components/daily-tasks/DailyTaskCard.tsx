import React, { useCallback, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type TextProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { AdaptiveLabel } from '../text-integrity/AdaptiveLabel';
import { FlowText } from '../text-integrity/FlowText';

export type DailyCardAction = {
  label: string;
  onPress: () => void;
  foregroundColor: string;
  backgroundColor?: string;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  labelProps?: TextProps;
  accessibilityLabel?: string;
};

export type DailyTaskCardProps = {
  testID: string;
  title: string;
  description: string;
  icon: ReactNode;
  progress?: ReactNode;
  titleColor: string;
  descriptionColor: string;
  surfaceColor: string;
  borderColor: string;
  accentColor: string;
  onPress?: () => void;
  action?: DailyCardAction;
  reroll?: { accessibilityLabel: string; onPress: () => void; icon: ReactNode };
  claimed?: boolean;
  claimedIndicator?: ReactNode;
  premium?: ReactNode;
  background?: ReactNode;
  outerStyle?: StyleProp<ViewStyle>;
  titleTextProps?: TextProps;
  descriptionTextProps?: TextProps;
  iconStyle?: StyleProp<ViewStyle>;
  variant?: 'task' | 'bonus';
};

function CardAction({ testID, action, onReflow, variant }: { testID: string; action: DailyCardAction; onReflow: () => void; variant?: 'task' | 'bonus' }) {
  const [stacked, setStacked] = useState(false);
  const [availableWidth, setAvailableWidth] = useState<number | null>(null);
  return (
    <Pressable
      testID={`${testID}-action`}
      accessibilityRole="button"
      accessibilityLabel={action.accessibilityLabel}
      accessibilityState={{ disabled: !!action.disabled, busy: !!action.loading }}
      disabled={action.disabled || action.loading}
      onPress={(event) => { event.stopPropagation(); action.onPress(); }}
      onLayout={(event) => setAvailableWidth(Math.max(1, event.nativeEvent.layout.width - 28))}
      style={[styles.action, variant === 'bonus' && styles.bonusAction, { backgroundColor: action.backgroundColor }, stacked && styles.actionStacked]}
    >
      {action.loading ? <ActivityIndicator testID={`${testID}-action-loading`} color={action.foregroundColor} /> : null}
      {availableWidth === null ? (
        <FlowText {...action.labelProps} testID={`${testID}-action-label`} provenance="authored" style={[styles.actionLabel, action.labelProps?.style, { color: action.foregroundColor }]}>{action.label}</FlowText>
      ) : (
        <AdaptiveLabel
          {...action.labelProps}
          testID={`${testID}-action-label`}
          provenance="authored"
          availableWidth={availableWidth}
          compactLineLimit={1}
          onReflowNeeded={() => { setStacked(true); onReflow(); }}
          style={[styles.actionLabel, action.labelProps?.style, { color: action.foregroundColor }]}
        >
          {action.label}
        </AdaptiveLabel>
      )}
      {action.icon}
    </Pressable>
  );
}

export function DailyTaskCard(props: DailyTaskCardProps) {
  const [stacked, setStacked] = useState(false);
  const requestStack = useCallback(() => setStacked(true), []);
  return (
    <View testID={props.testID} style={[styles.card, props.variant === 'bonus' && styles.bonusCard, { backgroundColor: props.surfaceColor, borderColor: props.borderColor }, props.outerStyle]}>
      {props.background}
      <Pressable
        testID={`${props.testID}-pressable`}
        accessibilityRole={props.onPress ? 'button' : undefined}
        accessibilityLabel={props.onPress ? `${props.title}. ${props.description}` : undefined}
        disabled={!props.onPress}
        onPress={props.onPress}
        style={({ pressed }) => [styles.pressable, pressed && styles.pressablePressed]}
      >
        <View testID={`${props.testID}-content`} style={[styles.content, props.variant === 'bonus' && styles.bonusContent, stacked && styles.contentStacked]}>
          <View testID={`${props.testID}-icon`} style={[styles.icon, props.variant === 'bonus' && styles.bonusIcon, { borderColor: props.accentColor }, props.iconStyle]}>{props.icon}</View>
          <View style={styles.copy}>
            <FlowText {...props.titleTextProps} testID={`${props.testID}-title`} provenance="authored" accessibilityLabel={props.title} style={[styles.title, props.titleTextProps?.style, { color: props.titleColor }]}>{props.title}</FlowText>
            <FlowText {...props.descriptionTextProps} testID={`${props.testID}-description`} provenance="authored" accessibilityLabel={props.description} style={[styles.description, props.descriptionTextProps?.style, { color: props.descriptionColor }]}>{props.description}</FlowText>
          </View>
          <View style={[styles.actions, stacked && styles.actionsStacked]}>
            {props.action ? <CardAction testID={props.testID} action={props.action} onReflow={requestStack} variant={props.variant} /> : null}
            {props.claimed ? <View testID={`${props.testID}-claimed`}>{props.claimedIndicator}</View> : null}
            {props.reroll ? <Pressable accessibilityRole="button" accessibilityLabel={props.reroll.accessibilityLabel} onPress={(event) => { event.stopPropagation(); props.reroll?.onPress(); }} style={styles.iconAction}>{props.reroll.icon}</Pressable> : null}
          </View>
        </View>
        {props.variant !== 'bonus' && props.progress ? <View testID={`${props.testID}-progress`} pointerEvents="none" style={styles.progressLayer} accessibilityRole="progressbar">{props.progress}</View> : null}
      </Pressable>
      {props.variant === 'bonus' ? <View testID={`${props.testID}-progress`} pointerEvents="none" style={styles.bonusProgress} accessibilityRole="progressbar">{props.progress}</View> : null}
      {props.premium}
    </View>
  );
}

export type DailyBonusCardProps = Omit<DailyTaskCardProps, 'accentColor' | 'onPress' | 'reroll' | 'premium' | 'progress'> & {
  progress: ReactNode;
};

export function DailyBonusCard(props: DailyBonusCardProps) {
  return <DailyTaskCard {...props} variant="bonus" accentColor={props.borderColor} />;
}

const styles = StyleSheet.create({
  card: { minHeight: 92, borderWidth: 0, borderRadius: 22, overflow: 'hidden', paddingHorizontal: 22, paddingVertical: 12, gap: 8 },
  bonusCard: { minHeight: 0, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 9, gap: 0 },
  pressable: { minWidth: 0, flexGrow: 1, justifyContent: 'center' },
  pressablePressed: { opacity: 0.86, transform: [{ scale: 0.985 }] },
  progressLayer: StyleSheet.absoluteFillObject,
  content: { flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0, minHeight: 72 },
  bonusContent: { gap: 10, minHeight: 0 },
  contentStacked: { flexDirection: 'column', alignItems: 'stretch' },
  icon: { width: 72, minHeight: 72, borderWidth: 0, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  bonusIcon: { width: 38, minHeight: 38, borderRadius: 11 },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  title: { fontWeight: '900', flexShrink: 1 },
  description: { lineHeight: 20, fontWeight: '800', flexShrink: 1 },
  actions: { alignItems: 'flex-end', justifyContent: 'center', gap: 6, flexShrink: 0 },
  actionsStacked: { alignSelf: 'stretch', alignItems: 'flex-end' },
  action: { minHeight: 44, minWidth: 58, maxWidth: 160, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  bonusAction: { maxWidth: 112, borderRadius: 14 },
  actionStacked: { maxWidth: undefined, alignSelf: 'stretch' },
  actionLabel: { fontWeight: '900', textAlign: 'center', flexShrink: 1 },
  iconAction: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bonusProgress: { marginTop: 8 },
});
