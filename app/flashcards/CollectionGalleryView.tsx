/**
 * Список карточек «галереей» — вид списка по макету docs/design/v2-app/cards-v2.html (кадры «Сохранённые» 1/2/3/5 колонок, «Поиск», «Удалено — вернуть»).
 *
 * зачем (Карточки 2.0, владелец 12.10): плитки в сетке из четырёх остановок (1 / 2 / 3 / 5 колонок), шаг меняют щипок двумя пальцами и ползунок
 * над сеткой; выбранный шаг запоминается. Тап по плитке открывает карточку (нижняя шторка), долгое нажатие и «⋯» — действия с карточкой
 * (изменить, удалить; удаление с «Вернуть» делает контейнер), «Тренировать» — плавающая кнопка внизу. Поиск открывается в полосе масштаба,
 * результаты идут в две колонки без строки «Найдено». Выбор нескольких карточек, строка лимита Free и подсказка про удаление остались.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';

import { CardsGallery, type GalleryCard } from '../../components/cards-grid/CardsGallery';
import { useCardsGridStep } from '../../components/cards-grid/useCardsScale';
import { ZoomBar } from '../../components/cards-grid/ZoomBar';
import { GALLERY_DEFAULT_STEP } from '../../components/cards-grid/cardsGalleryLayout';
import ReportErrorButton from '../../components/ReportErrorButton';
import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { PanelCta, PanelDock, SheetRow } from '../../components/mistakes-panel/PanelKit';
import { actionBoxShadow } from '../../components/v2/ShadowSurface';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { PanelSheet } from '../../components/mistakes-panel/PanelSheet';
import { triLang } from '../../constants/i18n';
import { hapticTap } from '../../hooks/use-haptics';
import { noteSwallowedHandler } from '../swallow_log';
import { resolveFlashcardBackText, type CardItem, type FlashcardContentLang } from './types';

type Props = Readonly<{
  cards: readonly CardItem[];
  lang: FlashcardContentLang;
  /** Заголовочный блок (название, число карточек, поиск) — едет вместе со списком. */
  header: React.ReactNode;
  hiddenByLimitCount: number;
  onOpenPremiumLimit: () => void;
  onOpenCard: (id: string) => void;
  onSpeak: (text: string) => void;
  /** Совместимость с контейнером: «силы слова» на плитке больше нет (макет cards-v2, решение координатора 12.10). */
  strengthForCard?: unknown;
  onCardsViewed: (ids: string[]) => void;
  isEditableCustomCard: (item: CardItem) => boolean;
  onEditCard: (item: CardItem) => void;
  onDeleteCardById: (cardId: string, fallbackIdx?: number) => void | Promise<void>;
  selectionMode: boolean;
  selectedIds: ReadonlySet<string>;
  onToggleSelection: (id: string) => void;
  selectedCount: number;
  canCreatePack: boolean;
  selectionRemaining?: number;
  onCreatePack: () => void;
  onDeleteSelected: () => void;
  showDeleteHint: boolean;
  onSetShowDeleteHint: (value: boolean) => void;
  /** «Тренировать» — плавающая кнопка; null — кнопки нет (режим выбора, пустой список). */
  onTrain: (() => void) | null;
  allowAddCustomCard: boolean;
  onCreateCard: () => void;
  activeCat: string;
  /** Запрос поиска: при нём список — две колонки (без строки «Найдено»), совпадение подчёркнуто. */
  searchQuery: string;
  /** Поле поиска для полосы масштаба (макет «Поиск»); null — поиск закрыт. */
  searchField?: React.ReactNode;
  /** Отступ сетки от шапки; у экрана набора её роль играет подпись «Карточки N» (0). */
  gridTopGap?: number;
}>;

const SIDE = 20;

const copyFor = (lang: FlashcardContentLang) => triLang(lang, {
  ru: { train: 'Тренировать', speak: 'Озвучить', edit: 'Изменить', del: 'Удалить', hint: 'Зажми карточку, чтобы изменить или удалить её', hidden: (n: number) => `+${n} карточек скрыто`, free: 'Бесплатно доступны первые 50 сохранённых карточек', plus: 'Открыть все с Plus', createPack: 'Создать набор', deleteSel: 'Удалить', more: (n: number) => `Выбери ещё ${n} карточек, чтобы создать набор`, add: 'Добавить карточку', close: 'Закрыть' },
  uk: { train: 'Тренувати', speak: 'Озвучити', edit: 'Змінити', del: 'Видалити', hint: 'Затисни картку, щоб змінити або видалити її', hidden: (n: number) => `+${n} карток приховано`, free: 'Безкоштовно доступні перші 50 збережених карток', plus: 'Відкрити все з Plus', createPack: 'Створити набір', deleteSel: 'Видалити', more: (n: number) => `Познач ще ${n} карток, щоб створити набір`, add: 'Додати картку', close: 'Закрити' },
  en: { train: 'Practise', speak: 'Listen', edit: 'Edit', del: 'Delete', hint: 'Hold a card to edit or delete it', hidden: (n: number) => `+${n} cards hidden`, free: 'The first 50 saved cards are free', plus: 'Unlock all with Plus', createPack: 'Create a pack', deleteSel: 'Delete', more: (n: number) => `Select ${n} more cards to create a pack`, add: 'Add a card', close: 'Close' },
  es: { train: 'Entrenar', speak: 'Escuchar', edit: 'Editar', del: 'Eliminar', hint: 'Mantén pulsada la tarjeta para editarla o eliminarla', hidden: (n: number) => `+${n} tarjetas ocultas`, free: 'Gratis: las primeras 50 tarjetas guardadas', plus: 'Desbloquear todo con Plus', createPack: 'Crear un set', deleteSel: 'Eliminar', more: (n: number) => `Elige ${n} tarjetas más para crear un pack`, add: 'Añadir tarjeta', close: 'Cerrar' },
  'pt-BR': { train: 'Treinar', speak: 'Ouvir', edit: 'Editar', del: 'Excluir', hint: 'Segure o cartão para editar ou excluir', hidden: (n: number) => `+${n} cartões ocultos`, free: 'Grátis: os primeiros 50 cartões salvos', plus: 'Desbloquear tudo com Plus', createPack: 'Criar um conjunto', deleteSel: 'Excluir', more: (n: number) => `Escolha mais ${n} cartões para criar um pacote`, add: 'Adicionar cartão', close: 'Fechar' },
  vi: { train: 'Luyện tập', speak: 'Nghe', edit: 'Sửa', del: 'Xóa', hint: 'Giữ thẻ để sửa hoặc xóa', hidden: (n: number) => `+${n} thẻ bị ẩn`, free: 'Miễn phí: 50 thẻ đã lưu đầu tiên', plus: 'Mở tất cả với Plus', createPack: 'Tạo bộ thẻ', deleteSel: 'Xóa', more: (n: number) => `Chọn thêm ${n} thẻ để tạo bộ thẻ`, add: 'Thêm thẻ', close: 'Đóng' },
  id: { train: 'Latihan', speak: 'Dengar', edit: 'Ubah', del: 'Hapus', hint: 'Tahan kartu untuk mengubah atau menghapusnya', hidden: (n: number) => `+${n} kartu disembunyikan`, free: 'Gratis: 50 kartu tersimpan pertama', plus: 'Buka semua dengan Plus', createPack: 'Buat set', deleteSel: 'Hapus', more: (n: number) => `Pilih ${n} kartu lagi untuk membuat paket`, add: 'Tambah kartu', close: 'Tutup' },
  tr: { train: 'Çalış', speak: 'Dinle', edit: 'Düzenle', del: 'Sil', hint: 'Düzenlemek veya silmek için kartı basılı tut', hidden: (n: number) => `+${n} kart gizli`, free: 'Ücretsiz: kaydedilen ilk 50 kart', plus: 'Plus ile tümünü aç', createPack: 'Set oluştur', deleteSel: 'Sil', more: (n: number) => `Paket oluşturmak için ${n} kart daha seç`, add: 'Kart ekle', close: 'Kapat' },
  pl: { train: 'Ćwicz', speak: 'Posłuchaj', edit: 'Edytuj', del: 'Usuń', hint: 'Przytrzymaj kartę, aby ją edytować lub usunąć', hidden: (n: number) => `+${n} kart ukrytych`, free: 'Za darmo: pierwsze 50 zapisanych kart', plus: 'Odblokuj wszystko z Plus', createPack: 'Utwórz zestaw', deleteSel: 'Usuń', more: (n: number) => `Wybierz jeszcze ${n} kart, aby utworzyć zestaw`, add: 'Dodaj kartę', close: 'Zamknij' },
});

const zoomCopyFor = (lang: FlashcardContentLang) => triLang(lang, {
  ru: { smaller: 'Мельче', larger: 'Крупнее', more: 'Ещё' },
  uk: { smaller: 'Дрібніше', larger: 'Крупніше', more: 'Ще' },
  en: { smaller: 'Smaller', larger: 'Larger', more: 'More' },
  es: { smaller: 'Más pequeño', larger: 'Más grande', more: 'Más' },
  'pt-BR': { smaller: 'Menor', larger: 'Maior', more: 'Mais' },
  vi: { smaller: 'Nhỏ hơn', larger: 'Lớn hơn', more: 'Thêm' },
  id: { smaller: 'Lebih kecil', larger: 'Lebih besar', more: 'Lainnya' },
  tr: { smaller: 'Daha küçük', larger: 'Daha büyük', more: 'Daha fazla' },
  pl: { smaller: 'Mniejsze', larger: 'Większe', more: 'Więcej' },
});

/** Во время поиска результаты идут в две колонки (макет «Поиск», шаг 1). */
const SEARCH_STEP = GALLERY_DEFAULT_STEP;
const TAG = '[CARDS-ZOOM]';

export default function CollectionGalleryView({
  cards, lang, header, hiddenByLimitCount, onOpenPremiumLimit, onOpenCard, onSpeak, onCardsViewed,
  isEditableCustomCard, onEditCard, onDeleteCardById, selectionMode, selectedIds, onToggleSelection, selectedCount, canCreatePack,
  selectionRemaining, onCreatePack, onDeleteSelected, showDeleteHint, onSetShowDeleteHint, onTrain, allowAddCustomCard, onCreateCard, activeCat, searchQuery, searchField, gridTopGap,
}: Props) {
  const g = useLv2Glass();
  const copy = useMemo(() => copyFor(lang), [lang]);
  const zoomCopy = useMemo(() => zoomCopyFor(lang), [lang]);
  const insets = useStableSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const width = screenW - SIDE * 2;
  const scrollRef = useRef<ScrollView>(null);
  // точная прокрутка и верх сетки в содержимом — для докрутки «карточка под пальцами остаётся на месте»
  const scrollYRef = useRef(0);
  const gridTopRef = useRef(260);
  const [scrollY, setScrollY] = useState(0);
  const [gridTop, setGridTop] = useState(260);
  const [pressedId, setPressedId] = useState<string | null>(null);
  const viewedRef = useRef<string>('');

  const items = useMemo<GalleryCard[]>(() => cards.map((card) => ({ id: card.id, front: card.en, back: resolveFlashcardBackText(card, lang) })), [cards, lang]);
  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);

  const { step, setStep, gesture, morph, morphFrom } = useCardsGridStep({
    count: items.length,
    width,
    viewportH: screenH,
    sideInset: SIDE,
    getGridTop: () => gridTopRef.current,
    getScrollY: () => scrollYRef.current,
    scrollTo: (y) => {
      // зачем: докрутка при смене шага — мгновенная (плитки перетекают от прежних позиций с учётом этого сдвига)
      scrollYRef.current = y;
      scrollRef.current?.scrollTo({ y, animated: false });
    },
  });

  // зачем (макет cards-v2 «Поиск»): пока идёт поиск, результаты — две колонки; после очистки возвращается шаг, который человек выбрал сам
  // (во время поиска шаг не запоминаем — это временный вид, а не выбор руки).
  const searching = searchQuery.trim().length > 0;
  const beforeSearchStep = useRef<number | null>(null);
  const stepNow = useRef(step);
  stepNow.current = step;
  useEffect(() => {
    if (searching && beforeSearchStep.current === null) {
      beforeSearchStep.current = stepNow.current;
      console.log(`${TAG} поиск начат: шаг ${stepNow.current} → ${SEARCH_STEP}`);
      if (stepNow.current !== SEARCH_STEP) setStep(SEARCH_STEP, undefined, 'поиск', false);
    } else if (!searching && beforeSearchStep.current !== null) {
      const back = beforeSearchStep.current;
      beforeSearchStep.current = null;
      console.log(`${TAG} поиск окончен: возвращаем шаг ${back}`);
      if (back !== stepNow.current) setStep(back, undefined, 'поиск-конец', false);
    }
  }, [searching, setStep]);

  // зачем (координатор 05.10, «500 фраз открываются 13,8 с»): [PACK-OPEN] галереи — сколько карточек и когда посчитан список плиток.
  const galleryMountedAtRef = useRef(Date.now());
  useEffect(() => {
    console.log('[PACK-OPEN] gallery:cards', JSON.stringify({ cards: cards.length, items: items.length, step, sinceMountMs: Date.now() - galleryMountedAtRef.current }));
  }, [cards.length, items.length, step]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const raw = event.nativeEvent.contentOffset.y;
    scrollYRef.current = raw;
    const y = Math.round(raw / 40) * 40;
    setScrollY((prev) => (prev === y ? prev : y));
  }, []);
  // зачем: «просмотренные карточки» считались по видимым строкам списка; в галерее — по окну плиток после остановки прокрутки.
  const reportViewed = useCallback(() => {
    const ids = cards.slice(0, 24).map((card) => card.id);
    const key = ids.join(',');
    if (key && key !== viewedRef.current) { viewedRef.current = key; onCardsViewed(ids); }
  }, [cards, onCardsViewed]);

  const onTile = useCallback((id: string) => {
    if (selectionMode) { hapticTap(); onToggleSelection(id); return; }
    onOpenCard(id);
  }, [onOpenCard, onToggleSelection, selectionMode]);
  const onSpeakTile = useCallback((id: string) => { const card = byId.get(id); if (card) onSpeak(card.en); }, [byId, onSpeak]);
  const pressedCard = pressedId ? byId.get(pressedId) ?? null : null;
  const dismissHint = useCallback(() => {
    onSetShowDeleteHint(false);
    AsyncStorage.setItem('flashcard_delete_hint_seen', '1').catch(noteSwallowedHandler('CollectionGalleryView:dismissHint'));
  }, [onSetShowDeleteHint]);
  const onZoomStep = useCallback((next: number) => setStep(next, undefined, 'ползунок'), [setStep]);

  return (
    <View style={styles.root}>
      <GestureDetector gesture={gesture}>
        <ScrollView
          ref={scrollRef}
          testID="fc-gallery-scroll"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={onScroll}
          onMomentumScrollEnd={reportViewed}
          onScrollEndDrag={reportViewed}
          stickyHeaderIndices={[1]}
          keyboardShouldPersistTaps="handled" decelerationRate="fast">
          <View>{header}</View>
          <ZoomBar g={g} step={step} onStep={onZoomStep} smallerLabel={zoomCopy.smaller} largerLabel={zoomCopy.larger} search={searchField ?? undefined} />
          {!selectionMode && activeCat === 'custom' && allowAddCustomCard ? (
            <Pressable testID="fc-create-card" accessibilityRole="button" onPress={onCreateCard} style={({ pressed }) => [styles.addBtn, { backgroundColor: g.hairlineSoft }, pressed && { opacity: 0.82 }]}>
              <Ionicons name="add" size={20} color={g.text} />
              <Text style={[styles.addText, { color: g.text }]}>{copy.add}</Text>
            </Pressable>
          ) : null}
          <View
            style={[styles.gridWrap, gridTopGap !== undefined && { marginTop: gridTopGap }]}
            onLayout={(event) => { const y = Math.round(event.nativeEvent.layout.y); gridTopRef.current = y; setGridTop(y); }}>
            <CardsGallery
              g={g}
              cards={items}
              width={width}
              step={step}
              morph={morph}
              morphFrom={morphFrom}
              scrollY={Math.max(0, scrollY - gridTop)}
              viewportH={screenH}
              onOpen={onTile}
              onSpeak={onSpeakTile}
              speakLabel={copy.speak}
              onLongPress={selectionMode ? undefined : setPressedId}
              moreLabel={zoomCopy.more}
              selectedIds={selectionMode ? selectedIds : undefined}
              highlight={searching ? searchQuery : undefined}
            />
          </View>
          {!selectionMode && hiddenByLimitCount > 0 ? (
            <Pressable testID="flashcards-free-limit-section" accessibilityRole="button" onPress={onOpenPremiumLimit} style={[styles.limit, { backgroundColor: g.hairlineSoft }]}>
              <Ionicons name="lock-closed" size={24} color={g.text} />
              <Text style={[styles.limitTitle, { color: g.text }]}>{copy.hidden(hiddenByLimitCount)}</Text>
              <Text style={[styles.limitSub, { color: g.secondary }]}>{copy.free}</Text>
              <View style={[styles.limitCta, { backgroundColor: g.accent }]}><Text style={[styles.limitCtaText, { color: g.accentInk }]}>{copy.plus}</Text></View>
            </Pressable>
          ) : null}
          <View style={styles.report}>
            <ReportErrorButton
              screen="flashcards_collection"
              dataId={`flashcards_${activeCat}`}
              dataText={`Cards · ${activeCat}`}
            />
          </View>
        </ScrollView>
      </GestureDetector>

      {!selectionMode && showDeleteHint ? (
        <View style={[styles.hint, { backgroundColor: g.opaqueControl }]}>
          <Ionicons name="trash-outline" size={18} color={g.secondary} />
          <Text style={[styles.hintText, { color: g.text }]}>{copy.hint}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={copy.close} hitSlop={12} onPress={dismissHint}>
            <Ionicons name="close" size={18} color={g.secondary} />
          </Pressable>
        </View>
      ) : null}

      {selectionMode ? (
        <PanelDock>
          {!canCreatePack ? <Text style={[styles.selHint, { color: g.secondary }]}>{copy.more(selectionRemaining ?? 0)}</Text> : null}
          <View style={styles.selRow}>
            <PanelCta g={g} flex testID="fc-create-pack-from-selection" label={copy.createPack} disabled={!canCreatePack} onPress={onCreatePack} />
            <PanelCta g={g} ghost testID="fc-delete-selected" label={copy.deleteSel} disabled={selectedCount === 0} onPress={onDeleteSelected} />
          </View>
        </PanelDock>
      ) : onTrain ? (
        // зачем (макет cards-v2 `.fab-wrap`): «Тренировать» — плавающая пилюля по центру внизу (42 высотой, значок ▶ и подпись), а не широкая панель
        <View pointerEvents="box-none" style={[styles.fabWrap, { bottom: Math.max(30, insets.bottom + 10) }]}>
          <Pressable testID="fc-gallery-train" accessibilityRole="button" accessibilityLabel={copy.train} onPress={onTrain} style={({ pressed }) => [styles.fab, { backgroundColor: g.accent, boxShadow: actionBoxShadow(g) }, pressed && styles.fabPressed]}>
            <Ionicons name="play" size={18} color={g.accentInk} />
            <Text style={[styles.fabText, { color: g.accentInk }]}>{copy.train}</Text>
          </Pressable>
        </View>
      ) : null}

      <PanelSheet visible={pressedCard !== null} onClose={() => setPressedId(null)} testID="fc-card-actions">
        {pressedCard && isEditableCustomCard(pressedCard) ? (
          <SheetRow g={g} testID="fc-card-edit" icon="create-outline" title={copy.edit} onPress={() => { const item = pressedCard; setPressedId(null); onEditCard(item); }} />
        ) : null}
        {pressedCard && !pressedCard.isSystem ? (
          <SheetRow g={g} testID="fc-card-delete" icon="trash-outline" title={copy.del} danger onPress={() => { const item = pressedCard; setPressedId(null); void onDeleteCardById(item.id, cards.indexOf(item)); }} />
        ) : null}
      </PanelSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: SIDE, paddingBottom: 150 },
  gridWrap: { marginTop: 0 },
  addBtn: { marginTop: 16, height: 42, alignSelf: 'flex-start', paddingHorizontal: 18, borderRadius: 21, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  limit: { marginTop: 16, borderRadius: 24, paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center', gap: 6 },
  limitTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  limitSub: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  limitCta: { marginTop: 8, borderRadius: 18, paddingHorizontal: 22, paddingVertical: 10 },
  limitCtaText: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  report: { alignItems: 'center', paddingVertical: 24 },
  hint: { position: 'absolute', left: 16, right: 16, bottom: 96, zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  hintText: { flex: 1, fontSize: 13, lineHeight: 18 },
  selHint: { marginBottom: 10, fontSize: 13, lineHeight: 17, textAlign: 'center' },
  selRow: { flexDirection: 'row', gap: 10 },
  fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  fab: { height: 42, borderRadius: 21, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fabPressed: { opacity: 0.86 },
  fabText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
});
