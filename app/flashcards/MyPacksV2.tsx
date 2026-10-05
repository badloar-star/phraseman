/**
 * «Мои наборы» — вид по макету docs/design/v2-app/cards-section.html (кадры «Список», «Действия с набором», «Пусто»).
 *
 * зачем (владелец: «в приложении запрещены любые различия с одобренными макетами»): строки-карточки вместо сетки плиток,
 * разделы «Созданные» / «Добавленные» с числами, внизу мятная «Создать набор», долгое нажатие на набор открывает шторку действий.
 * Всё, что в макете не нарисовано, но в продукте есть (поиск, порядок, язык наборов), живёт в шторке «⋯» шапки — так же,
 * как на списке «Сохранённые». Логика экрана (загрузка, открытие, удаление, оптимистичный откат) остаётся в flashcards_my_packs.tsx.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';

import { KitCta, KitEmpty, KitPackRow, KitSectionHead, KitTitle } from '../../components/cards-grid/CardsKit';
import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { BackButton, PanelDock, SheetRow } from '../../components/mistakes-panel/PanelKit';
import { PanelSheet } from '../../components/mistakes-panel/PanelSheet';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { useTheme } from '../../components/ThemeContext';
import { triLang, type Lang } from '../../constants/i18n';
import { pluralWord } from '../../constants/plural';
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
  onBack: () => void;
  onCreate: () => void;
  onOpen: (pack: FlashcardMarketPack) => void;
  onTrain: () => void;
  onEdit: (pack: FlashcardMarketPack) => void;
  onPublish: (pack: FlashcardMarketPack) => void;
  onDelete: (pack: FlashcardMarketPack) => void;
  onRetry: () => void;
}>;

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { back: 'Назад', menu: 'Меню', created: 'Созданные', added: 'Добавленные', onlyYou: 'Только вы', inCommunity: 'В сообществе', train: 'Тренировать', edit: 'Изменить', share: 'Открыть сообществу', del: 'Удалить набор', emptyTitle: 'Наборов пока нет', emptyDetail: 'Создайте свой первый', create: 'Создать набор', unavailable: 'Сейчас недоступно', retry: 'Попробовать снова', search: 'Поиск', searchPlaceholder: 'Название набора', byName: 'Порядок: по названию', byDate: 'Порядок: по обновлению', language: 'Язык наборов', close: 'Закрыть', none: 'Ничего не найдено', packs: { one: 'набор', few: 'набора', many: 'наборов' }, cards: { one: 'карточка', few: 'карточки', many: 'карточек' } },
  uk: { back: 'Назад', menu: 'Меню', created: 'Створені', added: 'Додані', onlyYou: 'Тільки ви', inCommunity: 'У спільноті', train: 'Тренувати', edit: 'Змінити', share: 'Відкрити спільноті', del: 'Видалити набір', emptyTitle: 'Наборів поки немає', emptyDetail: 'Створіть свій перший', create: 'Створити набір', unavailable: 'Зараз недоступно', retry: 'Спробувати ще', search: 'Пошук', searchPlaceholder: 'Назва набору', byName: 'Порядок: за назвою', byDate: 'Порядок: за оновленням', language: 'Мова наборів', close: 'Закрити', none: 'Нічого не знайдено', packs: { one: 'набір', few: 'набори', many: 'наборів' }, cards: { one: 'картка', few: 'картки', many: 'карток' } },
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
  const styles = useScaledTextStyles(baseStyles);
  const { lang, created, added, totalCount, status, labelFor, openingPackId, query, onQueryChange, sort, onSortChange, packLanguage, onPackLanguageChange, onBack, onCreate, onOpen, onTrain, onEdit, onPublish, onDelete, onRetry } = props;
  const g = useLv2Glass();
  const { theme: t } = useTheme();
  const insets = useStableSafeAreaInsets();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [actionsFor, setActionsFor] = useState<FlashcardMarketPack | null>(null);
  const subtitle = totalCount > 0 ? `${totalCount} ${pluralWord(lang, totalCount, copy.packs)}` : null;
  const showSearch = searchOpen || query.length > 0;
  const closeActions = () => setActionsFor(null);
  const runAction = (action: (pack: FlashcardMarketPack) => void) => () => {
    const pack = actionsFor;
    closeActions();
    if (pack) action(pack);
  };
  const actionsOwn = actionsFor ? created.some((item) => item.id === actionsFor.id) : false;

  const row = (pack: FlashcardMarketPack, own: boolean) => (
    <KitPackRow
      key={pack.id}
      g={g}
      icon={own ? 'layers-outline' : 'people-outline'}
      title={labelFor(pack)}
      subtitle={own ? (isPublished(pack) ? copy.inCommunity : copy.onlyYou) : (pack.authorName ?? '')}
      count={pack.cardCount}
      testID={`fc-my-packs-pack-${pack.id}`}
      disabled={openingPackId !== null}
      onPress={() => onOpen(pack)}
      onLongPress={() => setActionsFor(pack)}
    />
  );

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 120 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <BackButton g={g} onPress={onBack} label={copy.back} />
          <Pressable testID="fc-my-packs-menu" accessibilityRole="button" accessibilityLabel={copy.menu} hitSlop={8} onPress={() => setMenuOpen(true)} style={({ pressed }) => [styles.square, pressed && styles.pressed]}>
            <Ionicons name="ellipsis-vertical" size={18} color={g.text} />
          </Pressable>
        </View>
        <KitTitle g={g} title={titleFor(lang)} subtitle={subtitle} testID="fc-my-packs-title" />
        {showSearch ? (
          <View style={styles.search}>
            <Ionicons name="search" size={18} color="#6E6E72" />
            <TextInput
              testID="fc-my-packs-search"
              accessibilityLabel={copy.search}
              value={query}
              onChangeText={onQueryChange}
              placeholder={copy.searchPlaceholder}
              placeholderTextColor="#6E6E72"
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              style={[styles.searchInput, { color: g.text }]}
            />
            {query.length > 0 ? (
              <Pressable testID="fc-my-packs-search-clear" accessibilityRole="button" accessibilityLabel={copy.close} hitSlop={10} onPress={() => onQueryChange('')}>
                <Ionicons name="close" size={18} color="#6E6E72" />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {status === 'loading' ? (
          <View testID="fc-my-packs-loading" style={styles.loading}>
            {[0, 1, 2].map((index) => <View key={index} /* guard-ok: три статичные заглушки */ style={styles.skeleton} />)}
          </View>
        ) : null}

        {status === 'list' && created.length > 0 ? (
          <>
            <KitSectionHead g={g} title={copy.created} count={created.length} />
            <View testID="fc-my-packs-section-created" style={styles.stack}>{created.map((pack) => row(pack, true))}</View>
          </>
        ) : null}
        {status === 'list' && added.length > 0 ? (
          <>
            <KitSectionHead g={g} title={copy.added} count={added.length} />
            <View testID="fc-my-packs-section-added" style={styles.stack}>{added.map((pack) => row(pack, false))}</View>
          </>
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
      {status === 'list' || status === 'loading' ? (
        <PanelDock>
          <View style={styles.dock}>
            <KitCta g={g} label={copy.create} icon="add" onPress={onCreate} testID="fc-my-packs-create" />
          </View>
        </PanelDock>
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
            <SheetRow g={g} testID="fc-my-packs-action-train" icon="flash-outline" title={copy.train} onPress={() => { closeActions(); onTrain(); }} />
            {actionsOwn ? <SheetRow g={g} testID={`fc-my-packs-pack-edit-${actionsFor.id}`} icon="create-outline" title={copy.edit} onPress={runAction(onEdit)} /> : null}
            {actionsOwn && !isPublished(actionsFor) ? <SheetRow g={g} testID="fc-my-packs-action-share" icon="share-outline" title={copy.share} onPress={runAction(onPublish)} /> : null}
            <SheetRow g={g} testID={`fc-my-packs-pack-delete-${actionsFor.id}`} icon="trash-outline" title={copy.del} onPress={runAction(onDelete)} />
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

const baseStyles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20 },
  pressed: { opacity: 0.82 },
  top: { minHeight: 44, marginTop: 4, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  square: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.07)' },
  search: { marginTop: 22, minHeight: 46, borderRadius: 23, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.07)' },
  searchInput: { flex: 1, minWidth: 0, fontSize: 16, paddingVertical: 0 },
  stack: { gap: 9 },
  loading: { marginTop: 30, gap: 9 },
  skeleton: { height: 65, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)' },
  none: { marginTop: 30, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  dock: { paddingHorizontal: 20 },
  langRow: { marginTop: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 },
  langLabel: { fontSize: 15, lineHeight: 20 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4, paddingBottom: 18 },
  sheetHeadText: { flex: 1, minWidth: 0 },
  sheetTitle: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  sheetSub: { marginTop: 4, fontSize: 15, lineHeight: 20 },
  closeBtn: { width: 35, height: 35, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A2A2C' },
});
