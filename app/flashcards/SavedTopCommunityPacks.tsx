/** Три лучшие реальные UGC-набора на хабе; каталог и доступ не меняются. */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { type ComponentProps, useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { triLang, type Lang } from '../../constants/i18n';
import { FlowText } from '../../components/text-integrity/FlowText';
import { useTheme } from '../../components/ThemeContext';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { plateBoxShadow } from '../../components/v2/ShadowSurface';
import { hapticTap } from '../../hooks/use-haptics';
import { useLoadGate } from '../use_load_gate';
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
          style={[styles.cover, { backgroundColor: g.opaqueCard, boxShadow: plateBoxShadow(g) }]}
        >
          <Ionicons
            name={communityPackIconName(pack.category)}
            size={30}
            color={g.secondary}
          />
          {pack.cardCount > 0 ? <View testID={`saved-top-pack-count-${pack.id}`} style={[styles.highlightBadge, { backgroundColor: g.sheet }]}><Text style={[styles.highlightBadgeText, { color: g.text }]}>{pack.cardCount}</Text></View> : null}
          {opening ? <ActivityIndicator size="small" color={g.accentText} style={styles.opening} /> : null}
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

/**
 * зачем (владелец 01.10 + D158 / PM-214): пустой каталог докачиваем молча, но не бесконечно — общий
 * useLoadGate (потолок 12 с, паузы 1/3/8 с), затем в секции «Сейчас недоступно» + «Попробовать снова».
 */
function useSilentCatalogRetry(empty: boolean, loading: boolean, onRetry?: () => void) {
  const noRetry = empty && !onRetry;
  useEffect(() => {
    if (noRetry) console.warn('[FC-DECKS] top community: тихий повтор пропущен — нет onRetry');
  }, [noRetry]);
  const retry = useCallback(() => {
    console.warn('[FC-DECKS] top community: тихий повтор каталога');
    onRetry?.();
  }, [onRetry]);
  return useLoadGate({
    id: 'fc-top-community',
    status: !empty ? 'ready' : loading ? 'loading' : 'error',
    retry,
    enabled: Boolean(onRetry),
  });
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
  const catalogGate = useSilentCatalogRetry(catalog.length === 0, loading, onRetry);
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
        <ScrollView testID="saved-top-community-rail" horizontal showsHorizontalScrollIndicator={false} style={styles.railClip} /* зачем (13.10): тень не режется рельсой на Android, см. railClip */ contentContainerStyle={styles.rail} decelerationRate="fast">
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
      ) : catalogGate.exhausted ? (
        <View testID="saved-top-community-unavailable" style={styles.unavailable}>
          <Text accessibilityRole="header" style={[styles.unavailableTitle, { color: g.text }]}>{triLang(lang, {
            ru: 'Сейчас недоступно', uk: 'Зараз недоступно', en: 'Not available right now', es: 'No disponible ahora',
            'pt-BR': 'Indisponível agora', vi: 'Hiện chưa khả dụng', id: 'Belum tersedia sekarang', tr: 'Şu anda kullanılamıyor', pl: 'Teraz niedostępne',
          })}</Text>
          <Pressable
            testID="saved-top-community-try-again"
            accessibilityRole="button"
            onPress={() => { hapticTap(); catalogGate.retryNow('tap'); }}
            style={({ pressed }) => [styles.unavailableAction, { backgroundColor: g.opaqueControl, opacity: pressed ? 0.8 : 1 }]}
          >
            <Text style={[styles.unavailableActionLabel, { color: g.text }]}>{triLang(lang, {
              ru: 'Попробовать снова', uk: 'Спробувати ще', en: 'Try again', es: 'Intentar de nuevo',
              'pt-BR': 'Tentar de novo', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie',
            })}</Text>
          </Pressable>
        </View>
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
                style={[styles.cover, { backgroundColor: g.opaqueCard, boxShadow: plateBoxShadow(g) }]}
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
  seeAllText: { minWidth: 0, flexShrink: 1, fontSize: 13, lineHeight: 17, fontWeight: '700', textAlign: 'right' },
  railClip: { marginTop: -8, marginBottom: -4 }, // сверху +8 запаса, снизу +8 вместо прежних 4 → место в раскладке то же
  rail: { flexDirection: 'row', gap: 10, paddingTop: 8, paddingBottom: 8 },
  // D158: та же высота, что у скелетона секции (обложка 112 + две строки) — экран не прыгает.
  unavailable: { minHeight: 144, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 4 },
  unavailableTitle: { fontSize: 16, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  unavailableAction: { minHeight: 44, paddingHorizontal: 20, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  unavailableActionLabel: { fontSize: 16, fontWeight: '600' },
  highlightRow: { width: 112 },
  cover: { width: 112, height: 112, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  opening: { position: 'absolute', alignSelf: 'center' },
  owned: { position: 'absolute', left: 7, top: 7 },
  highlightTitle: { fontSize: 13, lineHeight: 17, fontWeight: '700', marginTop: 5 },
  highlightAuthor: { fontSize: 13, lineHeight: 17, marginTop: 1 },
  highlightCounts: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  highlightBadge: { position: 'absolute', right: 3, top: 3, minWidth: 26, minHeight: 19, borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2, alignItems: 'center', justifyContent: 'center' },
  highlightBadgeText: { fontSize: 13, fontWeight: '700' },
  loadingTitle: { width: '80%', height: 12, borderRadius: 6, marginTop: 5 },
  loadingAuthor: { width: '60%', height: 10, borderRadius: 5, marginTop: 1 },
});
