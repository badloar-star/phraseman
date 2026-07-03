import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from './SafeLinearGradient';
import { router, usePathname } from 'expo-router';
import { useTheme } from './ThemeContext';
import { useMatchmakingContext } from '../contexts/MatchmakingContext';
import { useLang } from './LangContext';
import { triLang } from '../constants/i18n';
import { hapticSoftImpact, hapticTap } from '../hooks/use-haptics';
import { MOTION_DURATION, MOTION_SPRING_LEGACY as MOTION_SPRING } from '../constants/motion';
import { ARENA_LOBBY_ACCEPT_MS, CLOUD_SYNC_ENABLED } from '../app/config';
import { setSessionLobbyChoice } from '../app/services/arena_db';
import { reserveArenaGameEntry } from '../app/arena_access_gate';
import { useOverlayVisible } from './OverlayArbiter';
import {
  isMatchFoundToastPathAllowed,
  type MatchFoundToastHost,
} from './matchFoundToastPaths';
import {
  cancelScheduledAnimatedStateUpdates,
  scheduleTrackedAnimatedStateUpdate,
  type ScheduledAnimatedStateUpdate,
} from './animationScheduling';

const { width: SCREEN_W } = Dimensions.get('window');

function MatchFoundToast({ host = 'root' }: { host?: MatchFoundToastHost }) {
  const { status, sessionId, userId, isMatchHandled, isLobbyActive, markMatchHandled, cancelSearching, resumeSearchAfterLobbyAbort } = useMatchmakingContext();
  const pathname = usePathname();
  const { theme: t, f } = useTheme();
  const { lang } = useLang();
  const insets = useStableSafeAreaInsets();

  const [visible, setVisible] = useState(false);
  const translateY = useRef(new Animated.Value(-160)).current;
  /** Смещения от свайпа (пользователь может смахнуть тост вверх/вбок). */
  const swipeY = useRef(new Animated.Value(0)).current;
  const swipeX = useRef(new Animated.Value(0)).current;
  const dotPulse   = useRef(new Animated.Value(0)).current;
  const swordTilt  = useRef(new Animated.Value(0)).current;
  const sheen      = useRef(new Animated.Value(0)).current;
  const acceptExpireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastAcceptEndsAtRef = useRef(0);
  const toastAcceptBarAnim = useRef(new Animated.Value(1)).current;
  const toastAcceptBarAnimRunRef = useRef<Animated.CompositeAnimation | null>(null);
  const loopsRef   = useRef<{ stop: () => void }[]>([]);
  const scheduledStateUpdatesRef = useRef<ScheduledAnimatedStateUpdate[]>([]);
  /** Тост реально в «показан»-состоянии (не вызываем slideOut из else на каждом тике эффекта — это давало sync-колбэки анимации → setState во время useInsertionEffect). */
  const toastActiveRef = useRef(false);
  /** rAF-id отложенного старта slideIn-анимаций под Fabric:
   *  без отсрочки connectAnimatedNodeToView вызывается раньше commit\'а маунта
   *  и кидает JSApplicationIllegalArgumentException. */
  const slideInRafRef = useRef<number | null>(null);
  const wantsToast = status === 'found'
    && !isMatchHandled
    && !isLobbyActive
    && isMatchFoundToastPathAllowed(pathname, host);
  const overlayKey = host === 'screen' ? 'matchFoundToastScreen' : 'matchFoundToast';
  const overlayVisible = useOverlayVisible(overlayKey, wantsToast);

  const slideIn = () => {
    cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
    toastActiveRef.current = true;
    setVisible(true);
    swipeY.setValue(0);
    swipeX.setValue(0);
    hapticSoftImpact();

    if (slideInRafRef.current != null) cancelAnimationFrame(slideInRafRef.current);
    /** Откладываем привязку анимированных нод на следующий кадр —
     *  даём Fabric закоммитить <Animated.View>. */
    slideInRafRef.current = requestAnimationFrame(() => {
      slideInRafRef.current = null;
      // Вынести старт нативных анимаций из того же микротика, что и commit стилей (LinearGradient / RN),
      // иначе на Fabric иногда цепляется «useInsertionEffect must not schedule updates».
      queueMicrotask(() => {
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
    });
  };

  const clearAcceptSchedule = () => {
    if (acceptExpireTimerRef.current) {
      clearTimeout(acceptExpireTimerRef.current);
      acceptExpireTimerRef.current = null;
    }
    toastAcceptBarAnimRunRef.current?.stop?.();
    toastAcceptBarAnimRunRef.current = null;
    toastAcceptBarAnim.setValue(1);
  };

  const stopLoops = () => {
    loopsRef.current.forEach((l) => l.stop());
    loopsRef.current = [];
  };

  /** Отклонить матч (по таймауту ИЛИ по свайпу): тихо помечаем handled,
   *  отменяем поиск и шлём decline на сервер (если это реальный матч). */
  const declineMatch = useCallback(() => {
    void (async () => {
      const sid = sessionId;
      const uid = userId;
      if (
        sid && uid && CLOUD_SYNC_ENABLED
        && !sid.startsWith('bot_')
        && !sid.startsWith('preview_match_')
        && !sid.startsWith('dev_test')
      ) {
        await setSessionLobbyChoice(sid, uid, 'decline').catch(() => {});
      }
      markMatchHandled();
      clearAcceptSchedule();
      slideOut();
      await cancelSearching();
      await resumeSearchAfterLobbyAbort();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, userId, markMatchHandled, cancelSearching, resumeSearchAfterLobbyAbort]);

  const slideOut = (cb?: () => void) => {
    clearAcceptSchedule();
    if (slideInRafRef.current != null) {
      cancelAnimationFrame(slideInRafRef.current);
      slideInRafRef.current = null;
    }
    stopLoops();
    const done = () => {
      toastActiveRef.current = false;
      scheduleTrackedAnimatedStateUpdate(scheduledStateUpdatesRef, () => {
        setVisible(false);
        cb?.();
      });
    };
    if (!toastActiveRef.current) {
      done();
      return;
    }
    Animated.timing(translateY, {
      toValue: -160, duration: MOTION_DURATION.slow, useNativeDriver: true,
    }).start(() => done());
  };

  /** Свайп-смахивание тоста: вверх или вбок → отклонить матч.
   *  Реагируем только на ощутимое движение, чтобы не перехватывать обычный тап. */
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dy) > 6 || Math.abs(g.dx) > 6,
      onPanResponderMove: (_e, g) => {
        // Вверх — свободно; вниз — с сопротивлением (тост «прилип» сверху).
        swipeY.setValue(g.dy < 0 ? g.dy : g.dy * 0.25);
        swipeX.setValue(g.dx);
      },
      onPanResponderRelease: (_e, g) => {
        const dismissUp = g.dy < -40 || g.vy < -0.5;
        const dismissSide = Math.abs(g.dx) > 80 || Math.abs(g.vx) > 0.6;
        if (dismissUp || dismissSide) {
          hapticTap();
          const toX = dismissSide ? (g.dx < 0 ? -SCREEN_W : SCREEN_W) : 0;
          const toY = dismissSide ? g.dy : -220;
          Animated.parallel([
            Animated.timing(swipeX, { toValue: toX, duration: 180, useNativeDriver: true }),
            Animated.timing(swipeY, { toValue: toY, duration: 180, useNativeDriver: true }),
          ]).start(() => {
            declineMatch();
          });
          return;
        }
        // Недотянул — возвращаем на место.
        Animated.parallel([
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, friction: 7 }),
          Animated.spring(swipeY, { toValue: 0, useNativeDriver: true, friction: 7 }),
        ]).start();
      },
      onPanResponderTerminate: () => {
        Animated.parallel([
          Animated.spring(swipeX, { toValue: 0, useNativeDriver: true, friction: 7 }),
          Animated.spring(swipeY, { toValue: 0, useNativeDriver: true, friction: 7 }),
        ]).start();
      },
    }),
  ).current;

  useEffect(() => () => {
    cancelScheduledAnimatedStateUpdates(scheduledStateUpdatesRef);
  }, []);

  useEffect(() => {
    // Show toast whenever a match is found and not yet handled
    // Only show on explicit safe routes. Lobby and arena flows handle navigation themselves.
    if (wantsToast && overlayVisible) {
      slideIn();
      toastAcceptEndsAtRef.current = Date.now() + ARENA_LOBBY_ACCEPT_MS;
      toastAcceptBarAnim.setValue(1);
      const barAnim = Animated.timing(toastAcceptBarAnim, {
        toValue: 0,
        duration: ARENA_LOBBY_ACCEPT_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      });
      toastAcceptBarAnimRunRef.current = barAnim;
      barAnim.start(() => {
        toastAcceptBarAnimRunRef.current = null;
      });
      acceptExpireTimerRef.current = setTimeout(() => {
        acceptExpireTimerRef.current = null;
        declineMatch();
      }, ARENA_LOBBY_ACCEPT_MS);
    } else if (toastActiveRef.current) {
      slideOut();
    }
    return () => {
      clearAcceptSchedule();
      if (slideInRafRef.current != null) {
        cancelAnimationFrame(slideInRafRef.current);
        slideInRafRef.current = null;
      }
      stopLoops();
    };
  }, [wantsToast, overlayVisible, declineMatch]);

  const handlePress = () => {
    if (!sessionId || !userId) return;
    hapticTap();
    clearAcceptSchedule();
    markMatchHandled();
    slideOut(() => {
      void (async () => {
        await reserveArenaGameEntry(sessionId, 'match_toast');
        router.push({
        pathname: '/arena_game' as any,
        params: { sessionId, userId },
        });
      })();
    });
  };

  if (!visible || !overlayVisible) return null;

  const TOAST_W = SCREEN_W - 32;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 8,
          transform: [
            { translateY: Animated.add(translateY, swipeY) },
            { translateX: swipeX },
          ],
        },
      ]}
      pointerEvents="box-none"
      {...panResponder.panHandlers}
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
        <View style={styles.acceptBarWrap} pointerEvents="none">
          <View style={[styles.acceptBarTrack, { backgroundColor: `${t.border}99` }]}>
            <Animated.View
              style={[
                styles.acceptBarFill,
                {
                  width: '100%',
                  backgroundColor: t.accent,
                  transform: [{ scaleX: toastAcceptBarAnim }],
                  transformOrigin: 'left',
                },
              ]}
            />
          </View>
        </View>
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
            {triLang(lang, { ru: 'Соперник найден!', uk: 'Суперника знайдено!', es: '¡Rival encontrado!', 'pt-BR': 'Oponente encontrado!', vi: 'Đã tìm thấy đối thủ!', id: 'Lawan ditemukan!', tr: 'Rakip bulundu!', pl: 'Znaleziono rywala!' })}
          </Text>
          <Text style={[styles.sub, { color: t.textMuted, fontSize: f.caption }]}>
            {triLang(lang, { ru: 'Нажми чтобы войти в игру', uk: 'Натисни, щоб увійти в гру', es: 'Toca para entrar en la partida', 'pt-BR': 'Toque para entrar na partida', vi: 'Nhấn để vào trận', id: 'Ketuk untuk masuk ke permainan', tr: 'Oyuna girmek için dokun', pl: 'Naciśnij, aby wejść do gry' })}
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

export default memo(MatchFoundToast);

const styles = StyleSheet.create({
  // Ниже MaintenanceGate (баннер 9998 / блок 9999) — техработы всегда сверху.
  container: { position: 'absolute', left: 16, right: 16, zIndex: 9990, elevation: 10 },
  toast: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 18, borderWidth: 1.5,
    paddingVertical: 14, paddingHorizontal: 16,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 14, elevation: 10,
    overflow: 'hidden',
  },
  acceptBarWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingTop: 8,
    zIndex: 2,
  },
  acceptBarTrack: {
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  acceptBarFill: {
    height: '100%',
    borderRadius: 2,
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
