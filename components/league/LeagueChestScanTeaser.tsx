// ─── ГИБРИД «Световод + Чекан»: Тизер сундука — скан ────────────────────────
// зачем: макет-эталон .motion-mockups/phraseman-hybrid.html, сцена L6 «Тизер ·
// скан сундука». Перенесено ВТОЧНОСТИ: луч-скан проходит по сундуку слева
// направо и обратно (760мс inOut), тени наград проявляются ЗА лучом и гаснут
// (интрига «видел, но не разглядел» вместо «? ? ?»), тикающий таймер до
// вскрытия, CTA привязывает интригу к действию. Подключается ТОЛЬКО через
// LeagueChestTeaserModal.motionVariant='hybrid' — боевой путь не тронут.
import React, { memo, useEffect, useRef } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import { triLang, type Lang } from '../../constants/i18n';
import { hapticLightImpact, hapticTap } from '../../hooks/use-haptics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { soundDirector } from '../../modules/audio/sound_director';
import { noAndroidOutline } from '../../constants/androidGlow';
import type { LeagueHubPalette } from './leagueHubPalette';

type Props = {
  visible: boolean;
  lang: Lang;
  palette: LeagueHubPalette;
  /** Мс до вскрытия сундука — честная привязка, не выдумка (как GiftExpiryCountdown). */
  opensAtMs: number;
  onClose: () => void;
};

const SHADOW_COUNT = 3;
const SHADOW_KEYS = Array.from({ length: SHADOW_COUNT }, (_, i) => `scan-shadow-${i}`);
const BEAM_TRAVEL = 150;

function scanTitle(lang: Lang): string {
  return triLang(lang, { ru: 'Скан показал три награды', uk: 'Скан показав три нагороди', es: 'El escaneo mostró tres premios', 'pt-BR': 'O scan mostrou três prêmios', vi: 'Máy quét cho thấy ba phần thưởng', id: 'Pemindaian menunjukkan tiga hadiah', tr: 'Tarama üç ödül gösterdi', pl: 'Skan pokazał trzy nagrody' });
}

function scanEyebrow(lang: Lang): string {
  return triLang(lang, { ru: 'Сундук лиги', uk: 'Скриня ліги', es: 'Cofre de liga', 'pt-BR': 'Baú da liga', vi: 'Rương giải đấu', id: 'Peti liga', tr: 'Lig sandığı', pl: 'Skrzynia ligi' });
}

function opensLabel(lang: Lang): string {
  return triLang(lang, { ru: 'до вскрытия', uk: 'до розкриття', es: 'para abrirse', 'pt-BR': 'para abrir', vi: 'trước khi mở', id: 'sebelum dibuka', tr: 'açılışa kadar', pl: 'do otwarcia' });
}

function holdTopLabel(lang: Lang): string {
  return triLang(lang, { ru: 'Удержаться в топ-7', uk: 'Втриматись у топ-7', es: 'Mantente en el top 7', 'pt-BR': 'Fique no top 7', vi: 'Giữ vững top 7', id: 'Bertahan di top 7', tr: 'İlk 7’de kal', pl: 'Utrzymaj się w top 7' });
}

function closeLabel(lang: Lang): string {
  return triLang(lang, { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar', 'pt-BR': 'Fechar', vi: 'Đóng', id: 'Tutup', tr: 'Kapat', pl: 'Zamknij' });
}

/** Форматирует остаток «Nд ЧЧ:ММ» — как в мокапе, без секундной точности (спокойнее в тизере). */
function formatOpensIn(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(total / (24 * 60));
  const hours = Math.floor((total % (24 * 60)) / 60);
  const minutes = total % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  return days > 0 ? `${days}д ${hh}:${mm}` : `${hh}:${mm}`;
}

function ShadowBox({ opacity, tint }: { opacity: SharedValue<number>; tint: string }) {
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.shadowBox, { backgroundColor: tint }, style]} />;
}

// зачем: фиксированное число хуков на позицию (не .map() с useAnimatedStyle
// внутри цикла) — правило хуков React требует постоянный порядок вызовов.
function ShadowRow({ opacities, tint }: { opacities: [SharedValue<number>, SharedValue<number>, SharedValue<number>]; tint: string }) {
  return (
    <View pointerEvents="none" style={styles.shadowsRow}>
      <ShadowBox opacity={opacities[0]} tint={tint} />
      <ShadowBox opacity={opacities[1]} tint={tint} />
      <ShadowBox opacity={opacities[2]} tint={tint} />
    </View>
  );
}

function LeagueChestScanTeaser({ visible, lang, palette, opensAtMs, onClose }: Props) {
  const reduceMotion = useReduceMotion();
  const [msLeft, setMsLeft] = React.useState(() => Math.max(0, opensAtMs - Date.now()));

  const backdropOpacity = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.86);
  const chestOpacity = useSharedValue(0);
  const beamOpacity = useSharedValue(0);
  const beamX = useSharedValue(0);
  const headerOpacity = useSharedValue(0);
  const footerOpacity = useSharedValue(0);
  const footerY = useSharedValue(10);
  const shadow0 = useSharedValue(0);
  const shadow1 = useSharedValue(0);
  const shadow2 = useSharedValue(0);
  const shadowOpacities: [SharedValue<number>, SharedValue<number>, SharedValue<number>] = [shadow0, shadow1, shadow2];

  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!visible) return;
    setMsLeft(Math.max(0, opensAtMs - Date.now()));
    tickTimerRef.current = setInterval(() => {
      setMsLeft(Math.max(0, opensAtMs - Date.now()));
    }, 30_000);
    return () => {
      if (tickTimerRef.current) clearInterval(tickTimerRef.current);
      tickTimerRef.current = null;
    };
  }, [visible, opensAtMs]);

  useEffect(() => {
    if (!visible) return;

    if (reduceMotion) {
      // зачем: закон Motion DNA — Reduce Motion = один финальный кадр, без скана/циклов.
      backdropOpacity.value = 0.72;
      cardOpacity.value = 1;
      cardScale.value = 1;
      chestOpacity.value = 1;
      beamOpacity.value = 0;
      headerOpacity.value = 1;
      footerOpacity.value = 1;
      footerY.value = 0;
      shadow0.value = 0.45;
      shadow1.value = 0.45;
      shadow2.value = 0.45;
      return;
    }

    backdropOpacity.value = 0;
    cardOpacity.value = 0;
    cardScale.value = 0.86;
    chestOpacity.value = 0;
    beamOpacity.value = 0;
    beamX.value = -BEAM_TRAVEL;
    headerOpacity.value = 0;
    footerOpacity.value = 0;
    footerY.value = 10;
    shadow0.value = 0;
    shadow1.value = 0;
    shadow2.value = 0;

    backdropOpacity.value = withTiming(0.72, { duration: 240, easing: Easing.out(Easing.cubic) });
    cardOpacity.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    cardScale.value = withTiming(1, { duration: 240, easing: Easing.out(Easing.cubic) });
    chestOpacity.value = withDelay(172, withTiming(1, { duration: 360, easing: Easing.out(Easing.cubic) }));
    headerOpacity.value = withDelay(380, withTiming(1, { duration: 320, easing: Easing.out(Easing.cubic) }));

    // Скан-луч: один проход слева направо (500мс), затем обратно (1700мс).
    const sweepForward = () => {
      beamOpacity.value = withTiming(0.9, { duration: 10 });
      beamX.value = withTiming(BEAM_TRAVEL, { duration: 760, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) beamOpacity.value = 0;
      });
    };
    const sweepBack = () => {
      beamOpacity.value = withTiming(0.9, { duration: 10 });
      beamX.value = withTiming(-BEAM_TRAVEL, { duration: 760, easing: Easing.inOut(Easing.cubic) }, (finished) => {
        if (finished) beamOpacity.value = 0;
      });
    };

    const sweepForwardTimer = setTimeout(() => {
      sweepForward();
      void hapticLightImpact();
    }, 500);
    const sweepBackTimer = setTimeout(() => {
      sweepBack();
      void hapticLightImpact();
    }, 1700);

    // Тени наград проявляются ЗА лучом и притухают — по одной, каскадом.
    shadowOpacities.forEach((sv, k) => {
      sv.value = withDelay(
        780 + k * 150,
        withSequence(
          withTiming(0.85, { duration: 200, easing: Easing.out(Easing.cubic) }),
          withTiming(0.3, { duration: 700, easing: Easing.linear }),
        ),
      );
    });
    // Второй проход луча освежает тени в обратном порядке.
    [shadow2, shadow1, shadow0].forEach((sv, k) => {
      sv.value = withDelay(
        1900 + k * 150,
        withSequence(
          withTiming(0.85, { duration: 200, easing: Easing.out(Easing.cubic) }),
          withTiming(0.45, { duration: 600, easing: Easing.linear }),
        ),
      );
    });

    footerOpacity.value = withDelay(2300, withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) }));
    footerY.value = withDelay(2300, withTiming(0, { duration: 280, easing: Easing.out(Easing.cubic) }));

    soundDirector.request('pm.reward.pack_reveal_start', { scope: 'league-chest-scan', dedupeKey: 'league-chest-scan' });

    return () => {
      clearTimeout(sweepForwardTimer);
      clearTimeout(sweepBackTimer);
      cancelAnimation(backdropOpacity);
      cancelAnimation(cardOpacity);
      cancelAnimation(cardScale);
      cancelAnimation(chestOpacity);
      cancelAnimation(beamOpacity);
      cancelAnimation(beamX);
      cancelAnimation(headerOpacity);
      cancelAnimation(footerOpacity);
      cancelAnimation(footerY);
      cancelAnimation(shadow0);
      cancelAnimation(shadow1);
      cancelAnimation(shadow2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, reduceMotion]);

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdropOpacity.value }));
  const cardStyle = useAnimatedStyle(() => ({ opacity: cardOpacity.value, transform: [{ scale: cardScale.value }] }));
  const chestStyle = useAnimatedStyle(() => ({ opacity: chestOpacity.value }));
  const beamStyle = useAnimatedStyle(() => ({ opacity: beamOpacity.value, transform: [{ translateX: beamX.value }] }));
  const headerStyle = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));
  const footerStyle = useAnimatedStyle(() => ({ opacity: footerOpacity.value, transform: [{ translateY: footerY.value }] }));

  if (!visible) return null;

  return (
    <Modal transparent animationType="none" visible={visible} onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />
        <Pressable
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel={closeLabel(lang)}
          onPress={() => { void hapticTap(); onClose(); }}
        />

        <Animated.View style={[styles.card, { backgroundColor: palette.surface }, cardStyle]} testID="league-chest-scan-teaser">
          <Pressable onPress={() => { void hapticTap(); onClose(); }} accessibilityRole="button" accessibilityLabel={closeLabel(lang)} style={styles.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={20} color={palette.muted} />
          </Pressable>

          <Animated.View style={[styles.chestWrap, chestStyle]}>
            <View style={[styles.chestGlow, { backgroundColor: palette.accent }]} />
            <Ionicons name="gift" size={44} color={palette.accent} />
          </Animated.View>

          <Animated.View pointerEvents="none" style={[styles.beam, { backgroundColor: palette.accent }, beamStyle]} />

          <ShadowRow opacities={shadowOpacities} tint={palette.accent} />

          <Animated.View style={headerStyle}>
            <Text style={[styles.eyebrow, { color: palette.accent }]}>{scanEyebrow(lang)}</Text>
            <Text style={[styles.title, { color: palette.text }]}>{scanTitle(lang)}</Text>
          </Animated.View>

          <Animated.View style={[styles.footer, footerStyle]}>
            <View style={styles.timerRow}>
              <Text style={[styles.timerValue, { color: palette.accent }]}>{formatOpensIn(msLeft)}</Text>
              <Text style={[styles.timerLabel, { color: palette.muted }]}>{opensLabel(lang)}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={holdTopLabel(lang)}
              onPress={() => { void hapticTap(); onClose(); }}
              style={({ pressed }) => [
                styles.ctaBtn,
                { backgroundColor: palette.elevated, opacity: pressed ? 0.85 : 1 },
                noAndroidOutline,
              ]}
            >
              <Text style={[styles.ctaText, { color: palette.text }]}>{holdTopLabel(lang)}</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default memo(LeagueChestScanTeaser);

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  backdrop: { backgroundColor: '#000000' },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 22,
    alignItems: 'center',
    overflow: 'hidden',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  chestWrap: {
    width: 88,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestGlow: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    opacity: 0.16,
  },
  beam: {
    position: 'absolute',
    top: 16,
    bottom: 108,
    width: 34,
    opacity: 0,
  },
  shadowsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 9,
    height: 44,
    marginTop: 10,
  },
  shadowBox: {
    width: 38,
    height: 44,
    borderRadius: 11,
  },
  eyebrow: {
    marginTop: 18,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  title: {
    marginTop: 6,
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  footer: {
    marginTop: 18,
    width: '100%',
    alignItems: 'center',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
  },
  timerValue: {
    fontSize: 20,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  ctaBtn: {
    marginTop: 14,
    minHeight: 48,
    borderRadius: 15,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
    borderWidth: 0,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '900',
  },
});
