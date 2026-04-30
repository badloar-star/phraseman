import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenGradient from '../components/ScreenGradient';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import { CLOUD_SYNC_ENABLED, DEV_MODE, IS_BETA_TESTER, IS_EXPO_GO } from './config';
import { primeCustomFlashcardsCache } from './flashcards_collection';
import FlashcardsCategoryHub from './flashcards/FlashcardsCategoryHub';
import {
  fallbackBundledMarketPacks,
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

export default function FlashcardsHubScreen() {
  const router = useRouter();
  const { theme: t, f, isDark, statusBarLight } = useTheme();
  const { lang } = useLang();
  const hubCategoryLang: 'ru' | 'uk' | 'es' = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
  const insets = useSafeAreaInsets();
  const isDevMarketEnabled = DEV_MODE || IS_BETA_TESTER;

  const [marketPacks, setMarketPacks] = useState<FlashcardMarketPack[]>(
    () => peekWarmMarketplacePacks() ?? fallbackBundledMarketPacks(),
  );
  const [communityPacks, setCommunityPacks] = useState<FlashcardMarketPack[]>([]);
  const [ownedPackIds, setOwnedPackIds] = useState<string[]>([]);
  const [ownedCommunityPackIds, setOwnedCommunityPackIds] = useState<string[]>([]);
  const [hubAuthorStableId, setHubAuthorStableId] = useState<string | null>(null);
  const [shardBalance, setShardBalance] = useState(0);

  const cloudCommunityEnabled = CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
  const exitToHome = useCallback(() => {
    router.replace('/(tabs)/home' as any);
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
      .map((p) => `${p.id}:${p.priceShards}:${p.cardCount}:${p.updatedAt}:${p.listingStatus ?? ''}`)
      .join('|');

  const loadHubMarket = useCallback(async (opts?: { force?: boolean }) => {
    const now = Date.now();
    /** 30s throttle: повторный focus не лезет в Firestore — экран мгновенный, без мигания. */
    if (!opts?.force && now - lastHubLoadAtRef.current < 30_000) return;
    lastHubLoadAtRef.current = now;

    const [packsRes, ownedRes, commPubRes, commOwnedRes, balRes] = await Promise.allSettled([
      loadMarketplacePacks(),
      loadAccessiblePackIds(),
      cloudCommunityEnabled ? loadPublishedCommunityMarketPacks() : Promise.resolve([] as FlashcardMarketPack[]),
      cloudCommunityEnabled ? loadCommunityOwnedPackIds() : Promise.resolve([] as string[]),
      getShardsBalance(),
    ]);
    const packsRaw = packsRes.status === 'fulfilled' ? packsRes.value : fallbackBundledMarketPacks();
    const packs = packsRaw.length > 0 ? packsRaw : fallbackBundledMarketPacks();
    const owned = ownedRes.status === 'fulfilled' ? ownedRes.value : [];
    const bal = balRes.status === 'fulfilled' ? balRes.value : 0;

    const nextMarketFp = computeMarketFp(packs);
    if (nextMarketFp !== marketFpRef.current) {
      marketFpRef.current = nextMarketFp;
      setMarketPacks(packs);
    }
    const nextOwnedFp = [...owned].sort().join('|');
    if (nextOwnedFp !== ownedFpRef.current) {
      ownedFpRef.current = nextOwnedFp;
      setOwnedPackIds(owned);
    }
    setShardBalance((prev) => (prev === bal ? prev : bal));

    if (cloudCommunityEnabled) {
      const published = commPubRes.status === 'fulfilled' ? commPubRes.value : [];
      const commOwned = commOwnedRes.status === 'fulfilled' ? commOwnedRes.value : [];
      const nextCommOwnedFp = [...commOwned].sort().join('|');
      if (nextCommOwnedFp !== commOwnedFpRef.current) {
        commOwnedFpRef.current = nextCommOwnedFp;
        setOwnedCommunityPackIds(commOwned);
      }
      const sid = await getCanonicalUserId().catch(() => null);
      setHubAuthorStableId((prev) => (prev === sid ? prev : sid));
      const pendingAuthor = sid ? await loadAuthorCommunityPacksPendingUpdate(sid).catch(() => []) : [];
      const missingMeta = commOwned.filter((id) => !published.some((p) => p.id === id));
      const extras = await Promise.all(missingMeta.map((id) => fetchCommunityPackMeta(id).catch(() => null)));
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
  }, [cloudCommunityEnabled]);

  /** Принудительное обновление после покупки (через `onMarketRefresh` в Hub). */
  const refreshHubMarketForce = useCallback(() => {
    void loadHubMarket({ force: true });
  }, [loadHubMarket]);

  useFocusEffect(
    useCallback(() => {
      primeCustomFlashcardsCache();
      void loadHubMarket();
    }, [loadHubMarket]),
  );

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      exitToHome();
      return true;
    });
    return () => sub.remove();
  }, [exitToHome]);

  return (
    <ScreenGradient>
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
            onPress={exitToHome}
            style={{ width: 40 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          {isDevMarketEnabled ? (
            <TouchableOpacity
              onPress={() => router.push('/flashcards_market_dev' as any)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: 8,
                paddingVertical: 5,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: `${t.accent}66`,
                backgroundColor: `${t.accent}1A`,
              }}
            >
              <Ionicons name="flask-outline" size={12} color={t.accent} />
              <Text style={{ fontSize: f.caption, color: t.accent, fontWeight: '700' }}>DEV</Text>
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
              { paddingBottom: Math.max(insets.bottom, 16) + 12 },
            ]}
            showsVerticalScrollIndicator
            keyboardShouldPersistTaps="handled"
            bounces
            alwaysBounceVertical={false}
          >
            <FlashcardsCategoryHub
              lang={hubCategoryLang}
              t={t}
              marketPacks={marketPacks}
              ownedPackIds={ownedPackIds}
              shardBalance={shardBalance}
              onMarketRefresh={refreshHubMarketForce}
              cloudCommunityEnabled={cloudCommunityEnabled}
              communityPacks={communityPacks}
              ownedCommunityPackIds={ownedCommunityPackIds}
              hubAuthorStableId={hubAuthorStableId}
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
