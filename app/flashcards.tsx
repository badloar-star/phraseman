import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, InteractionManager, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { hapticTap } from '../hooks/use-haptics';
import { CLOUD_SYNC_ENABLED, DEV_MODE, IS_BETA_TESTER, IS_EXPO_GO } from './config';
import { primeCustomFlashcardsCache } from './flashcards_collection';
import FlashcardsCategoryHub from './flashcards/FlashcardsCategoryHub';
import {
  reserveBundledMarketPacks,
  loadMarketplacePacks,
  loadAccessiblePackIds,
  peekWarmMarketplacePacks,
  type FlashcardMarketPack,
} from './flashcards/marketplace';
import { loadCommunityOwnedPackIds } from './community_packs/communityOwnedStorage';
import {
  fetchCommunityPackMeta,
  loadAuthorCommunityPacksPendingUpdate,
  loadPublishedCommunityMarketPacks,
  sortCommunityMarketPacksByRating,
} from './community_packs/communityFirestore';
import { getCanonicalUserId } from './user_id_policy';
import { getShardsBalance } from './shards_system';
import {
  flashcardsCommunityPacksAvailableForTarget,
  flashcardsOfficialPacksAvailableForTarget,
} from './flashcards_target_gate';
import { FLASHCARDS_MARKET_DEV_ROUTE } from '../constants/devRoutes';
import { safeRouterBack } from './navigation_back';

export default function FlashcardsHubScreen() {
  const router = useRouter();
  const { theme: t, f, statusBarLight, themeMode } = useTheme();
  const onColoredGradient = false;
  const gradHeaderInk = t.textPrimary;
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const hubCategoryLang: 'ru' | 'uk' | 'es' = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
  const officialPacksEnabled = flashcardsOfficialPacksAvailableForTarget(studyTarget);
  const communityPacksEnabled = flashcardsCommunityPacksAvailableForTarget(studyTarget);
  const insets = useSafeAreaInsets();
  const isDevMarketEnabled = DEV_MODE || IS_BETA_TESTER;
  const topSafeInset = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0);
  const scrollBottomPadding = Math.max(insets.bottom, 16) + 12;

  const [marketPacks, setMarketPacks] = useState<FlashcardMarketPack[]>(
    () => peekWarmMarketplacePacks() ?? reserveBundledMarketPacks(),
  );
  const [communityPacks, setCommunityPacks] = useState<FlashcardMarketPack[]>([]);
  const [ownedPackIds, setOwnedPackIds] = useState<string[]>([]);
  const [ownedCommunityPackIds, setOwnedCommunityPackIds] = useState<string[]>([]);
  const [hubAuthorStableId, setHubAuthorStableId] = useState<string | null>(null);
  const [shardBalance, setShardBalance] = useState(0);

  const cloudCommunityEnabled = CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
  const leaveFlashcardsHub = useCallback(() => {
    safeRouterBack(router, '/(tabs)/home' as any);
  }, [router]);

  /** Throttle Firestore-запросов: повторный focus не должен пересохранять list при беглом переключении. */
  const lastHubLoadAtRef = useRef<number>(0);
  /** Стабильность ссылок: setState только при реальной смене содержимого. */
  const marketFpRef = useRef<string>('');
  const ownedFpRef = useRef<string>('');
  const commFpRef = useRef<string>('');
  const commOwnedFpRef = useRef<string>('');

  const computeMarketFp = useCallback((packs: FlashcardMarketPack[]): string =>
    packs
      .map((p) => `${p.id}:${p.priceShards}:${p.cardCount}:${p.updatedAt}:${p.listingStatus ?? ''}`)
      .join('|'), []);

  useEffect(() => {
    if (!officialPacksEnabled) return;
    const bundledReserve = reserveBundledMarketPacks();
    if (bundledReserve.length <= marketPacks.length) return;
    const nextMarketFp = computeMarketFp(bundledReserve);
    if (nextMarketFp === computeMarketFp(marketPacks)) return;
    marketFpRef.current = nextMarketFp;
    setMarketPacks(bundledReserve);
  }, [computeMarketFp, officialPacksEnabled, marketPacks]);

  const loadHubMarket = useCallback(async (opts?: { force?: boolean }) => {
    if (!officialPacksEnabled) {
      const bal = await getShardsBalance().catch(() => 0);
      setShardBalance((prev) => (prev === bal ? prev : bal));
      setMarketPacks([]);
      setCommunityPacks([]);
      setOwnedPackIds([]);
      setOwnedCommunityPackIds([]);
      setHubAuthorStableId(null);
      return;
    }

    const now = Date.now();

    /** Всегда перечитываем локально купленное и баланс — магазин пишет AsyncStorage до перезахода. */
    const [owned, bal] = await Promise.all([loadAccessiblePackIds(studyTarget), getShardsBalance()]);
    const nextOwnedFp = [...owned].sort().join('|');
    if (nextOwnedFp !== ownedFpRef.current) {
      ownedFpRef.current = nextOwnedFp;
      setOwnedPackIds(owned);
    }
    setShardBalance((prev) => (prev === bal ? prev : bal));

    let commOwned: string[] = [];
    if (cloudCommunityEnabled && communityPacksEnabled) {
      commOwned = await loadCommunityOwnedPackIds(studyTarget).catch(() => [] as string[]);
      const nextCommOwnedFp = [...commOwned].sort().join('|');
      if (nextCommOwnedFp !== commOwnedFpRef.current) {
        commOwnedFpRef.current = nextCommOwnedFp;
        setOwnedCommunityPackIds(commOwned);
      }
    }

    /** 30s throttle только для Firestore/каталога — блокировки снимаются без ожидания окна. */
    if (!opts?.force && now - lastHubLoadAtRef.current < 30_000) return;
    lastHubLoadAtRef.current = now;

    const [packsRes, commPubRes] = await Promise.allSettled([
      loadMarketplacePacks(),
      cloudCommunityEnabled && communityPacksEnabled
        ? loadPublishedCommunityMarketPacks(studyTarget)
        : Promise.resolve([] as FlashcardMarketPack[]),
    ]);
    const packsRaw = packsRes.status === 'fulfilled' ? packsRes.value : reserveBundledMarketPacks();
    const packs = packsRaw.length > 0 ? packsRaw : reserveBundledMarketPacks();

    const nextMarketFp = computeMarketFp(packs);
    if (nextMarketFp !== marketFpRef.current) {
      marketFpRef.current = nextMarketFp;
      setMarketPacks(packs);
    }

    if (cloudCommunityEnabled && communityPacksEnabled) {
      const published = commPubRes.status === 'fulfilled' ? commPubRes.value : [];
      const sid = await getCanonicalUserId().catch(() => null);
      setHubAuthorStableId((prev) => (prev === sid ? prev : sid));
      const pendingAuthor = sid ? await loadAuthorCommunityPacksPendingUpdate(sid, studyTarget).catch(() => []) : [];
      const missingMeta = commOwned.filter((id) => !published.some((p) => p.id === id));
      const extras = await Promise.all(missingMeta.map((id) => fetchCommunityPackMeta(id, studyTarget).catch(() => null)));
      const merged = [...published, ...pendingAuthor, ...(extras.filter(Boolean) as FlashcardMarketPack[])];
      const seen = new Set<string>();
      const dedup: FlashcardMarketPack[] = [];
      for (const p of merged) {
        if (seen.has(p.id)) continue;
        seen.add(p.id);
        dedup.push(p);
      }
      dedup.sort((a, b) => {
        if (a.isCommunityUgc && b.isCommunityUgc) return sortCommunityMarketPacksByRating(a, b);
        return 0;
      });
      const nextCommFp = computeMarketFp(dedup);
      if (nextCommFp !== commFpRef.current) {
        commFpRef.current = nextCommFp;
        setCommunityPacks(dedup);
      }
    } else if (commFpRef.current !== '' || commOwnedFpRef.current !== '') {
      commFpRef.current = '';
      commOwnedFpRef.current = '';
      setCommunityPacks([]);
      setOwnedCommunityPackIds([]);
      setHubAuthorStableId(null);
    }
  }, [cloudCommunityEnabled, communityPacksEnabled, computeMarketFp, officialPacksEnabled, studyTarget]);

  /** Принудительное обновление после покупки (через `onMarketRefresh` в Hub). */
  const refreshHubMarketForce = useCallback(() => {
    void loadHubMarket({ force: true });
  }, [loadHubMarket]);

  const openTraining = useCallback(() => {
    void hapticTap();
    const owned = officialPacksEnabled && ownedPackIds.length > 0 ? ownedPackIds.join('|') : '';
    router.push(
      owned
        ? ({ pathname: '/flashcards_swipe', params: { owned } } as any)
        : ('/flashcards_swipe' as any),
    );
  }, [officialPacksEnabled, ownedPackIds, router]);

  const openAudioMode = useCallback(() => {
    void hapticTap();
    const owned = officialPacksEnabled && ownedPackIds.length > 0 ? ownedPackIds.join('|') : '';
    router.push(
      owned
        ? ({ pathname: '/flashcards_audio', params: { owned } } as any)
        : ('/flashcards_audio' as any),
    );
  }, [officialPacksEnabled, ownedPackIds, router]);

  useFocusEffect(
    useCallback(() => {
      primeCustomFlashcardsCache(studyTarget);
      void loadHubMarket();
      const warmImportsTask = InteractionManager.runAfterInteractions(() => {
        void import('./flashcards_swipe').catch(() => {});
        void import('./flashcards_audio').catch(() => {});
      });
      return () => {
        warmImportsTask.cancel?.();
      };
    }, [loadHubMarket, studyTarget]),
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leaveFlashcardsHub();
      return true;
    });
    return () => sub.remove();
  }, [leaveFlashcardsHub]);

  return (
    <ScreenGradient artBackdrop="flashcards">
      <SafeAreaView
        style={[styles.safe, { backgroundColor: 'transparent' }]}
        edges={['left', 'right']}
      >
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <View style={[styles.header, { borderBottomColor: t.border, paddingTop: topSafeInset + 12 }]}>
          <TouchableOpacity
            testID="flashcards-header-back"
            accessibilityLabel="qa-flashcards-header-back"
            accessible
            onPress={leaveFlashcardsHub}
            style={{ width: 40 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={onColoredGradient ? gradHeaderInk : t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {isDevMarketEnabled ? (
            <TouchableOpacity
              onPress={() => router.push(FLASHCARDS_MARKET_DEV_ROUTE as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: 8,
                paddingVertical: 5,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: onColoredGradient ? 'rgba(255,255,255,0.45)' : `${t.accent}66`,
                backgroundColor: onColoredGradient ? 'rgba(255,255,255,0.18)' : `${t.accent}1A`,
              }}
            >
              <Ionicons name="flask-outline" size={12} color={onColoredGradient ? gradHeaderInk : t.accent} />
              <Text style={{ fontSize: f.caption, color: onColoredGradient ? gradHeaderInk : t.accent, fontWeight: '700' }}>DEV</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40 }} />
          )}
        </View>

        <View style={styles.scrollRegion}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: scrollBottomPadding },
            ]}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            bounces
            alwaysBounceVertical={false}
          >
            <FlashcardsCategoryHub
              lang={hubCategoryLang}
              t={t}
              studyTarget={studyTarget}
              themeMode={themeMode}
              marketPacks={officialPacksEnabled ? marketPacks : []}
              ownedPackIds={officialPacksEnabled ? ownedPackIds : []}
              shardBalance={shardBalance}
              onMarketRefresh={refreshHubMarketForce}
              cloudCommunityEnabled={cloudCommunityEnabled && communityPacksEnabled}
              communityPacks={communityPacksEnabled ? communityPacks : []}
              ownedCommunityPackIds={communityPacksEnabled ? ownedCommunityPackIds : []}
              hubAuthorStableId={communityPacksEnabled ? hubAuthorStableId : null}
              onTrainingPress={openTraining}
              onAudioPress={openAudioMode}
            />
          </ScrollView>
        </View>
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
