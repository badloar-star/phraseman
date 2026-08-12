/**
 * cards-2.0 (E11): шапка коллекции (§3.2) — назад/заголовок, DEV-бейдж,
 * переключатель «Список / Колода», кнопка фильтра и строка поиска.
 * Вынесена из монолита flashcards_collection.tsx; состояние остаётся у контейнера.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Platform, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { triLang, type Lang } from '../../constants/i18n';
import type { Theme } from '../../constants/theme';
import { CATEGORIES } from './constants';
import type { CategoryId } from './types';
import { packTitleForInterface, type FlashcardMarketPack } from './marketplace';
import type { FcCollectionViewMode } from './collection_view_prefs';
import type { FilterGroup } from './selectors';

type Props = {
  t: Theme;
  f: Record<string, number>;
  lang: Lang;
  activeCat: CategoryId;
  packDeeplink: string | null;
  marketPackCatalog: FlashcardMarketPack[];
  fallbackTitle: string;
  onBack: () => void;
  isDevMarketEnabled: boolean;
  onOpenDevMarket: () => void;
  /** Переключатель «Список / Колода» — скрыт на пустой коллекции. */
  showViewToggle: boolean;
  viewMode: FcCollectionViewMode;
  onToggleViewMode: () => void;
  filterGroups: FilterGroup[];
  filterOptions: { key: string; label: string }[];
  activeFilter: string;
  filterOpen: boolean;
  onToggleFilterOpen: () => void;
  /** Строка поиска (debounce у контейнера) — скрыта на пустой коллекции без поиска. */
  showSearch: boolean;
  searchInput: string;
  searchActive: boolean;
  onSearchInput: (v: string) => void;
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
  isDevMarketEnabled,
  onOpenDevMarket,
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
}: Props) {
  const { width: screenW } = useWindowDimensions();
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

  const headerTitle = useMemo(() => {
    if (packDeeplink && marketPackCatalog.length > 0) {
      const p = marketPackCatalog.find((x) => x.id === packDeeplink);
      if (p) return packTitleForInterface(p, lang);
    }
    const cat = CATEGORIES.find((c) => c.id === activeCat);
    const full =
      cat == null
        ? undefined
        : lang === 'uk'
          ? cat.fullLabelUK
          : lang === 'es'
            ? cat.fullLabelES
            : cat.fullLabelRU;
    return full ?? fallbackTitle;
  }, [packDeeplink, marketPackCatalog, lang, activeCat, fallbackTitle]);

  const filterLabel = triLang(lang, { ru: 'Фильтр', uk: 'Фільтр', es: 'Filtro' });

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
          adjustsFontSizeToFit
          minimumFontScale={0.48}
          maxFontSizeMultiplier={1.2}
        >
          {headerTitle}
        </Text>
        <View style={{ flexDirection:'row', justifyContent:'flex-end', alignItems:'center', gap: 8, flexShrink: 0 }}>
          {isDevMarketEnabled && (
            <TouchableOpacity
              onPress={onOpenDevMarket}
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
          )}
          {/* E11: переключатель «Список / Колода» (персист fc_collection_view_v1) */}
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

      {/* E11: поиск (debounce 200мс у контейнера) — все вкладки, включая custom и паки */}
      {showSearch && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginHorizontal: 16,
            marginTop: 8,
            paddingHorizontal: 12,
            borderRadius: 12,
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
            placeholder={triLang(lang, { ru: 'Поиск по карточкам', uk: 'Пошук по картках', es: 'Buscar tarjetas' })}
            placeholderTextColor={t.textMuted}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            style={{ flex: 1, paddingVertical: Platform.OS === 'web' ? 9 : 8, color: t.textPrimary, fontSize: f.sub }}
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

/** DEV-«магазин наборов» FAB (absolute) — рендерится контейнером поверх контента. */
export function DevMarketFab({
  t,
  f,
  bottomOffset,
  onPress,
}: {
  t: Theme;
  f: Record<string, number>;
  bottomOffset: number;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        position: 'absolute',
        right: 14,
        bottom: bottomOffset,
        zIndex: 60,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: `${t.accent}66`,
        backgroundColor: `${t.accent}1F`,
        paddingHorizontal: 10,
        paddingVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <Ionicons name="storefront-outline" size={14} color={t.accent} />
      <Text style={{ fontSize: f.caption, color: t.accent, fontWeight: '800' }}>DEV MARKET</Text>
    </TouchableOpacity>
  );
}
