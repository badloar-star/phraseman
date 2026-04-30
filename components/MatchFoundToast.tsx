import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { useTheme } from './ThemeContext';
import { useMatchmakingContext } from '../contexts/MatchmakingContext';
import { useLang } from './LangContext';
import { hapticSoftImpact, hapticTap } from '../hooks/use-haptics';
import { MOTION_DURATION, MOTION_SPRING } from '../constants/motion';

const { width: SCREEN_W } = Dimensions.get('window');
const AUTO_DISMISS_MS = 20_000;
const TOAST_ALLOWED_PATHS = new Set([
  '/',
  '/(tabs)',
  '/(tabs)/home',
  '/(tabs)/index',
  '/(tabs)/quizzes',
  '/(tabs)/arena',
  '/(tabs)/settings',
  '/hall_of_fame_screen',
  '/home',
  // Stack screens: превью из админки тестеров
  '/settings_testers',
  '/beta_testers',
]);

function isMatchFoundToastPathAllowed(pathname: string | null | undefined): boolean {
  if (typeof pathname !== 'string' || pathname.length === 0) return false;
  if (TOAST_ALLOWED_PATHS.has(pathname)) return true;
  // expo-router: группы и вложенность, напр. /(stack)/settings_testers
  if (pathname.includes('settings_testers') || pathname.includes('beta_testers')) return true;
  // Уроки / арена / квизы — разные группы в стеке
  if (pathname.includes('/lessons') || pathname.includes('lesson')) return true;
  // Не показываем в боевых аренных экранах (lobby/game/results/join/rating):
  // там навигацией рулит сам arena-флоу и тост визуально мешает.
  return false;
}

export default function MatchFoundToast() {
  const { status, sessionId, userId, isMatchHandled, isLobbyActive, markMatchHandled } = useMatchmakingContext();
  const pathname = usePathname();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-160)).current;
  const dotPulse   = useRef(new Animated.Value(0)).current;
  const swordTilt  = useRef(new Animated.Value(0)).current;
  const sheen      = useRef(new Animated.Value(0)).current;
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loopsRef   = useRef<{ stop: () => void }[]>([]);
  /** rAF-id отложенного старта slideIn-анимаций под Fabric:
   *  без отсрочки connectAnimatedNodeToView вызывается раньше commit'а маунта
   *  и кидает JSApplicationIllegalArgumentException. */
  const slideInRafRef = useRef<number | null>(null);

  const slideIn = () => {
    setVisible(true);
    hapticSoftImpact();

    if (slideInRafRef.current != null) cancelAnimationFrame(slideInRafRef.current);
    /** Откладываем привязку анимированных нод на следующий кадр —
     *  даём Fabric закоммитить <Animated.View>. */
    slideInRafRef.current = requestAnimationFrame(() => {
      slideInRafRef.current = null;
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: MOTION_SPRING.ui.friction,
        tension: MOTION_SPRING.ui.tension,
      }).start();

      // Pulse — пульсирующий dot, говорящий «жми»
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(dotPulse, { toValue: 1, duration: 700, useNativeDriver: true }),
          Animated.timing(dotPulse, { toValue: 0, duration: 700, useNativeDriver: true }),
        ]),
      );
      pulse.start();
      loopsRef.current.push(pulse);

      // Лёгкий tilt на ⚔️ каждые ~3.2с — «зовёт» в бой
      const tilt = Animated.loop(
        Animated.sequence([
          Animated.delay(2200),
          Animated.timing(swordTilt, { toValue: 1,  duration: 90, useNativeDriver: true }),
          Animated.timing(swordTilt, { toValue: -1, duration: 90, useNativeDriver: true }),
          Animated.timing(swordTilt, { toValue: 0.5,duration: 90, useNativeDriver: true }),
          Animated.timing(swordTilt, { toValue: 0,  duration: 100, useNativeDriver: true }),
        ]),
      );
      tilt.start();
      loopsRef.current.push(tilt);

      // Sheen-волна по тосту. Reset делаем не через duration:0 (на Fabric внутри
      // loop иногда вызывает агрессивный disconnect ноды), а через duration:1
      // ПЕРЕД основным анимом — это эквивалентно мгновенному снапу для глаза.
      const sheenLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(sheen, { toValue: 0, duration: 1, useNativeDriver: true }),
          Animated.delay(1400),
          Animated.timing(sheen, {
            toValue: 1,
            duration: 1100,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      sheenLoop.start();
      loopsRef.current.push(sheenLoop);
    });
  };

  const stopLoops = () => {
    loopsRef.current.forEach((l) => l.stop());
    loopsRef.current = [];
  };

  const slideOut = (cb?: () => void) => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (slideInRafRef.current != null) {
      cancelAnimationFrame(slideInRafRef.current);
      slideInRafRef.current = null;
    }
    stopLoops();
    Animated.timing(translateY, {
      toValue: -160, duration: MOTION_DURATION.slow, useNativeDriver: true,
    }).start(() => { setVisible(false); cb?.(); });
  };

  useEffect(() => {
    const isAllowedPath = isMatchFoundToastPathAllowed(pathname);
    // Show toast whenever a match is found and not yet handled
    // Only show on explicit safe routes. Lobby and arena flows handle navigation themselves.
    if (status === 'found' && !isMatchHandled && !isLobbyActive && isAllowedPath) {
      slideIn();
      timerRef.current = setTimeout(() => slideOut(), AUTO_DISMISS_MS);
    } else {
      slideOut();
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (slideInRafRef.current != null) {
        cancelAnimationFrame(slideInRafRef.current);
        slideInRafRef.current = null;
      }
      stopLoops();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, isMatchHandled, isLobbyActive, pathname]);

  const handlePress = () => {
    if (!sessionId || !userId) return;
    hapticTap();
    markMatchHandled();
    slideOut(() => {
      router.push({
        pathname: '/arena_game' as any,
        params: { sessionId, userId },
      });
    });
  };

  if (!visible) return null;

  const TOAST_W = SCREEN_W - 32;

  return (
    <Animated.View
      style={[styles.container, { top: insets.top + 8, transform: [{ translateY }] }]}
      pointerEvents="box-none"
    >
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={handlePress}
        style={[
          styles.toast,
          {
            backgroundColor: t.bgCard,
            borderColor: t.accent,
            shadowColor: t.accent,
          },
        ]}
      >
        {/* Внутренний градиент свечения */}
        <LinearGradient
          colors={[t.accent + '22', 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* Sheen-волна */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0, bottom: 0, left: -90,
            width: 90,
            transform: [
              { translateX: sheen.interpolate({ inputRange: [0, 1], outputRange: [0, TOAST_W + 60] }) },
              { skewX: '-20deg' },
            ],
          }}
        >
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        </Animated.View>

        {/* Иконка с halo и tilt */}
        <View style={styles.iconWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.iconHalo,
              {
                backgroundColor: t.accent,
                opacity: dotPulse.interpolate({ inputRange: [0, 1], outputRange: [0.16, 0.36] }),
                transform: [{ scale: dotPulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.18] }) }],
              },
            ]}
          />
          <Animated.Text
            style={[
              styles.icon,
              {
                transform: [
                  { rotate: swordTilt.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] }) },
                ],
                textShadowColor: t.accent + 'CC',
                textShadowRadius: 10,
              },
            ]}
          >
            ⚔️
          </Animated.Text>
        </View>

        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: t.textPrimary, fontSize: f.body }]}>
            {lang === 'uk'
              ? 'Суперника знайдено!'
              : lang === 'es'
                ? '¡Rival encontrado!'
                : 'Соперник найден!'}
          </Text>
          <Text style={[styles.sub, { color: t.textMuted, fontSize: f.caption }]}>
            {lang === 'uk'
              ? 'Натисни, щоб увійти в гру'
              : lang === 'es'
                ? 'Toca para entrar en la partida'
                : 'Нажми чтобы войти в игру'}
          </Text>
        </View>

        {/* Pulsing dot — ring + ядро. Glow реализован через увеличивающийся
            полупрозрачный внешний круг, чтобы не анимировать shadowOpacity
            на native driver (это вылет на Fabric). */}
        <View style={styles.dotWrap}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.dotGlow,
              {
                backgroundColor: t.accent,
                opacity: dotPulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.55] }),
                transform: [{ scale: dotPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              {
                backgroundColor: t.accent,
                transform: [{ scale: dotPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
              },
            ]}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 16, right: 16, zIndex: 9999 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, borderWidth: 1.5,
    paddingVertical: 14, paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
    overflow: 'hidden',
  },
  iconWrap: {
    width: 38, height: 38,
    alignItems: 'center', justifyContent: 'center',
  },
  iconHalo: {
    position: 'absolute',
    width: 38, height: 38, borderRadius: 19,
  },
  icon: { fontSize: 26 },
  textWrap: { flex: 1, gap: 2 },
  title: { fontWeight: '800' },
  sub: {},
  dotWrap: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  dotGlow: { position: 'absolute', width: 22, height: 22, borderRadius: 11 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
