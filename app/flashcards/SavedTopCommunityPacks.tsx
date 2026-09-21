/**
 * Витрина «Лучшие наборы сообщества» — плитки в горизонтальном ряду НАД списком
 * сохранённых карточек (задание владельца 2026-08-29, расширено 2026-09-17:
 * было жёстко 3 в ряд без скролла — владелец попросил показывать до 10 и
 * скроллить горизонтально, а не резать витрину тремя лучшими).
 *
 * зачем: раздел «Карточки» открывался сразу на сохранённых, и наборы сообщества
 * жили на отдельной вкладке — человек, у которого ещё пусто, просто не знал, что
 * брать. Теперь до десяти самых залайканных наборов видно сразу (меньше, если в
 * каталоге меньше) в одном скроллящемся ряду; тап по плитке открывает набор для
 * просмотра. Размер плитки НЕ меняется от их количества — она держит тот же
 * размер, что раньше был при трёх в ряд (ширина/COLS), просто ряд теперь длиннее
 * ширины экрана и скроллится, как категории в FlashcardsCategoryBar.
 *
 * Раздел «Наборы сообщества» этой правкой НЕ затронут — там всё как было.
 *
 * Стоимость Firebase: НОЛЬ дополнительных чтений. Наборы берём из
 * `marketPackCatalog`, который экран сохранённых уже грузит в `useCollectionData`
 * (`loadPublishedCommunityMarketPacks`), а счётчики — из тех же документов.
 * Членство (`pack_likes`/`pack_adds`) плитки не читают: `variant="tile"` у
 * `CommunityPackSocialBar` это явно запрещает.
 *
 * Решения владельца по этому блоку:
 *   • три плитки в ряд, ровно как в каталоге — знакомая геометрия;
 *   • уже добавленные НЕ прячем: показываем с галочкой «в моих наборах»;
 *   • тап по плитке открывает набор в режиме просмотра (как в каталоге);
 *   • медленная сеть не должна выглядеть как исчезнувший блок: место витрины
 *     резервируется, а после пустого ответа доступна явная повторная загрузка.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import type { Theme } from '../../constants/theme';
import { triLang, type Lang } from '../../constants/i18n';
import { useTheme } from '../../components/ThemeContext';
import { AdaptiveLabel } from '../../components/text-integrity/AdaptiveLabel';
import { hapticTap } from '../../hooks/use-haptics';
import { getEffectivePlatformOS } from '../platform_ui_preview';
import {
  packCategoryIonIcon,
  packTitleForInterface,
  type FlashcardMarketPack,
} from './marketplace';
import { bundledPackTilePng, packTileImageForPack } from './packMarketplaceIcons';
import { useCommunityAuthorName } from '../community_packs/packAuthorNames';
import CommunityPackSocialBar from '../community_packs/CommunityPackSocialBar';
import { isLocalAuthorPackId } from '../community_packs/localAuthorPacks';

/** Сколько плиток помещается БЕЗ скролла — задаёт размер одной плитки (как раньше). */
const COLS = 3;
/** Сколько лучших наборов показываем всего — витрина теперь скроллится горизонтально. */
const SHOWN = 10;
const GAP = 10;
const TILE_RADIUS = 18;
/** Пропорция PNG-«веера» наборов: `contain` должен вписывать по высоте бокса. */
const PACK_FAN_ASPECT = 329 / 268;
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
 * Тень вместо обводки (правило владельца: контейнеры без рамок).
 * Добавленный набор подсвечен акцентной тенью — тон, а не бордер.
 */
function tileShadow(t: Theme, owned: boolean): ViewStyle {
  const os = getEffectivePlatformOS();
  if (os === 'web') return {};
  if (os === 'android') return { elevation: owned ? 4 : 3 };
  return owned
    ? { shadowColor: t.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.14, shadowRadius: 9 }
    : { shadowColor: t.cardShadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 };
}

/**
 * Отбор витрины: наборы сообщества, отсортированные по лайкам ↓, затем по числу
 * добавивших людей ↓, затем по id (детерминированно — иначе порядок скакал бы
 * между заходами при равных счётчиках). Чистая функция, тестируется отдельно.
 */
export function pickTopCommunityPacks(
  catalog: readonly FlashcardMarketPack[],
  /* зачем: дефолт остаётся 3 — этой же функцией пользуется подсказка наборов
     на экране flashcards_training_setup.tsx, и там ряд НЕ скроллится (три
     плитки flex:1 в строку). Витрина карточек передаёт SHOWN явно. */
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

type TileProps = {
  pack: FlashcardMarketPack;
  lang: Lang;
  t: Theme;
  width: number;
  labelSize: number;
  owned: boolean;
  opening: boolean;
  disabled: boolean;
  onOpen: (pack: FlashcardMarketPack) => void;
};

function TopPackTileBase({
  pack, lang, t, width, labelSize, owned, opening, disabled, onOpen,
}: TileProps) {
  const authorName = useCommunityAuthorName(pack, lang);
  const title = packTitleForInterface(pack, lang) || pack.codeName || pack.id;
  const png = packTileImageForPack(pack) ?? bundledPackTilePng(pack.id);
  /* зачем (владелец 2026-09-21: «иконки маленькие, увеличь»): было 68% плитки,
     и после `contain` по пропорции веера обложка терялась в пустом квадрате.
     92% — тот же масштаб, что в каталоге сообщества и «Моих наборах», при этом
     угловые бейджи (счётчик карт, галочка «в моих») остаются читаемыми. */
  const iconSize = Math.floor(width * 0.92);

  const [labelReflowed, setLabelReflowed] = useState(false);
  const onLabelReflow = useCallback(() => setLabelReflowed(true), []);
  const isOwned = owned;

  return (
    <View style={{ width, alignItems: 'center' }}>
      <TouchableOpacity
        testID={`saved-top-pack-${pack.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${title}. ${authorName}`}
        accessibilityState={{ disabled }}
        activeOpacity={0.85}
        disabled={disabled}
        onPress={() => {
          void hapticTap();
          onOpen(pack);
        }}
        style={[
          {
            width,
            height: width,
            borderRadius: TILE_RADIUS,
            backgroundColor: t.bgSurface,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          },
          tileShadow(t, isOwned),
        ]}
      >
        {png ? (
          <Image
            /* Обложка декоративна: название и автор уже озвучены меткой плитки. */
            accessible={false}
            source={png}
            style={{ width: iconSize * PACK_FAN_ASPECT, height: iconSize }}
            contentFit="contain"
          />
        ) : (
          <Ionicons
            name={(packCategoryIonIcon(pack.category) || 'albums-outline') as keyof typeof Ionicons.glyphMap}
            size={Math.round(iconSize * 0.62)}
            color={t.accent}
          />
        )}

        {opening ? (
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              { alignItems: 'center', justifyContent: 'center', backgroundColor: `${t.bgSurface}D9` },
            ]}
          >
            <ActivityIndicator color={t.accent} />
          </View>
        ) : null}

        {pack.cardCount > 0 ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', right: 5, bottom: 5,
              borderRadius: 9, paddingHorizontal: 6, paddingVertical: 1,
              backgroundColor: t.bgCard,
            }}
          >
            <Text style={{ fontSize: Math.max(10, Math.round(labelSize * 0.82)), fontWeight: '900', color: t.textSecond }}>
              {pack.cardCount}
            </Text>
          </View>
        ) : null}

        {isOwned ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute', right: 5, top: 5,
              borderRadius: 999, padding: 3,
              backgroundColor: `${t.accent}26`,
            }}
          >
            <Ionicons name="checkmark" size={11} color={t.accent} />
          </View>
        ) : null}
      </TouchableOpacity>

      <AdaptiveLabel
        testID={`saved-top-pack-title-${pack.id}`}
        provenance="user"
        availableWidth={width}
        compactLineLimit={2}
        onReflowNeeded={onLabelReflow}
        style={{
          marginTop: 8,
          fontSize: labelReflowed ? Math.max(11, Math.round((labelSize + 1) * 0.82)) : labelSize + 1,
          fontWeight: '800', color: t.textPrimary, textAlign: 'center',
          lineHeight: labelReflowed ? Math.max(15, Math.round((labelSize + 4) * 0.86)) : labelSize + 4,
        }}
      >
        {title}
      </AdaptiveLabel>
      <AdaptiveLabel
        testID={`saved-top-pack-author-${pack.id}`}
        provenance="user"
        availableWidth={width}
        compactLineLimit={1}
        onReflowNeeded={onLabelReflow}
        style={{
          marginTop: 2, fontSize: Math.max(10, labelSize - 1), fontWeight: '700',
          color: t.textSecond, textAlign: 'center', lineHeight: labelSize + 3,
        }}
      >
        {authorName}
      </AdaptiveLabel>

      {/* Лайки и добавления — тем же компонентом, что в каталоге (0 чтений на плитке). */}
      <View style={{ marginTop: 5 }}>
        <CommunityPackSocialBar pack={pack} lang={lang} t={t} owned={isOwned} variant="tile" />
      </View>

    </View>
  );
}

/**
 * зачем (скорость): блок живёт в шапке FlatList сохранённых, а она перерисовывается
 * на КАЖДЫЙ ввод буквы в поиск и на каждое удаление карточки. Сравниваем по
 * существу: `onOpen` — стрелка родителя, при поверхностном сравнении
 * memo не дал бы ничего.
 */
const TopPackTile = React.memo(TopPackTileBase, (prev, next) => (
  prev.pack === next.pack
  && prev.lang === next.lang
  && prev.t === next.t
  && prev.width === next.width
  && prev.labelSize === next.labelSize
  && prev.owned === next.owned
  && prev.opening === next.opening
  && prev.disabled === next.disabled
));

export type SavedTopCommunityPacksProps = {
  /** Полный каталог экрана: сообщество отбирается внутри. */
  catalog: readonly FlashcardMarketPack[];
  /** Идентификаторы уже добавленных наборов сообщества. */
  ownedCommunityPackIds: readonly string[];
  lang: Lang;
  t: Theme;
  /** Ширина контента экрана (уже без внешних отступов). */
  contentWidth: number;
  /** Открыть набор в режиме просмотра. */
  onOpenPreview: (pack: FlashcardMarketPack) => void;
  /** id набора, который сейчас открывается (крутилка на плитке). */
  openingPackId?: string | null;
  /** Каталог ещё загружается; витрина резервирует место, чтобы экран не прыгал. */
  loading?: boolean;
  /** Повторить загрузку после пустого/недоступного ответа. */
  onRetry?: () => void;
};

export default function SavedTopCommunityPacks({
  catalog,
  ownedCommunityPackIds,
  lang,
  t,
  contentWidth,
  onOpenPreview,
  openingPackId = null,
  loading = false,
  onRetry,
}: SavedTopCommunityPacksProps) {
  const { f } = useTheme();
  const [headingReflowed, setHeadingReflowed] = useState(false);
  const onHeadingReflow = useCallback(() => setHeadingReflowed(true), []);
  const top = useMemo(() => pickTopCommunityPacks(catalog, SHOWN), [catalog]);
  const ownedSet = useMemo(() => new Set(ownedCommunityPackIds), [ownedCommunityPackIds]);

  const tileW = useMemo(
    () => Math.max(72, Math.floor((contentWidth - GAP * (COLS - 1)) / COLS)),
    [contentWidth],
  );
  const labelSize = Math.max(11, Math.min(f.caption, Math.floor(tileW * 0.13)));

  const heading = triLang(lang, {
    ru: 'Лучшее у сообщества',
    uk: 'Найкраще у спільноти',
    en: 'Top from the community',
    es: 'Lo mejor de la comunidad',
    'pt-BR': 'O melhor da comunidade',
    vi: 'Hay nhất từ cộng đồng',
    id: 'Terbaik dari komunitas',
    tr: "Topluluğun en iyileri",
    pl: 'Najlepsze od społeczności',
  });
  const loadingLabel = triLang(lang, {
    ru: 'Загружаем лучшие наборы', uk: 'Завантажуємо найкращі набори', en: 'Loading top packs',
    es: 'Cargando los mejores packs', 'pt-BR': 'Carregando os melhores pacotes',
    vi: 'Đang tải các bộ thẻ hay nhất', id: 'Memuat paket terbaik', tr: 'En iyi paketler yükleniyor',
    pl: 'Ładowanie najlepszych zestawów',
  });
  const unavailableLabel = triLang(lang, {
    ru: 'Наборы сообщества пока недоступны', uk: 'Набори спільноти поки недоступні',
    en: 'Community packs are unavailable right now', es: 'Los packs de la comunidad no están disponibles ahora',
    'pt-BR': 'Os pacotes da comunidade estão indisponíveis agora', vi: 'Các bộ thẻ cộng đồng hiện chưa khả dụng',
    id: 'Paket komunitas sedang tidak tersedia', tr: 'Topluluk paketleri şu anda kullanılamıyor',
    pl: 'Zestawy społeczności są teraz niedostępne',
  });
  const retryLabel = triLang(lang, {
    ru: 'Повторить', uk: 'Повторити', en: 'Retry', es: 'Reintentar', 'pt-BR': 'Tentar novamente',
    vi: 'Thử lại', id: 'Coba lagi', tr: 'Yeniden dene', pl: 'Spróbuj ponownie',
  });

  return (
    /* зачем: витрина не должна липнуть к полю поиска — воздух сверху обязателен. */
    <View style={{ width: contentWidth, alignSelf: 'center', marginTop: 10, marginBottom: 18 }}>
      <AdaptiveLabel
        testID="saved-top-community-heading"
        provenance="authored"
        availableWidth={contentWidth}
        compactLineLimit={1}
        onReflowNeeded={onHeadingReflow}
        style={{
          fontSize: headingReflowed ? Math.max(f.bodyLg, Math.round(f.h2 * 0.86)) : f.h2,
          lineHeight: Math.round((headingReflowed ? Math.max(f.bodyLg, f.h2 * 0.86) : f.h2) * 1.25),
          fontWeight: '900',
          color: t.textPrimary,
          marginBottom: 12,
          letterSpacing: 0.1,
        }}
      >
        {heading}
      </AdaptiveLabel>

      {top.length > 0 ? (
        /* зачем: до 10 плиток не помещаются в ширину экрана — скроллим
           горизонтально тем же паттерном, что FlashcardsCategoryBar. Ширина
           плитки не меняется (та же геометрия, что раньше при трёх в ряд),
           отрицательные внешние отступы компенсируют паддинг ScrollView, чтобы
           первая/последняя плитка не съезжали относительно заголовка и списка снизу. */
        <ScrollView
          horizontal
          decelerationRate="fast"
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -GAP / 2 }}
          contentContainerStyle={{ paddingHorizontal: GAP / 2, gap: GAP }}
        >
          {top.map((pack) => (
          <TopPackTile
            key={`saved_top_${pack.id}`}
            pack={pack}
            lang={lang}
            t={t}
            width={tileW}
            labelSize={labelSize}
            owned={ownedSet.has(pack.id)}
            opening={openingPackId === pack.id}
            disabled={openingPackId !== null && openingPackId !== pack.id}
            onOpen={onOpenPreview}
          />
          ))}
        </ScrollView>
      ) : loading ? (
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={loadingLabel}
          style={{ flexDirection: 'row', gap: GAP }}
        >
          {Array.from({ length: COLS }, (_, index) => (
            <View
              key={`saved-top-pack-loading-${index}`}
              style={{
                width: tileW,
                minHeight: tileW + Math.max(108, Math.round(f.sub * 7)),
                borderRadius: TILE_RADIUS,
                backgroundColor: t.bgSurface,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {index === 1 ? <ActivityIndicator color={t.accent} /> : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ minHeight: 112, borderRadius: 18, padding: 16, backgroundColor: t.bgSurface, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text style={{ color: t.textSecond, fontSize: f.sub, lineHeight: Math.round(f.sub * 1.4), fontWeight: '700', textAlign: 'center' }}>
            {unavailableLabel}
          </Text>
          {onRetry ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={retryLabel}
              onPress={onRetry}
              style={({ pressed }) => ({
                minHeight: 48,
                minWidth: 120,
                borderRadius: 14,
                paddingHorizontal: 18,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: t.accent,
                opacity: pressed ? 0.82 : 1,
              })}
            >
              <Text style={{ color: t.correctText, fontSize: f.body, fontWeight: '900' }}>{retryLabel}</Text>
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
