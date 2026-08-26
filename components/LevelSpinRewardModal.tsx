import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import ReanimatedAnimated, {
  Easing as REasing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import LevelSpinRewardArt from './LevelSpinRewardArt';
import { triLang, type Lang } from '../constants/i18n';
import { soundDirector } from '../modules/audio/sound_director';
import {
  giftDisplayDescForLang,
  giftDisplayTitleForLang,
  giftSpinTier,
  giftSpinTierUiLabel,
  type GiftDef,
} from '../app/level_gift_system';
import { hapticSuccess, hapticTap } from '../hooks/use-haptics';
import { RewardModalBackdrop } from './RewardModalBackdrop';
import { useTheme } from './ThemeContext';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LUM, SUITE } from '../constants/motionHybrid';
import DuoPressable from './DuoPressable';

type Props = {
  visible: boolean;
  gift: GiftDef | null;
  giftId: string | null;
  lang: Lang;
  isPremium?: boolean;
  requestId: string | null;
  onClaim: () => void;
  onClose: () => void;
  /**
   * зачем: гибрид «Световод + Чекан» (владелец, 2026-08-16) — вход панели из
   * света вместо мгновенного spring, единственный микро-удар на награде
   * (SUITE.pulse), управляемый выход (LUM.exitMs) ПЕРЕД onClose вместо
   * мгновенного unmount. Боевой дефолт — 'classic', ничего не меняется без
   * явного включения. Барабан (LevelSpinFinishLine) этим не затронут.
   */
  motionVariant?: 'classic' | 'hybrid';
};

/** The immediate, animated winner surface shown after the reel has physically settled. */
export default function LevelSpinRewardModal({
  visible,
  gift,
  giftId,
  lang,
  isPremium = false,
  requestId,
  onClaim,
  onClose,
  motionVariant = 'classic',
}: Props) {
  const { theme: t, themeMode } = useTheme();
  const entrance = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const icon = useRef(new Animated.Value(0)).current;
  const glowLoopRef = useRef<Animated.CompositeAnimation | null>(null);
  const reduceMotion = useReduceMotion();
  // зачем: гибрид держит панель смонтированной до конца выхода (LUM.exitMs),
  // classic закрывается мгновенно как раньше — единственная причина этого
  // локального состояния поверх родительского `visible`.
  const [hybridMounted, setHybridMounted] = React.useState(visible);
  const hybridBackdrop = useSharedValue(0);
  const hybridPanelOpacity = useSharedValue(0);
  const hybridPanelScale = useSharedValue(1.04);
  const hybridPulse = useSharedValue(0);

  useEffect(() => {
    if (!visible || !requestId) return;
    entrance.setValue(0);
    glow.setValue(0);
    icon.setValue(0);
    const rewardEvent = isPremium
      ? 'pm.spin.reward_premium'
      : gift && giftSpinTier(gift) !== 'ordinary'
        ? 'pm.spin.reward_rare'
        : 'pm.spin.reward_win';
    soundDirector.request(rewardEvent, {
      scope: 'level-spin-reward-modal',
      dedupeKey: `level-spin-reward-modal:${requestId}`,
      rateLimit: { maxStarts: 6, windowMs: 4_000 },
    });
    void hapticSuccess();
    if (motionVariant === 'classic') {
      Animated.parallel([
        Animated.spring(entrance, { toValue: 1, tension: 118, friction: 12, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(100),
          Animated.spring(icon, { toValue: 1, tension: 170, friction: 8, useNativeDriver: true }),
        ]),
      ]).start();
      glowLoopRef.current?.stop();
      glowLoopRef.current = Animated.loop(Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1_250, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 1_250, useNativeDriver: true }),
      ]));
      glowLoopRef.current.start();
      return () => { glowLoopRef.current?.stop(); };
    }
    return undefined;
  }, [entrance, gift, glow, icon, isPremium, motionVariant, requestId, visible]);

  // Гибрид: вход панели из света (opacity + scale 1.04→1, settle без отскока),
  // затем единственный микро-удар награды (SUITE.pulse) — закон «удар только
  // у героя кульминации».
  useEffect(() => {
    if (motionVariant !== 'hybrid') return;
    if (!visible || !requestId) return;
    setHybridMounted(true);
    if (reduceMotion) {
      hybridBackdrop.value = 1;
      hybridPanelOpacity.value = 1;
      hybridPanelScale.value = 1;
      hybridPulse.value = 1;
      return;
    }
    hybridBackdrop.value = withTiming(1, { duration: 240, easing: REasing.out(REasing.cubic) });
    hybridPanelOpacity.value = withTiming(1, { duration: LUM.resolveMs, easing: REasing.out(REasing.cubic) });
    hybridPanelScale.value = withSpring(1, LUM.settle);
    hybridPulse.value = 0;
    hybridPulse.value = withDelay(LUM.resolveMs, withSpring(1, SUITE.pulse));
    return () => {
      cancelAnimation(hybridBackdrop);
      cancelAnimation(hybridPanelOpacity);
      cancelAnimation(hybridPanelScale);
      cancelAnimation(hybridPulse);
    };
  }, [hybridBackdrop, hybridPanelOpacity, hybridPanelScale, hybridPulse, motionVariant, reduceMotion, requestId, visible]);

  const runHybridExit = (after: () => void) => {
    if (reduceMotion) {
      setHybridMounted(false);
      after();
      return;
    }
    hybridBackdrop.value = withTiming(0, { duration: LUM.exitMs, easing: REasing.out(REasing.cubic) });
    hybridPanelOpacity.value = withTiming(0, { duration: LUM.exitMs, easing: REasing.out(REasing.cubic) });
    hybridPanelScale.value = withTiming(0.97, { duration: LUM.exitMs, easing: REasing.out(REasing.cubic) });
    // Панель остаётся смонтированной (hybridMounted) до конца LUM.exitMs —
    // родитель закрывается только после того, как хвост выхода фактически доиграл.
    setTimeout(() => {
      setHybridMounted(false);
      after();
    }, LUM.exitMs);
  };

  const hybridBackdropStyle = useAnimatedStyle(() => ({ opacity: hybridBackdrop.value }));
  const hybridPanelStyle = useAnimatedStyle(() => ({
    opacity: hybridPanelOpacity.value,
    transform: [{ scale: hybridPanelScale.value }],
  }));
  const hybridIconPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + hybridPulse.value * 0.08 }],
  }));

  if (motionVariant === 'hybrid' ? !hybridMounted : !visible) return null;

  const title = gift
    ? giftDisplayTitleForLang(gift, lang)
    : triLang(lang, { ru: 'ПОДАРОК ПОЛУЧЕН', uk: 'ПОДАРУНОК ОТРИМАНО', en: 'GIFT RECEIVED', es: 'REGALO RECIBIDO', 'pt-BR': 'PRESENTE RECEBIDO', vi: 'ĐÃ NHẬN QUÀ', id: 'HADIAH DITERIMA', tr: 'HEDİYE ALINDI', pl: 'PREZENT ODEBRANY' });
  const description = gift
    ? giftDisplayDescForLang(gift, lang)
    : triLang(lang, { ru: 'Награда применена к аккаунту', uk: 'Нагороду застосовано до акаунта', en: 'The reward was applied to your account', es: 'La recompensa se aplicó a tu cuenta', 'pt-BR': 'A recompensa foi aplicada à sua conta', vi: 'Phần thưởng đã được áp dụng cho tài khoản', id: 'Hadiah diterapkan ke akunmu', tr: 'Ödül hesabına uygulandı', pl: 'Nagroda została zastosowana na koncie' });
  const rarity = gift ? giftSpinTierUiLabel(gift, lang) : triLang(lang, { ru: 'НАГРАДА', uk: 'НАГОРОДА', en: 'REWARD', es: 'RECOMPENSA', 'pt-BR': 'RECOMPENSA', vi: 'PHẦN THƯỞNG', id: 'HADIAH', tr: 'ÖDÜL', pl: 'NAGRODA' });
  // зачем (аудит по Библии, 2026-08-26): «ГОТОВО» — состояние, а не действие
  // (Правило 1). Модалка закрывает полученный подарок — так и называем.
  const ctaLabel = triLang(lang, { ru: 'ЗАБРАТЬ', uk: 'ЗАБРАТИ', en: 'CLAIM', es: 'RECOGER', 'pt-BR': 'RESGATAR', vi: 'NHẬN', id: 'AMBIL', tr: 'AL', pl: 'ODBIERZ' });
  const claimA11yLabel = triLang(lang, { ru: 'Закрыть полученный подарок', uk: 'Закрити отриманий подарунок', en: 'Close received gift', es: 'Cerrar el regalo recibido', 'pt-BR': 'Fechar o presente recebido', vi: 'Đóng phần thưởng đã nhận', id: 'Tutup hadiah yang diterima', tr: 'Alınan hediyeyi kapat', pl: 'Zamknij otrzymany prezent' });

  const handleClaim = () => {
    void hapticTap();
    soundDirector.request('pm.spin.reward_lock', {
      scope: 'level-spin-reward-modal',
      dedupeKey: `level-spin-reward-lock:${requestId ?? 'unknown'}`,
      rateLimit: { maxStarts: 6, windowMs: 4_000 },
    });
    onClaim();
  };

  if (motionVariant === 'hybrid') {
    return (
      <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={() => runHybridExit(onClose)}>
        <View testID="level-spin-reward-modal" style={styles.root}>
          <ReanimatedAnimated.View style={[StyleSheet.absoluteFillObject, hybridBackdropStyle]}>
            <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
          </ReanimatedAnimated.View>
          <ReanimatedAnimated.View style={[styles.panel, styles.panelHybrid, { backgroundColor: t.bgCard }, hybridPanelStyle]}>
            <View style={styles.topLine} />
            <Text style={[styles.kicker, { color: t.gold }]}>
              {triLang(lang, { ru: 'ТВОЙ ПОДАРОК', uk: 'ТВІЙ ПОДАРУНОК', en: 'YOUR GIFT', es: 'TU REGALO', 'pt-BR': 'SEU PRESENTE', vi: 'PHẦN THƯỞNG CỦA BẠN', id: 'HADIAHMU', tr: 'HEDİYEN', pl: 'TWÓJ PREZENT' })}
            </Text>
            <ReanimatedAnimated.View style={[styles.iconStage, hybridIconPulseStyle]}>
              <View pointerEvents="none" style={[styles.iconHaloHybrid, { backgroundColor: `${t.gold}1F` }]} />
              <LevelSpinRewardArt
                rewardId={gift?.id ?? giftId ?? 'choice_3_level'}
                size={126}
                accessibilityLabel={title}
                fallbackColor={t.gold}
              />
            </ReanimatedAnimated.View>
            <Text style={[styles.rarity, { color: t.gold }]}>{rarity}</Text>
            <Text style={[styles.title, { color: t.textPrimary }]}>{title}</Text>
            <Text style={[styles.description, { color: t.textSecond }]}>{description}</Text>
            {isPremium ? <Text style={styles.plus}>PLUS</Text> : null}
            <DuoPressable
              accessibilityLabel={claimA11yLabel}
              onPress={() => runHybridExit(handleClaim)}
              edgeColor="#B67A0D"
              edgeHeight={4}
              style={styles.ctaHybridFace}
              wrapStyle={styles.ctaHybridWrap}
            >
              <Text style={styles.ctaText}>{ctaLabel}</Text>
            </DuoPressable>
          </ReanimatedAnimated.View>
        </View>
      </Modal>
    );
  }

  const panelScale = entrance.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
  const panelY = entrance.interpolate({ inputRange: [0, 1], outputRange: [28, 0] });
  const panelOpacity = entrance;
  const iconScale = icon.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0.35, 1.12, 1] });
  const iconY = icon.interpolate({ inputRange: [0, 1], outputRange: [26, 0] });
  const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.26, 0.72] });

  return (
    <Modal
      transparent
      visible
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View testID="level-spin-reward-modal" style={styles.root}>
        <RewardModalBackdrop themeMode={themeMode} intensity="strong" />
        <Animated.View style={[styles.panel, { backgroundColor: t.bgCard, opacity: panelOpacity, transform: [{ translateY: panelY }, { scale: panelScale }] }]}>
          <Animated.View pointerEvents="none" style={[styles.glow, { opacity: glowOpacity }]} />
          <View style={styles.topLine} />
          <Text style={[styles.kicker, { color: t.gold }]}>
            {triLang(lang, { ru: 'ТВОЙ ПОДАРОК', uk: 'ТВІЙ ПОДАРУНОК', en: 'YOUR GIFT', es: 'TU REGALO', 'pt-BR': 'SEU PRESENTE', vi: 'PHẦN THƯỞNG CỦA BẠN', id: 'HADIAHMU', tr: 'HEDİYEN', pl: 'TWÓJ PREZENT' })}
          </Text>
          <Animated.View style={[styles.iconStage, { transform: [{ translateY: iconY }, { scale: iconScale }] }]}>
            {/* guard-ok: classic-путь, задание требует сохранить без изменений 1:1 */}
            <View style={[styles.iconHalo, { borderColor: `${t.gold}88` }]} />
            <LevelSpinRewardArt
              rewardId={gift?.id ?? giftId ?? 'choice_3_level'}
              size={126}
              accessibilityLabel={title}
              fallbackColor={t.gold}
            />
          </Animated.View>
          <Text style={[styles.rarity, { color: t.gold }]}>{rarity}</Text>
          <Text style={[styles.title, { color: t.textPrimary }]}>{title}</Text>
          <Text style={[styles.description, { color: t.textSecond }]}>{description}</Text>
          {isPremium ? <Text style={styles.plus}>PLUS</Text> : null}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={claimA11yLabel}
            onPress={handleClaim}
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  panel: { width: '100%', maxWidth: 430, minHeight: 510, borderRadius: 30, borderWidth: 1.5, borderColor: '#F3C85CAA', alignItems: 'center', paddingHorizontal: 26, paddingTop: 30, paddingBottom: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 28, elevation: 24 },
  glow: { position: 'absolute', top: 84, width: 260, height: 260, borderRadius: 130, backgroundColor: '#F3C85C2B', shadowColor: '#F3C85C', shadowOpacity: 0.8, shadowRadius: 46, elevation: 4 },
  topLine: { width: 62, height: 4, borderRadius: 3, backgroundColor: '#F3C85C', marginBottom: 22 },
  kicker: { fontSize: 12, lineHeight: 16, fontWeight: '900', letterSpacing: 2.2 },
  iconStage: { width: 164, height: 164, marginTop: 26, marginBottom: 18, alignItems: 'center', justifyContent: 'center' },
  iconHalo: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 2, backgroundColor: '#F3C85C12' },
  rarity: { fontSize: 11, fontWeight: '900', letterSpacing: 1.6, textTransform: 'uppercase' },
  title: { marginTop: 10, fontSize: 27, lineHeight: 32, fontWeight: '900', textAlign: 'center' },
  description: { marginTop: 10, maxWidth: 310, fontSize: 15, lineHeight: 21, textAlign: 'center' },
  plus: { marginTop: 15, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden', color: '#2A164A', backgroundColor: '#E8D7FF', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  cta: { width: '100%', minHeight: 58, marginTop: 'auto', borderRadius: 18, backgroundColor: '#F3C85C', alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: '#B67A0D' },
  ctaPressed: { transform: [{ translateY: 3 }], borderBottomWidth: 1 },
  ctaText: { color: '#211500', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  // Гибрид: та же геометрия панели, но БЕЗ обводки (закон владельца — контейнеры
  // без borderWidth/borderColor, разделяем тоном/тенью). Тень чуть глубже, чтобы
  // компенсировать потерю золотой кромки в тёмной теме.
  panelHybrid: { borderWidth: 0, shadowOpacity: 0.58 },
  iconHaloHybrid: { position: 'absolute', width: 150, height: 150, borderRadius: 75 },
  ctaHybridWrap: { marginTop: 'auto', width: '100%' },
  ctaHybridFace: { width: '100%', minHeight: 58, borderRadius: 18, backgroundColor: '#F3C85C' },
});
