/**
 * Cards 2.1 §5.3 — каталог наборов сообщества (правая позиция таббара «Наборы»).
 *
 * Раньше это был хаб-дашборд раздела на `/flashcards`; после §5.1 вход в раздел ведёт
 * на сохранённые карточки, а бывший хаб стал экраном каталога: только «Мои наборы»
 * и «Наборы сообщества» (бесплатные, с лайками и счётчиком добавлений).
 * Убраны (§1.3/§3/§4): чип баланса осколков в шапке, hero-CTA, секция режимов
 * практики и витрина официальных наборов с ценами.
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, BackHandler, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { primeCustomFlashcardsCache } from './flashcards_collection';
import FlashcardsCategoryHub from './flashcards/FlashcardsCategoryHub';
import FlashcardsTabBar, { FC_TABBAR_HEIGHT, useFcTabBarScroll } from './flashcards/FlashcardsTabBar';
import {
  fallbackBundledMarketPacks,
  loadMarketplacePacks,
  loadAccessiblePackIds,
  peekWarmMarketplacePacks,
  type FlashcardMarketPack,
} from './flashcards/marketplace';
import { loadCommunityOwnedPackIds } from './community_packs/communityOwnedStorage';
import { loadLocalAuthorPacks, mergeLocalAuthorPacks } from './community_packs/localAuthorPacks';
import {
  fetchCommunityPackMeta,
  loadAuthorCommunityPacksPendingUpdate,
  loadPublishedCommunityMarketPacks,
  sortCommunityMarketPacksBySocial,
} from './community_packs/communityFirestore';
import { getCanonicalUserId } from './user_id_policy';

export default function FlashcardsPacksScreen() {
  const router = useRouter();
  const { theme: t, f, statusBarLight, themeMode } = useTheme();
  /** В этом проекте градиентных тем (`ocean` / `sakura`) нет — шапка всегда на обычной поверхности. */
  const onColoredGradient = false;
  const gradHeaderInk = 'rgba(255,250,252,0.98)';
  const { lang } = useLang();
  // Изоляция целей обучения: каталог читает наборы и кэш текущей цели.
  const { studyTarget } = useStudyTarget();
  const hubCategoryLang: 'ru' | 'uk' | 'es' = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
  const insets = useStableSafeAreaInsets();

  const [marketPacks, setMarketPacks] = useState<FlashcardMarketPack[]>(
    () => peekWarmMarketplacePacks() ?? fallbackBundledMarketPacks(),
  );
  const [communityPacks, setCommunityPacks] = useState<FlashcardMarketPack[]>([]);
  const [ownedPackIds, setOwnedPackIds] = useState<string[]>([]);
  const [ownedCommunityPackIds, setOwnedCommunityPackIds] = useState<string[]>([]);
  const [hubAuthorStableId, setHubAuthorStableId] = useState<string | null>(null);

  /** cards-2.0 (E3): параллакс орбов ScreenGradient от скролла (±20px), за reduceMotion. */
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);
  const scrollY = useRef(new Animated.Value(0)).current;
  const parallaxY = useMemo(
    () =>
      scrollY.interpolate({
        inputRange: [-120, 0, 480],
        outputRange: [12, 0, -20],
        extrapolate: 'clamp',
      }),
    [scrollY],
  );
  /**
   * §5.2: капсула таббара сжимается при скролле — как на главной.
   * Скролл этого экрана уже занят нативным параллаксом орбов, поэтому таббар
   * подключён `listener`-ом того же `Animated.event`: покадрово это пара
   * арифметических операций и запись shared value, без `setState` и без
   * повторного onScroll-моста (сама анимация капсулы идёт на UI-потоке).
   */
  const tabScroll = useFcTabBarScroll();
  const onHubScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: Platform.OS !== 'web',
        listener: tabScroll.onScroll,
      }),
    [scrollY, tabScroll],
  );

  const cloudCommunityEnabled = CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
  const leavePacks = useCallback(() => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      router.replace('/flashcards' as any);
    }
  }, [router]);

  /** Throttle Firestore-запросов: повторный focus не должен пересохранять list при беглом переключении. */
  const lastHubLoadAtRef = useRef<number>(0);
  /** Стабильность ссылок: setState только при реальной смене содержимого. */
  const marketFpRef = useRef<string>('');
  const ownedFpRef = useRef<string>('');
  const commFpRef = useRef<string>('');
  const commOwnedFpRef = useRef<string>('');

  const computeMarketFp = (packs: FlashcardMarketPack[]): string =>
    packs
      .map((p) => `${p.id}:${p.likesCount ?? 0}:${p.addedCount ?? 0}:${p.cardCount}:${p.updatedAt}:${p.listingStatus ?? ''}`)
      .join('|');

  const loadHubMarket = useCallback(async (opts?: { force?: boolean }) => {
    const now = Date.now();

    /** Локально доступные наборы перечитываем всегда — добавление пишет AsyncStorage до перезахода. */
    const owned = await loadAccessiblePackIds(studyTarget);
    const nextOwnedFp = [...owned].sort().join('|');
    if (nextOwnedFp !== ownedFpRef.current) {
      ownedFpRef.current = nextOwnedFp;
      setOwnedPackIds(owned);
    }

    /** Свои наборы с устройства («Сохранить» в редакторе) — всегда доступны автору. */
    const localAuthored = await loadLocalAuthorPacks(studyTarget).catch(() => []);
    let commOwned: string[] = [];
    if (cloudCommunityEnabled) {
      commOwned = await loadCommunityOwnedPackIds(studyTarget).catch(() => [] as string[]);
    }
    {
      const ownedWithLocal = [...commOwned, ...localAuthored.map((p) => p.id)];
      const nextCommOwnedFp = [...ownedWithLocal].sort().join('|');
      if (nextCommOwnedFp !== commOwnedFpRef.current) {
        commOwnedFpRef.current = nextCommOwnedFp;
        setOwnedCommunityPackIds(ownedWithLocal);
      }
      /**
       * Только что сохранённый набор обязан появиться сразу: 30-секундный троттл ниже
       * относится к Firestore-каталогу и не должен задерживать локальные наборы.
       */
      setCommunityPacks((prev) => {
        const cloudOnly = prev.filter((p) => p.listingStatus !== 'local_only');
        const next = [...cloudOnly, ...mergeLocalAuthorPacks(cloudOnly, localAuthored, studyTarget)];
        const fp = computeMarketFp(next);
        if (fp === commFpRef.current) return prev;
        commFpRef.current = fp;
        return next;
      });
    }

    /** 30s throttle только для Firestore/каталога — блокировки снимаются без ожидания окна. */
    if (!opts?.force && now - lastHubLoadAtRef.current < 30_000) return;
    lastHubLoadAtRef.current = now;

    const [packsRes, commPubRes] = await Promise.allSettled([
      loadMarketplacePacks(studyTarget),
      cloudCommunityEnabled ? loadPublishedCommunityMarketPacks(studyTarget) : Promise.resolve([] as FlashcardMarketPack[]),
    ]);
    const packsRaw = packsRes.status === 'fulfilled' ? packsRes.value : fallbackBundledMarketPacks();
    const packs = packsRaw.length > 0 ? packsRaw : fallbackBundledMarketPacks();

    const nextMarketFp = computeMarketFp(packs);
    if (nextMarketFp !== marketFpRef.current) {
      marketFpRef.current = nextMarketFp;
      setMarketPacks(packs);
    }

    if (cloudCommunityEnabled) {
      const published = commPubRes.status === 'fulfilled' ? commPubRes.value : [];
      const sid = await getCanonicalUserId().catch(() => null);
      setHubAuthorStableId((prev) => (prev === sid ? prev : sid));
      const pendingAuthor = sid ? await loadAuthorCommunityPacksPendingUpdate(sid, studyTarget).catch(() => []) : [];
      const missingMeta = commOwned.filter((id) => !published.some((p) => p.id === id));
      const extras = await Promise.all(missingMeta.map((id) => fetchCommunityPackMeta(id, studyTarget).catch(() => null)));
      const localMarket = mergeLocalAuthorPacks([...published, ...pendingAuthor], localAuthored, studyTarget);
      const merged = [...published, ...pendingAuthor, ...(extras.filter(Boolean) as FlashcardMarketPack[]), ...localMarket];
      const seen = new Set<string>();
      const dedup: FlashcardMarketPack[] = [];
      for (const p of merged) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        dedup.push(p);
      }
      dedup.sort((a, b) => {
        /** Cards 2.1 §2.3: лайки ↓ → добавления ↓ → свежесть. */
        if (a.isCommunityUgc && b.isCommunityUgc) return sortCommunityMarketPacksBySocial(a, b);
        return 0;
      });
      const nextCommFp = computeMarketFp(dedup);
      if (nextCommFp !== commFpRef.current) {
        commFpRef.current = nextCommFp;
        setCommunityPacks(dedup);
      }
    } else {
      const localOnly = mergeLocalAuthorPacks([], localAuthored, studyTarget);
      const nextCommFp = computeMarketFp(localOnly);
      if (nextCommFp !== commFpRef.current) {
        commFpRef.current = nextCommFp;
        setCommunityPacks(localOnly);
      }
      setHubAuthorStableId(null);
    }
  }, [cloudCommunityEnabled, studyTarget]);

  /** Принудительное обновление после «Добавить себе» (через `onMarketRefresh` в каталоге). */
  const refreshHubMarketForce = useCallback(() => {
    void loadHubMarket({ force: true });
  }, [loadHubMarket]);

  useFocusEffect(
    useCallback(() => {
      primeCustomFlashcardsCache(studyTarget);
      void loadHubMarket();
    }, [loadHubMarket]),
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leavePacks();
      return true;
    });
    return () => sub.remove();
  }, [leavePacks]);

  return (
    <ScreenGradient entranceOffsetY={reduceMotion ? undefined : (parallaxY as unknown as Animated.Value)}>
      <SafeAreaView
        style={[styles.safe, { backgroundColor: 'transparent' }]}
        edges={['top', 'left', 'right']}
      >
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <View style={[styles.header, { borderBottomColor: t.border }]}>
          <TouchableOpacity
            testID="flashcards-header-back"
            accessibilityLabel="qa-flashcards-header-back"
            accessible
            onPress={leavePacks}
            style={{ width: 40 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={onColoredGradient ? gradHeaderInk : t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {/* DEV-магазин наборов убран из раздела карточек (решение владельца 2026-08-13). */}
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.scrollRegion}>
          <Animated.ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, 16) + 12 + FC_TABBAR_HEIGHT },
            ]}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            bounces
            alwaysBounceVertical={false}
            onScroll={reduceMotion ? tabScroll.onScroll : onHubScroll}
            scrollEventThrottle={16}
          >
            <FlashcardsCategoryHub
              lang={hubCategoryLang}
              t={t}
              themeMode={themeMode}
              marketPacks={marketPacks}
              ownedPackIds={ownedPackIds}
              onMarketRefresh={refreshHubMarketForce}
              cloudCommunityEnabled={cloudCommunityEnabled}
              communityPacks={communityPacks}
              ownedCommunityPackIds={ownedCommunityPackIds}
              hubAuthorStableId={hubAuthorStableId}
              studyTarget={studyTarget}
            />
          </Animated.ScrollView>
        </View>

        {/* Cards 2.1 §5.2: тот же таббар раздела, правая позиция активна */}
        <FlashcardsTabBar lang={lang} t={t} active="packs" bottomInset={insets.bottom} scroll={tabScroll} />
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, flexDirection: 'column', minHeight: 0 },
  scrollRegion: { flex: 1, minHeight: 0 },
  scrollView: { flex: 1, minHeight: 0 },
  scrollContent: { paddingTop: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
  },
});
