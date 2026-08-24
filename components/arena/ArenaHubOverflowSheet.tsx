import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTournamentPalette } from '../ui/v2_theme';
import { useStableSafeAreaInsets } from '../../app/stable_safe_area_metrics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { useLang } from '../LangContext';
import { arenaText } from '../../modules/arena/copy';
import { arenaExpansionText } from '../../modules/arena/expansion_copy';
import { arenaHubOverflowChoices, type ArenaOverflowRoute } from '../../modules/arena/hub_nav';
import PressableHybrid from '../PressableHybrid';

function ArenaHubOverflowSheetBase({
  visible,
  latestMatchId,
  onClose,
}: Readonly<{
  visible: boolean;
  latestMatchId: string | null;
  onClose: () => void;
}>) {
  const P = useTournamentPalette();
  const router = useRouter();
  const { lang } = useLang();
  const reduceMotion = useReduceMotion();
  const insets = useStableSafeAreaInsets();
  const { height } = useWindowDimensions();
  const progress = useSharedValue(visible ? 1 : 0);
  const [mounted, setMounted] = useState(visible);
  const choices = useMemo(
    () => arenaHubOverflowChoices(latestMatchId),
    [latestMatchId],
  );

  useEffect(() => {
    if (visible) {
      setMounted(true);
      progress.value = reduceMotion ? 1 : withSpring(1, { damping: 18, stiffness: 210, mass: 0.9 });
      return;
    }
    if (!mounted) return;
    if (reduceMotion) {
      progress.value = 0;
      setMounted(false);
      return;
    }
    progress.value = withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) });
    const timer = setTimeout(() => setMounted(false), 170);
    return () => clearTimeout(timer);
  }, [mounted, progress, reduceMotion, visible]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: progress.value * 0.62 }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: 0.4 + progress.value * 0.6,
    transform: [{ translateY: (1 - progress.value) * Math.min(360, height * 0.5) }],
  }));

  const navigate = (route: ArenaOverflowRoute | null) => {
    if (!route) return;
    onClose();
    router.push(route as never);
  };

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        <Pressable accessibilityRole="button" accessibilityLabel={arenaText(lang, 'closeArenaMenu')} style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View style={[styles.sheet, sheetStyle, { backgroundColor: P.bg, paddingBottom: Math.max(18, insets.bottom + 10), maxHeight: height * 0.86 }]}>
          <View style={[styles.grabber, { backgroundColor: P.elev2 }]} />
          <Text style={[styles.title, { color: P.text }]}>{arenaText(lang, 'title')}</Text>
          <ScrollView contentContainerStyle={styles.list}>
            {choices.map((choice) => {
              const title = choice.key === 'wallet'
                ? arenaExpansionText(lang, 'wallet')
                : arenaText(lang, choice.label as Parameters<typeof arenaText>[1]);
              const disabledHint = choice.key === 'review' && choice.disabled
                ? arenaText(lang, 'reviewEmpty')
                : undefined;
              return (
                <PressableHybrid
                  key={choice.key}
                  variant="card"
                  disabled={choice.disabled}
                  accessibilityRole="button"
                  accessibilityLabel={title}
                  accessibilityHint={disabledHint}
                  accessibilityState={{ disabled: choice.disabled }}
                  onPress={() => navigate(choice.route)}
                  style={{ opacity: choice.disabled ? 0.45 : 1 }}
                  contentStyle={[styles.row, { backgroundColor: P.elev }]}
                >
                  <View style={[styles.icon, { backgroundColor: P.elev2 }]}>
                    <Ionicons name={choice.icon as React.ComponentProps<typeof Ionicons>['name']} size={22} color={P.text} />
                  </View>
                  <Text style={[styles.rowTitle, { color: P.text }]}>{title}</Text>
                  <Ionicons name="chevron-forward" size={20} color={P.muted} />
                </PressableHybrid>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

export const ArenaHubOverflowSheet = memo(ArenaHubOverflowSheetBase);

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { backgroundColor: '#000' },
  sheet: { alignSelf: 'center', width: '100%', maxWidth: 620, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 16, paddingTop: 10, gap: 14 },
  grabber: { alignSelf: 'center', width: 42, height: 4, borderRadius: 2 },
  title: { fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  list: { gap: 8, paddingBottom: 2 },
  row: { minHeight: 64, borderRadius: 18, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { flex: 1, fontSize: 16, fontWeight: '800' },
});
