/**
 * Cards 2.1 §5.3 — «Мои наборы»: свои и добавленные наборы отдельными разделами.
 *
 * «Наборы» в нижнем таббаре раскрывают ДВА разных раздела (§5.2):
 *   • этот экран        — только мои наборы (добавленные + созданные мной);
 *   • /flashcards_packs — каталог наборов сообщества.
 *
 * Экран намеренно тонкий: грузит владение (`loadAccessiblePackIds` +
 * `loadCommunityOwnedPackIds` + локальные авторские) и показывает сетку плиток.
 * Тап по набору синхронно готовит карточки (staging) и уходит в коллекцию с
 * `?pack=…&from=mine` — тот же путь, что и из каталога, поэтому первый кадр уже
 * с карточками, а «назад» из набора возвращает ровно сюда (замечания владельца
 * после теста на iPhone, 2026-08-13).
 *
 * Два раздела (замечание владельца): «Добавленные из сообщества» и «Созданные
 * мной» — это разные вещи, и в одной куче их не различить. Пустой раздел не
 * показывается совсем.
 *
 * Лэйаут стабилен с первого кадра: пока владение читается, показываем тот же
 * каркас (заголовок + сетка-заглушка), а не пустоту, которая потом «прыгает».
 */
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  BackHandler,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLang } from '../components/LangContext';
import ScreenGradient from '../components/ScreenGradient';
import { useStudyTarget } from '../components/StudyTargetContext';
import { useTheme } from '../components/ThemeContext';
import { triLang } from '../constants/i18n';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from './config';
import { safeRouterBack } from './navigation_back';
import { loadCommunityOwnedPackIds } from './community_packs/communityOwnedStorage';
import { fetchCommunityPackMeta } from './community_packs/communityFirestore';
import { loadLocalAuthorPacks, mergeLocalAuthorPacks } from './community_packs/localAuthorPacks';
import { stageCommunityPackCardsForNavigation } from './community_packs/staging';
import { useStableSafeAreaInsets } from './stable_safe_area_metrics';
import Reanimated from 'react-native-reanimated';
import FlashcardsTabBar, { FC_TABBAR_HEIGHT, useFcTabBarScroll } from './flashcards/FlashcardsTabBar';
import {
  fallbackBundledMarketPacks,
  loadAccessiblePackIds,
  loadMarketplacePacks,
  packCategoryIonIcon,
  packHubCodeName,
  packTitleForInterface,
  peekWarmMarketplacePacks,
  type FlashcardMarketPack,
} from './flashcards/marketplace';
import {
  bundledPackTilePng,
  packTileArtRevision,
  packTileImageForPack,
} from './flashcards/packMarketplaceIcons';
import { FC_PACKS_ROUTE } from './flashcards/tabbar_state';
import { stageOwnedPackCardsForNavigation } from './flashcards/useCollectionData';
import { getCanonicalUserId } from './user_id_policy';

const COLS = 3;
const GAP = 10;
const H_PAD = 16;
const TILE_RADIUS = 18;

/** Два раздела экрана: что добавил себе и что создал сам. */
type MyPacksGroups = {
  added: FlashcardMarketPack[];
  created: FlashcardMarketPack[];
};

const EMPTY_GROUPS: MyPacksGroups = { added: [], created: [] };

function sameGroup(a: FlashcardMarketPack[], b: FlashcardMarketPack[]): boolean {
  return a.length === b.length && a.every((p, i) => {
    const next = b[i];
    return !!next && p.id === next.id && packTileArtRevision(p) === packTileArtRevision(next);
  });
}

export default function FlashcardsMyPacksScreen() {
  const router = useRouter();
  const { theme: t, statusBarLight } = useTheme();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const insets = useStableSafeAreaInsets();
  const { width } = useWindowDimensions();
  /** §5.2: капсула таббара сжимается при скролле — как на главной. */
  const tabScroll = useFcTabBarScroll();

  const [groups, setGroups] = useState<MyPacksGroups>(EMPTY_GROUPS);

  const contentLang: 'ru' | 'uk' | 'es' = lang === 'uk' ? 'uk' : lang === 'es' ? 'es' : 'ru';
  const cloudCommunityEnabled = CLOUD_SYNC_ENABLED && !IS_EXPO_GO;

  const tileW = Math.floor((Math.min(width, 640) - H_PAD * 2 - GAP * (COLS - 1)) / COLS);
  const packCount = groups.added.length + groups.created.length;

  /** Владение читается при каждом фокусе: «Добавить себе» пишет AsyncStorage без событий. */
  const loadMine = useCallback(async (): Promise<MyPacksGroups> => {
    const [ownedIds, localAuthored, communityOwnedIds, myStableId] = await Promise.all([
      loadAccessiblePackIds(studyTarget).catch(() => [] as string[]),
      loadLocalAuthorPacks(studyTarget).catch(() => []),
      cloudCommunityEnabled
        ? loadCommunityOwnedPackIds(studyTarget).catch(() => [] as string[])
        : Promise.resolve([] as string[]),
      getCanonicalUserId().catch(() => null),
    ]);

    const catalog = peekWarmMarketplacePacks(studyTarget)
      ?? (await loadMarketplacePacks(studyTarget).catch(() => fallbackBundledMarketPacks(studyTarget)));
    const catalogById = new Map(catalog.map((p) => [p.id, p]));

    /** Свои наборы с устройства: они мои по определению, ещё до сверки автора. */
    const authoredLocal = mergeLocalAuthorPacks(catalog, localAuthored, studyTarget);
    const authoredLocalIds = new Set(authoredLocal.map((p) => p.id));

    const added: FlashcardMarketPack[] = [];
    const created: FlashcardMarketPack[] = [];
    const seen = new Set<string>();
    /** Мой набор — созданный на этом аккаунте (локальный черновик или опубликованный мной UGC). */
    const isMine = (pack: FlashcardMarketPack): boolean =>
      authoredLocalIds.has(pack.id) ||
      (!!pack.isCommunityUgc && !!pack.authorStableId && !!myStableId && pack.authorStableId === myStableId);
    const push = (pack: FlashcardMarketPack | null | undefined) => {
      if (!pack || seen.has(pack.id)) return;
      seen.add(pack.id);
      (isMine(pack) ? created : added).push(pack);
    };

    for (const id of ownedIds) push(catalogById.get(id));
    for (const pack of authoredLocal) push(pack);

    /** Наборы сообщества, добавленные себе: метаданные из каталога, иначе точечно из облака. */
    const missing = communityOwnedIds.filter((id) => !seen.has(id) && !catalogById.has(id));
    for (const id of communityOwnedIds) push(catalogById.get(id));
    if (missing.length > 0) {
      const metas = await Promise.all(
        missing.map((id) => fetchCommunityPackMeta(id, studyTarget).catch(() => null)),
      );
      for (const meta of metas) push(meta);
    }
    return { added, created };
  }, [cloudCommunityEnabled, studyTarget]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void loadMine().then((next) => {
        if (cancelled) return;
        setGroups((prev) =>
          sameGroup(prev.added, next.added) && sameGroup(prev.created, next.created) ? prev : next,
        );
      });
      return () => {
        cancelled = true;
      };
    }, [loadMine]),
  );

  const leave = useCallback(() => {
    safeRouterBack(router, '/flashcards' as any);
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
      /** `from=mine` — «назад» из набора возвращает ровно сюда, без промежуточных остановок. */
      router.push({
        pathname: '/flashcards_collection',
        params: { pack: pack.id, from: 'mine' },
      } as any);
    },
    [router, studyTarget],
  );

  const copy = useMemo(
    () => ({
      title: triLang(lang, {
        ru: 'Мои наборы', uk: 'Мої набори', es: 'Mis packs',
        'pt-BR': 'Meus pacotes', vi: 'Bộ thẻ của tôi', id: 'Paket saya', tr: 'Paketlerim', pl: 'Moje zestawy',
      }),
      added: triLang(lang, {
        ru: 'Добавленные из сообщества',
        uk: 'Додані зі спільноти',
        es: 'Añadidos de la comunidad',
        'pt-BR': 'Adicionados da comunidade',
        vi: 'Đã thêm từ cộng đồng',
        id: 'Ditambahkan dari komunitas',
        tr: 'Topluluktan eklenenler',
        pl: 'Dodane ze społeczności',
      }),
      created: triLang(lang, {
        ru: 'Созданные мной',
        uk: 'Створені мною',
        es: 'Creados por mí',
        'pt-BR': 'Criados por mim',
        vi: 'Do tôi tạo',
        id: 'Dibuat olehku',
        tr: 'Benim oluşturduklarım',
        pl: 'Utworzone przeze mnie',
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

  /**
   * Иконка набора — ровно как в каталоге сообщества (`FlashcardsCategoryHub`):
   * сперва обложка, выбранная автором (`ugcCardBackKey`), затем бандл по id и
   * только потом осмысленный дефолт по категории. Раньше здесь была сразу
   * Ionicons-заглушка, поэтому «Мои наборы» стояли без иконок (владелец).
   */
  const packIcon = useCallback(
    (pack: FlashcardMarketPack, tile: number) => {
      const png = packTileImageForPack(pack) ?? bundledPackTilePng(pack.id);
      /** Обложка занимает плитку почти целиком (как в хабе), иконка-дефолт — скромнее. */
      if (png) {
        const size = Math.max(72, Math.floor(tile * 0.86));
        return (
          <Image
            key={packTileArtRevision(pack)}
            source={png}
            style={{ width: size, height: size }}
            contentFit="contain"
          />
        );
      }
      return (
        <Ionicons
          name={(packCategoryIonIcon(pack.category) || 'albums-outline') as never}
          size={Math.round(tile * 0.42)}
          color={pack.isCommunityUgc ? t.accent : t.textPrimary}
        />
      );
    },
    [t.accent, t.textPrimary],
  );

  const renderTile = useCallback(
    (pack: FlashcardMarketPack) => {
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
              overflow: 'hidden',
            }}
          >
            {packIcon(pack, tileW)}
            {pack.cardCount > 0 ? (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  right: 5,
                  bottom: 5,
                  borderRadius: 9,
                  paddingHorizontal: 6,
                  paddingVertical: 1,
                  backgroundColor: t.bgCard,
                  borderWidth: 1,
                  borderColor: t.border,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '800', color: t.textSecond }}>{pack.cardCount}</Text>
              </View>
            ) : null}
          </View>
          <Text
            style={{ color: t.textSecond, fontSize: 11, fontWeight: '700', marginTop: 6, textAlign: 'center' }}
            numberOfLines={2}
          >
            {label}
          </Text>
        </TouchableOpacity>
      );
    },
    [contentLang, openPack, packIcon, t.accent, t.bgCard, t.bgSurface, t.border, t.textSecond, tileW],
  );

  /** Раздел с заголовком и счётчиком; пустой раздел не рендерится вообще. */
  const renderSection = useCallback(
    (key: 'added' | 'created', title: string, packs: FlashcardMarketPack[]) => {
      if (packs.length === 0) return null;
      return (
        <View key={key} testID={`fc-my-packs-section-${key}`} style={{ marginTop: 18 }}>
          <View style={styles.sectionHead}>
            <Text
              accessibilityRole="header"
              style={{ color: t.textPrimary, fontSize: 15, fontWeight: '800', letterSpacing: 0.2 }}
            >
              {title}
            </Text>
            <View
              style={[styles.sectionCount, { borderColor: t.border, backgroundColor: t.bgSurface }]}
              pointerEvents="none"
            >
              <Text style={{ color: t.textSecond, fontSize: 11, fontWeight: '800' }}>{packs.length}</Text>
            </View>
          </View>
          <View style={styles.grid}>{packs.map(renderTile)}</View>
        </View>
      );
    },
    [renderTile, t.bgSurface, t.border, t.textPrimary, t.textSecond],
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

            {renderSection('added', copy.added, groups.added)}
            {renderSection('created', copy.created, groups.created)}

            {packCount === 0 ? (
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
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionCount: {
    minWidth: 24,
    paddingHorizontal: 7,
    paddingVertical: 1,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GAP,
    justifyContent: 'flex-start',
  },
});
