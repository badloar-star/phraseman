/**
 * Плашка «матч не открылся» — объяснение вместо молчаливого возврата.
 *
 * зачем (владелец 2026-09-20: «нажал ПРИНЯТЬ, пару секунд ничего не
 * происходит, затем тупо выкидывает назад в хаб Арены»): ветки мёртвого матча
 * в `ArenaOpponentFoundHost` гасили поиск и возвращали энергию, не сказав ни
 * слова. С точки зрения человека матч исчезал сам по себе, и он не знал, ждать
 * ли ему чего-нибудь и вернулись ли 25⚡.
 *
 * У принятого матча ровно два честных исхода: переход в матч или ЭТА плашка.
 * Третьего («тихо пропало») быть не может.
 *
 * Слова берутся из `arenaEntryFailureCopy` — тот же источник, что и у экрана
 * матча, чтобы одна и та же причина не называлась в приложении двумя способами.
 */
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from '../SafeLinearGradient';
import { useTournamentPalette } from '../ui/v2_theme';
import { SUITE } from '../../constants/motionHybrid';
import DuoPressable from '../DuoPressable';
import { noAndroidOutline } from '../../constants/androidGlow';

export type ArenaEntryFailureToastProps = Readonly<{
  title: string;
  hint: string;
  dismissLabel: string;
  reduceMotion: boolean;
  onDismiss: () => void;
  bottomOffset?: number;
}>;

export function ArenaEntryFailureToast({
  title,
  hint,
  dismissLabel,
  reduceMotion,
  onDismiss,
  bottomOffset = 0,
}: ArenaEntryFailureToastProps) {
  const P = useTournamentPalette();
  const opacity = useSharedValue(0);
  const y = useSharedValue(14);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      y.value = 0;
      return undefined;
    }
    opacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.quad) });
    y.value = withSpring(0, SUITE.pulse);
    return () => {
      cancelAnimation(opacity);
      cancelAnimation(y);
    };
  }, [opacity, reduceMotion, y]);

  const shell = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: y.value }],
  }));

  return (
    /*
     * box-none по той же причине, что и у тоста находки: контейнер растянут на
     * всю ширину поверх чужого экрана и без этого ловил бы касания по всей
     * полосе, гася кнопки под собой.
     */
    <Reanimated.View
      testID="arena-entry-failure"
      accessibilityLiveRegion="polite"
      style={[styles.host, { bottom: bottomOffset }, shell]}
      pointerEvents="box-none"
    >
      <LinearGradient
        colors={[P.surfaceGradA, P.surfaceGradB]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, noAndroidOutline]}
      >
        <Text accessibilityRole="header" style={[styles.title, { color: P.text }]}>{title}</Text>
        <Text style={[styles.hint, { color: P.muted }]}>{hint}</Text>
        <DuoPressable
          testID="arena-entry-failure-dismiss"
          onPress={onDismiss}
          wrapStyle={styles.buttonWrap}
          style={[styles.button, { backgroundColor: P.accent }]}
        >
          <Text numberOfLines={1} style={[styles.buttonText, { color: P.accentText }]}>
            {dismissLabel}
          </Text>
        </DuoPressable>
      </LinearGradient>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 12, right: 12 },
  card: { borderRadius: 24, padding: 16, overflow: 'hidden' },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.1 },
  hint: { marginTop: 5, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  buttonWrap: { marginTop: 13 },
  button: { borderRadius: 15, minHeight: 48, paddingVertical: 13, alignItems: 'center', justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '800', letterSpacing: -0.1 },
});
