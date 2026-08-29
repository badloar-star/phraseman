/**
 * Витрина «Лучшие наборы сообщества» — три плитки в ряд НАД списком сохранённых
 * карточек (задание владельца 2026-08-29).
 *
 * зачем: раздел «Карточки» открывался сразу на сохранённых, и наборы сообщества
 * жили на отдельной вкладке — человек, у которого ещё пусто, просто не знал, что
 * брать. Теперь три самых залайканных набора видно сразу, и добавить их можно
 * одним нажатием, не уходя с экрана.
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
 *   • НЕТ данных — НЕТ блока: ни скелетона, ни заглушки, ни пустой полосы.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import type { Theme } from '../../constants/theme';
import { triLang, type Lang } from '../../constants/i18n';
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
import { addCommunityPackToLibrary } from '../community_packs/communityPackActions';
import type { RuntimeStudyTarget } from '../target_storage_keys';

/** Три в ряд — та же сетка, что в каталоге сообщества. */
const COLS = 3;
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
  limit = COLS,
): FlashcardMarketPack[] {
  return catalog
    .filter((p) => !!p?.isCommunityUgc && p.listingStatus !== 'local_only')
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
  studyTarget?: RuntimeStudyTarget;
  onOpen: (pack: FlashcardMarketPack) => void;
  onAdded: (packId: string) => void;
};

function TopPackTileBase({
  pack, lang, t, width, labelSize, owned, opening, disabled, studyTarget, onOpen, onAdded,
}: TileProps) {
  const authorName = useCommunityAuthorName(pack, lang);
  const title = packTitleForInterface(pack, lang) || pack.codeName || pack.id;
  const png = packTileImageForPack(pack) ?? bundledPackTilePng(pack.id);
  const iconSize = Math.floor(width * 0.68);

  /**
   * Optimistic UI: галочка «в моих наборах» появляется в ТОТ ЖЕ кадр, до ответа
   * сервера. `addCommunityPackToLibrary` пишет владение локально и лишь потом
   * догоняет счётчик — поэтому откат тут нужен только на настоящий отказ.
   */
  const [addedLocally, setAddedLocally] = useState(false);
  /** Защита от двойного тапа: пока идёт запись, повторное нажатие игнорируем. */
  const addBusyRef = useRef(false);
  const isOwned = owned || addedLocally;

  const onAddPress = useCallback(() => {
    if (isOwned || addBusyRef.current) return;
    addBusyRef.current = true;
    void hapticTap();
    setAddedLocally(true);
    void (async () => {
      try {
        const res = await addCommunityPackToLibrary(pack, studyTarget);
        if (res === 'added' || res === 'already_added') {
          onAdded(pack.id);
          return;
        }
        /** Набор недоступен — честно возвращаем кнопку, тост показывает вызванный код. */
        setAddedLocally(false);
      } catch {
        setAddedLocally(false);
      } finally {
        addBusyRef.current = false;
      }
    })();
  }, [isOwned, pack, studyTarget, onAdded]);

  const addLabel = triLang(lang, {
    ru: 'Добавить', uk: 'Додати', en: 'Add', es: 'Añadir',
    'pt-BR': 'Adicionar', vi: 'Thêm', id: 'Tambah', tr: 'Ekle', pl: 'Dodaj',
  });
  const ownedLabel = triLang(lang, {
    ru: 'В моих', uk: 'У моїх', en: 'Added', es: 'Añadido',
    'pt-BR': 'Adicionado', vi: 'Đã thêm', id: 'Ditambahkan', tr: 'Eklendi', pl: 'Dodano',
  });

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
            <Text style={{ fontSize: 9, fontWeight: '800', color: t.textSecond }}>{pack.cardCount}</Text>
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

      <Text
        style={{
          marginTop: 7, fontSize: labelSize + 1, fontWeight: '700',
          color: t.textPrimary, textAlign: 'center', lineHeight: labelSize + 4,
        }}
        numberOfLines={2}
      >
        {title}
      </Text>
      <Text
        style={{
          marginTop: 2, fontSize: Math.max(8, labelSize - 1), fontWeight: '600',
          color: t.textMuted, textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {authorName}
      </Text>

      {/* Лайки и добавления — тем же компонентом, что в каталоге (0 чтений на плитке). */}
      <View style={{ marginTop: 5 }}>
        <CommunityPackSocialBar pack={pack} lang={lang} t={t} owned={isOwned} variant="tile" />
      </View>

      {/*
        Главное в этом блоке: добавить не уходя с экрана. Кнопка живёт под
        плиткой отдельной мишенью — тап по самой плитке открывает просмотр,
        и эти два действия не должны спорить за одну область.
      */}
      <TouchableOpacity
        testID={`saved-top-pack-add-${pack.id}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: isOwned }}
        accessibilityLabel={`${isOwned ? ownedLabel : addLabel}: ${title}`}
        activeOpacity={0.85}
        disabled={isOwned}
        onPress={onAddPress}
        hitSlop={{ top: 6, bottom: 8, left: 8, right: 8 }}
        style={{
          marginTop: 6,
          minHeight: 28,
          width: '100%',
          borderRadius: 999,
          paddingHorizontal: 8,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: isOwned ? `${t.accent}1F` : t.accent,
        }}
      >
        <Text
          numberOfLines={1}
          style={{
            fontSize: Math.max(9, labelSize),
            fontWeight: '800',
            color: isOwned ? t.accent : t.bgPrimary,
          }}
        >
          {isOwned ? ownedLabel : addLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * зачем (скорость): блок живёт в шапке FlatList сохранённых, а она перерисовывается
 * на КАЖДЫЙ ввод буквы в поиск и на каждое удаление карточки. Сравниваем по
 * существу: `onOpen`/`onAdded` — стрелки родителя, при поверхностном сравнении
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
  && prev.studyTarget === next.studyTarget
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
  studyTarget?: RuntimeStudyTarget;
  /** Открыть набор в режиме просмотра. */
  onOpenPreview: (pack: FlashcardMarketPack) => void;
  /** Набор добавлен — экрану пора перечитать свои карточки. */
  onAdded: (packId: string) => void;
  /** id набора, который сейчас открывается (крутилка на плитке). */
  openingPackId?: string | null;
};

/**
 * НЕТ ДАННЫХ — НЕТ БЛОКА. Никакого скелетона и никакой пустой полосы: пока
 * каталог не пришёл, шапка списка просто отсутствует, и первый кадр сохранённых
 * карточек не сдвигается вниз впустую.
 */
export default function SavedTopCommunityPacks({
  catalog,
  ownedCommunityPackIds,
  lang,
  t,
  contentWidth,
  studyTarget,
  onOpenPreview,
  onAdded,
  openingPackId = null,
}: SavedTopCommunityPacksProps) {
  const top = useMemo(() => pickTopCommunityPacks(catalog), [catalog]);
  const ownedSet = useMemo(() => new Set(ownedCommunityPackIds), [ownedCommunityPackIds]);

  const tileW = useMemo(
    () => Math.max(72, Math.floor((contentWidth - GAP * (COLS - 1)) / COLS)),
    [contentWidth],
  );
  const labelSize = Math.max(9, Math.min(11, Math.floor(tileW * 0.11)));

  if (top.length === 0) return null;

  return (
    <View style={{ width: contentWidth, alignSelf: 'center', marginBottom: 18 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '800',
          color: t.textSecond,
          marginBottom: 10,
          letterSpacing: 0.2,
        }}
        numberOfLines={1}
      >
        {triLang(lang, {
          ru: 'Лучшее у сообщества',
          uk: 'Найкраще у спільноти',
          en: 'Top from the community',
          es: 'Lo mejor de la comunidad',
          'pt-BR': 'O melhor da comunidade',
          vi: 'Hay nhất từ cộng đồng',
          id: 'Terbaik dari komunitas',
          tr: "Topluluğun en iyileri",
          pl: 'Najlepsze od społeczności',
        })}
      </Text>

      <View style={{ flexDirection: 'row', gap: GAP }}>
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
            studyTarget={studyTarget}
            onOpen={onOpenPreview}
            onAdded={onAdded}
          />
        ))}
      </View>
    </View>
  );
}
