/**
 * Экран рулетки Plus (роут /roulette).
 *
 * Лента из 36 карточек (6 копий TAPE_CYCLE из 6 призов), горизонтальный скролл
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
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../components/ThemeContext';
import { CINEMA, cinemaAlpha, isCinemaMode } from '../constants/cinemaThemes';
import { captureAccountGeneration, isCurrentAccountGeneration } from './account_generation';
import { accountScopeKey } from './account_scope_key';
import { getClaimableReferralState, peekClaimableReferralState } from './referral_vip';
import { claimReferralSpins, peekCachedSpinCredits, readCachedSpinCredits, spinReferralRoulette } from './roulette_spin_client';
import { POSITION_OF_PRIZE, preloadRoulettePrizeImages, ROULETTE_PRIZES, SHOW_SPIN_ODDS, TAPE_CYCLE } from './roulette_prizes';
import { useReferralRoulettePolicy } from './referral_roulette_flag';
import { selectAccountScopedReferralState, selectReferralSurfaceState } from './referral_surface_state';
import { readReferralDrain } from './referrals_cache';
import { isReferralCloudEnabled } from './referral_cloud';
import RouletteWinModal from '../components/roulette_win_modal';
import type { RouletteWinData } from '../components/roulette_win_modal';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';

function makeL(lang: Lang) {
  return (ru: string, uk: string, es: string, ptBr: string, vi: string, id: string, tr: string, pl: string) =>
    triLang(lang, { ru, uk, es, 'pt-BR': ptBr, vi, id, tr, pl });
}

// ── Геометрия ленты (совпадает с веб-макетом) ────────────────────────────────
const CARD_W = 150;
const CARD_H = 100; // 3:2, как в модалке выигрыша
const GAP = 16;
const STEP = CARD_W + GAP;
const CYCLE = TAPE_CYCLE.length; // 6
const COPIES = 6;
const TAPE_COUNT = CYCLE * COPIES; // 36
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
  const { lang } = useLang();
  const L = useMemo(() => makeL(lang as Lang), [lang]);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const roulettePolicy = useReferralRoulettePolicy();
  const reduceMotion = useReducedMotion();

  const rouletteAccountToken = captureAccountGeneration();
  const rouletteAccountKey = accountScopeKey(rouletteAccountToken);
  const persistedDrain = readReferralDrain(rouletteAccountToken);
  const warmDrain = persistedDrain?.value ?? peekClaimableReferralState()?.drain;
  const [drain, setDrain] = useState(() => warmDrain ?? null);
  const [hasServerDrain, setHasServerDrain] = useState(() => !!warmDrain);
  const initialReferralSurface = selectReferralSurfaceState({
    referralEnabled: isReferralCloudEnabled(),
    remotePolicy: roulettePolicy,
    persistedDrain: warmDrain,
  });
  const [spinState, setSpins] = useState(() => (
    initialReferralSurface.emergencyStop
      ? 0
      : initialReferralSurface.softEnabled
      ? peekCachedSpinCredits()
      : warmDrain?.availableCreditCount ?? 0
  ));
  const [rouletteStateAccountKey, setRouletteStateAccountKey] = useState<string | null>(() => (
    rouletteAccountKey
  ));
  const scopedReferralState = selectAccountScopedReferralState(rouletteAccountKey, {
    accountKey: rouletteStateAccountKey,
    drain: hasServerDrain ? drain : null,
    spins: spinState,
  });
  const spins = scopedReferralState.spins;
  const referralSurface = selectReferralSurfaceState({
    referralEnabled: isReferralCloudEnabled(),
    remotePolicy: roulettePolicy,
    persistedDrain: scopedReferralState.drain,
  });
  const [spinning, setSpinning] = useState(false);
  const [assetsReady, setAssetsReady] = useState(false);
  const [layoutReady, setLayoutReady] = useState(false);
  const [tapeViewportWidth, setTapeViewportWidth] = useState(windowWidth);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);
  const [win, setWin] = useState<RouletteWinData | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [prizesOpen, setPrizesOpen] = useState(false);

  const centerX = tapeViewportWidth / 2;
  const translateX = useSharedValue(windowWidth / 2 - CARD_W / 2);
  const lastIndexRef = useRef(0);
  const spinningRef = useRef(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const winTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bloomColors: [string, string] = isCinemaMode(themeMode)
    ? [CINEMA[themeMode].bloomA, CINEMA[themeMode].bloomB]
    : [t.accent, t.accent];

  useEffect(() => {
    let alive = true;
    void preloadRoulettePrizeImages()
      .then(() => { if (alive) setAssetsReady(true); })
      .catch(() => { if (alive) setAssetsReady(false); });
    return () => {
      alive = false;
      spinningRef.current = false;
      cancelAnimation(translateX);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (winTimerRef.current) clearTimeout(winTimerRef.current);
    };
  }, [translateX]);

  useEffect(() => {
    const rouletteAvailable = !referralSurface.emergencyStop
      && (referralSurface.softEnabled || spins > 0 || spinningRef.current || win != null);
    if (rouletteAvailable) return;
    cancelAnimation(translateX);
    spinningRef.current = false;
    setSpinning(false);
    setWin(null);
  }, [referralSurface.emergencyStop, referralSurface.softEnabled, spins, translateX, win]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  /** Мгновенный account-scoped cache, затем только server-derived drain state. */
  const refreshSpins = useCallback(async () => {
    const requestAccount = captureAccountGeneration();
    if (referralSurface.emergencyStop) {
      setRouletteStateAccountKey(accountScopeKey(requestAccount));
      setSpins(0);
      return;
    }
    const cachedDrain = readReferralDrain(requestAccount)?.value;
    const cached = referralSurface.softEnabled
      ? await readCachedSpinCredits()
      : cachedDrain?.availableCreditCount ?? 0;
    if (!isCurrentAccountGeneration(requestAccount)) return;
    setRouletteStateAccountKey(accountScopeKey(requestAccount));
    if (cachedDrain) {
      setDrain(cachedDrain);
      setHasServerDrain(true);
    }
    setSpins(cached);
    await claimReferralSpins().catch(() => null);
    const state = await getClaimableReferralState({ force: true });
    if (state.ok && isCurrentAccountGeneration(requestAccount)) {
      setRouletteStateAccountKey(accountScopeKey(requestAccount));
      setDrain(state.drain);
      setHasServerDrain(true);
      setSpins(state.drain.availableCreditCount);
    }
  }, [referralSurface.emergencyStop, referralSurface.softEnabled, rouletteAccountKey]);

  useFocusEffect(
    useCallback(() => {
      refreshSpins();
    }, [refreshSpins]),
  );

  // ── Завершение спина (вызывается на JS-треде после анимации) ───────────────
  const onSpinEnd = useCallback((prizeIndex: number, prizeDays: number, vipUntil: number) => {
    setHighlightIdx(lastIndexRef.current);
    setSpinning(false);
    spinningRef.current = false;
    winTimerRef.current = setTimeout(() => {
      setWin({ prizeIndex, prizeDays, vipUntil });
    }, 500);
  }, []);

  const onTapeLayout = useCallback((event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (!Number.isFinite(width) || width <= 0) return;
    setTapeViewportWidth((current) => current === width ? current : width);
    setLayoutReady(true);
    if (!spinningRef.current) {
      translateX.value = width / 2 - (lastIndexRef.current * STEP + CARD_W / 2);
    }
  }, [translateX]);

  const onSpin = useCallback(async () => {
    if (!assetsReady || !layoutReady) {
      showToast(L('Карточки ещё готовятся — секунду', 'Картки ще готуються — секунду', 'Las tarjetas aún se están preparando', 'Os cartões ainda estão sendo preparados', 'Thẻ vẫn đang được chuẩn bị', 'Kartu masih disiapkan', 'Kartlar hâlâ hazırlanıyor', 'Karty są jeszcze przygotowywane'));
      return;
    }
    if (spinningRef.current || spins <= 0) return;
    const spinAccount = captureAccountGeneration();
    spinningRef.current = true;
    setSpinning(true);
    setHighlightIdx(null);

    // Нормализация: мгновенный перенос в эквивалентную позицию ближе к старту.
    const norm = (lastIndexRef.current % CYCLE) + CYCLE;
    lastIndexRef.current = norm;
    translateX.value = centerX - (norm * STEP + CARD_W / 2);

    const outcome = await spinReferralRoulette();
    if (!isCurrentAccountGeneration(spinAccount)) {
      spinningRef.current = false;
      setSpinning(false);
      return;
    }
    if (!outcome.ok) {
      spinningRef.current = false;
      setSpinning(false);
      if (outcome.reason === 'no_spins') {
        setSpins(0);
        showToast(L('Ключи закончились — пригласи друга', 'Ключі закінчилися — запроси друга', 'No quedan llaves: invita a un amigo', 'As chaves acabaram — convide um amigo', 'Đã hết chìa khóa — hãy mời bạn', 'Kunci habis — undang teman', 'Anahtar kalmadı — bir arkadaşını davet et', 'Skończyły się klucze — zaproś znajomego'));
      } else if (outcome.reason === 'link_required') {
        showToast(L('Нужно связать аккаунт — загляни в профиль', 'Потрібно прив’язати акаунт — зазирни в профіль', 'Vincula tu cuenta desde el perfil', 'Vincule sua conta no perfil', 'Hãy liên kết tài khoản trong hồ sơ', 'Tautkan akunmu di profil', 'Hesabını profilden bağla', 'Połącz konto w profilu'));
      } else if (outcome.reason === 'disabled') {
        showToast(L('Награды временно недоступны', 'Нагороди тимчасово недоступні', 'Las recompensas no están disponibles temporalmente', 'As recompensas estão temporariamente indisponíveis', 'Phần thưởng tạm thời không khả dụng', 'Hadiah sementara tidak tersedia', 'Ödüller geçici olarak kullanılamıyor', 'Nagrody są chwilowo niedostępne'));
      } else {
        // retry уже выполнен внутри клиента с тем же spinRequestId — не дублируем.
        showToast(L('Сеть подвела — попробуй ещё раз', 'Помилка мережі — спробуй ще раз', 'Falló la red: inténtalo de nuevo', 'Falha na rede — tente novamente', 'Lỗi mạng — hãy thử lại', 'Jaringan bermasalah — coba lagi', 'Ağ hatası — tekrar dene', 'Błąd sieci — spróbuj ponownie'));
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
      onSpinEnd(outcome.prizeIndex, outcome.prizeDays, outcome.vipUntil);
      return;
    }
    translateX.value = withTiming(
      targetX,
      { duration: SPIN_DURATION_MS, easing: Easing.bezier(0.1, 0.72, 0.06, 1) },
      (finished) => {
        'worklet';
        if (finished) scheduleOnRN(onSpinEnd, outcome.prizeIndex, outcome.prizeDays, outcome.vipUntil);
      },
    );
  }, [L, assetsReady, layoutReady, spins, centerX, reduceMotion, translateX, onSpinEnd, showToast]);

  const tapeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const tapeCards = useMemo(() => {
    const cards: number[] = [];
    for (let i = 0; i < TAPE_COUNT; i += 1) cards.push(TAPE_CYCLE[i % CYCLE]);
    return cards;
  }, []);

  const rouletteAvailable = !referralSurface.emergencyStop
    && (referralSurface.softEnabled || spins > 0 || spinning || win != null);
  const canSpin = rouletteAvailable && assetsReady && layoutReady && spins > 0 && !spinning;

  if (!rouletteAvailable) {
    return (
      <View style={[styles.root, { backgroundColor: t.bgGradient[0] }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={[styles.headerBtn, { borderColor: t.border }]} accessibilityLabel={L('Назад', 'Назад', 'Atrás', 'Voltar', 'Quay lại', 'Kembali', 'Geri', 'Wstecz')}>
            <Text style={{ color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily, fontWeight: '400' }}>‹</Text>
          </Pressable>
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontFamily: ds.fontFamily, fontWeight: '700', flex: 1, textAlign: 'center' }}>
            {L('Раздел недоступен', 'Розділ недоступний', 'Sección no disponible', 'Seção indisponível', 'Mục không khả dụng', 'Bagian tidak tersedia', 'Bölüm kullanılamıyor', 'Sekcja niedostępna')}
          </Text>
          <View style={styles.headerBtn} />
        </View>
        <Text style={{ color: t.textMuted, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '400', textAlign: 'center', margin: 24 }}>
          {L('Этот раздел сейчас выключен.', 'Цей розділ зараз вимкнено.', 'Esta sección está desactivada.', 'Esta seção está desativada.', 'Mục này hiện đang tắt.', 'Bagian ini sedang dinonaktifkan.', 'Bu bölüm şu anda kapalı.', 'Ta sekcja jest teraz wyłączona.')}
        </Text>
      </View>
    );
  }

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
            style={[styles.headerBtn, { backgroundColor: t.bgCard }]}
            accessibilityLabel={L('Назад', 'Назад', 'Atrás', 'Voltar', 'Quay lại', 'Kembali', 'Geri', 'Wstecz')}
          >
            <Text style={{ color: t.textPrimary, fontSize: f.h3, fontFamily: ds.fontFamily, fontWeight: '400' }}>‹</Text>
          </Pressable>
          {/* зачем: владелец запретил слова «рулетка/прокрут» в интерфейсе —
              механика называется «Награда за друга», единица счёта — «ключ».
              Заголовок и accessibility были захардкожены по-русски: локализуем. */}
          <Text style={{ color: t.textPrimary, fontSize: f.h2, fontFamily: ds.fontFamily, fontWeight: '700', flex: 1, textAlign: 'center' }}>
            {L('Награда за друга', 'Нагорода за друга', 'Recompensa por amigo', 'Recompensa por amigo', 'Phần thưởng mời bạn', 'Hadiah undang teman', 'Arkadaş ödülü', 'Nagroda za znajomego')}
          </Text>
          <Pressable
            onPress={() => router.push('/roulette_about')}
            hitSlop={12}
            style={[styles.headerBtn, { backgroundColor: t.bgCard }]}
            accessibilityLabel={L('О награде', 'Про нагороду', 'Sobre la recompensa', 'Sobre a recompensa', 'Về phần thưởng', 'Tentang hadiah', 'Ödül hakkında', 'O nagrodzie')}
          >
            <Text style={{ color: t.textMuted, fontSize: f.body, fontFamily: ds.fontFamily, fontWeight: '700' }}>?</Text>
          </Pressable>
        </View>

        {/* Бейдж ключей */}
        <View style={[styles.spinsBadge, { backgroundColor: t.accentBg }]}>
          <Text style={{ color: t.accent, fontSize: f.label, fontFamily: ds.fontFamily, fontWeight: '700' }}>
            {L('Ключей', 'Ключів', 'Llaves', 'Chaves', 'Chìa khóa', 'Kunci', 'Anahtar', 'Klucze')}: {spins}
          </Text>
        </View>

        {/* Лента */}
        <View style={[styles.tapeViewport, { height: CARD_H + 28 }]} onLayout={onTapeLayout}>
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
                  <Image source={prize.image} style={styles.tapeCardImage} contentFit="cover" cachePolicy="memory-disk" priority="high" />
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
              accessibilityLabel={L('Забрать награду', 'Забрати нагороду', 'Recibir la recompensa', 'Receber a recompensa', 'Nhận phần thưởng', 'Ambil hadiah', 'Ödülü al', 'Odbierz nagrodę')}
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
                  {!assetsReady || !layoutReady
                    ? L('Готовим…', 'Готуємо…', 'Preparando…', 'Preparando…', 'Đang chuẩn bị…', 'Menyiapkan…', 'Hazırlanıyor…', 'Przygotowujemy…')
                    : spinning
                      ? L('Открываем…', 'Відкриваємо…', 'Abriendo…', 'Abrindo…', 'Đang mở…', 'Membuka…', 'Açılıyor…', 'Otwieramy…')
                      : spins > 0
                        ? L('Забрать награду', 'Забрати нагороду', 'Recibir recompensa', 'Receber recompensa', 'Nhận thưởng', 'Ambil hadiah', 'Ödülü al', 'Odbierz nagrodę')
                        : L('Нет ключей', 'Немає ключів', 'Sin llaves', 'Sem chaves', 'Không có chìa khóa', 'Tidak ada kunci', 'Anahtar yok', 'Brak kluczy')}
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
                    <Image source={p.image} style={styles.prizeThumb} contentFit="cover" cachePolicy="memory-disk" priority="normal" />
                  </View>
                  <Text style={{ color: t.textPrimary, fontSize: f.sub, fontFamily: ds.fontFamily, fontWeight: '700', width: 74 }}>
                    {p.label}
                  </Text>
                  {SHOW_SPIN_ODDS && (
                    <>
                      <View style={[styles.prizeBarTrack, { backgroundColor: t.border }]}>
                        <View style={[styles.prizeBarFill, { backgroundColor: t.accent, width: `${Math.max(2, p.weight)}%` }]} />
                      </View>
                      <Text style={{ color: t.textMuted, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '400', width: 52, textAlign: 'right' }}>
                        {p.weight}%
                      </Text>
                    </>
                  )}
                </View>
              ))}
              <Text style={{ color: t.textMuted, fontSize: f.caption, fontFamily: ds.fontFamily, fontWeight: '400', marginTop: 10, textAlign: 'center' }}>
                {SHOW_SPIN_ODDS ? 'Шансы честные · результат определяет сервер' : 'Результат определяет сервер'}
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
  // зачем: владелец не терпит обводки контейнеров — разделяем тоном (фон-заливка),
  // поэтому borderWidth убран вместе с borderColor (правило design_no_borders_tone_only).
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinsBadge: {
    alignSelf: 'center',
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
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
