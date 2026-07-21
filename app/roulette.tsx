/**
 * Экран рулетки Plus (роут /roulette).
 *
 * Лента из 72 карточек (12 копий TAPE_CYCLE из 6 призов), горизонтальный скролл
 * на UI-треде (Reanimated translateX). Результат определяет СЕРВЕР
 * (referralSpin, идемпотентно по spinRequestId — см. roulette_spin_client.ts);
 * клиент лишь докручивает ленту до позиции выданного приза.
 *
 * Нормализация перед спином: лента периодична с периодом 6, поэтому мгновенно
 * схлопываем lastIndex → lastIndex % 6 + 6 (визуально та же позиция), затем
 * анимируем к target = lastIndex + 18 + delta (≥ 3 полных круга).
 *
 * Reduced motion: без анимации — мгновенный переход к целевой карточке.
 * Двойной тап «Крутить» заблокирован флагом spinningRef (state-only гонка возможна).
 *
 * Токены: fontWeight только '400'/'700'; тени shadowColor '#000000';
 * overflow:'hidden' отделён от elevation (outer/inner); LinearGradient только start/end.
 * Bloom-градиент CTA — только для cinema-тем (midnight/ember/aurora/volt), иначе solid accent.
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { CINEMA, cinemaAlpha, isCinemaMode } from '../constants/cinemaThemes';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { getCanonicalUserId } from './user_id_policy';
import { readCachedSpinCredits, spinReferralRoulette } from './roulette_spin_client';
import type { SpinOutcome } from './roulette_spin_client';
import { POSITION_OF_PRIZE, ROULETTE_PRIZES, TAPE_CYCLE } from './roulette_prizes';
import RouletteWinModal from '../components/roulette_win_modal';
import type { RouletteWinData } from '../components/roulette_win_modal';

// ── Геометрия ленты (совпадает с веб-макетом) ────────────────────────────────
const CARD_W = 150;
const CARD_H = 100; // 3:2, как в модалке выигрыша
const GAP = 16;
const STEP = CARD_W + GAP;
const CYCLE = TAPE_CYCLE.length; // 6
const COPIES = 12;
const TAPE_COUNT = CYCLE * COPIES; // 72
const SPIN_DURATION_MS = 4800;
/** Минимум полных карточек прокрутки за спин (≈3 круга). */
const MIN_TRAVEL = 18;

// ── Статичные звёзды (seeded, не пересчитываются между рендерами) ────────────
interface StarDot { left: number; top: number; size: number; opacity: number }
const STARS: readonly StarDot[] = (() => {
  let seed = 42;
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  return Array.from({ length: 40 }, () => ({
    left: rnd() * 100,
    top: rnd() * 100,
    size: 1.5 + rnd() * 2,
    opacity: 0.15 + rnd() * 0.5,
  }));
})();

export default function RouletteScreen() {
  const { theme: t, f, ds, themeMode } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const centerX = windowWidth / 2;

  const [spins, setSpins] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [win, setWin] = useState<RouletteWinData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [prizesOpen, setPrizesOpen] = useState(false);

  const translateX = useSharedValue(centerX - CARD_W / 2);
  const lastIndexRef = useRef(0);
  const spinningRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const winTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bloomColors: [string, string] = isCinemaMode(themeMode)
    ? [CINEMA[themeMode].bloomA, CINEMA[themeMode].bloomB]
    : [t.accent, t.accent];

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (winTimerRef.current) clearTimeout(winTimerRef.current);
    };
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  /**
   * Обновление счётчика прокрутов: мгновенно из кэша, затем сеть.
   * Публичного getter'а на сервере нет — читаем users/{uid}.progress
   * .referral_spin_credits напрямую (тот же getDb-паттерн, что и в
   * firestore_friend_activity.ts). TODO: заменить на callable, когда появится.
   */
  const refreshSpins = useCallback(async () => {
    const cached = await readCachedSpinCredits();
    setSpins(cached);
    if (IS_EXPO_GO || !CLOUD_SYNC_ENABLED) return;
    try {
      const uid = await getCanonicalUserId();
      if (!uid) return;
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const db = require('@react-native-firebase/firestore').default();
      const snap = await db.collection('users').doc(uid).get();
      const remote = Number(snap?.data()?.progress?.referral_spin_credits);
      if (Number.isFinite(remote) && remote >= 0) setSpins(Math.floor(remote));
    } catch { /* офлайн/прав нет — остаёмся на кэше */ }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshSpins();
    }, [refreshSpins]),
  );

  // ── Завершение спина (вызывается на JS-треде после анимации) ───────────────
  const onSpinEnd = useCallback((outcome: Extract<SpinOutcome, { ok: true }>) => {
    setHighlightIdx(lastIndexRef.current);
    setSpinning(false);
    spinningRef.current = false;
    winTimerRef.current = setTimeout(() => {
      setWin({ prizeIndex: outcome.prizeIndex, prizeDays: outcome.prizeDays, vipUntil: outcome.vipUntil });
    }, 500);
  }, []);

  const onSpin = useCallback(async () => {
    if (spinningRef.current || spins <= 0) return;
    spinningRef.current = true;
    setSpinning(true);
    setHighlightIdx(null);

    // Нормализация: мгновенный перенос в эквивалентную позицию ближе к старту.
    const norm = (lastIndexRef.current % CYCLE) + CYCLE;
    lastIndexRef.current = norm;
    translateX.value = centerX - (norm * STEP + CARD_W / 2);

    const outcome = await spinReferralRoulette();
    if (!outcome.ok) {
      spinningRef.current = false;
      setSpinning(false);
      if (outcome.reason === 'no_spins') {
        setSpins(0);
        showToast('Прокруты закончились — пригласи друга');
      } else if (outcome.reason === 'link_required') {
        showToast('Нужно связать аккаунт — загляни в профиль');
      } else if (outcome.reason === 'disabled') {
        showToast('Рулетка временно недоступна');
      } else {
        // retry уже выполнен внутри клиента с тем же spinRequestId — не дублируем.
        showToast('Сеть подвела — попробуй ещё раз');
      }
      return;
    }

    setSpins(outcome.spinsLeft);
    const base = lastIndexRef.current + MIN_TRAVEL;
    const delta = ((POSITION_OF_PRIZE[outcome.prizeIndex] - (base % CYCLE)) + CYCLE) % CYCLE;
    const target = base + delta; // target % CYCLE === POSITION_OF_PRIZE[prizeIndex]
    lastIndexRef.current = target;
    const targetX = centerX - (target * STEP + CARD_W / 2);

    if (reduceMotion) {
      translateX.value = targetX;
      onSpinEnd(outcome);
      return;
    }
    translateX.value = withTiming(
      targetX,
      { duration: SPIN_DURATION_MS, easing: Easing.bezier(0.1, 0.72, 0.06, 1) },
      (finished) => {
        'worklet';
        if (finished) runOnJS(onSpinEnd)(outcome);
        else runOnJS(() => { spinningRef.current = false; })();
      },
    );
  }, [spins, centerX, reduceMotion, translateX, onSpinEnd, showToast]);

  const tapeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const tapeCards = useMemo(() => {
    const cards: number[] = [];
    for (let i = 0; i < TAPE_COUNT; i += 1) cards.push(TAPE_CYCLE[i % CYCLE]);
    return cards;
  }, []);

  const canSpin = spins > 0 && !spinning;

  return (
    <View style={styles.root}>
      {/* Фон */}
      <LinearGradient colors={t.bgGradient} style={StyleSheet.absoluteFill} />
      {STARS.map((s, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: t.textPrimary,
            opacity: s.opacity,
          }}
        />
      ))}
      {/* Bloom снизу */}
      <LinearGradient
        colors={['transparent', cinemaAlpha(bloomColors[0], 0.22), cinemaAlpha(bloomColors[1], 0.3)]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.bottomBloom}
        pointerEvents="none"
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Хедер */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={[styles.headerBtn, { borderColor: t.border }]}
            accessibilityLabel="Назад"
          >
            <Text style={{ color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily, fontWeight: '400' }}>‹</Text>
          </Pressable>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontFamily: ds.fontFamily, fontWeight: '700', flex: 1, textAlign: 'center' }}>
            Рулетка Plus
          </Text>
          <Pressable
            onPress={() => router.push('/roulette_about')}
            hitSlop={12}
            style={[styles.headerBtn, { borderColor: t.border }]}
            accessibilityLabel="О рулетке"
          >
            <Text style={{ color: t.textMuted, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '700' }}>?</Text>
          </Pressable>
        </View>

        {/* Бейдж прокрутов */}
        <View style={[styles.spinsBadge, { backgroundColor: t.accentBg, borderColor: t.border }]}>
          <Text style={{ color: t.accent, fontSize: f.label, fontFamily: ds.fontFamily, fontWeight: '700' }}>
            Прокрутов: {spins}
          </Text>
        </View>

        {/* Лента */}
        <View style={[styles.tapeViewport, { height: CARD_H + 28 }]}>
          <Animated.View style={[styles.tapeRow, tapeStyle]}>
            {tapeCards.map((prizeIdx, i) => {
              const prize = ROULETTE_PRIZES[prizeIdx];
              const isHit = highlightIdx === i;
              return (
                <View
                  key={i}
                  style={[
                    styles.tapeCard,
                    {
                      width: CARD_W,
                      height: CARD_H,
                      marginRight: i === tapeCards.length - 1 ? 0 : GAP,
                      borderColor: isHit ? t.accent : t.border,
                      borderWidth: isHit ? 2 : 1,
                      transform: [{ scale: isHit ? 1.1 : 1 }],
                    },
                  ]}
                >
                  <Image source={prize.image} style={styles.tapeCardImage} resizeMode="cover" />
                </View>
              );
            })}
          </Animated.View>

          {/* Указатель по центру */}
          <View style={styles.pointer} pointerEvents="none">
            <Text style={{ color: t.accent, fontSize: 18, fontWeight: '700' }}>▼</Text>
          </View>

          {/* Маски краёв */}
          <LinearGradient
            colors={[t.bgGradient[0], 'transparent']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.maskLeft}
            pointerEvents="none"
          />
          <LinearGradient
            colors={['transparent', t.bgGradient[0]]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.maskRight}
            pointerEvents="none"
          />
        </View>

        {/* CTA */}
        <View style={styles.ctaWrap}>
          {/* outer = тень, inner = clip (overflow убивает elevation) */}
          <View style={[styles.ctaOuter, { shadowColor: '#000000' }]}>
            <Pressable
              onPress={onSpin}
              disabled={!canSpin}
              style={({ pressed }: { pressed: boolean }) => [{ borderRadius: 22, overflow: 'hidden', opacity: pressed && canSpin ? 0.92 : 1 }]}
              accessibilityLabel="Крутить рулетку"
            >
              <LinearGradient
                colors={canSpin ? bloomColors : [t.accentBg, t.accentBg]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.ctaBtn, { height: ds.buttonHeight }]}
              >
                <Text
                  style={{
                    color: canSpin ? t.correctText : t.textGhost,
                    fontSize: f.bodyLg,
                    fontFamily: ds.fontFamily,
                    fontWeight: '700',
                  }}
                >
                  {spinning ? 'Крутится…' : spins > 0 ? 'Крутить' : 'Нет прокрутов'}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>

          {spins <= 0 && !spinning && (
            <Pressable
              onPress={() => router.push('/referrals')}
              style={[styles.inviteBtn, { borderColor: t.accent, height: ds.buttonHeight }]}
              accessibilityLabel="Пригласить друга"
            >
              <Text style={{ color: t.accent, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '700' }}>
                Пригласить друга
              </Text>
            </Pressable>
          )}
        </View>

        {/* Призы */}
        <View style={[styles.prizesCard, { backgroundColor: t.accentBg, borderColor: t.border }]}>
          <Pressable onPress={() => setPrizesOpen((v) => !v)} style={styles.prizesHeader} accessibilityLabel="Что можно выиграть">
            <Text style={{ color: t.textPrimary, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '700', flex: 1 }}>
              Что можно выиграть
            </Text>
            <Text style={{ color: t.textMuted, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '400' }}>
              {prizesOpen ? '▲' : '▼'}
            </Text>
          </Pressable>
          {prizesOpen && (
            <View style={styles.prizesList}>
              {ROULETTE_PRIZES.map((p) => (
                <View key={p.index} style={styles.prizeRow}>
                  <View style={[styles.prizeThumbOuter, { borderColor: t.border }]}>
                    <Image source={p.image} style={styles.prizeThumb} resizeMode="cover" />
                  </View>
                  <Text style={{ color: t.textPrimary, fontSize: f.sub, fontFamily: ds.fontFamily, fontWeight: '700', width: 74 }}>
                    {p.label}
                  </Text>
                  <View style={[styles.prizeBarTrack, { backgroundColor: t.border }]}>
                    <View style={[styles.prizeBarFill, { backgroundColor: t.accent, width: `${Math.max(2, p.weight)}%` }]} />
                  </View>
                  <Text style={{ color: t.textMuted, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '400', width: 52, textAlign: 'right' }}>
                    {p.weight}%
                  </Text>
                </View>
              ))}
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '400', marginTop: 10, textAlign: 'center' }}>
                Шансы честные · результат определяет сервер
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Тост */}
      {toast && (
        <View style={[styles.toast, { backgroundColor: t.accentBg, borderColor: t.border, bottom: insets.bottom + 20 }]} pointerEvents="none">
          <Text style={{ color: t.textPrimary, fontSize: f.sub, fontFamily: ds.fontFamily, fontWeight: '400', textAlign: 'center' }}>
            {toast}
          </Text>
        </View>
      )}

      <RouletteWinModal data={win} onClose={() => setWin(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bottomBloom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '45%',
  },
  scroll: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinsBadge: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  tapeViewport: {
    marginTop: 20,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  tapeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'absolute',
    left: 0,
    top: 14,
  },
  tapeCard: {
    borderRadius: 13,
    overflow: 'hidden',
  },
  tapeCardImage: {
    width: '100%',
    height: '100%',
  },
  pointer: {
    position: 'absolute',
    top: 0,
    left: '50%',
    marginLeft: -9,
  },
  maskLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 56,
  },
  maskRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 56,
  },
  ctaWrap: {
    marginTop: 24,
    paddingHorizontal: 24,
    gap: 12,
  },
  ctaOuter: {
    borderRadius: 22,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  ctaBtn: {
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inviteBtn: {
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prizesCard: {
    marginTop: 24,
    marginHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  prizesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prizesList: {
    marginTop: 14,
    gap: 10,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prizeThumbOuter: {
    width: 48,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  prizeThumb: {
    width: '100%',
    height: '100%',
  },
  prizeBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  prizeBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  toast: {
    position: 'absolute',
    left: 24,
    right: 24,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
});
