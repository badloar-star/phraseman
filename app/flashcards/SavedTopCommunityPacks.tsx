/** Три лучшие реальные UGC-набора на хабе; каталог и доступ не меняются. */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { type ComponentProps, useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { triLang, type Lang } from '../../constants/i18n';
import { FlowText } from '../../components/text-integrity/FlowText';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { hapticTap } from '../../hooks/use-haptics';
import { packCategoryIonIcon, packTitleForInterface, type FlashcardMarketPack } from './marketplace';
import { useCommunityAuthorName } from '../community_packs/packAuthorNames';
import { isLocalAuthorPackId } from '../community_packs/localAuthorPacks';
import CommunityPackSocialBar from '../community_packs/CommunityPackSocialBar';

const COLS = 3;
const SHOWN = 10;
type IoniconName = ComponentProps<typeof Ionicons>['name'];

function isIoniconName(candidate: unknown): candidate is IoniconName {
  return typeof candidate === 'string'
    && Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, candidate);
}

function communityPackIconName(category: FlashcardMarketPack['category']): IoniconName {
  const candidate = packCategoryIonIcon(category);
  return isIoniconName(candidate) ? candidate : 'albums-outline';
}

/**
 * Порога «минимум N лайков» тут НЕТ намеренно.
 *
 * зачем (владелец, скриншот 2026-08-29 «ты не добавил»): с порогом ≥1 лайк
 * витрина была пустой на живом устройстве — у наборов в базе лайков ещё нет,
 * и фильтр выбрасывал ВСЁ. Пустая полка вместо витрины — это не «честность»,
 * а сломанная функция. Показываем лучшее из того, что реально есть: лайки ↓,
 * при равенстве — число добавивших людей ↓ (владелец просил оба сигнала).
 */



/**
 * Отбор витрины: наборы сообщества, отсортированные по лайкам ↓, затем по числу
 * добавивших людей ↓, затем по id (детерминированно — иначе порядок скакал бы
 * между заходами при равных счётчиках). Чистая функция, тестируется отдельно.
 */
export function pickTopCommunityPacks(
  catalog: readonly FlashcardMarketPack[],
  /* Default three is also used by the training setup suggestions. */
  limit = COLS,
): FlashcardMarketPack[] {
  return catalog
    .filter((p) => !!p?.isCommunityUgc && !isLocalAuthorPackId(p.id))
    .sort((a, b) => {
      const likes = (b.likesCount ?? 0) - (a.likesCount ?? 0);
      if (likes !== 0) return likes;
      const added = (b.addedCount ?? 0) - (a.addedCount ?? 0);
      if (added !== 0) return added;
      return String(a.id).localeCompare(String(b.id));
    })
    .slice(0, Math.max(0, limit));
}



function CommunityHighlightRow({ pack, lang, owned, opening, disabled, onOpen }: {
  pack: FlashcardMarketPack;
  lang: Lang;
  owned: boolean;
  opening: boolean;
  disabled: boolean;
  onOpen: (pack: FlashcardMarketPack) => void;
}) {
  const { theme, liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const socialTheme = useMemo(() => ({
    ...theme,
    textSecond: g.secondary,
    textMuted: g.secondary,
    accent: g.lightTint,
  }), [theme, g.secondary, g.lightTint]);
  const authorName = useCommunityAuthorName(pack, lang);
  const title = packTitleForInterface(pack, lang) || pack.codeName || pack.id;
  const activate = () => {
    if (disabled) return;
    void hapticTap();
    onOpen(pack);
  };
  return (
    <Pressable
      testID={`saved-top-pack-${pack.id}`}
      accessible={false}
      disabled={disabled}
      onPress={activate}
      style={({ pressed }) => [styles.highlightRow, pressed && { opacity: 0.82 }]}
    >
      <View
        testID={`saved-top-pack-activation-${pack.id}`}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${authorName}`}
        accessibilityState={{ disabled, busy: opening }}
        accessibilityActions={[{ name: 'activate' }]}
        onAccessibilityTap={activate}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === 'activate') activate();
        }}
      >
        <View
          testID={`saved-top-pack-cover-${pack.id}`}
          style={[styles.cover, { backgroundColor: g.opaqueCard, borderColor: g.glassEdge }]}
        >
          <Ionicons
            name={communityPackIconName(pack.category)}
            size={30}
            color={g.secondary}
          />
          {pack.cardCount > 0 ? <View testID={`saved-top-pack-count-${pack.id}`} style={[styles.highlightBadge, { backgroundColor: g.sheet }]}><Text style={[styles.highlightBadgeText, { color: g.text }]}>{pack.cardCount}</Text></View> : null}
          {opening ? <ActivityIndicator size="small" color={g.cta} style={styles.opening} /> : null}
          {owned ? <Ionicons name="checkmark-circle" size={16} color={g.lightTint} style={styles.owned} /> : null}
        </View>
        <FlowText testID={`saved-top-pack-title-${pack.id}`} provenance="user" style={[styles.highlightTitle, { color: g.text }]}>{title}</FlowText>
        <FlowText testID={`saved-top-pack-author-${pack.id}`} provenance="user" style={[styles.highlightAuthor, { color: g.secondary }]}>{authorName}</FlowText>
      </View>
      <View style={styles.highlightCounts}>
        <CommunityPackSocialBar pack={pack} lang={lang} t={socialTheme} owned={owned} variant="tile" />
      </View>
    </Pressable>
  );
}

const SILENT_RETRY_MS = 20_000;
const SILENT_RETRY_MAX = 5;

/** зачем (владелец 01.10): пустой каталог не показывает ошибку и кнопку «Повторить» — докачиваем молча, до 5 раз по 20 с. */
function useSilentCatalogRetry(empty: boolean, loading: boolean, onRetry?: () => void) {
  const attempts = useRef(0);
  useEffect(() => {
    if (!empty) { attempts.current = 0; return undefined; }
    if (!onRetry) { console.warn('[FC-DECKS] top community: тихий повтор пропущен — нет onRetry'); return undefined; }
    if (loading) return undefined; // идёт обычная загрузка, не дублируем
    if (attempts.current >= SILENT_RETRY_MAX) {
      console.warn('[FC-DECKS] top community: лимит тихих повторов исчерпан', { attempts: attempts.current });
      return undefined;
    }
    const timer = setTimeout(() => {
      attempts.current += 1;
      console.warn('[FC-DECKS] top community: тихий повтор каталога', { attempt: attempts.current });
      onRetry();
    }, SILENT_RETRY_MS);
    return () => clearTimeout(timer);
  }, [empty, loading, onRetry]);
}

export type SavedTopCommunityPacksProps = {
  /** Полный каталог экрана: сообщество отбирается внутри. */
  catalog: readonly FlashcardMarketPack[];
  /** Идентификаторы уже добавленных наборов сообщества. */
  ownedCommunityPackIds: readonly string[];
  lang: Lang;
  /** Ширина контента экрана (уже без внешних отступов). */
  contentWidth: number;
  /** Открыть набор в режиме просмотра. */
  onOpenPreview: (pack: FlashcardMarketPack) => void;
  /** Open the full community catalog from the approved hub heading. */
  onSeeAll?: () => void;
  /** id набора, который сейчас открывается (крутилка на плитке). */
  openingPackId?: string | null;
  /** Каталог ещё загружается; повторные попытки не стартуют, пока идёт загрузка. */
  loading?: boolean;
  /** Тихий повтор загрузки при пустом каталоге (без кнопок и текстов). */
  onRetry?: () => void;
};

export default function SavedTopCommunityPacks({
  catalog,
  ownedCommunityPackIds,
  lang,
  contentWidth,
  onOpenPreview,
  onSeeAll,
  openingPackId = null,
  loading = false,
  onRetry,
}: SavedTopCommunityPacksProps) {
  useSilentCatalogRetry(catalog.length === 0, loading, onRetry);
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const top = useMemo(() => pickTopCommunityPacks(catalog, SHOWN), [catalog]);
  const ownedSet = useMemo(() => new Set(ownedCommunityPackIds), [ownedCommunityPackIds]);

  const heading = triLang(lang, {
    ru: 'Популярное в сообществе',
    uk: 'Найкраще у спільноти',
    en: 'Top from the community',
    es: 'Lo mejor de la comunidad',
    'pt-BR': 'O melhor da comunidade',
    vi: 'Hay nhất từ cộng đồng',
    id: 'Terbaik dari komunitas',
    tr: "Topluluğun en iyileri",
    pl: 'Najlepsze od społeczności',
  });
  const seeAllLabel = triLang(lang, {
    ru: 'Все', uk: 'Усі', en: 'All', es: 'Todos',
    'pt-BR': 'Ver tudo', vi: 'Xem tất cả', id: 'Lihat semua', tr: 'Tümünü gör', pl: 'Zobacz wszystkie',
  });
  return (
    /* зачем: витрина не должна липнуть к полю поиска — воздух сверху обязателен. */
    <View testID="saved-top-community-section" style={{ width: contentWidth, alignSelf: 'center' }}>
      <View testID="saved-top-community-heading-row" style={styles.sectionHeading}>
        <FlowText testID="saved-top-community-heading" provenance="authored" accessibilityRole="header" style={[styles.sectionTitle, { color: g.text }]}>{heading}</FlowText>
        {onSeeAll ? (
          <Pressable testID="fc-cards-hub-see-all" accessibilityRole="button" accessibilityLabel={seeAllLabel} onPress={onSeeAll} style={styles.seeAll}>
            <Text style={[styles.seeAllText, { color: g.secondary }]}>{seeAllLabel}</Text><Ionicons name="chevron-forward" size={16} color={g.secondary} />
          </Pressable>
        ) : null}
      </View>

      {top.length > 0 ? (
        <ScrollView testID="saved-top-community-rail" horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {top.map((pack) => (
            <CommunityHighlightRow
              key={`saved_top_${pack.id}`}
              pack={pack}
              lang={lang}
              owned={ownedSet.has(pack.id)}
              opening={openingPackId === pack.id}
              disabled={openingPackId !== null && openingPackId !== pack.id}
              onOpen={onOpenPreview}
            />
          ))}
        </ScrollView>
      ) : (
        /* зачем (владелец 01.10): ни «Загружаем…», ни «Наборы сообщества недоступны», ни «Повторить» —
           пока в каталоге пусто, секция показывает скелетон ТОЙ ЖЕ геометрии (без текста и крутилки),
           а повторные попытки идут молча (см. useSilentCatalogRetry). */
        <View style={styles.rail}>
          {Array.from({ length: COLS }, (_, index) => (
            <View
              key={`saved-top-pack-loading-${index}`}
              testID={`saved-top-pack-loading-${index}`}
              style={styles.highlightRow}
            >
              <View
                testID={`saved-top-pack-loading-cover-${index}`}
                style={[styles.cover, { backgroundColor: g.opaqueCard, borderColor: g.glassEdge }]}
              />
              <View testID={`saved-top-pack-loading-title-${index}`} style={[styles.loadingTitle, { backgroundColor: g.opaqueControl }]} />
              <View testID={`saved-top-pack-loading-author-${index}`} style={[styles.loadingAuthor, { backgroundColor: g.opaqueControl }]} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeading: { minHeight: 44, marginTop: 20.5, marginBottom: 2.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  sectionTitle: { flex: 1, minWidth: 0, flexShrink: 1, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  seeAll: { minHeight: 44, maxWidth: '42%', minWidth: 44, flexShrink: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  seeAllText: { minWidth: 0, flexShrink: 1, fontSize: 12, lineHeight: 16, fontWeight: '600', textAlign: 'right' },
  rail: { flexDirection: 'row', gap: 10, paddingBottom: 4 },
  highlightRow: { width: 112 },
  cover: { width: 112, height: 112, borderRadius: 12, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  opening: { position: 'absolute', alignSelf: 'center' },
  owned: { position: 'absolute', left: 7, top: 7 },
  highlightTitle: { fontSize: 12, lineHeight: 16, fontWeight: '700', marginTop: 5 },
  highlightAuthor: { fontSize: 10, lineHeight: 13, marginTop: 1 },
  highlightCounts: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  highlightBadge: { position: 'absolute', right: 3, top: 3, minWidth: 26, minHeight: 19, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2, alignItems: 'center', justifyContent: 'center' },
  highlightBadgeText: { fontSize: 10, fontWeight: '700' },
  loadingTitle: { width: '80%', height: 12, borderRadius: 6, marginTop: 5 },
  loadingAuthor: { width: '60%', height: 10, borderRadius: 5, marginTop: 1 },
});
