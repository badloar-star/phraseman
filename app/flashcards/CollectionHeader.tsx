/**
 * cards-2.0 (E11): шапка коллекции (§3.2) — назад/заголовок,
 * переключатель «Список / Набор», кнопка фильтра и строка поиска.
 * Вынесена из монолита flashcards_collection.tsx; состояние остаётся у контейнера.
 *
 * 2026-08-13 (владелец): входа в DEV-«магазин наборов» в разделе карточек больше нет.
 *
 * Замечания владельца после теста на iPhone:
 *   • на экране НАБОРА строки поиска по карточкам быть не должно
 *     (в «Сохранённых» поиск остаётся) — контейнер шлёт `showSearch={false}`;
 *   • «Слушать» и «Тренировать» переехали СЮДА, наверх, компактными
 *     иконками без подписей (раньше — широкие кнопки с текстом внизу экрана);
 *   • у набора видно НИК автора, а не технический идентификатор;
 *   • своя (ещё не опубликованная) коллекция получает кнопку «Сделать публичным».
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useMemo } from 'react';
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { triLang, type Lang } from '../../constants/i18n';
import type { Theme } from '../../constants/theme';
import { CATEGORIES } from './constants';
import type { CategoryId } from './types';
import { packTitleForInterface, type FlashcardMarketPack } from './marketplace';
import { useCommunityAuthorName } from '../community_packs/packAuthorNames';
import type { FcCollectionViewMode } from './collection_view_prefs';
import type { FilterGroup } from './selectors';
import EnergyCostBadge from '../../components/EnergyCostBadge';

type Props = {
  t: Theme;
  f: Record<string, number>;
  lang: Lang;
  activeCat: CategoryId;
  packDeeplink: string | null;
  marketPackCatalog: FlashcardMarketPack[];
  fallbackTitle: string;
  onBack: () => void;
  /** Переключатель «Список / Набор» — скрыт на пустой коллекции. */
  showViewToggle: boolean;
  viewMode: FcCollectionViewMode;
  onToggleViewMode: () => void;
  filterGroups: FilterGroup[];
  filterOptions: { key: string; label: string }[];
  activeFilter: string;
  filterOpen: boolean;
  onToggleFilterOpen: () => void;
  /** Строка поиска (debounce у контейнера) — на экране набора не показывается. */
  showSearch: boolean;
  searchInput: string;
  searchActive: boolean;
  onSearchInput: (v: string) => void;
  /** Компактные иконки «Слушать» / «Тренировать» вверху (§ замечание владельца). */
  showModeButtons?: boolean;
  onListen?: () => void;
  onTrain?: () => void;
  /** «Сделать публичным» — только для своей ещё не опубликованной коллекции. */
  showPublish?: boolean;
  publishBusy?: boolean;
  onPublish?: () => void;
};

export default function CollectionHeader({
  t,
  f,
  lang,
  activeCat,
  packDeeplink,
  marketPackCatalog,
  fallbackTitle,
  onBack,
  showViewToggle,
  viewMode,
  onToggleViewMode,
  filterGroups,
  filterOptions,
  activeFilter,
  filterOpen,
  onToggleFilterOpen,
  showSearch,
  searchInput,
  searchActive,
  onSearchInput,
  showModeButtons = false,
  onListen,
  onTrain,
  showPublish = false,
  publishBusy = false,
  onPublish,
}: Props) {
  const { width: screenW } = useWindowDimensions();

  const currentPack = useMemo(
    () => (packDeeplink ? marketPackCatalog.find((x) => x.id === packDeeplink) ?? null : null),
    [packDeeplink, marketPackCatalog],
  );
  /** Ник автора набора; сырой идентификатор сюда не попадает никогда. */
  const authorName = useCommunityAuthorName(currentPack, lang);

  /**
   * Назва набору / категорії в шапці колекції — навмисно менша за звичайний h2 екрана,
   * щоб довгі UK-рядки (лапки, коми) вміщались без «Влучно, та м'…».
   */
  const titleFontSize = useMemo(() => {
    const base = f.h3;
    if (screenW <= 320) return Math.max(13, base - 2);
    if (screenW < 360) return Math.max(14, base - 1);
    if (screenW < 400) return Math.max(14, base);
    return base;
  }, [f.h3, screenW]);

  /**
   * Высота строки поиска: минимум 44pt (тап-таргет) и всегда больше строки текста
   * при крупном системном шрифте — иначе подсказка обрезается по высоте.
   */
  const searchFieldHeight = useMemo(() => Math.max(44, Math.round(f.sub * 2.6)), [f.sub]);

  const headerTitle = useMemo(() => {
    if (currentPack) return packTitleForInterface(currentPack, lang);
    const cat = CATEGORIES.find((c) => c.id === activeCat);
    // Плановые локали: полное имя категории на всех 8 языках интерфейса.
    const fullByLang: Record<Lang, string> | undefined =
      cat == null
        ? undefined
        : {
            ru: cat.fullLabelRU,
            uk: cat.fullLabelUK,
            es: cat.fullLabelES,
            'pt-BR': cat.fullLabelPtBr,
            vi: cat.fullLabelVi,
            id: cat.fullLabelId,
            tr: cat.fullLabelTr,
            pl: cat.fullLabelPl,
          };
    const full = fullByLang?.[lang];
    return full ?? fallbackTitle;
  }, [currentPack, lang, activeCat, fallbackTitle]);

  const filterLabel = triLang(lang, {
    ru: 'Фильтр', uk: 'Фільтр', es: 'Filtro',
    'pt-BR': 'Filtro', vi: 'Bộ lọc', id: 'Filter', tr: 'Filtre', pl: 'Filtr',
  });

  const listenA11yLabel = triLang(lang, {
    ru: 'Слушать', uk: 'Слухати', es: 'Escuchar',
    'pt-BR': 'Ouvir', vi: 'Nghe', id: 'Dengarkan', tr: 'Dinle', pl: 'Słuchaj',
  });
  const trainA11yLabel = triLang(lang, {
    ru: 'Тренировать', uk: 'Тренувати', es: 'Entrenar',
    'pt-BR': 'Treinar', vi: 'Luyện tập', id: 'Latih', tr: 'Çalış', pl: 'Trenuj',
  });
  const publishLabel = triLang(lang, {
    ru: 'Сделать публичным',
    uk: 'Зробити публічним',
    es: 'Hacer público',
    'pt-BR': 'Tornar público',
    vi: 'Công khai bộ thẻ',
    id: 'Jadikan publik',
    tr: 'Herkese açık yap',
    pl: 'Udostępnij publicznie',
  });

  /** Компактная иконочная кнопка режима — без подписи (§ замечание владельца). */
  const modeButton = (
    key: 'listen' | 'train',
    icon: 'headset-outline' | 'barbell-outline',
    a11y: string,
    onPress: (() => void) | undefined,
  ) => (
    <View style={{ width: 34, height: 34, position: 'relative', overflow: 'visible' }}>
    <TouchableOpacity
      testID={key === 'listen' ? 'fc-listen-deck' : 'fc-train-deck'}
      accessibilityLabel={key === 'listen' ? 'qa-fc-listen-deck' : 'qa-fc-train-deck'}
      accessibilityRole="button"
      accessibilityHint={a11y}
      accessible
      onPress={onPress}
      activeOpacity={0.85}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={{
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: key === 'train' ? t.accent : `${t.accent}66`,
        backgroundColor: key === 'train' ? t.accent : `${t.accent}14`,
      }}
    >
      <Ionicons name={icon} size={17} color={key === 'train' ? t.correctText : t.accent} />
    </TouchableOpacity>
      <EnergyCostBadge
        compact
        testID={key === 'listen'
          ? 'flashcards-collection-listen-energy-cost'
          : 'flashcards-collection-train-energy-cost'}
        style={{ right: -2 }}
      />
    </View>
  );

  return (
    <>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
          borderBottomWidth: 0.5, borderBottomColor: t.border,
        }}
      >
        <TouchableOpacity testID="flashcards-header-back" accessibilityLabel="qa-flashcards-header-back" accessible onPress={onBack} style={{ width: 40 }} hitSlop={{ top:12,bottom:12,left:12,right:12 }}>
          <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
        </TouchableOpacity>
        <Text
          style={{
            fontWeight: '700', letterSpacing: 0.2, color: t.textPrimary, fontSize: titleFontSize,
            flex: 1, minWidth: 0, textAlign: 'center', paddingHorizontal: 4,
          }}
          numberOfLines={1}
          maxFontSizeMultiplier={1.2}
        >
          {headerTitle}
        </Text>
        <View style={{ flexDirection:'row', justifyContent:'flex-end', alignItems:'center', gap: 8, flexShrink: 0 }}>
          {/* Режимы «Слушать» / «Тренировать» — компактно, только иконки */}
          {showModeButtons && modeButton('listen', 'headset-outline', listenA11yLabel, onListen)}
          {showModeButtons && modeButton('train', 'barbell-outline', trainA11yLabel, onTrain)}
          {/* E11: переключатель «Список / Набор» (персист fc_collection_view_v1) */}
          {showViewToggle && (
            <TouchableOpacity
              testID="fc-view-toggle"
              accessibilityLabel="qa-fc-view-toggle"
              accessible
              onPress={onToggleViewMode}
              hitSlop={{ top:8,bottom:8,left:8,right:8 }}
              style={{
                paddingHorizontal: 8,
                paddingVertical: 5,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: viewMode === 'deck' ? t.accent : t.border,
                backgroundColor: viewMode === 'deck' ? `${t.accent}18` : 'transparent',
              }}
            >
              <Ionicons
                name={viewMode === 'list' ? 'albums-outline' : 'list-outline'}
                size={15}
                color={viewMode === 'deck' ? t.accent : t.textSecond}
              />
            </TouchableOpacity>
          )}
          {/* E11: фильтр на всех вкладках, где есть группы источников */}
          {filterGroups.length > 0 && (
            <TouchableOpacity
              onPress={onToggleFilterOpen}
              hitSlop={{ top:8,bottom:8,left:8,right:8 }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 3,
                paddingHorizontal: 10, paddingVertical: 5,
                borderRadius: 12, borderWidth: 1,
                borderColor: activeFilter !== 'all' ? t.accent : t.border,
                backgroundColor: activeFilter !== 'all' ? t.accent + '18' : 'transparent',
              }}
            >
              <Ionicons name="filter-outline" size={12} color={activeFilter !== 'all' ? t.accent : t.textSecond} />
              <Text style={{ fontSize: f.caption, fontWeight: '600', color: activeFilter !== 'all' ? t.accent : t.textSecond }}>
                {activeFilter === 'all'
                  ? filterLabel
                  : (filterOptions.find(o => o.key === activeFilter)?.label ?? filterLabel)}
              </Text>
              <Ionicons name={filterOpen ? 'chevron-up' : 'chevron-down'} size={10} color={activeFilter !== 'all' ? t.accent : t.textSecond} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Ник автора набора — вместо технического идентификатора */}
      {currentPack?.isCommunityUgc ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 8 }}>
          <Ionicons name="person-circle-outline" size={15} color={t.textMuted} />
          <Text
            testID="fc-pack-author"
            accessibilityLabel="qa-fc-pack-author"
            style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }}
            numberOfLines={1}
          >
            {authorName}
          </Text>
        </View>
      ) : null}

      {/* «Сделать публичным» — своя ещё не опубликованная коллекция */}
      {showPublish ? (
        <TouchableOpacity
          testID="fc-pack-publish"
          accessibilityLabel="qa-fc-pack-publish"
          accessibilityRole="button"
          accessible
          disabled={publishBusy}
          onPress={onPublish}
          activeOpacity={0.85}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginHorizontal: 16,
            marginTop: 8,
            paddingVertical: 11,
            paddingHorizontal: 14,
            borderRadius: 14,
            borderWidth: 1.5,
            borderColor: t.accent,
            backgroundColor: `${t.accent}14`,
            opacity: publishBusy ? 0.6 : 1,
          }}
        >
          {publishBusy ? (
            <ActivityIndicator size="small" color={t.accent} />
          ) : (
            <Ionicons name="earth-outline" size={17} color={t.accent} />
          )}
          <Text style={{ color: t.accent, fontSize: f.sub, fontWeight: '800' }} numberOfLines={1}>
            {publishLabel}
          </Text>
        </TouchableOpacity>
      ) : null}

      {/* E11: поиск (debounce 200мс у контейнера). На экране набора не показывается. */}
      {showSearch && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginHorizontal: 16,
            marginTop: 8,
            paddingHorizontal: 12,
            paddingVertical: 0,
            height: searchFieldHeight,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: searchActive ? `${t.accent}88` : t.border,
            backgroundColor: t.bgSurface,
          }}
        >
          <Ionicons name="search-outline" size={16} color={searchActive ? t.accent : t.textMuted} />
          <TextInput
            testID="fc-search-input"
            accessibilityLabel="qa-fc-search-input"
            value={searchInput}
            onChangeText={onSearchInput}
            placeholder={triLang(lang, {
              ru: 'Поиск по карточкам', uk: 'Пошук по картках', es: 'Buscar tarjetas',
              'pt-BR': 'Buscar cartões', vi: 'Tìm thẻ', id: 'Cari kartu', tr: 'Kart ara', pl: 'Szukaj kart',
            })}
            placeholderTextColor={t.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            maxFontSizeMultiplier={1.2}
            /**
             * Вертикаль поля задаём ВЫСОТОЙ, а не paddingVertical: на iOS однострочный
             * TextInput = UITextField, он центрирует текст сам, а вертикальные паддинги
             * ужимали строку — у подсказки срезалась нижняя половина букв.
             */
            style={{
              flex: 1,
              height: searchFieldHeight - 2,
              paddingTop: 0,
              paddingBottom: 0,
              paddingVertical: 0,
              includeFontPadding: false,
              textAlignVertical: 'center',
              color: t.textPrimary,
              fontSize: f.sub,
            }}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity
              testID="fc-search-clear"
              accessibilityLabel="qa-fc-search-clear"
              accessible
              onPress={() => onSearchInput('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color={t.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </>
  );
}
