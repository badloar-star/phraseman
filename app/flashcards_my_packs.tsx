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
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { actionToastTri, emitAppEvent } from './events';
import { safeRouterBack } from './navigation_back';
import { soundDirector } from '../modules/audio/sound_director';
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
  peekAccessiblePackIds,
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
import { type RuntimeStudyTarget } from './target_storage_keys';

const COLS = 3;
const GAP = 10;
/**
 * Пропорция PNG-«веера» наборов (329x268). Тот же расчёт, что в
 * `FlashcardsCategoryHub` — иконка должна вписываться по высоте, не по ширине.
 */
const PACK_FAN_ASPECT = 329 / 268;
const H_PAD = 16;
const TILE_RADIUS = 18;

/** Два раздела экрана: что добавил себе и что создал сам. */
type MyPacksGroups = {
  added: FlashcardMarketPack[];
  created: FlashcardMarketPack[];
};

const EMPTY_GROUPS: MyPacksGroups = { added: [], created: [] };

/**
 * Разложить наборы по двум разделам. Вынесено из loadMine, чтобы синхронная
 * гидратация первого кадра и асинхронное дочитывание собирали список ОДИНАКОВО:
 * иначе первый кадр и следующий за ним разошлись бы, и это читалось бы как
 * «контент прыгает».
 */
function groupPacks(
  packs: readonly (FlashcardMarketPack | null | undefined)[],
  isMine: (pack: FlashcardMarketPack) => boolean,
): MyPacksGroups {
  const added: FlashcardMarketPack[] = [];
  const created: FlashcardMarketPack[] = [];
  const seen = new Set<string>();
  for (const pack of packs) {
    if (!pack || seen.has(pack.id)) continue;
    seen.add(pack.id);
    (isMine(pack) ? created : added).push(pack);
  }
  return { added, created };
}

/**
 * FIX (владелец, 2026-08-16) «при открытии разделов всё обновляется несколько
 * раз, мелькают промежуточные экраны»: состояние стартовало с EMPTY_GROUPS, и
 * экран ВСЕГДА показывал пустоту, пока не доедет await. Человек видел пустой
 * экран → список, а при возврате — ещё и старое содержимое на кадр.
 *
 * Собираем первый кадр СИНХРОННО из уже прогретых кэшей (owned id + каталог
 * читаются из памяти, без AsyncStorage и без сети). Ничего не прогрето —
 * честно отдаём пусто, как раньше. Сеть/диск лишь дочитывают недостающее.
 */
function peekMyPacksGroups(studyTarget?: RuntimeStudyTarget): MyPacksGroups {
  const catalog = peekWarmMarketplacePacks(studyTarget);
  if (!catalog) return EMPTY_GROUPS;
  const ownedIds = peekAccessiblePackIds(studyTarget);
  if (ownedIds.length === 0) return EMPTY_GROUPS;
  const catalogById = new Map(catalog.map((p) => [p.id, p]));
  // Автора на синхронном пути не знаем (getCanonicalUserId асинхронный), поэтому
  // UGC до дочитывания считаем «добавленным». Раздел «Созданные мной» доедет со
  // следующим кадром и лишь дополнит список — плитки на месте уже сейчас.
  return groupPacks(ownedIds.map((id) => catalogById.get(id)), () => false);
}

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

  // Первый кадр — из прогретых кэшей, без ожидания диска и сети (см. peekMyPacksGroups).
  const [groups, setGroups] = useState<MyPacksGroups>(() => peekMyPacksGroups(studyTarget));
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const openingPackRef = useRef<string | null>(null);
  const openingRequestGenerationRef = useRef(0);

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

    /** Мой набор — созданный на этом аккаунте (локальный черновик или опубликованный мной UGC). */
    const isMine = (pack: FlashcardMarketPack): boolean =>
      authoredLocalIds.has(pack.id) ||
      (!!pack.isCommunityUgc && !!pack.authorStableId && !!myStableId && pack.authorStableId === myStableId);

    /** Порядок тот же, что и был: владение → свои локальные → добавленные из сообщества. */
    const known = new Set([
      ...ownedIds,
      ...authoredLocal.map((p) => p.id),
      ...communityOwnedIds.filter((id) => catalogById.has(id)),
    ]);
    /** Наборы сообщества, добавленные себе: метаданные из каталога, иначе точечно из облака. */
    const missing = communityOwnedIds.filter((id) => !known.has(id) && !catalogById.has(id));
    const metas = missing.length > 0
      ? await Promise.all(missing.map((id) => fetchCommunityPackMeta(id, studyTarget).catch(() => null)))
      : [];

    // Один сборщик на оба пути (см. groupPacks) — синхронный первый кадр и это
    // дочитывание раскладывают наборы одинаково, поэтому список не перестраивается.
    return groupPacks(
      [
        ...ownedIds.map((id) => catalogById.get(id)),
        ...authoredLocal,
        ...communityOwnedIds.map((id) => catalogById.get(id)),
        ...metas,
      ],
      isMine,
    );
  }, [cloudCommunityEnabled, studyTarget]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      openingRequestGenerationRef.current += 1;
      openingPackRef.current = null;
      setOpeningPackId(null);
      void loadMine().then((next) => {
        if (cancelled) return;
        setGroups((prev) =>
          sameGroup(prev.added, next.added) && sameGroup(prev.created, next.created) ? prev : next,
        );
      });
      return () => {
        cancelled = true;
        openingRequestGenerationRef.current += 1;
        openingPackRef.current = null;
      };
    }, [loadMine]),
  );

  // зачем (владелец, 2026-08-16): фолбек '/flashcards' уводил в СОСЕДНЮЮ позицию
  // того же таббара карточек, а не наружу — раздел замыкался сам на себя и выйти
  // было невозможно. Порядок владельца: набор → «Мои наборы» → главная.
  const leave = useCallback(() => {
    safeRouterBack(router, '/(tabs)/home' as any);
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
    async (pack: FlashcardMarketPack) => {
      if (openingPackRef.current) return;
      // зачем: тап уже необратимо решён — звук открытия набора играет сразу,
      // не дожидаясь стейджинга карточек/сети (Optimistic UI).
      soundDirector.request('pm.cards.pack_open', { scope: 'cards' });
      const requestToken = ++openingRequestGenerationRef.current;
      openingPackRef.current = pack.id;
      setOpeningPackId(pack.id);
      if (pack.isCommunityUgc) {
        const cards = await stageCommunityPackCardsForNavigation(pack.id, studyTarget, pack);
        if (
          openingRequestGenerationRef.current !== requestToken
          || openingPackRef.current !== pack.id
        ) return;
        if (cards.length === 0) {
          openingPackRef.current = null;
          setOpeningPackId(null);
          emitAppEvent('action_toast', actionToastTri('error', {
            ru: 'Не удалось загрузить набор. Проверьте интернет и попробуйте ещё раз.',
            uk: 'Не вдалося завантажити набір. Перевірте інтернет і спробуйте ще раз.',
            es: 'No se pudo cargar el pack. Comprueba internet e inténtalo de nuevo.',
            'pt-BR': 'Não foi possível carregar o pacote. Verifique a internet e tente novamente.',
            vi: 'Không thể tải bộ thẻ. Hãy kiểm tra mạng và thử lại.',
            id: 'Paket tidak dapat dimuat. Periksa internet lalu coba lagi.',
            tr: 'Paket yüklenemedi. İnternetini kontrol edip tekrar dene.',
            pl: 'Nie udało się wczytać zestawu. Sprawdź internet i spróbuj ponownie.',
          }));
          return;
        }
      } else {
        stageOwnedPackCardsForNavigation(pack.id, studyTarget);
      }
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
        ru: 'Мои наборы', uk: 'Мої набори', en: 'My packs', es: 'Mis packs',
        'pt-BR': 'Meus pacotes', vi: 'Bộ thẻ của tôi', id: 'Paket saya', tr: 'Paketlerim', pl: 'Moje zestawy',
      }),
      added: triLang(lang, {
        ru: 'Добавленные из сообщества',
        uk: 'Додані зі спільноти',
        en: 'Added from the community',
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
        en: 'Created by me',
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
        en: 'Packs you add or create will appear here',
        es: 'Aquí aparecerán los packs que añadas o crees',
        'pt-BR': 'Aqui aparecerão os pacotes que você adicionar ou criar',
        vi: 'Các bộ thẻ bạn thêm hoặc tạo sẽ xuất hiện ở đây',
        id: 'Paket yang kamu tambahkan atau buat akan muncul di sini',
        tr: 'Eklediğin veya oluşturduğun paketler burada görünür',
        pl: 'Tu pojawią się zestawy, które dodasz lub utworzysz',
      }),
      browse: triLang(lang, {
        ru: 'Открыть наборы сообщества', uk: 'Відкрити набори спільноти', en: 'Open community packs', es: 'Ver packs de la comunidad',
        'pt-BR': 'Ver pacotes da comunidade', vi: 'Xem bộ thẻ cộng đồng', id: 'Lihat paket komunitas',
        tr: 'Topluluk paketlerini aç', pl: 'Zobacz zestawy społeczności',
      }),
      back: triLang(lang, {
        ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás',
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
      /**
       * Обложка занимает плитку почти целиком (как в хабе), иконка-дефолт — скромнее.
       *
       * зачем: владелец жаловался на крошечные иконки наборов. Размер терялся
       * дважды — `contain` вписывал веер 329x268 в КВАДРАТ по ширине (минус ~20%
       * высоты) плюс прозрачные поля внутри самого webp. Растим бокс по пропорции
       * веера и вписываем по высоте; у плитки `overflow:'hidden'`, края не торчат.
       */
      if (png) {
        const size = Math.max(84, Math.floor(tile * 0.98));
        return (
          <Image
            key={packTileArtRevision(pack)}
            source={png}
            style={{ width: size * PACK_FAN_ASPECT, height: size }}
            contentFit="contain"
          />
        );
      }
      return (
        <Ionicons
          name={(packCategoryIonIcon(pack.category) || 'albums-outline') as never}
          size={Math.round(tile * 0.6)}
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
          disabled={openingPackId !== null}
          onPress={() => { void openPack(pack); }}
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
            {openingPackId === pack.id ? (
              <View
                pointerEvents="none"
                style={[StyleSheet.absoluteFillObject, { alignItems: 'center', justifyContent: 'center', backgroundColor: `${t.bgSurface}D9` }]}
              >
                <ActivityIndicator color={t.accent} />
              </View>
            ) : null}
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
    [contentLang, openPack, openingPackId, packIcon, t.accent, t.bgCard, t.bgSurface, t.border, t.textSecond, tileW],
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
          decelerationRate="fast"
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
