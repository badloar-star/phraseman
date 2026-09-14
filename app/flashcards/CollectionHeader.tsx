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
 *   • режимы тренировки выбираются на хабе карточек, шапка коллекции их не дублирует;
 *   • у набора видно НИК автора, а не технический идентификатор;
 *   • своя (ещё не опубликованная) коллекция получает кнопку «Отправить в сообщество».
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import { FlowText } from '../../components/text-integrity';
import React, { useMemo } from 'react';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { ActivityIndicator, Modal, Pressable, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { triLang, type Lang } from '../../constants/i18n';
import type { Theme } from '../../constants/theme';
import { CATEGORIES } from './constants';
import type { CategoryId } from './types';
import { packTitleForInterface, type FlashcardMarketPack } from './marketplace';
import { useCommunityAuthorName } from '../community_packs/packAuthorNames';
import type { FcCollectionViewMode } from './collection_view_prefs';
import type { FilterGroup } from './selectors';
import PackLanguagePicker from './PackLanguagePicker';
import type { PackLanguage } from './pack_languages';

const VIEW_TOGGLE_SIZE = 40;
const VIEW_TOGGLE_ICON_SIZE = 18;

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
  /** «Отправить в сообщество» — только для своей ещё не опубликованной коллекции. */
  showPublish?: boolean;
  publishBusy?: boolean;
  onPublish?: () => void;
  packLanguage?: PackLanguage;
  onPackLanguageChange?: (language: PackLanguage) => void;
  selectionMode?: boolean;
  selectedCount?: number;
  selectionTotal?: number;
  actionsOpen?: boolean;
  onToggleActions?: () => void;
  onEnterSelection?: () => void;
  onExitSelection?: () => void;
  onDeleteSelected?: () => void;
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
  showPublish = false,
  publishBusy = false,
  onPublish,
  packLanguage = 'en',
  onPackLanguageChange,
  selectionMode = false,
  selectedCount = 0,
  selectionTotal = 0,
  actionsOpen = false,
  onToggleActions,
  onEnterSelection,
  onExitSelection,
  onDeleteSelected,
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
    // зачем: packTitleForInterface читает КОНТЕНТНЫЙ заголовок пака (нет
    // en-source), поэтому en сужаем до ru — как в flashcards_collection.tsx
    // fullCategoryLabelForLang (тот же класс бага, что уронил Студию аватаров).
    if (currentPack) return packTitleForInterface(currentPack, lang === 'en' ? 'ru' : lang);
    const cat = CATEGORIES.find((c) => c.id === activeCat);
    // Плановые локали: полное имя категории на всех 8 языках интерфейса + en (RU-фолбэк).
    const fullByLang: Record<Lang, string> | undefined =
      cat == null
        ? undefined
        : {
            ru: cat.fullLabelRU,
            uk: cat.fullLabelUK,
            en: cat.fullLabelRU,
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
    ru: 'Фильтр', uk: 'Фільтр', en: 'Filter', es: 'Filtro',
    'pt-BR': 'Filtro', vi: 'Bộ lọc', id: 'Filter', tr: 'Filtre', pl: 'Filtr',
  });

  const viewToggleLabel = viewMode === 'list'
    ? triLang(lang, {
        ru: 'Показать как набор', uk: 'Показати як набір', en: 'Show as a deck', es: 'Mostrar como mazo',
        'pt-BR': 'Mostrar como conjunto', vi: 'Hiển thị dạng bộ thẻ', id: 'Tampilkan sebagai set',
        tr: 'Deste olarak göster', pl: 'Pokaż jako zestaw',
      })
    : triLang(lang, {
        ru: 'Показать списком', uk: 'Показати списком', en: 'Show as a list', es: 'Mostrar como lista',
        'pt-BR': 'Mostrar como lista', vi: 'Hiển thị dạng danh sách', id: 'Tampilkan sebagai daftar',
        tr: 'Liste olarak göster', pl: 'Pokaż jako listę',
      });

  const publishLabel = triLang(lang, {
    ru: 'Отправить в сообщество',
    uk: 'Надіслати до спільноти',
    en: 'Send to community',
    es: 'Enviar a la comunidad',
    'pt-BR': 'Enviar para a comunidade',
    vi: 'Gửi tới cộng đồng',
    id: 'Kirim ke komunitas',
    tr: 'Topluluğa gönder',
    pl: 'Wyślij do społeczności',
  });

  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const savedSurface = activeCat === 'saved' && !packDeeplink;
  const savedActionsLabel = triLang(lang, {
    ru: 'Действия сохранённых', uk: 'Дії збережених', en: 'Saved card actions', es: 'Acciones de guardadas',
    'pt-BR': 'Ações das salvas', vi: 'Thao tác thẻ đã lưu', id: 'Tindakan kartu tersimpan', tr: 'Kayıtlı kart eylemleri', pl: 'Działania zapisanych kart',
  });
  const viewMenuLabel = triLang(lang, {
    ru: 'Вид', uk: 'Вигляд', en: 'View', es: 'Vista', 'pt-BR': 'Visualização', vi: 'Chế độ xem', id: 'Tampilan', tr: 'Görünüm', pl: 'Widok',
  });
  const selectMenuLabel = triLang(lang, {
    ru: 'Отметить', uk: 'Позначити', en: 'Select', es: 'Seleccionar', 'pt-BR': 'Selecionar', vi: 'Chọn', id: 'Pilih', tr: 'Seç', pl: 'Zaznacz',
  });
  const deleteSelectedMenuLabel = triLang(lang, {
    ru: 'Удалить выбранные', uk: 'Видалити вибрані', en: 'Delete selected', es: 'Eliminar seleccionadas',
    'pt-BR': 'Excluir selecionadas', vi: 'Xóa thẻ đã chọn', id: 'Hapus yang dipilih', tr: 'Seçilenleri sil', pl: 'Usuń zaznaczone',
  });
  const currentViewLabel = viewMode === 'list'
    ? triLang(lang, { ru: 'Список', uk: 'Список', en: 'List', es: 'Lista', 'pt-BR': 'Lista', vi: 'Danh sách', id: 'Daftar', tr: 'Liste', pl: 'Lista' })
    : triLang(lang, { ru: 'Стопка', uk: 'Стос', en: 'Deck', es: 'Mazo', 'pt-BR': 'Conjunto', vi: 'Bộ thẻ', id: 'Set', tr: 'Deste', pl: 'Zestaw' });
  const cancelSelectionLabel = triLang(lang, {
    ru: 'Отмена', uk: 'Скасувати', en: 'Cancel', es: 'Cancelar', 'pt-BR': 'Cancelar', vi: 'Hủy', id: 'Batal', tr: 'İptal', pl: 'Anuluj',
  });

  return (
    <>
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
          borderBottomWidth: 0.5, borderBottomColor: t.border,
        }}
      >
        {selectionMode ? (
          <TouchableOpacity
            testID="fc-saved-selection-cancel"
            accessibilityLabel={cancelSelectionLabel}
            accessibilityRole="button"
            accessible
            onPress={onExitSelection}
            style={{ minWidth: 64, minHeight: 44, justifyContent: 'center' }}
          >
            <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '800' }}>{cancelSelectionLabel}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            testID="flashcards-header-back"
            accessibilityLabel={triLang(lang, {
              ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar',
              vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz',
            })}
            accessibilityRole="button"
            accessible
            onPress={onBack}
            style={{ width: 40, minHeight: 44, justifyContent: 'center' }}
            hitSlop={{ top:12,bottom:12,left:12,right:12 }}
          >
            <Ionicons name="arrow-back" size={24} color={t.textPrimary} />
          </TouchableOpacity>
        )}
        {/*
          зачем: динамическое сжатие шрифта (adjustsFontSizeToFit) здесь запрещено —
          на iOS оно ужимает КОРОТКИЕ варианты до крошечного кегля (класс регрессии,
          AGENTS.md → Layout stability, храповик tests/layout_stability_contract).
          Длинные заголовки лечим вёрсткой: кегль уже подобран по ширине экрана
          (titleFontSize), а остаток переносится на вторую строку. Названия наборов
          пользовательские (до 200 символов на сервере), поэтому вторая строка при
          переполнении обрезается многоточием — но кегль остаётся читаемым всегда.
          Шапка без фиксированной высоты (alignItems:'center'), поэтому вторая
          строка растит строку целиком, а кнопки остаются по центру — без прыжка.
        */}
        <FlowText testID="fc-collection-title" provenance="external"
          style={{
            fontWeight: '700', letterSpacing: 0.2, color: t.textPrimary, fontSize: titleFontSize,
            lineHeight: Math.round(titleFontSize * 1.2),
            flex: 1, minWidth: 0, textAlign: 'center', paddingHorizontal: 4,
          }}
          maxFontSizeMultiplier={1.2}
        >
          {selectionMode ? selectMenuLabel : headerTitle}
        </FlowText>
        <View style={{ flexDirection:'row', justifyContent:'flex-end', alignItems:'center', gap: 6, flexShrink: 0 }}>
          {selectionMode ? (
            <Text testID="fc-saved-selection-count" style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '900' }}>
              {selectedCount} / {selectionTotal}
            </Text>
          ) : savedSurface ? (
            <>
              {onPackLanguageChange ? (
                <PackLanguagePicker lang={lang} t={t} value={packLanguage} onChange={onPackLanguageChange} />
              ) : null}
              <TouchableOpacity
                testID="fc-saved-actions"
                accessibilityLabel={savedActionsLabel}
                accessibilityRole="button"
                accessibilityState={{ expanded: actionsOpen }}
                accessible
                onPress={onToggleActions}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 13, borderWidth: 1, borderColor: actionsOpen ? t.accent : t.border, backgroundColor: actionsOpen ? t.accentBg : t.bgSurface }}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={actionsOpen ? t.accent : t.textSecond} />
              </TouchableOpacity>
            </>
          ) : null}
          {/* E11: переключатель «Список / Набор» (персист fc_collection_view_v1) */}
          {!savedSurface && showViewToggle && (
            <TouchableOpacity
              testID="fc-view-toggle"
              accessibilityLabel={viewToggleLabel}
              accessibilityRole="button"
              accessible
              onPress={onToggleViewMode}
              hitSlop={{ top:11,bottom:11,left:9,right:9 }}
              style={{
                width: VIEW_TOGGLE_SIZE,
                height: VIEW_TOGGLE_SIZE,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 13,
                borderWidth: 1,
                borderColor: viewMode === 'deck' ? t.accent : t.border,
                backgroundColor: viewMode === 'deck' ? `${t.accent}18` : 'transparent',
              }}
            >
              <Ionicons
                name={viewMode === 'list' ? 'albums-outline' : 'list-outline'}
                size={VIEW_TOGGLE_ICON_SIZE}
                color={viewMode === 'deck' ? t.accent : t.textSecond}
              />
            </TouchableOpacity>
          )}
          {/* E11: фильтр на всех вкладках, где есть группы источников */}
          {!savedSurface && filterGroups.length > 0 && (
            <TouchableOpacity
              accessibilityLabel={filterLabel}
              accessibilityRole="button"
              accessibilityState={{ expanded: filterOpen }}
              onPress={onToggleFilterOpen}
              hitSlop={{ top:8,bottom:8,left:8,right:8 }}
              style={{
                flexDirection: 'row', alignItems: 'center', gap: 3,
                minHeight: 40, paddingHorizontal: 10,
                borderRadius: 12, borderWidth: 1,
                borderColor: activeFilter !== 'all' ? t.accent : t.border,
                backgroundColor: activeFilter !== 'all' ? t.accent + '18' : 'transparent',
              }}
            >
              <Ionicons name="filter-outline" size={12} color={activeFilter !== 'all' ? t.accent : t.textSecond} />
              <FlowText testID="fc-filter-label" provenance="authored"
                style={{ maxWidth: screenW < 360 ? 44 : 86, fontSize: f.caption, fontWeight: '600', color: activeFilter !== 'all' ? t.accent : t.textSecond }}
              >
                {activeFilter === 'all'
                  ? filterLabel
                  : (filterOptions.find(o => o.key === activeFilter)?.label ?? filterLabel)}
              </FlowText>
              <Ionicons name={filterOpen ? 'chevron-up' : 'chevron-down'} size={10} color={activeFilter !== 'all' ? t.accent : t.textSecond} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {savedSurface ? (
        <Modal visible={actionsOpen} transparent animationType={reduceMotion ? 'none' : 'fade'} onRequestClose={onToggleActions}>
          <View style={{ flex: 1 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={cancelSelectionLabel} onPress={onToggleActions} style={{ flex: 1 }} />
            <View
              testID="fc-saved-actions-menu"
              accessibilityRole="menu"
              style={{ position: 'absolute', top: insets.top + 56, right: 16, width: 230, padding: 8, borderRadius: 18, backgroundColor: t.bgSurface, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}
            >
              <TouchableOpacity
                accessibilityRole="menuitem"
                accessibilityLabel={`${viewMenuLabel}: ${currentViewLabel}`}
                onPress={() => { onToggleActions?.(); onToggleViewMode(); }}
                style={{ minHeight: 44, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800' }}>{viewMenuLabel}</Text>
                <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }}>{currentViewLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="menuitem"
                accessibilityLabel={selectMenuLabel}
                onPress={() => { onToggleActions?.(); onEnterSelection?.(); }}
                style={{ minHeight: 44, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={t.accent} />
                <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '800' }}>{selectMenuLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityRole="menuitem"
                accessibilityLabel={deleteSelectedMenuLabel}
                disabled={selectedCount === 0}
                onPress={() => { onToggleActions?.(); onDeleteSelected?.(); }}
                style={{ minHeight: 44, borderRadius: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: selectedCount === 0 ? 0.45 : 1 }}
              >
                <Ionicons name="trash-outline" size={18} color={t.wrong} />
                <Text style={{ color: t.wrong, fontSize: f.sub, fontWeight: '800' }}>{deleteSelectedMenuLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Ник автора набора — вместо технического идентификатора */}
      {currentPack?.isCommunityUgc ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 16, marginTop: 8 }}>
          <Ionicons name="person-circle-outline" size={15} color={t.textMuted} />
          <FlowText provenance="user"
            testID="fc-pack-author"
            accessibilityLabel="qa-fc-pack-author"
            style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700' }}
          >
            {authorName}
          </FlowText>
        </View>
      ) : null}

      {/* «Отправить в сообщество» — своя ещё не опубликованная коллекция */}
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
          <FlowText testID="fc-publish-label" provenance="authored" style={{ flexShrink: 1, color: t.accent, fontSize: f.sub, fontWeight: '800' }}>
            {publishLabel}
          </FlowText>
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
            /**
             * зачем (владелец, скриншот 2026-08-29 «поиск сломал»): CollectionHeader
             * возвращает фрагмент, поэтому поле поиска — прямой ребёнок flex-колонки
             * экрана. Соседний список/ScrollView с flex:1 требует высоту, и RN сжимал
             * поле, несмотря на явный height, — у подсказки срезалась нижняя половина
             * букв. flexShrink:0 делает заданную высоту неприкосновенной.
             */
            flexShrink: 0,
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
              ru: 'Поиск по карточкам', uk: 'Пошук по картках', en: 'Search cards', es: 'Buscar tarjetas',
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
