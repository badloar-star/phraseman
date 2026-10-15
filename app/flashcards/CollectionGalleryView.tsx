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
import { cardsPerfCount, cardsPerfFlush } from '../../components/cards-grid/cardsPerfLog';
import { useCardsGridStep } from '../../components/cards-grid/useCardsScale';
import { ZoomBar } from '../../components/cards-grid/ZoomBar';
import { GALLERY_DEFAULT_STEP } from '../../components/cards-grid/cardsGalleryLayout';
import ReportErrorButton from '../../components/ReportErrorButton';
import { useLv2Glass } from '../../components/learning-v2/LearningV2Glass';
import { PanelCta, PanelDock, SheetRow } from '../../components/mistakes-panel/PanelKit';
import { actionBoxShadow } from '../../components/v2/ShadowSurface';
import { useStableSafeAreaInsets } from '../stable_safe_area_metrics';
import { PanelSheet } from '../../components/mistakes-panel/PanelSheet';
import { triLang, type Lang } from '../../constants/i18n';
import { useLang } from '../../components/LangContext';
import { pluralWithCount, pluralWord } from '../../constants/plural';
import { hapticTap } from '../../hooks/use-haptics';
import { noteSwallowedHandler } from '../swallow_log';
import { resolveFlashcardBackText, type CardItem, type FlashcardContentLang } from './types';

type Props = Readonly<{
  cards: readonly CardItem[];
  lang: FlashcardContentLang;
  /** Заголовочный блок (название, число карточек, поиск) — едет вместе со списком. */
  header: React.ReactNode;
  hiddenByLimitCount: number;
  /** Free упёрся в лимит сохранённых (cards-v2 `savedLimit`): внизу «Безлимит с Plus» вместо секции «+N скрыто». */
  limitCta?: Readonly<{ onPress: () => void }> | null;
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

const copyFor = (lang: Lang) => triLang(lang, {
  ru: { train: 'Тренировать', speak: 'Озвучить', edit: 'Изменить', del: 'Удалить', hint: 'Зажми карточку, чтобы изменить или удалить её', hidden: (n: number) => `+${n} ${pluralWord('ru', n, { one: 'карточка скрыта', few: 'карточки скрыты', many: 'карточек скрыто' })}`, free: 'Бесплатно доступны первые 50 сохранённых карточек', plus: 'Открыть все с Plus', createPack: 'Создать набор', deleteSel: 'Удалить', more: (n: number) => `Выбери ещё ${pluralWithCount('ru', n, { one: 'карточку', few: 'карточки', many: 'карточек' })}, чтобы создать набор`, add: 'Добавить карточку', close: 'Закрыть' },
  uk: { train: 'Тренувати', speak: 'Озвучити', edit: 'Змінити', del: 'Видалити', hint: 'Затисни картку, щоб змінити або видалити її', hidden: (n: number) => `+${n} ${pluralWord('uk', n, { one: 'картка прихована', few: 'картки приховані', many: 'карток приховано' })}`, free: 'Безкоштовно доступні перші 50 збережених карток', plus: 'Відкрити все з Plus', createPack: 'Створити набір', deleteSel: 'Видалити', more: (n: number) => `Познач ще ${pluralWithCount('uk', n, { one: 'картку', few: 'картки', many: 'карток' })}, щоб створити набір`, add: 'Додати картку', close: 'Закрити' },
  en: { train: 'Practice', speak: 'Listen', edit: 'Edit', del: 'Delete', hint: 'Hold a card to edit or delete it', hidden: (n: number) => `+${n} ${pluralWord('en', n, { one: 'card hidden', few: 'cards hidden', many: 'cards hidden' })}`, free: 'The first 50 saved cards are free', plus: 'Unlock all with Plus', createPack: 'Create a pack', deleteSel: 'Delete', more: (n: number) => `Select ${n} more ${pluralWord('en', n, { one: 'card', few: 'cards', many: 'cards' })} to create a pack`, add: 'Add a card', close: 'Close' },
  es: { train: 'Entrenar', speak: 'Escuchar', edit: 'Editar', del: 'Eliminar', hint: 'Mantén pulsada la tarjeta para editarla o eliminarla', hidden: (n: number) => `+${n} ${pluralWord('es', n, { one: 'tarjeta oculta', few: 'tarjetas ocultas', many: 'tarjetas ocultas' })}`, free: 'Gratis: las primeras 50 tarjetas guardadas', plus: 'Desbloquear todo con Plus', createPack: 'Crear un set', deleteSel: 'Eliminar', more: (n: number) => `Elige ${n} ${pluralWord('es', n, { one: 'tarjeta', few: 'tarjetas', many: 'tarjetas' })} más para crear un pack`, add: 'Añadir tarjeta', close: 'Cerrar' },
  'pt-BR': { train: 'Treinar', speak: 'Ouvir', edit: 'Editar', del: 'Excluir', hint: 'Segure o cartão para editar ou excluir', hidden: (n: number) => `+${n} ${pluralWord('pt-BR', n, { one: 'cartão oculto', few: 'cartões ocultos', many: 'cartões ocultos' })}`, free: 'Grátis: os primeiros 50 cartões salvos', plus: 'Desbloquear tudo com Plus', createPack: 'Criar um conjunto', deleteSel: 'Excluir', more: (n: number) => `Escolha mais ${n} ${pluralWord('pt-BR', n, { one: 'cartão', few: 'cartões', many: 'cartões' })} para criar um pacote`, add: 'Adicionar cartão', close: 'Fechar' },
  vi: { train: 'Luyện tập', speak: 'Nghe', edit: 'Sửa', del: 'Xóa', hint: 'Giữ thẻ để sửa hoặc xóa', hidden: (n: number) => `+${n} thẻ bị ẩn`, free: 'Miễn phí: 50 thẻ đã lưu đầu tiên', plus: 'Mở tất cả với Plus', createPack: 'Tạo bộ thẻ', deleteSel: 'Xóa', more: (n: number) => `Chọn thêm ${n} thẻ để tạo bộ thẻ`, add: 'Thêm thẻ', close: 'Đóng' },
  id: { train: 'Latihan', speak: 'Dengar', edit: 'Ubah', del: 'Hapus', hint: 'Tahan kartu untuk mengubah atau menghapusnya', hidden: (n: number) => `+${n} kartu disembunyikan`, free: 'Gratis: 50 kartu tersimpan pertama', plus: 'Buka semua dengan Plus', createPack: 'Buat set', deleteSel: 'Hapus', more: (n: number) => `Pilih ${n} kartu lagi untuk membuat paket`, add: 'Tambah kartu', close: 'Tutup' },
  tr: { train: 'Çalış', speak: 'Dinle', edit: 'Düzenle', del: 'Sil', hint: 'Düzenlemek veya silmek için kartı basılı tut', hidden: (n: number) => `+${n} kart gizli`, free: 'Ücretsiz: kaydedilen ilk 50 kart', plus: 'Plus ile tümünü aç', createPack: 'Set oluştur', deleteSel: 'Sil', more: (n: number) => `Paket oluşturmak için ${n} kart daha seç`, add: 'Kart ekle', close: 'Kapat' },
  pl: { train: 'Ćwicz', speak: 'Posłuchaj', edit: 'Edytuj', del: 'Usuń', hint: 'Przytrzymaj kartę, aby ją edytować lub usunąć', hidden: (n: number) => `+${n} ${pluralWord('pl', n, { one: 'karta ukryta', few: 'karty ukryte', many: 'kart ukrytych' })}`, free: 'Za darmo: pierwsze 50 zapisanych kart', plus: 'Odblokuj wszystko z Plus', createPack: 'Utwórz zestaw', deleteSel: 'Usuń', more: (n: number) => `Wybierz jeszcze ${pluralWithCount('pl', n, { one: 'kartę', few: 'karty', many: 'kart' })}, aby utworzyć zestaw`, add: 'Dodaj kartę', close: 'Zamknij' },
});

// зачем (cards-v2 `savedLimit`): подпись нижней кнопки при упёртом лимите Free — 9 языков
const unlimitedLabelFor = (lang: Lang): string => triLang(lang, {
  ru: 'Безлимит с Plus', uk: 'Безліміт з Plus', en: 'Unlimited with Plus', es: 'Sin límite con Plus', 'pt-BR': 'Sem limite com Plus',
  vi: 'Không giới hạn với Plus', id: 'Tanpa batas dengan Plus', tr: 'Plus ile sınırsız', pl: 'Bez limitu z Plus',
});

const zoomCopyFor = (lang: Lang) => triLang(lang, {
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
  cards, lang, header, hiddenByLimitCount, limitCta, onOpenPremiumLimit, onOpenCard, onSpeak, onCardsViewed,
  isEditableCustomCard, onEditCard, onDeleteCardById, selectionMode, selectedIds, onToggleSelection, selectedCount, canCreatePack,
  selectionRemaining, onCreatePack, onDeleteSelected, showDeleteHint, onSetShowDeleteHint, onTrain, allowAddCustomCard, onCreateCard, activeCat, searchQuery, searchField, gridTopGap,
}: Props) {
  const g = useLv2Glass();
  // зачем (EN-проход Сверки 12.10, cards-007/010 «Тренировать» по-русски при uiLang=en): подписи экрана — это ЯЗЫК ИНТЕРФЕЙСА, а `lang` приходит КОНТЕНТНЫЙ (flashcardContentLang: у en/pt-BR/vi… он ru/uk/es) —
  // поэтому все подписи (кнопки, подсказка, лимит) шли на языке перевода карточек, а не интерфейса. Контентный `lang` остаётся только для перевода на плитке.
  const { lang: uiLang } = useLang();
  const copy = useMemo(() => copyFor(uiLang), [uiLang]);
  const zoomCopy = useMemo(() => zoomCopyFor(uiLang), [uiLang]);
  const insets = useStableSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const width = screenW - SIDE * 2;
  const scrollRef = useRef<ScrollView>(null);
  // точная прокрутка и верх сетки в содержимом — для докрутки «карточка под пальцами остаётся на месте»
  const scrollYRef = useRef(0);
  const gridTopRef = useRef(260);
  const [scrollY, setScrollY] = useState(0);
  const perfWindowYRef = useRef(0);
  const [gridTop, setGridTop] = useState(260);
  const [pressedId, setPressedId] = useState<string | null>(null);
  // зачем (координатор 12.10, cards-034): шторка действий лежит в области ПОД шапкой экрана, и затемнение не закрывало «‹ поиск + ⋮». Меряем положение корня в окне и растягиваем слой шторки вверх до края окна
  const rootRef = useRef<View>(null);
  const [rootWindowY, setRootWindowY] = useState(0);
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
  // зачем: [CARDS-PERF] время до первого кадра списка — следующий кадр после монтирования галереи
  useEffect(() => {
    const raf = requestAnimationFrame(() => cardsPerfFlush('saved', 'first-frame', { cards: cards.length, step, sinceMountMs: Date.now() - galleryMountedAtRef.current }));
    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const raw = event.nativeEvent.contentOffset.y;
    scrollYRef.current = raw;
    cardsPerfCount('scroll-event');
    const y = Math.round(raw / 40) * 40;
    if (perfWindowYRef.current !== y) { perfWindowYRef.current = y; cardsPerfCount('window-step'); } // зачем: [CARDS-PERF] сколько раз прокрутка перерисовала весь экран галереи (шаг 40 dp)
    setScrollY((prev) => (prev === y ? prev : y));
  }, []);
  // зачем: «просмотренные карточки» считались по видимым строкам списка; в галерее — по окну плиток после остановки прокрутки.
  const reportViewed = useCallback(() => {
    cardsPerfFlush('saved', 'scroll-end', { cards: cards.length, step, scrollY: Math.round(scrollYRef.current) });
    const ids = cards.slice(0, 24).map((card) => card.id);
    const key = ids.join(',');
    if (key && key !== viewedRef.current) { viewedRef.current = key; onCardsViewed(ids); }
  }, [cards, onCardsViewed, step]);

  const onTile = useCallback((id: string) => {
    if (selectionMode) { hapticTap(); onToggleSelection(id); return; }
    onOpenCard(id);
  }, [onOpenCard, onToggleSelection, selectionMode]);
  const onSpeakTile = useCallback((id: string) => { const card = byId.get(id); if (card) onSpeak(card.en); }, [byId, onSpeak]);
  const pressedCard = pressedId ? byId.get(pressedId) ?? null : null;
  // зачем (аудит #5, 15.10): долгое нажатие открывало шторку действий и у карточек, для которых строк нет (системные и нередактируемые чужие) — пустое окно, «мёртвый» контрол. Шторка открывается, только если в ней есть что нажать.
  const onLongPressTile = useCallback((id: string) => {
    const card = byId.get(id);
    const hasRows = !!card && (isEditableCustomCard(card) || !card.isSystem);
    if (!hasRows) {
      console.log(`[CARDS-SHEET] долгое нажатие: у карточки нет действий — шторку не открываем card=${id} found=${card ? 'да' : 'нет'} system=${card ? String(card.isSystem) : '-'}`); // guard-ok: ранний выход называет причину
      return;
    }
    setPressedId(id);
  }, [byId, isEditableCustomCard]);
  // зачем (R1 cards-034, 12.10; журнал [CARDS-SHEET] rootWindowY=50 windowH=914): слой шторки сдвигается вверх на rootWindowY (чтобы встать в окно целиком), но значение измерялось ТОЛЬКО после тапа —
  // первый кадр шторки стоял на 50 dp ниже (rootWindowY=0), въезд (SlideInDown) стартовал оттуда, и «Удалить» оказывалось у самого края под жестовой полоской. Теперь корень меряется при раскладке:
  // к тапу значение уже известно, слой с первого кадра в нужном месте (замер при тапе остаётся как страховка).
  const measureRoot = useCallback(() => {
    rootRef.current?.measureInWindow((_x, y, _w, h) => {
      const next = Math.max(0, Math.round(y));
      console.log(`[CARDS-SHEET] root:layout rootWindowY=${next} rootH=${Math.round(h)} windowH=${Math.round(screenH)}`); // guard-ok: замер до тапа — главная цифра для сверки положения шторки
      setRootWindowY((prev) => (prev === next ? prev : next));
    });
  }, [screenH]);
  useEffect(() => {
    if (pressedCard === null) return;
    rootRef.current?.measureInWindow((_x, y, _w, h) => {
      console.log(`[CARDS-SHEET] scrim card=${pressedCard.id} rootWindowY=${Math.round(y)} rootH=${Math.round(h)} windowH=${Math.round(screenH)} → слой шторки растянут вверх на ${Math.round(y)} dp`); // guard-ok: числа раскладки слоя шторки
      setRootWindowY(Math.max(0, y));
    });
  }, [pressedCard, screenH]);
  React.useEffect(() => {
    if (showDeleteHint && pressedCard !== null) console.log(`[CARDS-HINT] gallery: подсказка скрыта — открыта шторка действий card=${pressedCard.id}`); // guard-ok: ветвление называет причину
  }, [pressedCard, showDeleteHint]);
  const dismissHint = useCallback(() => {
    onSetShowDeleteHint(false);
    AsyncStorage.setItem('flashcard_delete_hint_seen', '1').catch(noteSwallowedHandler('CollectionGalleryView:dismissHint'));
  }, [onSetShowDeleteHint]);
  const onZoomStep = useCallback((next: number) => setStep(next, undefined, 'ползунок'), [setStep]);

  return (
    <View ref={rootRef} collapsable={false} onLayout={measureRoot} style={styles.root}>
      <GestureDetector gesture={gesture}>
        <ScrollView
          ref={scrollRef}
          testID="fc-gallery-scroll"
          contentContainerStyle={[styles.content, selectionMode && !canCreatePack && styles.contentSelHint]}
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
              onLongPress={selectionMode ? undefined : onLongPressTile}
              moreLabel={zoomCopy.more}
              selectedIds={selectionMode ? selectedIds : undefined}
              highlight={searching ? searchQuery : undefined}
            />
          </View>
          {!selectionMode && hiddenByLimitCount > 0 && !limitCta ? (
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

      {/* зачем (координатор 12.10, cards-034/006): внизу одна плашка за раз — пока открыта шторка действий («Удалить»), подсказка «Зажми карточку…» не висит поверх неё и не закрывает ручку шторки */}
      {!selectionMode && showDeleteHint && pressedCard === null ? (
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
          {/* зачем (Макеты e68b81502, cards-007: подсказка «Выбери ещё 10 карточек…» лежала на нижнем ряду без подложки, текст наезжал на карточки): плашка по тону
              «Тени» (opaqueControl, как у подсказки удаления) + запас внизу списка (contentSelHint), чтобы последний ряд не прятался за панелью */}
          {/* зачем (координатор 13.10, cards-007): при пустом выборе подсказки нет, как в образце; она появляется, когда выбрана хотя бы одна карточка, и считает, сколько осталось */}
          {!canCreatePack && selectedCount > 0 ? (
            <View testID="fc-selection-hint" style={[styles.selHintPlate, { backgroundColor: g.opaqueControl }]}>
              <Text style={[styles.selHint, { color: g.text }]}>{copy.more(selectionRemaining ?? 0)}</Text>
            </View>
          ) : null}
          <View style={styles.selRow}>
            <PanelCta g={g} flex testID="fc-create-pack-from-selection" label={copy.createPack} disabled={!canCreatePack} onPress={onCreatePack} />
            <PanelCta g={g} ghost testID="fc-delete-selected" label={copy.deleteSel} disabled={selectedCount === 0} onPress={onDeleteSelected} />
          </View>
        </PanelDock>
      ) : onTrain ? (
        // зачем (макет cards-v2 `.fab-wrap`): «Тренировать» — плавающая пилюля по центру внизу (42 высотой, значок ▶ и подпись), а не широкая панель
        <View pointerEvents="box-none" style={[styles.fabWrap, { bottom: Math.max(30, insets.bottom + 10) + (limitCta ? 66 : 0) }]}>
          <Pressable testID="fc-gallery-train" accessibilityRole="button" accessibilityLabel={copy.train} onPress={onTrain} style={({ pressed }) => [styles.fab, { backgroundColor: g.accent, boxShadow: actionBoxShadow(g) }, pressed && styles.fabPressed]}>
            <Ionicons name="play" size={18} color={g.accentInk} />
            <Text style={[styles.fabText, { color: g.accentInk }]}>{copy.train}</Text>
          </Pressable>
        </View>
      ) : null}

      {limitCta && !selectionMode ? (
        <View pointerEvents="box-none" style={[styles.limitBar, { bottom: Math.max(16, insets.bottom + 6) }]}>
          <Pressable testID="fc-gallery-unlimited" accessibilityRole="button" accessibilityLabel={unlimitedLabelFor(uiLang)} onPress={limitCta.onPress} style={({ pressed }) => [styles.limitBtn, { backgroundColor: g.accent, boxShadow: actionBoxShadow(g) }, pressed && styles.fabPressed]}>
            <Ionicons name="lock-open-outline" size={18} color={g.accentInk} />
            <Text style={[styles.limitBtnText, { color: g.accentInk }]}>{unlimitedLabelFor(uiLang)}</Text>
          </Pressable>
        </View>
      ) : null}

      {/* слой шторки — на всё окно: верх сдвинут на положение корня, поэтому затемнение покрывает и шапку экрана */}
      <View pointerEvents="box-none" style={{ position: 'absolute', left: 0, right: 0, top: -rootWindowY, height: screenH }}>
      <PanelSheet visible={pressedCard !== null} onClose={() => setPressedId(null)} testID="fc-card-actions">
        {pressedCard && isEditableCustomCard(pressedCard) ? (
          <SheetRow g={g} testID="fc-card-edit" icon="create-outline" title={copy.edit} onPress={() => { const item = pressedCard; setPressedId(null); onEditCard(item); }} />
        ) : null}
        {pressedCard && !pressedCard.isSystem ? (
          <SheetRow g={g} testID="fc-card-delete" icon="trash-outline" title={copy.del} danger onPress={() => { const item = pressedCard; setPressedId(null); void onDeleteCardById(item.id, cards.indexOf(item)); }} />
        ) : null}
      </PanelSheet>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: SIDE, paddingBottom: 150 },
  contentSelHint: { paddingBottom: 210 }, // панель выделения с плашкой-подсказкой выше обычной: 150 + плашка ≈ 40 + зазор
  gridWrap: { marginTop: 0 },
  addBtn: { marginTop: 16, minHeight: 42, alignSelf: 'flex-start', paddingHorizontal: 18, borderRadius: 21, flexDirection: 'row', alignItems: 'center', gap: 8 },
  addText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
  limit: { marginTop: 16, borderRadius: 24, paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center', gap: 6 },
  limitTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  limitSub: { fontSize: 13, lineHeight: 20, textAlign: 'center' },
  limitCta: { marginTop: 8, borderRadius: 18, paddingHorizontal: 22, paddingVertical: 10 },
  limitCtaText: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  report: { alignItems: 'center', paddingVertical: 24 },
  hint: { position: 'absolute', left: 16, right: 16, bottom: 96, zIndex: 20, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  hintText: { flex: 1, fontSize: 13, lineHeight: 18 },
  selHintPlate: { alignSelf: 'center', maxWidth: '100%', marginBottom: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 8 },
  selHint: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  selRow: { flexDirection: 'row', gap: 10 },
  fabWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  limitBar: { position: 'absolute', left: 0, right: 0, paddingHorizontal: 20 },
  limitBtn: { minHeight: 56, borderRadius: 28, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  limitBtnText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  fab: { minHeight: 42, borderRadius: 21, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fabPressed: { opacity: 0.86 },
  fabText: { fontSize: 16, lineHeight: 20, fontWeight: '600' },
});
