/**
 * Cards 2.1 §5.3 — «Мои наборы»: свои и добавленные наборы отдельным разделом.
 *
 * «Наборы» в нижнем таббаре раскрывают ДВА разных раздела (§5.2):
 *   • этот экран        — только мои наборы (добавленные официальные + свои UGC);
 *   • /flashcards_packs — каталог наборов сообщества.
 *
 * Экран намеренно тонкий: грузит владение (`loadAccessiblePackIds` +
 * `loadCommunityOwnedPackIds` + локальные авторские) и показывает сетку плиток.
 * Тап по набору синхронно готовит карточки (staging) и уходит в коллекцию с
 * `?pack=` — тот же путь, что и из каталога, поэтому первый кадр уже с карточками.
 *
 * Лэйаут стабилен с первого кадра: пока владение читается, показываем тот же
 * каркас (заголовок + сетка-заглушка), а не пустоту, которая потом «прыгает».
 */
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  BackHandler,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../../components/LangContext';
import ScreenGradient from '../../components/ScreenGradient';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { useTheme } from '../../components/ThemeContext';
import { triLang } from '../../constants/i18n';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { loadCommunityOwnedPackIds } from '../community_packs/communityOwnedStorage';
import { fetchCommunityPackMeta } from '../community_packs/communityFirestore';
import { loadLocalAuthorPacks, mergeLocalAuthorPacks } from '../community_packs/localAuthorPacks';
import { stageCommunityPackCardsForNavigation } from '../community_packs/staging';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import Reanimated from 'react-native-reanimated';
import FlashcardsTabBar, { FC_TABBAR_HEIGHT, useFcTabBarScroll } from './FlashcardsTabBar';
import {
  fallbackBundledMarketPacks,
  loadAccessiblePackIds,
  loadMarketplacePacks,
  packCategoryIonIcon,
  packHubCodeName,
  packTitleForInterface,
  peekWarmMarketplacePacks,
  type FlashcardMarketPack,
} from './marketplace';
import { FC_PACKS_ROUTE } from './tabbar_state';
import { stageOwnedPackCardsForNavigation } from './useCollectionData';

const COLS = 3;
const GAP = 10;
const H_PAD = 16;
const TILE_RADIUS = 18;

export default function FlashcardsMyPacksScreen() {
  const router = useRouter();
  const { theme: t, statusBarLight } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const insets = useStableSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [packs, setPacks] = useState<FlashcardMarketPack[]>([]);

  const contentLang: 'ru' | 'uk' | 'es' = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
  const cloudCommunityEnabled = CLOUD_SYNC_ENABLED && !IS_EXPO_GO;

  const tileW = Math.floor((Math.min(width, 640) - H_PAD * 2 - GAP * (COLS - 1)) / COLS);

  /** Владение читается при каждом фокусе: «Добавить себе» пишет AsyncStorage без событий. */
  const loadMine = useCallback(async () => {
    const [ownedIds, localAuthored, communityOwnedIds] = await Promise.all([
      loadAccessiblePackIds(studyTarget).catch(() => [] as string[]),
      loadLocalAuthorPacks(studyTarget).catch(() => []),
      cloudCommunityEnabled
        ? loadCommunityOwnedPackIds(studyTarget).catch(() => [] as string[])
        : Promise.resolve([] as string[]),
    ]);

    const catalog = peekWarmMarketplacePacks(studyTarget)
      ?? (await loadMarketplacePacks(studyTarget).catch(() => fallbackBundledMarketPacks(studyTarget)));
    const catalogById = new Map(catalog.map((p) => [p.id, p]));

    const out: FlashcardMarketPack[] = [];
    const seen = new Set<string>();
    const push = (pack: FlashcardMarketPack | null | undefined) => {
      if (!pack || seen.has(pack.id)) return;
      seen.add(pack.id);
      out.push(pack);
    };

    for (const id of ownedIds) push(catalogById.get(id));
    for (const pack of mergeLocalAuthorPacks(catalog, localAuthored, studyTarget)) push(pack);

    /** Наборы сообщества, добавленные себе: метаданные из каталога, иначе точечно из облака. */
    const missing = communityOwnedIds.filter((id) => !seen.has(id));
    for (const id of communityOwnedIds) push(catalogById.get(id));
    if (missing.length > 0) {
      const metas = await Promise.all(
        missing.map((id) => fetchCommunityPackMeta(id, studyTarget).catch(() => null)),
      );
      for (const meta of metas) push(meta);
    }
    return out;
  }, [cloudCommunityEnabled, studyTarget]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void loadMine().then((next) => {
        if (cancelled) return;
        setPacks((prev) => {
          const same = prev.length === next.length && prev.every((p, i) => p.id === next[i]?.id);
          return same ? prev : next;
        });
      });
      return () => {
        cancelled = true;
      };
    }, [loadMine]),
  );

  const leave = useCallback(() => {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) router.back();
    else router.replace('/flashcards' as any);
  }, [router]);

  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leave();
      return true;
    });
    return () => sub.remove();
  }, [leave]);

  const openPack = useCallback(
    (pack: FlashcardMarketPack) => {
      /** КРИТИЧНО: staging СИНХРОННО перед push — первый кадр коллекции уже с карточками. */
      if (pack.isCommunityUgc) stageCommunityPackCardsForNavigation(pack.id, studyTarget);
      else stageOwnedPackCardsForNavigation(pack.id);
      router.push({ pathname: '/flashcards_collection', params: { pack: pack.id } } as any);
    },
    [router, studyTarget],
  );

  const copy = useMemo(
    () => ({
      title: triLang(lang, {
        ru: 'Мои наборы', uk: 'Мої набори', es: 'Mis packs',
        'pt-BR': 'Meus pacotes', vi: 'Bộ thẻ của tôi', id: 'Paket saya', tr: 'Paketlerim', pl: 'Moje zestawy',
      }),
      empty: triLang(lang, {
        ru: 'Здесь появятся наборы, которые вы добавили себе или создали',
        uk: 'Тут з’являться набори, які ви додали собі або створили',
        es: 'Aquí aparecerán los packs que añadas o crees',
        'pt-BR': 'Aqui aparecerão os pacotes que você adicionar ou criar',
        vi: 'Các bộ thẻ bạn thêm hoặc tạo sẽ xuất hiện ở đây',
        id: 'Paket yang kamu tambahkan atau buat akan muncul di sini',
        tr: 'Eklediğin veya oluşturduğun paketler burada görünür',
        pl: 'Tu pojawią się zestawy, które dodasz lub utworzysz',
      }),
      browse: triLang(lang, {
        ru: 'Открыть наборы сообщества', uk: 'Відкрити набори спільноти', es: 'Ver packs de la comunidad',
        'pt-BR': 'Ver pacotes da comunidade', vi: 'Xem bộ thẻ cộng đồng', id: 'Lihat paket komunitas',
        tr: 'Topluluk paketlerini aç', pl: 'Zobacz zestawy społeczności',
      }),
      back: triLang(lang, {
        ru: 'Назад', uk: 'Назад', es: 'Atrás',
        'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
      }),
    }),
    [lang],
  );

  return (
    <ScreenGradient>
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <View style={[styles.header, { borderBottomColor: t.border }]}>
          <TouchableOpacity
            testID="fc-my-packs-back"
            accessibilityLabel="qa-fc-my-packs-back"
            accessibilityRole="button"
            accessible
            onPress={leave}
            style={{ width: 40 }}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <View style={{ width: 40 }} />
        </View>

        {/* §5.2: скролл кормит капсулу таббара прямо на UI-потоке. */}
        <Reanimated.ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 + FC_TABBAR_HEIGHT },
          ]}
          showsVerticalScrollIndicator
          onScroll={tabScroll.scrollHandler}
          scrollEventThrottle={16}
        >
          <View style={{ paddingHorizontal: H_PAD }}>
            <Text style={{ color: t.textPrimary, fontSize: 26, fontWeight: '800', letterSpacing: 0.2 }}>
              {copy.title}
            </Text>

            <View
              style={{
                marginTop: 16,
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: GAP,
                justifyContent: 'flex-start',
              }}
            >
              {packs.map((pack) => {
                const displayTitle = packTitleForInterface(pack, contentLang);
                const label =
                  pack.isCommunityUgc && displayTitle.trim().length > 0
                    ? displayTitle.trim()
                    : packHubCodeName(pack);
                return (
                  <TouchableOpacity
                    key={pack.id}
                    testID={`fc-my-packs-pack-${pack.id}`}
                    accessibilityLabel={`qa-fc-my-packs-pack-${pack.id}`}
                    accessibilityRole="button"
                    accessible
                    activeOpacity={0.85}
                    onPress={() => openPack(pack)}
                    style={{ width: tileW, alignItems: 'center', paddingBottom: 6 }}
                  >
                    <View
                      style={{
                        width: tileW,
                        height: tileW,
                        borderRadius: TILE_RADIUS,
                        borderWidth: 1.5,
                        borderColor: t.accent,
                        backgroundColor: t.bgSurface,
                        alignItems: 'center',
                        justifyContent: 'center',
                        paddingHorizontal: 4,
                      }}
                    >
                      <Ionicons
                        name={(packCategoryIonIcon(pack.category) || 'albums-outline') as never}
                        size={Math.round(tileW * 0.42)}
                        color={pack.isCommunityUgc ? t.accent : t.textPrimary}
                      />
                    </View>
                    <Text
                      style={{ color: t.textSecond, fontSize: 11, fontWeight: '700', marginTop: 6, textAlign: 'center' }}
                      numberOfLines={2}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {packs.length === 0 ? (
              <View style={{ marginTop: 24, alignItems: 'center', gap: 14 }}>
                <Text style={{ color: t.textMuted, fontSize: 14, fontWeight: '600', textAlign: 'center' }}>
                  {copy.empty}
                </Text>
                <TouchableOpacity
                  testID="fc-my-packs-browse-community"
                  accessibilityLabel="qa-fc-my-packs-browse-community"
                  accessibilityRole="button"
                  accessible
                  activeOpacity={0.85}
                  onPress={() => router.push(FC_PACKS_ROUTE as never)}
                  style={{
                    paddingVertical: 12,
                    paddingHorizontal: 18,
                    borderRadius: 14,
                    borderWidth: 1.5,
                    borderColor: t.accent,
                    backgroundColor: `${t.accent}1A`,
                  }}
                >
                  <Text style={{ color: t.accent, fontSize: 14, fontWeight: '800' }}>{copy.browse}</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </Reanimated.ScrollView>

        <FlashcardsTabBar lang={lang} t={t} active="mine" bottomInset={insets.bottom} scroll={tabScroll} />
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, flexDirection: 'column', minHeight: 0, backgroundColor: 'transparent' },
  scroll: { flex: 1, minHeight: 0 },
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
