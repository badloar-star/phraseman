/**
 * Шапка списка карточек — макет docs/design/v2-app/cards-section.html (кадры «Список», «Поиск», «Свой набор»).
 *
 * зачем (владелец 04.10: «экран как в макете, все лишние функции — в меню «⋯» в шапке»): наверху остаются «назад» и квадратная кнопка меню,
 * ниже крупный заголовок, число карточек и поиск-капсула. Всё, что в макете не нарисовано (вид «стопка», фильтр, слова/фразы, язык набора,
 * выбор нескольких, витрина сообщества, «опубликовать/править»), живёт в шторке меню. Две части: верхняя панель (прибита) и заголовочный блок
 * (едет вместе со списком).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';

import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { BackButton, SheetRow, type PanelChip } from '../../components/mistakes-panel/PanelKit';
import { KitSegment } from '../../components/cards-grid/CardsKit';
import { PanelSheet } from '../../components/mistakes-panel/PanelSheet';
import { useTheme } from '../../components/ThemeContext';
import { triLang, type Lang } from '../../constants/i18n';
import { plateBoxShadow } from '../../components/v2/ShadowSurface';
import { useFlashcardTrainingQuotaPreview } from '../../hooks/useFlashcardTrainingQuotaPreview';
import PackLanguagePicker from './PackLanguagePicker';
import type { PackLanguage } from './pack_languages';
import type { FcCollectionViewMode } from './collection_view_prefs';
import type { SavedCardContentKind } from './selectors';

export type CollectionMenuProps = Readonly<{
  lang: Lang;
  viewMode: FcCollectionViewMode;
  onToggleViewMode: () => void;
  showViewToggle: boolean;
  hasFilter: boolean;
  filterActive: boolean;
  onOpenFilter: () => void;
  savedContentKind?: SavedCardContentKind;
  savedContentCounts?: Readonly<Record<SavedCardContentKind, number>>;
  onSavedContentKindChange?: (kind: SavedCardContentKind) => void;
  packLanguage?: PackLanguage;
  onPackLanguageChange?: (language: PackLanguage) => void;
  selectionMode: boolean;
  selectedCount: number;
  onEnterSelection?: () => void;
  onDeleteSelected?: () => void;
  onOpenCommunity?: () => void;
  showPublish?: boolean;
  publishBusy?: boolean;
  onPublish?: () => void;
  showEdit?: boolean;
  onEdit?: () => void;
  /** Название набора — заголовок шторки действий (макет cards-v2 `setActions`). */
  title?: string;
  /** «Новая карточка» в наборе (макет `setActions`). */
  onNewCard?: () => void;
  /** «Удалить набор» (только свой; макет `setActions`, красная строка); подтверждение — на экране. */
  onDeletePack?: () => void;
  /** Чужой набор сообщества: «Пожаловаться на набор». */
  onReport?: () => void;
}>;

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { back: 'Назад', menu: 'Меню', search: 'Поиск', searchPlaceholder: 'Слово или перевод', clear: 'Очистить', cards: { one: 'карточка', few: 'карточки', many: 'карточек' }, cancel: 'Отмена', asDeck: 'Показать стопкой', asList: 'Показать списком', filter: 'Фильтр', all: 'Все', words: 'Слова', phrases: 'Фразы', select: 'Отметить несколько', deleteSelected: 'Удалить выбранные', community: 'Лучшее у сообщества', publish: 'Отправить в сообщество', edit: 'Править набор', language: 'Язык набора' },
  uk: { back: 'Назад', menu: 'Меню', search: 'Пошук', searchPlaceholder: 'Слово або переклад', clear: 'Очистити', cards: { one: 'картка', few: 'картки', many: 'карток' }, cancel: 'Скасувати', asDeck: 'Показати стосом', asList: 'Показати списком', filter: 'Фільтр', all: 'Усі', words: 'Слова', phrases: 'Фрази', select: 'Позначити кілька', deleteSelected: 'Видалити вибрані', community: 'Найкраще у спільноти', publish: 'Надіслати до спільноти', edit: 'Редагувати набір', language: 'Мова набору' },
  en: { back: 'Back', menu: 'Menu', search: 'Search', searchPlaceholder: 'Word or translation', clear: 'Clear', cards: { one: 'card', few: 'cards', many: 'cards' }, cancel: 'Cancel', asDeck: 'Show as a deck', asList: 'Show as a list', filter: 'Filter', all: 'All', words: 'Words', phrases: 'Phrases', select: 'Select several', deleteSelected: 'Delete selected', community: 'Best from the community', publish: 'Send to community', edit: 'Edit pack', language: 'Pack language' },
  es: { back: 'Atrás', menu: 'Menú', search: 'Buscar', searchPlaceholder: 'Palabra o traducción', clear: 'Borrar', cards: { one: 'tarjeta', few: 'tarjetas', many: 'tarjetas' }, cancel: 'Cancelar', asDeck: 'Mostrar como mazo', asList: 'Mostrar como lista', filter: 'Filtro', all: 'Todas', words: 'Palabras', phrases: 'Frases', select: 'Seleccionar varias', deleteSelected: 'Eliminar seleccionadas', community: 'Lo mejor de la comunidad', publish: 'Enviar a la comunidad', edit: 'Editar el pack', language: 'Idioma del pack' },
  'pt-BR': { back: 'Voltar', menu: 'Menu', search: 'Buscar', searchPlaceholder: 'Palavra ou tradução', clear: 'Limpar', cards: { one: 'cartão', few: 'cartões', many: 'cartões' }, cancel: 'Cancelar', asDeck: 'Mostrar como conjunto', asList: 'Mostrar como lista', filter: 'Filtro', all: 'Todas', words: 'Palavras', phrases: 'Frases', select: 'Selecionar vários', deleteSelected: 'Excluir selecionadas', community: 'O melhor da comunidade', publish: 'Enviar para a comunidade', edit: 'Editar o pacote', language: 'Idioma do pacote' },
  vi: { back: 'Quay lại', menu: 'Menu', search: 'Tìm', searchPlaceholder: 'Từ hoặc bản dịch', clear: 'Xóa', cards: { one: 'thẻ', few: 'thẻ', many: 'thẻ' }, cancel: 'Hủy', asDeck: 'Hiển thị dạng bộ thẻ', asList: 'Hiển thị dạng danh sách', filter: 'Bộ lọc', all: 'Tất cả', words: 'Từ', phrases: 'Cụm từ', select: 'Chọn nhiều', deleteSelected: 'Xóa thẻ đã chọn', community: 'Hay nhất từ cộng đồng', publish: 'Gửi tới cộng đồng', edit: 'Sửa bộ thẻ', language: 'Ngôn ngữ bộ thẻ' },
  id: { back: 'Kembali', menu: 'Menu', search: 'Cari', searchPlaceholder: 'Kata atau terjemahan', clear: 'Hapus', cards: { one: 'kartu', few: 'kartu', many: 'kartu' }, cancel: 'Batal', asDeck: 'Tampilkan sebagai set', asList: 'Tampilkan sebagai daftar', filter: 'Filter', all: 'Semua', words: 'Kata', phrases: 'Frasa', select: 'Pilih beberapa', deleteSelected: 'Hapus yang dipilih', community: 'Terbaik dari komunitas', publish: 'Kirim ke komunitas', edit: 'Edit paket', language: 'Bahasa paket' },
  tr: { back: 'Geri', menu: 'Menü', search: 'Ara', searchPlaceholder: 'Kelime veya çeviri', clear: 'Temizle', cards: { one: 'kart', few: 'kart', many: 'kart' }, cancel: 'İptal', asDeck: 'Deste olarak göster', asList: 'Liste olarak göster', filter: 'Filtre', all: 'Tümü', words: 'Kelimeler', phrases: 'İfadeler', select: 'Birkaçını seç', deleteSelected: 'Seçilenleri sil', community: 'Topluluğun en iyisi', publish: 'Topluluğa gönder', edit: 'Paketi düzenle', language: 'Paket dili' },
  pl: { back: 'Wstecz', menu: 'Menu', search: 'Szukaj', searchPlaceholder: 'Słowo lub tłumaczenie', clear: 'Wyczyść', cards: { one: 'karta', few: 'karty', many: 'kart' }, cancel: 'Anuluj', asDeck: 'Pokaż jako zestaw', asList: 'Pokaż jako listę', filter: 'Filtr', all: 'Wszystkie', words: 'Słowa', phrases: 'Frazy', select: 'Zaznacz kilka', deleteSelected: 'Usuń zaznaczone', community: 'Najlepsze ze społeczności', publish: 'Wyślij do społeczności', edit: 'Edytuj zestaw', language: 'Język zestawu' },
});

/** Верхняя панель: «назад» и квадратная кнопка меню; в режиме выбора — «Отмена» и счётчик. */
export const CollectionTopBar = memo(function CollectionTopBar({ lang, onBack, onMenu, selectionMode, selectedCount, selectionTotal, onExitSelection, limitLabel, limitIcon, onCreate, onSearch, searchOpen }: Readonly<{
  lang: Lang;
  onBack: () => void;
  onMenu: () => void;
  selectionMode: boolean;
  selectedCount: number;
  selectionTotal: number;
  onExitSelection?: () => void;
  /** Пилюля остатка тренировок («24/30») и «+» — на экране набора (макет «Свой набор»). */
  limitLabel?: string | null;
  /** Значок пилюли лимита: на «Сохранённых» закладка, на наборе стопка (по умолчанию). */
  limitIcon?: keyof typeof Ionicons.glyphMap;
  onCreate?: () => void;
  /** Кнопка поиска в шапке (макет cards-v2: поиск открывается в полосе масштаба); без неё поиск остаётся в заголовочном блоке. */
  onSearch?: () => void;
  searchOpen?: boolean;
}>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const g = useLv2Glass();
  // зачем (замечание владельца 10.10): цвета — токены выбранной темы, стили пересобираются при смене темы.
  const styles = useScaledTextStyles(useMemo(() => makeStyles(g), [g]));
  const copy = useMemo(() => copyFor(lang), [lang]);
  if (selectionMode) {
    return (
      <View style={styles.top}>
        <Pressable testID="fc-saved-selection-cancel" accessibilityRole="button" onPress={onExitSelection} hitSlop={10} style={styles.cancelBtn}>
          <Text style={[styles.cancelText, { color: g.text }]}>{copy.cancel}</Text>
        </Pressable>
        <Text testID="fc-saved-selection-count" style={[styles.count, { color: g.secondary }]}>{`${selectedCount} / ${selectionTotal}`}</Text>
      </View>
    );
  }
  return (
    <View style={styles.top}>
      <BackButton g={g} label={copy.back} onPress={onBack} />
      <View style={styles.topRight}>
        {limitLabel ? (
          <View testID="fc-collection-limit" style={[styles.pill, { backgroundColor: g.hairlineSoft }]}>
            <Ionicons name={limitIcon ?? 'albums-outline'} size={16} color={g.text} />
            <Text style={[styles.pillText, { color: g.text }]}>{limitLabel}</Text>
          </View>
        ) : null}
        {onSearch ? (
          <Pressable testID="fc-collection-search" accessibilityRole="button" accessibilityLabel={copy.search} accessibilityState={{ selected: !!searchOpen }} hitSlop={8} onPress={onSearch} style={({ pressed }) => [styles.round, { backgroundColor: searchOpen ? g.dividerTone : g.hairlineSoft }, pressed && styles.pressed]}>
            <Ionicons name="search" size={20} color={g.text} />
          </Pressable>
        ) : null}
        {onCreate ? (
          <Pressable testID="fc-collection-create" accessibilityRole="button" hitSlop={8} onPress={onCreate} style={({ pressed }) => [styles.round, { backgroundColor: g.hairlineSoft }, pressed && styles.pressed]}>
            <Ionicons name="add" size={22} color={g.text} />
          </Pressable>
        ) : null}
        <Pressable testID="fc-saved-actions" accessibilityRole="button" accessibilityLabel={copy.menu} hitSlop={8} onPress={onMenu} style={({ pressed }) => [styles.square, { backgroundColor: g.hairlineSoft }, pressed && styles.pressed]}>
          <Ionicons name="ellipsis-vertical" size={18} color={g.text} />
        </Pressable>
      </View>
    </View>
  );
});

/** Остаток тренировок для пилюли (тот же источник, что на хабе). */
export function useCollectionLimitLabel(): string | null {
  const quota = useFlashcardTrainingQuotaPreview();
  // зачем (D174, cards-section-056): пилюля = «использовано/лимит» (30/30), как D166 «4/3» у энергии, а не «осталось/лимит» (0/30)
  return quota.status === 'waiting' ? null : `${Math.min(quota.limit, Math.max(0, quota.used))}/${quota.limit}`;
}

/** Капсула поиска (макет `.srch`): лупа, ввод, крестик. Живёт в полосе масштаба над сеткой (кадр «Поиск») или под заголовком (пустой результат). */
export const CollectionSearchField = memo(function CollectionSearchField({ lang, value, onChange, onClose, autoFocus }: Readonly<{
  lang: Lang;
  value: string;
  onChange: (value: string) => void;
  /** Крестик при пустой строке закрывает поиск (если передан). */
  onClose?: () => void;
  autoFocus?: boolean;
}>) {
  const g = useLv2Glass();
  const styles = useScaledTextStyles(useMemo(() => makeStyles(g), [g]));
  const { f } = useTheme();
  const copy = useMemo(() => copyFor(lang), [lang]);
  return (
    <View testID="fc-search-field" style={styles.search0}>
      <Ionicons name="search" size={18} color={g.mutedText} />
      <TextInput
        testID="fc-search-input"
        accessibilityLabel={copy.search}
        value={value}
        onChangeText={onChange}
        placeholder={copy.search}
        placeholderTextColor={g.mutedText}
        autoCorrect={false}
        autoCapitalize="none"
        autoFocus={autoFocus}
        returnKeyType="search"
        style={[styles.searchInput, { color: g.text, fontSize: Math.min(f.body, 17) }]}
      />
      {value.length > 0 || onClose ? (
        <Pressable testID="fc-search-clear" accessibilityRole="button" accessibilityLabel={copy.clear} hitSlop={10} onPress={() => { if (value.length > 0) onChange(''); else onClose?.(); }}>
          <Ionicons name="close" size={18} color={g.mutedText} />
        </Pressable>
      ) : null}
    </View>
  );
});

/** Заголовок «Сохранённые N» (макет cards-v2: 34/40 и число 22 приглушённым) и, если нужно, поиск-капсула под ним. */
export const CollectionTitleBlock = memo(function CollectionTitleBlock({ lang, title, cardCount, big = true, titleOnly = false, showSearch, searchInput, onSearchInput }: Readonly<{
  lang: Lang;
  title: string;
  cardCount: number;
  /** Крупный заголовок «Сохранённых» (34/40 с числом рядом); у остальных — прежний 34/40 без числа. */
  big?: boolean;
  /** Кадр «Пусто»: только заголовок, без числа и поиска. */
  titleOnly?: boolean;
  showSearch: boolean;
  searchInput: string;
  onSearchInput: (value: string) => void;
}>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const g = useLv2Glass();
  // зачем (замечание владельца 10.10): цвета — токены выбранной темы, стили пересобираются при смене темы.
  const styles = useScaledTextStyles(useMemo(() => makeStyles(g), [g]));
  return (
    <View>
      <View style={styles.titleRow}>
        <Text maxFontSizeMultiplier={1.15} testID="fc-collection-title" accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title}</Text>
        {titleOnly || !big ? null : <Text testID="fc-collection-count" style={[styles.titleCount, { color: g.mutedText }]}>{cardCount}</Text>}
      </View>
      {showSearch && !titleOnly ? (
        <View style={styles.searchGap}>
          <CollectionSearchField lang={lang} value={searchInput} onChange={onSearchInput} />
        </View>
      ) : null}
    </View>
  );
});

/** Шторка меню «⋯»: всё, что в макете списка не нарисовано, но в продукте есть. */
export const CollectionMenuSheet = memo(function CollectionMenuSheet({ visible, onClose, menu }: Readonly<{ visible: boolean; onClose: () => void; menu: CollectionMenuProps }>) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const g = useLv2Glass();
  // зачем (замечание владельца 10.10): цвета — токены выбранной темы, стили пересобираются при смене темы.
  const styles = useScaledTextStyles(useMemo(() => makeStyles(g), [g]));
  const { theme: t } = useTheme();
  const copy = useMemo(() => copyFor(menu.lang), [menu.lang]);
  const run = (action?: () => void) => () => { onClose(); action?.(); };
  const kindChips = useMemo<PanelChip[]>(() => menu.savedContentCounts
    ? [
      { id: 'all', label: `${copy.all} ${menu.savedContentCounts.all}` },
      { id: 'word', label: `${copy.words} ${menu.savedContentCounts.word}` },
      { id: 'phrase', label: `${copy.phrases} ${menu.savedContentCounts.phrase}` },
    ]
    : [], [copy.all, copy.phrases, copy.words, menu.savedContentCounts]);
  return (
    <PanelSheet visible={visible} onClose={onClose} testID="fc-saved-actions-menu">
      {menu.title ? (
        // зачем (cards-v2 `setActions`): шторка действий набора начинается с его названия, 20/700
        <Text accessibilityRole="header" style={{ color: g.text, fontSize: 20, lineHeight: 26, fontWeight: '700', paddingHorizontal: 6, paddingBottom: 6 }}>{menu.title}</Text>
      ) : null}
      {menu.selectionMode && menu.selectedCount > 0 ? (
        <SheetRow g={g} testID="fc-menu-delete-selected" icon="trash-outline" title={copy.deleteSelected} danger onPress={run(menu.onDeleteSelected)} />
      ) : null}
      {menu.showViewToggle ? (
        <SheetRow g={g} testID={menu.viewMode === 'list' ? 'fc-saved-view-deck' : 'fc-saved-view-list'} icon={menu.viewMode === 'list' ? 'albums-outline' : 'grid-outline'} title={menu.viewMode === 'list' ? copy.asDeck : copy.asList} onPress={run(menu.onToggleViewMode)} />
      ) : null}
      {menu.hasFilter ? (
        <SheetRow g={g} testID="fc-menu-filter" icon="filter-outline" title={menu.filterActive ? `${copy.filter} •` : copy.filter} onPress={run(menu.onOpenFilter)} />
      ) : null}
      {menu.onEnterSelection && !menu.selectionMode ? (
        <SheetRow g={g} testID="fc-menu-select" icon="checkbox-outline" title={copy.select} onPress={run(menu.onEnterSelection)} />
      ) : null}
      {menu.onOpenCommunity ? (
        <SheetRow g={g} testID="fc-menu-community" icon="people-outline" title={copy.community} onPress={run(menu.onOpenCommunity)} />
      ) : null}
      {menu.showPublish ? (
        <SheetRow g={g} testID="fc-pack-publish" icon="cloud-upload-outline" title={copy.publish} onPress={run(menu.publishBusy ? undefined : menu.onPublish)} />
      ) : null}
      {menu.onReport ? (
        <SheetRow g={g} testID="collection-report-pack" icon="flag-outline" title={triLang(menu.lang, {
          ru: 'Пожаловаться на набор', uk: 'Поскаржитись на набір', en: 'Report this pack', es: 'Denunciar el pack',
          'pt-BR': 'Denunciar o pacote', vi: 'Báo cáo bộ thẻ', id: 'Laporkan paket', tr: 'Seti bildir', pl: 'Zgłoś zestaw',
        })} onPress={run(menu.onReport)} />
      ) : null}
      {menu.showEdit ? (
        <SheetRow g={g} testID="fc-pack-edit" icon="create-outline" title={copy.edit} onPress={run(menu.onEdit)} />
      ) : null}
      {menu.onNewCard ? (
        <SheetRow g={g} testID="fc-pack-new-card" icon="add-outline" title={triLang(menu.lang, {
          ru: 'Новая карточка', uk: 'Нова картка', en: 'New card', es: 'Nueva tarjeta', 'pt-BR': 'Novo cartão',
          vi: 'Thẻ mới', id: 'Kartu baru', tr: 'Yeni kart', pl: 'Nowa karta',
        })} onPress={run(menu.onNewCard)} />
      ) : null}
      {menu.onDeletePack ? (
        <SheetRow g={g} testID="fc-pack-delete" icon="trash-outline" title={triLang(menu.lang, {
          ru: 'Удалить набор', uk: 'Видалити набір', en: 'Delete pack', es: 'Eliminar pack',
          'pt-BR': 'Excluir pacote', vi: 'Xóa bộ thẻ', id: 'Hapus paket', tr: 'Paketi sil', pl: 'Usuń zestaw',
        })} danger onPress={run(menu.onDeletePack)} />
      ) : null}
      {kindChips.length > 0 && menu.savedContentKind && menu.onSavedContentKindChange ? (
        // зачем (R1_DIFF_ONE_FIX, cards-032 / cards-v2-048, решение координатора 12.10): в макете «Все / Слова / Фразы» — ОДИН сегмент-контейнер (`.seg3`, как «30 с / 60 с / 90 с» в настройке тренировки), а не три отдельные таблетки
        <View style={{ marginTop: 14 }}>
          <KitSegment g={g} options={kindChips} value={menu.savedContentKind} onChange={(id) => menu.onSavedContentKindChange?.(id as SavedCardContentKind)} testIDPrefix="fc-saved-content" />
        </View>
      ) : null}
      {menu.onPackLanguageChange ? (
        <View style={styles.langRow}>
          <Text style={[styles.langLabel, { color: g.secondary }]}>{copy.language}</Text>
          <PackLanguagePicker lang={menu.lang} t={t} value={menu.packLanguage ?? 'en'} onChange={menu.onPackLanguageChange} />
        </View>
      ) : null}
    </PanelSheet>
  );
});

const makeStyles = (g: ReturnType<typeof useLv2Glass>) => StyleSheet.create({
  pressed: { opacity: 0.82 },
  top: { minHeight: 44, marginTop: 6, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  round: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  square: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pill: { minHeight: 30, borderRadius: 18, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pillText: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  cancelBtn: { minHeight: 44, justifyContent: 'center' },
  cancelText: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  count: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  // зачем (Карточки 2.0, макет cards-v2 `ttl`): заголовок 34/40 700, отступ сверху 14, число рядом 22/600 через 12
  titleRow: { marginTop: 14, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline' },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  titleCount: { marginLeft: 12, fontSize: 22, lineHeight: 28, fontWeight: '600' },
  searchGap: { marginTop: 22 },
  search0: { minHeight: 44, borderRadius: 22, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: g.dividerTone, boxShadow: plateBoxShadow(g) },
  searchInput: { flex: 1, paddingVertical: 0, minHeight: 44 },
  langRow: { marginTop: 12, minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  langLabel: { fontSize: 16, lineHeight: 22 },
});
