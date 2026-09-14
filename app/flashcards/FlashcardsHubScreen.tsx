import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  findNodeHandle,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ContentWrap from '../../components/ContentWrap';
import FeatureIntroEntry from '../../components/feature_intro/FeatureIntroEntry';
import ScreenGradient from '../../components/ScreenGradient';
import { useLang } from '../../components/LangContext';
import { useStudyTarget } from '../../components/StudyTargetContext';
import { useTheme } from '../../components/ThemeContext';
import { usePremium } from '../../components/PremiumContext';
import PlusBadge from '../../components/PlusBadge';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { useScreen } from '../../hooks/use-screen';
import { useFlashcardTrainingQuotaPreview } from '../../hooks/useFlashcardTrainingQuotaPreview';
import { CLOUD_SYNC_ENABLED, IS_EXPO_GO } from '../config';
import { actionToastTri, emitAppEvent } from '../events';
import { markNextNavigationAsReplace, safeRouterBack } from '../navigation_back';
import { loadCommunityOwnedPackIds } from '../community_packs/communityOwnedStorage';
import { loadPublishedCommunityMarketPacks } from '../community_packs/communityFirestore';
import { loadLocalAuthorPacks } from '../community_packs/localAuthorPacks';
import { stageCommunityPackCardsForNavigation } from '../community_packs/staging';
import { buildFcCreateRoute } from './tabbar_state';
import {
  loadMarketplacePacks,
  peekWarmMarketplacePacks,
  type FlashcardMarketPack,
} from './marketplace';
import SavedTopCommunityPacks from './SavedTopCommunityPacks';
import FlashcardsTrainingModeSheet from './FlashcardsTrainingModeSheet';
import type { CardsTrainingMode } from './training_entry';
import { primeFlashcardsCollectionCache } from './useCollectionData';
import { hydrateFcDeckOptionsSnapshot, loadFcDeckOptions } from './deck_options';

type LibraryRowProps = {
  testID: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
};

/**
 * Совпадают ли каталоги по составу (id и социальные счётчики, которые видно на
 * плитке). Полное глубокое сравнение на каждый фокус дороже самой перерисовки.
 */
function sameCatalog(a: readonly FlashcardMarketPack[], b: readonly FlashcardMarketPack[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i].id !== b[i].id) return false;
    if ((a[i].likesCount ?? 0) !== (b[i].likesCount ?? 0)) return false;
    if ((a[i].addedCount ?? 0) !== (b[i].addedCount ?? 0)) return false;
    // зачем: без этой строки список НЕ перерисуется при новом отклике — счётчик
    // «💬» отставал бы до полного перезахода в раздел (та же жалоба была на лайк).
    if ((a[i].commentsCount ?? 0) !== (b[i].commentsCount ?? 0)) return false;
  }
  return true;
}

/** Тот же список id — прежняя ссылка, чтобы владение не перерисовывало витрину. */
function sameIds(a: readonly string[], b: readonly string[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

function mergeCatalogs(...catalogs: readonly FlashcardMarketPack[][]): FlashcardMarketPack[] {
  const merged: FlashcardMarketPack[] = [];
  const seen = new Set<string>();
  for (const catalog of catalogs) {
    for (const pack of catalog) {
      if (!pack?.id || seen.has(pack.id)) continue;
      seen.add(pack.id);
      merged.push(pack);
    }
  }
  return merged;
}

function LibraryRow({ testID, icon, title, subtitle, onPress }: LibraryRowProps) {
  const { theme: t, f } = useTheme();
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={({ pressed }) => [styles.libraryRow, { backgroundColor: t.bgSurface, opacity: pressed ? 0.82 : 1 }]}
    >
      <View style={[styles.libraryIcon, { backgroundColor: `${t.accent}18` }]}>
        <Ionicons name={icon} size={21} color={t.accent} />
      </View>
      <View style={styles.libraryCopy}>
        <Text
          style={[
            styles.libraryTitle,
            { color: t.textPrimary, fontSize: f.bodyLg, lineHeight: Math.round(f.bodyLg * 1.2), fontWeight: '900' },
          ]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.librarySubtitle,
            { color: t.textSecond, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.25), fontWeight: '700' },
          ]}
        >
          {subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={t.textMuted} />
    </Pressable>
  );
}

export default function FlashcardsHubScreen() {
  const router = useRouter();
  const { lang } = useLang();
  const { studyTarget } = useStudyTarget();
  const { theme: t, f, statusBarLight } = useTheme();
  const { accessResolved } = usePremium();
  const quotaPreview = useFlashcardTrainingQuotaPreview();
  const { contentMaxW } = useScreen();
  const { width } = useWindowDimensions();
  const cloudCommunityEnabled = CLOUD_SYNC_ENABLED && !IS_EXPO_GO;
  const [catalog, setCatalog] = useState<FlashcardMarketPack[]>(
    () => peekWarmMarketplacePacks(studyTarget) ?? [],
  );
  const [ownedCommunityPackIds, setOwnedCommunityPackIds] = useState<string[]>([]);
  /**
   * зачем (владелец: «раздел открывается и происходит скачок, моргание»):
   * состояние стартовало в 'loading' ВСЕГДА, даже когда тёплый каталог уже лежал
   * в памяти и был отдан синхронно строкой выше. Из-за этого первый кадр рисовал
   * скелетон, а следующий — готовый список: ровно то моргание, о котором речь.
   * Кэш есть — решение известно синхронно, ждать нечего (тот же приём уже принят
   * в useCollectionData: collectionDataReady по прогретому кэшу).
   */
  const [catalogLoadState, setCatalogLoadState] = useState<'loading' | 'ready'>(
    () => (catalog.length > 0 ? 'ready' : 'loading'),
  );
  const [catalogLoadRevision, setCatalogLoadRevision] = useState(0);
  const [openingPackId, setOpeningPackId] = useState<string | null>(null);
  const openingPackRef = useRef<string | null>(null);
  /** Зеркало длины каталога: фокус-эффект решает по нему, нужен ли спиннер. */
  const catalogLenRef = useRef(0);
  catalogLenRef.current = catalog.length;
  const [modeSheetVisible, setModeSheetVisible] = useState(false);
  const pendingModeRef = useRef<CardsTrainingMode | null>(null);
  const trainButtonRef = useRef<View>(null);

  const copy = useMemo(() => ({
    title: triLang(lang, {
      ru: 'Карточки', uk: 'Картки', en: 'Cards', es: 'Tarjetas', 'pt-BR': 'Cartões',
      vi: 'Thẻ', id: 'Kartu', tr: 'Kartlar', pl: 'Karty',
    }),
    library: triLang(lang, {
      ru: 'Ваши карточки', uk: 'Ваші картки', en: 'Your cards', es: 'Tus tarjetas',
      'pt-BR': 'Seus cartões', vi: 'Thẻ của bạn', id: 'Kartu Anda', tr: 'Kartların', pl: 'Twoje karty',
    }),
    saved: triLang(lang, {
      ru: 'Сохранённые', uk: 'Збережені', en: 'Saved', es: 'Guardadas', 'pt-BR': 'Salvos',
      vi: 'Đã lưu', id: 'Tersimpan', tr: 'Kaydedilenler', pl: 'Zapisane',
    }),
    savedSub: triLang(lang, {
      ru: 'Личная коллекция', uk: 'Особиста колекція', en: 'Personal collection', es: 'Colección personal',
      'pt-BR': 'Coleção pessoal', vi: 'Bộ sưu tập cá nhân', id: 'Koleksi pribadi',
      tr: 'Kişisel koleksiyon', pl: 'Osobista kolekcja',
    }),
    mine: triLang(lang, {
      ru: 'Мои наборы', uk: 'Мої набори', en: 'My packs', es: 'Mis packs', 'pt-BR': 'Meus pacotes',
      vi: 'Bộ thẻ của tôi', id: 'Paket saya', tr: 'Paketlerim', pl: 'Moje zestawy',
    }),
    mineSub: triLang(lang, {
      ru: 'Созданные и добавленные', uk: 'Створені й додані', en: 'Created and added',
      es: 'Creados y añadidos', 'pt-BR': 'Criados e adicionados', vi: 'Đã tạo và thêm',
      id: 'Dibuat dan ditambahkan', tr: 'Oluşturulan ve eklenen', pl: 'Utworzone i dodane',
    }),
    community: triLang(lang, {
      ru: 'Наборы пользователей', uk: 'Набори користувачів', en: 'Community packs',
      es: 'Packs de usuarios', 'pt-BR': 'Pacotes da comunidade', vi: 'Bộ thẻ cộng đồng',
      id: 'Paket komunitas', tr: 'Topluluk paketleri', pl: 'Zestawy społeczności',
    }),
    communitySub: triLang(lang, {
      ru: 'Открыть каталог', uk: 'Відкрити каталог', en: 'Open catalog', es: 'Abrir catálogo',
      'pt-BR': 'Abrir catálogo', vi: 'Mở danh mục', id: 'Buka katalog', tr: 'Kataloğu aç',
      pl: 'Otwórz katalog',
    }),
    train: triLang(lang, {
      ru: 'Тренироваться с карточками', uk: 'Тренуватися з картками', en: 'Practise with cards',
      es: 'Entrenar con tarjetas', 'pt-BR': 'Treinar com cartões', vi: 'Luyện tập với thẻ',
      id: 'Latihan dengan kartu', tr: 'Kartlarla çalış', pl: 'Ćwicz z kartami',
    }),
    create: triLang(lang, {
      ru: 'Создать набор', uk: 'Створити набір', en: 'Create a pack', es: 'Crear pack',
      'pt-BR': 'Criar pacote', vi: 'Tạo bộ thẻ', id: 'Buat paket', tr: 'Paket oluştur',
      pl: 'Utwórz zestaw',
    }),
    back: triLang(lang, {
      ru: 'На главную', uk: 'На головну', en: 'Back to home', es: 'Volver al inicio',
      'pt-BR': 'Voltar ao início', vi: 'Về trang chính', id: 'Kembali ke beranda',
      tr: 'Ana sayfaya dön', pl: 'Wróć na stronę główną',
    }),
  }), [lang]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      // Revision is an explicit retry signal: changing it restarts this focused load.
      void catalogLoadRevision;
      /**
       * зачем (владелец 2026-09-13, «должно открываться молниеносно»): снимок
       * списка наборов поднимается с диска ЗДЕСЬ, пока человек смотрит на хаб.
       * К моменту тапа по «Тренировке» он уже в памяти, и экран выбора наборов
       * отрисовывает список первым кадром вместо спиннера на семь чтений.
       */
      void hydrateFcDeckOptionsSnapshot();
      /**
       * зачем (владелец 2026-09-14, «должно быть загружено ещё до того, как
       * раздел карточек открыт»): список наборов собирается здесь, в хабе,
       * пока человек ещё не нажал «Тренировка». Все режимы делят один снимок,
       * поэтому одного прогрева хватает на блиц, «Вспомни», свайп и «Устно».
       * Результат сразу уходит в память и на диск; экран выбора наборов берёт
       * его первым кадром.
       */
      void loadFcDeckOptions('trainer', lang, studyTarget).catch((error: unknown) => {
        console.warn('[FC-DECKS] hub:warm FAILED —', error instanceof Error ? error.message : String(error)); // guard-ok: лог отказа в catch, не на кадр
      });
      primeFlashcardsCollectionCache(studyTarget);
      /**
       * зачем: возврат на экран перечитывает каталог фоном, но НЕ стирает уже
       * показанный список. Скелетон уместен только когда показывать нечего.
       * Иначе каждый вход давал кадр «загрузка» поверх готовых данных.
       */
      if (catalogLenRef.current === 0) setCatalogLoadState('loading');
      openingPackRef.current = null;
      setOpeningPackId(null);
      void (async () => {
        const [official, published, owned, authored] = await Promise.all([
          loadMarketplacePacks(studyTarget).catch(() => [] as FlashcardMarketPack[]),
          cloudCommunityEnabled
            // Кнопка «Повторить» (revision > 0) — жест человека, идём мимо кэша.
            ? loadPublishedCommunityMarketPacks(studyTarget, { forceRemote: catalogLoadRevision > 0 })
                .catch(() => [] as FlashcardMarketPack[])
            : Promise.resolve([] as FlashcardMarketPack[]),
          cloudCommunityEnabled
            ? loadCommunityOwnedPackIds(studyTarget).catch(() => [] as string[])
            : Promise.resolve([] as string[]),
          loadLocalAuthorPacks(studyTarget).catch(() => []),
        ]);
        if (cancelled) {
          // Ранний выход обязан объясняться: экран потерял фокус до ответа.
          if (__DEV__) console.log('[FC-HUB] catalog load dropped: screen left focus');
          return;
        }
        /**
         * зачем (владелец: «раздел открывается и происходит скачок»): фокус
         * зовётся при КАЖДОМ входе и раздавал НОВЫЙ массив даже при том же
         * составе — новая ссылка перерисовывала всю витрину. Тот же приём уже
         * принят в useCollectionData (setCardsIfChanged): состав не изменился —
         * держим ПРЕЖНЮЮ ссылку, и повторный вход не даёт ни одной перерисовки.
         */
        const merged = mergeCatalogs(official, published);
        setCatalog((prev) => (sameCatalog(prev, merged) ? prev : merged));
        const nextOwned = [...new Set([...owned, ...authored.map((pack) => pack.id)])];
        setOwnedCommunityPackIds((prev) => (sameIds(prev, nextOwned) ? prev : nextOwned));
        setCatalogLoadState('ready');
      })();
      return () => {
        cancelled = true;
        openingPackRef.current = null;
      };
    }, [catalogLoadRevision, cloudCommunityEnabled, lang, studyTarget]),
  );

  const reloadCatalog = useCallback(() => {
    setCatalogLoadRevision((current) => current + 1);
  }, []);

  const openTopPack = useCallback((pack: FlashcardMarketPack) => {
    if (openingPackRef.current) return;
    openingPackRef.current = pack.id;
    setOpeningPackId(pack.id);
    void (async () => {
      const cards = await stageCommunityPackCardsForNavigation(pack.id, studyTarget, pack);
      if (openingPackRef.current !== pack.id) return;
      openingPackRef.current = null;
      setOpeningPackId(null);
      if (cards.length === 0) {
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Не удалось загрузить набор. Проверьте интернет и попробуйте ещё раз.',
          uk: 'Не вдалося завантажити набір. Перевірте інтернет і спробуйте ще раз.',
          es: 'No se pudo cargar el pack. Comprueba internet e inténtalo de nuevo.',
        }));
        return;
      }
      router.push({
        pathname: '/flashcards_collection',
        params: { pack: pack.id, preview: '1', from: 'hub' },
      } as never);
    })();
  }, [router, studyTarget]);

  const openCreatePack = useCallback(() => {
    void hapticTap();
    const target = buildFcCreateRoute('pack');
    router.push({ pathname: target.pathname, params: target.params } as never);
  }, [router]);

  const trainingLocked = quotaPreview.status === 'exhausted';
  /**
   * зачем (владелец 2026-09-13: «кнопка нажимается, но ничего не происходит»):
   * раньше пускал ТОЛЬКО статус 'allowed', поэтому при любой поломке на нашей
   * стороне тап гас молча. Решение владельца: человека нельзя наказывать за
   * нашу аварию — когда квоту прочитать НЕВОЗМОЖНО ('unavailable' — база
   * phone-state не открылась, 'stale_account' — токен разъехался), пускаем
   * так, будто лимит не исчерпан. Ждём мы только 'waiting' — это нормальная
   * загрузка, которая вот-вот закончится сама.
   */
  const trainingEntryReady = quotaPreview.status === 'allowed'
    || quotaPreview.status === 'unavailable'
    || quotaPreview.status === 'stale_account';
  const speakingLocked = trainingLocked;

  /** Free-пользователь получает paywall до экрана настройки, а не после лишнего тапа. */
  const openTrainingPaywall = useCallback((context: 'flashcard_training', source: string) => {
    markNextNavigationAsReplace();
    router.replace({ pathname: '/premium_modal', params: { context, source } } as never);
  }, [router]);

  const chooseMode = useCallback((mode: CardsTrainingMode) => {
    if (mode === 'speaking' && speakingLocked) {
      openTrainingPaywall('flashcard_training', 'flashcards_hub_speaking');
      return;
    }
    if (trainingLocked) {
      openTrainingPaywall('flashcard_training', 'flashcards_hub_training_mode');
      return;
    }
    if (!trainingEntryReady) return;
    pendingModeRef.current = mode;
    setModeSheetVisible(false);
  }, [openTrainingPaywall, speakingLocked, trainingEntryReady, trainingLocked]);

  const finishModeSheetDismissal = useCallback(() => {
    const mode = pendingModeRef.current;
    pendingModeRef.current = null;
    if (!mode) {
      requestAnimationFrame(() => {
        const node = findNodeHandle(trainButtonRef.current);
        if (node != null) AccessibilityInfo.setAccessibilityFocus(node);
      });
      return;
    }
    router.push({ pathname: '/flashcards_training_setup', params: { mode } } as never);
  }, [router]);

  const contentWidth = Math.max(0, Math.min(contentMaxW, width - 32));

  return (
    <ScreenGradient>
      <FeatureIntroEntry id="cards_hub_first_visit" enabled={accessResolved && !modeSheetVisible && openingPackId === null} />
      <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
        <StatusBar barStyle={statusBarLight ? 'light-content' : 'dark-content'} backgroundColor="transparent" translucent />
        <ContentWrap>
          <View style={styles.header}>
            <View style={styles.headerLeading}>
              <Pressable
                testID="fc-cards-hub-back"
                accessibilityRole="button"
                accessibilityLabel={copy.back}
                onPress={() => safeRouterBack(router, '/(tabs)/home' as never)}
                hitSlop={8}
                style={({ pressed }) => [styles.backButton, { backgroundColor: t.bgSurface, opacity: pressed ? 0.78 : 1 }]}
              >
                <Ionicons name="arrow-back" size={23} color={t.textPrimary} />
              </Pressable>
              <Text
                accessibilityRole="header"
                style={[
                  styles.title,
                  {
                    color: t.textPrimary,
                    fontSize: Math.max(27, Math.round(f.h1 * 1.2)),
                    lineHeight: Math.max(32, Math.round(f.h1 * 1.35)),
                    fontWeight: '900',
                  },
                ]}
              >
                {copy.title}
              </Text>
            </View>
            <Pressable
              testID="fc-cards-hub-create-pack"
              accessibilityRole="button"
              accessibilityLabel={copy.create}
              onPress={openCreatePack}
              style={({ pressed }) => [styles.createButton, { backgroundColor: t.bgSurface, opacity: pressed ? 0.78 : 1 }]}
            >
              <Ionicons name="add" size={25} color={t.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <SavedTopCommunityPacks
              catalog={catalog}
              ownedCommunityPackIds={ownedCommunityPackIds}
              lang={lang}
              t={t}
              contentWidth={contentWidth}
              openingPackId={openingPackId}
              onOpenPreview={openTopPack}
              loading={catalogLoadState === 'loading'}
              onRetry={reloadCatalog}
            />

            <Text
              style={[
                styles.sectionTitle,
                { color: t.textPrimary, fontSize: f.h2, lineHeight: Math.round(f.h2 * 1.25), fontWeight: '900' },
              ]}
            >
              {copy.library}
            </Text>
            <View style={styles.libraryList}>
              <LibraryRow
                testID="fc-cards-hub-library-saved"
                icon="bookmark-outline"
                title={copy.saved}
                subtitle={copy.savedSub}
                onPress={() => router.push({ pathname: '/flashcards_collection', params: { cat: 'saved', from: 'hub' } } as never)}
              />
              <LibraryRow
                testID="fc-cards-hub-library-mine"
                icon="albums-outline"
                title={copy.mine}
                subtitle={copy.mineSub}
                onPress={() => router.push('/flashcards_my_packs' as never)}
              />
              <LibraryRow
                testID="fc-cards-hub-library-community"
                icon="people-outline"
                title={copy.community}
                subtitle={copy.communitySub}
                onPress={() => router.push('/flashcards_packs' as never)}
              />
            </View>

            <Pressable
              ref={trainButtonRef}
              testID="fc-cards-hub-train"
              accessibilityRole="button"
              accessibilityLabel={trainingLocked ? `${copy.train}. Plus` : copy.train}
              onPress={() => {
                void hapticTap();
                console.log('[FC-TRAIN-ENTRY] tap:train', JSON.stringify({
                  quotaStatus: quotaPreview.status, used: quotaPreview.used, limit: quotaPreview.limit,
                  bypass: quotaPreview.bypass, trainingLocked, trainingEntryReady, accessResolved,
                }));
                if (trainingLocked) {
                  console.log('[FC-TRAIN-ENTRY] tap:train → paywall (quota exhausted)');
                  openTrainingPaywall('flashcard_training', 'flashcards_hub_train');
                  return;
                }
                // зачем: этот выход был НЕМЫМ — на статусе waiting/unavailable/stale_account
                // тап не делал ничего и не оставлял следа. Причина обязана попасть в лог.
                if (!trainingEntryReady) {
                  console.warn(`[FC-TRAIN-ENTRY] tap:train → МЁРТВЫЙ ТАП, статус квоты="${quotaPreview.status}" (нужен "allowed")`);
                  return;
                }
                pendingModeRef.current = null;
                setModeSheetVisible(true);
              }}
              style={({ pressed }) => [styles.trainButton, { backgroundColor: t.accent, opacity: pressed ? 0.84 : 1 }]}
            >
              <View style={styles.trainButtonContent}>
                <Text
                  style={[
                    styles.trainText,
                    { color: t.correctText, fontSize: f.bodyLg, lineHeight: Math.round(f.bodyLg * 1.25), fontWeight: '900' },
                  ]}
                >
                  {copy.train}
                </Text>
                {trainingLocked ? <PlusBadge themeMode="dark" size="sm" showIcon={false} /> : null}
              </View>
            </Pressable>
          </ScrollView>
        </ContentWrap>

        <FlashcardsTrainingModeSheet
          visible={modeSheetVisible}
          lang={lang}
          t={t}
          onClose={() => setModeSheetVisible(false)}
          onDismissed={finishModeSheetDismissal}
          onSelect={chooseMode}
          lockedModes={{ speaking: speakingLocked }}
        />
      </SafeAreaView>
    </ScreenGradient>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, minHeight: 0, backgroundColor: 'transparent' },
  header: { minHeight: 60, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeading: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  title: { flexShrink: 1, letterSpacing: 0.1 },
  createButton: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, minHeight: 0 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionTitle: { marginTop: 6, marginBottom: 12, letterSpacing: 0.1 },
  libraryList: { gap: 9 },
  libraryRow: { minHeight: 72, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 11 },
  libraryIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  libraryCopy: { flex: 1, minWidth: 0 },
  libraryTitle: {},
  librarySubtitle: { marginTop: 3 },
  trainButton: { minHeight: 54, marginTop: 16, borderRadius: 17, paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  trainButtonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  trainText: { flexShrink: 1, textAlign: 'center' },
});
