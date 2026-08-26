import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import Reanimated, {
  cancelAnimation,
  Easing as REasing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './ThemeContext';
import type { ThemeMode } from '../constants/theme';
import { LUM } from '../constants/motionHybrid';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { LinearGradient } from './SafeLinearGradient';

const THEME_BANNERS: Record<ThemeMode, number> = {
  dark: require('../assets/images/settings/referral_theme/invite-dark-v2.webp'),
  gold: require('../assets/images/settings/referral_theme/invite-gold-v2.webp'),
  olive: require('../assets/images/settings/referral_theme/invite-olive-v2.webp'),
  sagePorcelain: require('../assets/images/settings/referral_theme/invite-sagePorcelain-v2.webp'),
  midnight: require('../assets/images/settings/referral_theme/invite-midnight-v2.webp'),
  ember: require('../assets/images/settings/referral_theme/invite-ember-v2.webp'),
  aurora: require('../assets/images/settings/referral_theme/invite-aurora-v2.webp'),
  volt: require('../assets/images/settings/referral_theme/invite-volt-v2.webp'),
  indigo: require('../assets/images/settings/referral_theme/invite-indigo-v2.webp'),
};

// зачем (владелец, ускорение сплэша): раньше стартовый прогрев тянул баннеры
// ВСЕХ 9 тем сразу, хотя на экране настроек всегда виден только один — баннер
// активной темы. Читаем сохранённую тему напрямую из AsyncStorage (без React-
// контекста, вызывается до монтирования дерева) и прогреваем только его.
export async function getActiveReferralInviteBannerImage(): Promise<number> {
  const stored = await AsyncStorage.getItem('app_theme').catch(() => null);
  const mode = stored && stored in THEME_BANNERS ? (stored as ThemeMode) : 'indigo';
  return THEME_BANNERS[mode];
}

interface ReferralInviteBannerArtProps {
  /**
   * зачем: гибрид «Световод + Чекан» (владелец, 2026-08-16) — баннер въезжает
   * сверху ИЗ СВЕТА (opacity + y -14→0, LUM.settle, без отскока) и один раз
   * вспыхивает по кромке после появления (LUM.rimMs). Чисто декоративная
   * добавка поверх текущего вида — CTA/навигация живут в родителе
   * (app/(tabs)/settings.tsx) и этим пропом не затрагиваются. Default 'classic'
   * не меняет боевой вид.
   */
  motionVariant?: 'classic' | 'hybrid';
}

/** New DALL·E artwork is intentionally unique for every interface theme. */
function ReferralInviteBannerArt({ motionVariant = 'hybrid' }: ReferralInviteBannerArtProps) {
  const { themeMode, theme } = useTheme();
  const isHybrid = motionVariant === 'hybrid';
  const reduceMotion = useReduceMotion();
  // зачем: без recyclingKey expo-image переиспользует нативную вьюху и держит
  // кадр прошлой темы — баннер не менялся при переключении темы. Ключ по теме
  // заставляет сбросить закешированный кадр ровно на смене темы (не каждый рендер).
  const banner = THEME_BANNERS[themeMode] ?? THEME_BANNERS.midnight;

  const entryOpacity = useSharedValue(0);
  const entryY = useSharedValue(-14);
  const rimOpacity = useSharedValue(0);
  useEffect(() => {
    if (!isHybrid) return;
    if (reduceMotion) {
      entryOpacity.value = 1;
      entryY.value = 0;
      rimOpacity.value = 0;
      return;
    }
    entryOpacity.value = withTiming(1, { duration: LUM.resolveMs, easing: REasing.out(REasing.cubic) });
    entryY.value = withSpring(0, LUM.settle);
    // Микро-перелив по кромке ОДИН РАЗ при появлении (после посадки листа).
    rimOpacity.value = withSequence(
      withTiming(0, { duration: LUM.resolveMs }),
      withTiming(1, { duration: 0 }),
      withTiming(0, { duration: LUM.rimMs, easing: REasing.linear }),
    );
    return () => {
      cancelAnimation(entryOpacity);
      cancelAnimation(entryY);
      cancelAnimation(rimOpacity);
    };
  }, [isHybrid, reduceMotion, entryOpacity, entryY, rimOpacity]);
  const hybridEntryStyle = useAnimatedStyle(() => ({
    opacity: entryOpacity.value,
    transform: [{ translateY: entryY.value }],
  }));
  const rimStyle = useAnimatedStyle(() => ({ opacity: rimOpacity.value }));

  const content = (
    <View
      testID={`settings-invite-art-${themeMode}`}
      pointerEvents="none"
      style={[styles.root, { backgroundColor: theme.bgSurface2 }]}
    >
      {/* Первый кадр и аварийный fallback: место баннера никогда не выглядит пустым,
          даже если OTA-ассет ещё не приехал или expo-image восстанавливает cache. */}
      <View style={styles.fallback}>
        <Ionicons name="gift-outline" size={44} color={theme.accent} />
      </View>
      <Image
        key={themeMode}
        recyclingKey={themeMode}
        source={banner}
        accessible={false}
        contentFit="cover"
        cachePolicy="memory-disk"
        transition={0}
        style={styles.image}
      />
      {isHybrid && (
        // Перелив по кромке — тон/свет (LinearGradient), НЕ обводка: владелец
        // запрещает borderWidth/borderColor у контейнеров.
        <Reanimated.View pointerEvents="none" style={[styles.rimGlow, rimStyle]}>
          <LinearGradient
            colors={[`${theme.accent}55`, 'transparent']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Reanimated.View>
      )}
    </View>
  );

  if (!isHybrid) return content;
  return <Reanimated.View style={hybridEntryStyle}>{content}</Reanimated.View>;
}

const styles = StyleSheet.create({
  root: { width: '100%', height: 132, overflow: 'hidden' },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  image: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  rimGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 48 },
});

export default memo(ReferralInviteBannerArt);

export const REFERRAL_INVITE_BANNER_IMAGES = Object.values(THEME_BANNERS);
