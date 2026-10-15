/**
 * «Мои наборы» — вид по макету docs/design/v2-app/cards-v2.html (кадры «Мои наборы», «Пусто»; функции mySets(), mySetsEmpty()).
 *
 * зачем (владелец 12.10: cards-v2 утверждён целиком, «приложение = макет»): набор — «стопка» PackDeck (название, «40 · A2», чипы слов, круглая «играть»),
 * один список без разделов, «+» в шапке вместо нижней кнопки, долгое нажатие на набор открывает шторку действий.
 * Всё, что в макете не нарисовано, но в продукте есть (поиск, порядок, язык наборов), живёт в шторке «⋯» шапки — так же,
 * как на списке «Сохранённые». Логика экрана (загрузка, открытие, удаление, оптимистичный откат) остаётся в flashcards_my_packs.tsx.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';

import { KitEmpty } from '../../components/cards-grid/CardsKit';
import { PackDeck, PackDeckPlayButton } from '../../components/packs/PackRow';
import { packDeckLevel, packDeckWords } from '../../components/packs/packDeckModel';
import { PackBackBare, PackRoundButton, PackScreenTitle, PackSquareButton, PackTopBarRow } from '../../components/packs/PackScreenKit';
import { communityAuthorLabel, officialPackAuthorName } from '../community_packs/packAuthorNames';
import { formatPackTitleForDisplay } from './marketplace';
import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { SheetRow } from '../../components/mistakes-panel/PanelKit';
import { PanelSheet } from '../../components/mistakes-panel/PanelSheet';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { useTheme } from '../../components/ThemeContext';
import { triLang, type Lang } from '../../constants/i18n';
import { pluralWord } from '../../constants/plural';
import { hapticTap } from '../../hooks/use-haptics';
import PackLanguagePicker from './PackLanguagePicker';
import type { PackLanguage } from './pack_languages';
import type { FlashcardMarketPack } from './marketplace';

export type MyPacksSortKey = 'updated' | 'name';

type Props = Readonly<{
  lang: Lang;
  created: readonly FlashcardMarketPack[];
  added: readonly FlashcardMarketPack[];
  /** Сколько наборов всего (до поиска) — для подписи под заголовком. */
  totalCount: number;
  status: 'list' | 'loading' | 'unavailable' | 'empty';
  labelFor: (pack: FlashcardMarketPack) => string;
  openingPackId: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  sort: MyPacksSortKey;
  onSortChange: (value: MyPacksSortKey) => void;
  packLanguage: PackLanguage;
  onPackLanguageChange: (value: PackLanguage) => void;
  /** Сколько наборов скрыто выбранным языком (0 — ничего не скрыто) и тап «Показать все». */
  hiddenByLanguage?: number;
  onShowAllLanguages?: () => void;
  /** Наборы, добавленные на ДРУГИХ языках изучения (Ревизор Макетов 15.10: es-набор при en не виден и без намёка). Тап — язык раздела (не глобальный). */
  otherLanguages?: ReadonlyArray<{ code: string; count: number }>;
  onSwitchSectionLanguage?: (code: string) => void;
  onBack: () => void;
  onCreate: () => void;
  onOpen: (pack: FlashcardMarketPack) => void;
  /** Запуск тренировки ИМЕННО этого набора (круглая «играть» стопки и «Тренировать» в шторке действий). */
  onTrain: (pack: FlashcardMarketPack) => void;
  onEdit: (pack: FlashcardMarketPack) => void;
  onPublish: (pack: FlashcardMarketPack) => void;
  onDelete: (pack: FlashcardMarketPack) => void;
  onRetry: () => void;
}>;

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { back: 'Назад', menu: 'Меню', created: 'Созданные', added: 'Добавленные', onlyYou: 'Только ты', inCommunity: 'В сообществе', train: 'Тренировать', edit: 'Изменить', share: 'Открыть сообществу', del: 'Удалить набор', emptyTitle: 'Наборов нет', emptyDetail: 'Собери свой первый', create: 'Создать набор', unavailable: 'Сейчас недоступно', retry: 'Попробовать снова', search: 'Поиск', searchPlaceholder: 'Название набора', byName: 'Порядок: по названию', byDate: 'Порядок: по обновлению', language: 'Язык наборов', close: 'Закрыть', none: 'Ничего не найдено', packs: { one: 'набор', few: 'набора', many: 'наборов' }, cards: { one: 'карточка', few: 'карточки', many: 'карточек' } },
  uk: { back: 'Назад', menu: 'Меню', created: 'Створені', added: 'Додані', onlyYou: 'Тільки ти', inCommunity: 'У спільноті', train: 'Тренувати', edit: 'Змінити', share: 'Відкрити спільноті', del: 'Видалити набір', emptyTitle: 'Наборів немає', emptyDetail: 'Збери свій перший', create: 'Створити набір', unavailable: 'Зараз недоступно', retry: 'Спробувати ще', search: 'Пошук', searchPlaceholder: 'Назва набору', byName: 'Порядок: за назвою', byDate: 'Порядок: за оновленням', language: 'Мова наборів', close: 'Закрити', none: 'Нічого не знайдено', packs: { one: 'набір', few: 'набори', many: 'наборів' }, cards: { one: 'картка', few: 'картки', many: 'карток' } },
  en: { back: 'Back', menu: 'Menu', created: 'Created', added: 'Added', onlyYou: 'Only you', inCommunity: 'In the community', train: 'Train', edit: 'Edit', share: 'Share with the community', del: 'Delete pack', emptyTitle: 'No packs yet', emptyDetail: 'Create your first one', create: 'Create pack', unavailable: 'Not available right now', retry: 'Try again', search: 'Search', searchPlaceholder: 'Pack name', byName: 'Order: by name', byDate: 'Order: by update', language: 'Pack language', close: 'Close', none: 'Nothing found', packs: { one: 'pack', few: 'packs', many: 'packs' }, cards: { one: 'card', few: 'cards', many: 'cards' } },
  es: { back: 'Atrás', menu: 'Menú', created: 'Creados', added: 'Añadidos', onlyYou: 'Solo tú', inCommunity: 'En la comunidad', train: 'Entrenar', edit: 'Editar', share: 'Compartir con la comunidad', del: 'Eliminar pack', emptyTitle: 'Aún no hay packs', emptyDetail: 'Crea el primero', create: 'Crear pack', unavailable: 'No disponible ahora', retry: 'Intentar de nuevo', search: 'Buscar', searchPlaceholder: 'Nombre del pack', byName: 'Orden: por nombre', byDate: 'Orden: por actualización', language: 'Idioma de los packs', close: 'Cerrar', none: 'No se encontró nada', packs: { one: 'pack', few: 'packs', many: 'packs' }, cards: { one: 'tarjeta', few: 'tarjetas', many: 'tarjetas' } },
  'pt-BR': { back: 'Voltar', menu: 'Menu', created: 'Criados', added: 'Adicionados', onlyYou: 'Só você', inCommunity: 'Na comunidade', train: 'Treinar', edit: 'Editar', share: 'Abrir para a comunidade', del: 'Excluir pacote', emptyTitle: 'Ainda não há pacotes', emptyDetail: 'Crie o seu primeiro', create: 'Criar pacote', unavailable: 'Indisponível agora', retry: 'Tentar de novo', search: 'Buscar', searchPlaceholder: 'Nome do pacote', byName: 'Ordem: por nome', byDate: 'Ordem: por atualização', language: 'Idioma dos pacotes', close: 'Fechar', none: 'Nada encontrado', packs: { one: 'pacote', few: 'pacotes', many: 'pacotes' }, cards: { one: 'cartão', few: 'cartões', many: 'cartões' } },
  vi: { back: 'Quay lại', menu: 'Menu', created: 'Đã tạo', added: 'Đã thêm', onlyYou: 'Chỉ bạn', inCommunity: 'Trong cộng đồng', train: 'Luyện tập', edit: 'Sửa', share: 'Chia sẻ với cộng đồng', del: 'Xóa bộ thẻ', emptyTitle: 'Chưa có bộ thẻ', emptyDetail: 'Hãy tạo bộ thẻ đầu tiên', create: 'Tạo bộ thẻ', unavailable: 'Hiện chưa khả dụng', retry: 'Thử lại', search: 'Tìm', searchPlaceholder: 'Tên bộ thẻ', byName: 'Thứ tự: theo tên', byDate: 'Thứ tự: theo cập nhật', language: 'Ngôn ngữ bộ thẻ', close: 'Đóng', none: 'Không tìm thấy gì', packs: { one: 'bộ thẻ', few: 'bộ thẻ', many: 'bộ thẻ' }, cards: { one: 'thẻ', few: 'thẻ', many: 'thẻ' } },
  id: { back: 'Kembali', menu: 'Menu', created: 'Dibuat', added: 'Ditambahkan', onlyYou: 'Hanya kamu', inCommunity: 'Di komunitas', train: 'Latihan', edit: 'Ubah', share: 'Bagikan ke komunitas', del: 'Hapus paket', emptyTitle: 'Belum ada paket', emptyDetail: 'Buat paket pertamamu', create: 'Buat paket', unavailable: 'Belum tersedia sekarang', retry: 'Coba lagi', search: 'Cari', searchPlaceholder: 'Nama paket', byName: 'Urutan: nama', byDate: 'Urutan: pembaruan', language: 'Bahasa paket', close: 'Tutup', none: 'Tidak ditemukan', packs: { one: 'paket', few: 'paket', many: 'paket' }, cards: { one: 'kartu', few: 'kartu', many: 'kartu' } },
  tr: { back: 'Geri', menu: 'Menü', created: 'Oluşturulanlar', added: 'Eklenenler', onlyYou: 'Yalnızca sen', inCommunity: 'Toplulukta', train: 'Çalış', edit: 'Düzenle', share: 'Topluluğa aç', del: 'Paketi sil', emptyTitle: 'Henüz paket yok', emptyDetail: 'İlk paketini oluştur', create: 'Paket oluştur', unavailable: 'Şu anda kullanılamıyor', retry: 'Tekrar dene', search: 'Ara', searchPlaceholder: 'Paket adı', byName: 'Sıra: ada göre', byDate: 'Sıra: güncellemeye göre', language: 'Paket dili', close: 'Kapat', none: 'Hiçbir şey bulunamadı', packs: { one: 'paket', few: 'paket', many: 'paket' }, cards: { one: 'kart', few: 'kart', many: 'kart' } },
  pl: { back: 'Wstecz', menu: 'Menu', created: 'Utworzone', added: 'Dodane', onlyYou: 'Tylko ty', inCommunity: 'W społeczności', train: 'Trenuj', edit: 'Zmień', share: 'Udostępnij społeczności', del: 'Usuń zestaw', emptyTitle: 'Brak zestawów', emptyDetail: 'Utwórz swój pierwszy', create: 'Utwórz zestaw', unavailable: 'Teraz niedostępne', retry: 'Spróbuj ponownie', search: 'Szukaj', searchPlaceholder: 'Nazwa zestawu', byName: 'Kolejność: po nazwie', byDate: 'Kolejność: po aktualizacji', language: 'Język zestawów', close: 'Zamknij', none: 'Nic nie znaleziono', packs: { one: 'zestaw', few: 'zestawy', many: 'zestawów' }, cards: { one: 'karta', few: 'karty', many: 'kart' } },
});

const isPublished = (pack: FlashcardMarketPack): boolean => pack.listingStatus === 'published' || pack.listingStatus === 'update_pending';

function MyPacksV2Inner(props: Props) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const g = useLv2Glass();
  // зачем (замечание владельца 10.10): цвета — токены выбранной темы, стили пересобираются при смене темы.
  const styles = useScaledTextStyles(useMemo(() => makeStyles(g), [g]));
  const { lang, created, added, totalCount, status, labelFor, openingPackId, query, onQueryChange, sort, onSortChange, packLanguage, onPackLanguageChange, hiddenByLanguage = 0, onShowAllLanguages, otherLanguages = [], onSwitchSectionLanguage, onBack, onCreate, onOpen, onTrain, onEdit, onPublish, onDelete, onRetry } = props;
  const { theme: t } = useTheme();
  const insets = useStableSafeAreaInsets();
  const copy = useMemo(() => copyFor(lang), [lang]);
  // зачем: заглушка — высота стопки без чипов слов: 12 (стопка) + 16 + название 26 + подпись 21 + 16 (без прыжка, когда наборы пришли).
  const skeletonH = 91;
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState<FlashcardMarketPack | null>(null);
  const showSearch = searchOpen || query.length > 0;
  const closeActions = () => setActionsFor(null);
  const runAction = (action: (pack: FlashcardMarketPack) => void) => () => {
    const pack = actionsFor;
    closeActions();
    if (pack) action(pack);
  };
  const actionsOwn = actionsFor ? created.some((item) => item.id === actionsFor.id) : false;

  // зачем (владелец 12.10, cards-v2 mySets()): набор — «стопка» (общий PackDeck): название, «40 · A2», три чипа слов, круглая «играть»;
  // у добавленных — аватар и имя автора. Уровень и первые слова читаются из полей набора, пока их нет — скрыты (ждём от Ядра).
  // Автор добавленного набора — без чтения сети: официальный → «Professor Lingman», иначе ник из каталога или фолбэк.
  const reviewNote = triLang(lang, {
    ru: 'На проверке', uk: 'На перевірці', en: 'In review', es: 'En revisión',
    'pt-BR': 'Em revisão', vi: 'Đang duyệt', id: 'Sedang ditinjau', tr: 'İncelemede', pl: 'W trakcie sprawdzania',
  });
  // зачем (координатор 11.10, «сперва лог», ночная задача Карточек п.6): у добавленного набора на снимке не было подписи автора. Лог показывает ОТКУДА
  // берётся подпись: официальный набор, ник из документа набора или нейтральный фолбэк (поля ника нет). Без имён и uid — только наличие и длина.
  const authorSource = (pack: FlashcardMarketPack): 'official' | 'nick' | 'fallback' => {
    if (officialPackAuthorName(pack)) return 'official';
    return communityAuthorLabel(pack.authorName ?? '', lang) === communityAuthorLabel('', lang) ? 'fallback' : 'nick';
  };
  const addedAuthorKey = added.map((pack) => `${pack.id}:${authorSource(pack)}`).join('|');
  useEffect(() => {
    if (added.length === 0) return;
    const rows = added.map((pack) => ({
      id: pack.id,
      source: authorSource(pack),
      hasAuthorName: typeof pack.authorName === 'string' && pack.authorName.trim().length > 0,
      authorNameLen: typeof pack.authorName === 'string' ? pack.authorName.trim().length : 0,
      hasAuthorStableId: typeof pack.authorStableId === 'string' && pack.authorStableId.trim().length > 0,
    }));
    console.log('[MYPACKS-AUTHOR] added', JSON.stringify({ count: added.length, fallback: rows.filter((r) => r.source === 'fallback').length, rows })); // guard-ok: трассировка, без имён и uid
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: ключ состава и источника подписи, а не ссылка на массив
  }, [addedAuthorKey]);
  const row = (pack: FlashcardMarketPack, own: boolean) => {
    const title = labelFor(pack);
    const authorName = own ? null : (officialPackAuthorName(pack) ?? communityAuthorLabel(pack.authorName ?? '', lang));
    return (
      <PackDeck
        key={pack.id}
        g={g}
        lang={lang}
        title={title}
        count={pack.cardCount}
        level={packDeckLevel(pack)}
        words={packDeckWords(pack)}
        author={authorName ? { name: authorName } : null}
        note={pack.isPendingUpdateReview ? reviewNote : null}
        trailing={<PackDeckPlayButton g={g} label={copy.train} testID={`fc-my-packs-pack-play-${pack.id}`} disabled={openingPackId !== null} onPress={() => { void hapticTap(); onTrain(pack); }} />}
        accessibilityLabel={`${formatPackTitleForDisplay(title)}${authorName ? `, ${authorName}` : ''}, ${pack.cardCount}${pack.isPendingUpdateReview ? `, ${reviewNote}` : ''}`}
        testID={`fc-my-packs-pack-${pack.id}`}
        disabled={openingPackId !== null}
        onPress={() => onOpen(pack)}
        onLongPress={() => setActionsFor(pack)}
      />
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled" decelerationRate="fast">
        <PackTopBarRow
          left={<PackBackBare g={g} onPress={onBack} label={copy.back} testID="mp-back" />}
          right={(
            <>
              <PackSquareButton g={g} testID="fc-my-packs-menu" label={copy.menu} onPress={() => setMenuOpen(true)} />
              {/* зачем (cards-v2 mySetsEmpty): в пустом состоянии «+» в шапке нет — единственная кнопка «Создать набор» стоит в центре экрана */}
              {status === 'empty' ? null : <PackRoundButton g={g} testID="fc-my-packs-create-top" icon="add" label={copy.create} onPress={onCreate} />}
            </>
          )}
        />
        <PackScreenTitle g={g} title={titleFor(lang)} count={totalCount > 0 ? totalCount : null} testID="fc-my-packs-title" />
        {showSearch ? (
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={g.mutedText} />
            <TextInput
              testID="fc-my-packs-search"
              accessibilityLabel={copy.search}
              value={query}
              onChangeText={onQueryChange}
              placeholder={copy.searchPlaceholder}
              placeholderTextColor={g.mutedText}
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={[styles.searchInput, { color: g.text }]}
            />
            {query.length > 0 ? (
              <Pressable testID="fc-my-packs-search-clear" accessibilityRole="button" accessibilityLabel={copy.close} hitSlop={10} onPress={() => onQueryChange('')}>
                <Ionicons name="close" size={18} color={g.mutedText} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {status === 'loading' ? (
          <View testID="fc-my-packs-loading" style={styles.loading}>
            {[0, 1, 2].map((index) => <View key={index} /* guard-ok: три статичные заглушки */ style={[styles.skeleton, { height: skeletonH }]} />)}
          </View>
        ) : null}

        {(status === 'list' || status === 'empty') && otherLanguages.length > 0 && onSwitchSectionLanguage ? (
          // зачем (Ревизор Макетов 15.10): при языке en набор на es не показывался и «Наборов нет» не объясняло почему — честная строка и переключение ЯЗЫКА РАЗДЕЛА (не глобального)
          <Pressable testID="fc-my-packs-other-languages" accessibilityRole="button" onPress={() => onSwitchSectionLanguage(otherLanguages[0].code)} style={({ pressed }) => [styles.hiddenRow, pressed && styles.pressed]}>
            <Text style={[styles.hiddenText, { color: g.secondary }]}>
              {triLang(lang, {
                ru: `Есть наборы на других языках: ${otherLanguages.map((item) => `${item.code.toUpperCase()} ${item.count}`).join(', ')}`,
                uk: `Є набори іншими мовами: ${otherLanguages.map((item) => `${item.code.toUpperCase()} ${item.count}`).join(', ')}`,
                en: `Packs in other languages: ${otherLanguages.map((item) => `${item.code.toUpperCase()} ${item.count}`).join(', ')}`,
                es: `Hay packs en otros idiomas: ${otherLanguages.map((item) => `${item.code.toUpperCase()} ${item.count}`).join(', ')}`,
                'pt-BR': `Há pacotes em outros idiomas: ${otherLanguages.map((item) => `${item.code.toUpperCase()} ${item.count}`).join(', ')}`,
                vi: `Có bộ thẻ ở ngôn ngữ khác: ${otherLanguages.map((item) => `${item.code.toUpperCase()} ${item.count}`).join(', ')}`,
                id: `Ada paket di bahasa lain: ${otherLanguages.map((item) => `${item.code.toUpperCase()} ${item.count}`).join(', ')}`,
                tr: `Başka dillerde paketler var: ${otherLanguages.map((item) => `${item.code.toUpperCase()} ${item.count}`).join(', ')}`,
                pl: `Są zestawy w innych językach: ${otherLanguages.map((item) => `${item.code.toUpperCase()} ${item.count}`).join(', ')}`,
              })}
            </Text>
            <Text style={[styles.hiddenAction, { color: g.text }]}>
              {triLang(lang, { ru: 'Показать', uk: 'Показати', en: 'Show', es: 'Mostrar', 'pt-BR': 'Mostrar', vi: 'Hiện', id: 'Tampilkan', tr: 'Göster', pl: 'Pokaż' })}
            </Text>
          </Pressable>
        ) : null}
        {status === 'list' && hiddenByLanguage > 0 && onShowAllLanguages ? (
          // зачем (координатор 15.10, R27): набор другого языка не пропадает молча — над списком честная строка со счётчиком и кнопкой «Показать все»
          <Pressable testID="fc-my-packs-hidden-language" accessibilityRole="button" onPress={onShowAllLanguages} style={({ pressed }) => [styles.hiddenRow, pressed && styles.pressed]}>
            <Text style={[styles.hiddenText, { color: g.secondary }]}>
              {triLang(lang, {
                ru: `Скрыто ${hiddenByLanguage}: другой язык`, uk: `Приховано ${hiddenByLanguage}: інша мова`, en: `${hiddenByLanguage} hidden: other language`,
                es: `${hiddenByLanguage} ocultos: otro idioma`, 'pt-BR': `${hiddenByLanguage} ocultos: outro idioma`, vi: `Đã ẩn ${hiddenByLanguage}: ngôn ngữ khác`,
                id: `${hiddenByLanguage} disembunyikan: bahasa lain`, tr: `${hiddenByLanguage} gizli: başka dil`, pl: `Ukryto ${hiddenByLanguage}: inny język`,
              })}
            </Text>
            <Text style={[styles.hiddenAction, { color: g.text }]}>
              {triLang(lang, { ru: 'Показать все', uk: 'Показати всі', en: 'Show all', es: 'Mostrar todos', 'pt-BR': 'Mostrar todos', vi: 'Hiện tất cả', id: 'Tampilkan semua', tr: 'Tümünü göster', pl: 'Pokaż wszystkie' })}
            </Text>
          </Pressable>
        ) : null}
        {/* зачем (cards-v2 mySets()): один список стопок без разделов — свои, затем добавленные (у них аватар автора). */}
        {status === 'list' && created.length + added.length > 0 ? (
          <View testID="fc-my-packs-section-created" style={styles.stack}>
            {created.map((pack) => row(pack, true))}
            {added.map((pack) => row(pack, false))}
          </View>
        ) : null}
        {status === 'list' && created.length === 0 && added.length === 0 ? (
          <Text style={[styles.none, { color: g.secondary }]}>{copy.none}</Text>
        ) : null}
      </ScrollView>

      {status === 'empty' ? (
        <KitEmpty g={g} testID="fc-my-packs-empty" icon="layers-outline" title={copy.emptyTitle} detail={copy.emptyDetail} action={copy.create} actionIcon="add" onAction={onCreate} actionTestID="fc-my-packs-create" />
      ) : null}
      {status === 'unavailable' ? (
        <KitEmpty g={g} testID="fc-my-packs-unavailable" icon="layers-outline" title={copy.unavailable} detail="" action={copy.retry} onAction={onRetry} actionTestID="fc-my-packs-try-again" />
      ) : null}
      <PanelSheet visible={menuOpen} onClose={() => setMenuOpen(false)} testID="fc-my-packs-menu-sheet">
        <SheetRow g={g} testID="fc-my-packs-menu-search" icon="search-outline" title={copy.search} onPress={() => { setMenuOpen(false); setSearchOpen(true); }} />
        <SheetRow
          g={g}
          testID="fc-my-packs-sort-toggle"
          icon={sort === 'updated' ? 'time-outline' : 'text-outline'}
          title={sort === 'updated' ? copy.byDate : copy.byName}
          onPress={() => { onSortChange(sort === 'updated' ? 'name' : 'updated'); }}
        />
        <View style={styles.langRow}>
          <Text style={[styles.langLabel, { color: g.secondary }]}>{copy.language}</Text>
          <PackLanguagePicker lang={lang} t={t} value={packLanguage} onChange={onPackLanguageChange} />
        </View>
      </PanelSheet>

      <PanelSheet visible={actionsFor !== null} onClose={closeActions} testID="fc-my-packs-actions-sheet">
        {actionsFor ? (
          <>
            <View style={styles.sheetHead}>
              <View style={styles.sheetHeadText}>
                <Text style={[styles.sheetTitle, { color: g.text }]}>{labelFor(actionsFor)}</Text>
                <Text style={[styles.sheetSub, { color: g.secondary }]}>{`${actionsFor.cardCount} ${pluralWord(lang, actionsFor.cardCount, copy.cards)}`}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={copy.close} hitSlop={8} onPress={closeActions} style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}>
                <Ionicons name="close" size={18} color={g.text} />
              </Pressable>
            </View>
            <SheetRow g={g} testID="fc-my-packs-action-train" icon="flash-outline" title={copy.train} onPress={() => { closeActions(); onTrain(actionsFor); }} />
            {actionsOwn ? <SheetRow g={g} testID={`fc-my-packs-pack-edit-${actionsFor.id}`} icon="create-outline" title={copy.edit} onPress={runAction(onEdit)} /> : null}
            {actionsOwn && !isPublished(actionsFor) ? <SheetRow g={g} testID="fc-my-packs-action-share" icon="share-outline" title={copy.share} onPress={runAction(onPublish)} /> : null}
            {/* зачем (R1_DIFF_ONE_FIX, cards-section-010): «Удалить набор» красный, как в шторке экрана набора и в макете — разрушительное действие */}
            <SheetRow g={g} testID={`fc-my-packs-pack-delete-${actionsFor.id}`} icon={actionsOwn ? 'trash-outline' : 'remove-circle-outline'} title={actionsOwn ? copy.del : triLang(lang, { ru: 'Убрать из моих', uk: 'Прибрати з моїх', en: 'Remove from mine', es: 'Quitar de mis packs', 'pt-BR': 'Remover dos meus', vi: 'Bỏ khỏi bộ của tôi', id: 'Hapus dari milikku', tr: 'Benimkilerden çıkar', pl: 'Usuń z moich' })} danger onPress={runAction(onDelete)} />
          </>
        ) : null}
      </PanelSheet>
    </View>
  );
}

const titleFor = (lang: Lang): string => triLang(lang, {
  ru: 'Мои наборы', uk: 'Мої набори', en: 'My packs', es: 'Mis packs', 'pt-BR': 'Meus pacotes', vi: 'Bộ thẻ của tôi', id: 'Paket saya', tr: 'Paketlerim', pl: 'Moje zestawy',
});

export const MyPacksV2 = memo(MyPacksV2Inner);

const makeStyles = (g: ReturnType<typeof useLv2Glass>) => StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pressed: { opacity: 0.82 },
  search: { marginTop: 22, minHeight: 46, borderRadius: 23, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: g.hairlineSoft },
  searchInput: { flex: 1, minWidth: 0, fontSize: 16, paddingVertical: 0 },
  stack: { marginTop: 22, gap: 14 }, // зачем: `.stack.g14` макета mySets() — 14 между стопками, 22 от заголовка (тень «дышит» ≥ 10)
  loading: { marginTop: 22, gap: 14 },
  skeleton: { borderRadius: 20, backgroundColor: g.hairlineSoft },
  none: { marginTop: 30, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  hiddenRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 44, paddingVertical: 8 },
  hiddenText: { flex: 1, fontSize: 13, lineHeight: 17 },
  hiddenAction: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  langRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  langLabel: { fontSize: 16, lineHeight: 20 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 18 },
  sheetHeadText: { flex: 1, minWidth: 0 },
  sheetTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  sheetSub: { marginTop: 4, fontSize: 16, lineHeight: 20 },
  closeBtn: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: g.opaqueControl },
});
