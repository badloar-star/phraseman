/**
 * «Набор до добавления» — cards-v2.html setOther(false) (решение владельца 12.10: cards-v2 перекрывает community-redesign #c1 экран 4):
 * «назад» и «⋮», название 34/40, автор (аватар + имя), строка «уровень · N карточек · ♥», ряд «Добавить себе +» и круглое сердце,
 * ниже сетка карточек набора (общая галерея components/cards-grid: щипок меняет размер; озвучка по тапу — как раньше).
 *
 * зачем отдельным компонентом (указание координатора 04.10): экран набора `flashcards_collection.tsx`
 * показывает и СВОИ наборы (эталон «Карточек»). Вид режима просмотра вынесен сюда, а экран набора лишь выбирает ветку.
 *
 * Данные и обработчики приходят от экрана набора как есть: добавление/покупка живут в
 * `CommunityPackSocialBar` (оптимистично, откат при отказе, защита от двойного нажатия),
 * жалоба — `ReportPackModal`, обсуждение — `PackCommentsSheet`.
 *
 * Шаг сетки (1/2/3/5 колонок) меняется щипком и ползунком ZoomBar, запоминается общим для всех списков карточек (useCardsGridStep).
 * Уровень набора (A1–C2) в документах пока нет — чип скрыт (packDeckLevel).
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import { CardsGallery } from '../../components/cards-grid/CardsGallery';
import { useCardsGridStep } from '../../components/cards-grid/useCardsScale';
import { ZoomBar } from '../../components/cards-grid/ZoomBar';
import { packDeckLevel } from '../../components/packs/packDeckModel';
import { packCardsWord } from '../../components/packs/PackRow';
import { PackBackBare, PackSquareButton, PackTopBarRow } from '../../components/packs/PackScreenKit';
import SkeletonBlock from '../../components/SkeletonShimmer';
import { useTheme } from '../../components/ThemeContext';
import { triLang, type Lang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { nestedBoxShadow } from '../../components/v2/ShadowSurface';
import type { Theme } from '../../constants/theme';
import { inferExpoSpeechLanguage, type SpeakOpts } from '../../hooks/use-audio';
import CommunityPackSocialBar from '../community_packs/CommunityPackSocialBar';
import { useCommunityAuthor } from '../community_packs/packAuthorNames';
import { fetchCommunityPackSocialState } from '../community_packs/packSocialFirestore';
import { onAppEvent } from '../events';
import {
  bumpPackCounts,
  EMPTY_PACK_COUNTS_OVERLAY,
  livePackCounts,
  packBaseCounts,
  type PackCounts,
  type PackCountsOverlay,
} from '../community_packs/packLiveCounts';
import { packHubCodeName, packTitleForInterface, type FlashcardMarketPack } from './marketplace';
import PackVideoHero from './PackVideoHero';
import { resolveFlashcardBackText, type CardItem, type FlashcardContentLang } from './types';

type Props = {
  pack: FlashcardMarketPack;
  cards: readonly CardItem[];
  lang: Lang;
  cardContentLang: FlashcardContentLang;
  t: Theme;
  onBack: () => void;
  /** «⋮» — жалоба и «Не показывать мне» (ReportPackModal экрана набора). */
  onMore: () => void;
  onAdded: () => void;
  onRequestPurchase: (pack: FlashcardMarketPack, priceRunes: number) => void;
  onOpenComments: () => void;
  onSpeak: (text: string, opts?: SpeakOpts) => void;
  /** Экран открыт по тапу до загрузки карточек (packs-simple-004): на месте списка — скелет строк той же высоты. */
  cardsLoading?: boolean;
};

const SIDE = 20;
const SKELETON_ROW_H = 118; // `.zg.s0 { grid-auto-rows: 118px }` — тот же размер, что у готовой плитки, без прыжка

export default function CommunityPackPreview({
  pack, cards, lang, cardContentLang, t, onBack, onMore, onAdded, onRequestPurchase, onOpenComments, onSpeak, cardsLoading = false,
}: Props) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const { width: screenW, height: screenH } = useWindowDimensions();
  const author = useCommunityAuthor(pack, lang);
  const title = packTitleForInterface(pack, cardContentLang) || packHubCodeName(pack);
  const backLabel = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });
  const moreLabel = triLang(lang, { ru: 'Ещё', uk: 'Ще', en: 'More', es: 'Más', 'pt-BR': 'Mais', vi: 'Thêm', id: 'Lainnya', tr: 'Daha fazla', pl: 'Więcej' });
  const speakLabel = triLang(lang, { ru: 'Озвучить', uk: 'Озвучити', en: 'Listen', es: 'Escuchar', 'pt-BR': 'Ouvir', vi: 'Nghe', id: 'Dengarkan', tr: 'Dinle', pl: 'Posłuchaj' });
  const commentsLabel = triLang(lang, { ru: 'Отклики', uk: 'Відгуки', en: 'Comments', es: 'Comentarios', 'pt-BR': 'Comentários', vi: 'Bình luận', id: 'Komentar', tr: 'Yorumlar', pl: 'Komentarze' });
  const count = cards.length > 0 ? cards.length : pack.cardCount;
  const level = packDeckLevel(pack);

  /**
   * Свежие счётчики набора — одно чтение, как раньше делал `previewMeta` (каталог мог быть старше на часы).
   * зачем: строка «♥ N» под названием берёт цифры из каталога и подменяет свежими, как придут
   * (большее из двух — не «прыгаем» вниз от устаревшего ответа).
   */
  const [counts, setCounts] = useState(() => ({ likes: pack.likesCount ?? 0, added: pack.addedCount ?? 0 }));
  useEffect(() => {
    let cancelled = false;
    void fetchCommunityPackSocialState(pack.id, null).then((state) => {
      if (cancelled) return;
      setCounts((prev) => {
        const likes = Math.max(prev.likes, state.counts.likesCount);
        const added = Math.max(prev.added, state.counts.addedCount);
        return likes === prev.likes && added === prev.added ? prev : { likes, added };
      });
    }).catch((error: unknown) => {
      console.warn(`[PACK-ROW] preview:counts failed pack=${pack.id} kind=${error instanceof Error ? error.name : typeof error}`); // guard-ok
    });
    return () => { cancelled = true; };
  }, [pack.id]);

  /**
   * Живые счётчики (ревью 11.10, п.2; жалоба владельца «отстаёт до перезахода»): лайк, отклик и «Добавить себе»
   * на этом экране сразу двигают цифры — сдвигом поверх значения каталога/свежего чтения, без сети.
   * Та же модель, что в хабе (packLiveCounts): база — текущие цифры (каталог → свежее чтение); пришло чтение с
   * другими цифрами — сдвиг отбрасывается, поэтому поздний ответ сервера, уже учёвший лайк, не даёт N+2.
   */
  const base = useMemo(
    () => packBaseCounts({ likesCount: counts.likes, addedCount: counts.added, commentsCount: pack.commentsCount }),
    [counts.likes, counts.added, pack.commentsCount],
  );
  const baseRef = useRef(base);
  baseRef.current = base;
  const [overlay, setOverlay] = useState<PackCountsOverlay>(EMPTY_PACK_COUNTS_OVERLAY);
  useEffect(() => {
    const bump = (d: Partial<PackCounts>, reason: string) => {
      console.log(`[PACK-ROW] preview:counts pack=${pack.id} reason=${reason} delta=${JSON.stringify(d)}`); // guard-ok
      setOverlay((prev) => bumpPackCounts(prev, pack.id, baseRef.current, d));
    };
    const liked = onAppEvent('community_pack_like_changed', (e) => { if (e.packId === pack.id) bump({ likes: e.liked ? 1 : -1 }, e.liked ? 'like' : 'unlike'); });
    const commented = onAppEvent('community_pack_comments_changed', (e) => { if (e.packId === pack.id) bump({ comments: e.delta }, 'comments'); });
    const added = onAppEvent('community_pack_added', (e) => { if (e.packId === pack.id) bump({ added: 1 }, 'added'); });
    return () => { liked.remove(); commented.remove(); added.remove(); };
  }, [pack.id]);
  const live = livePackCounts(overlay, pack.id, base);
  const liveLikes = live.likes;
  const liveComments = live.comments;

  // зачем (координатор 05.10, «набор из 500 фраз открывается 13,8 с, данные готовы за 0,5 с, тормозит отрисовка»): сперва логи этапов —
  // сколько строк, когда первый кадр/раскладка. Плитки галереи рисуются только в окне прокрутки (+ запас) — 500 фраз не создаются разом.
  const mountedAtRef = useRef(Date.now());
  const firstLayoutLoggedRef = useRef(false);
  useEffect(() => {
    console.log('[PACK-OPEN] preview:mount', JSON.stringify({ packId: pack.id, cards: cards.length, packCardCount: pack.cardCount }));
    return () => console.log('[PACK-OPEN] preview:unmount', JSON.stringify({ packId: pack.id, aliveMs: Date.now() - mountedAtRef.current }));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- только на вход/выход экрана
  }, []);
  useEffect(() => {
    console.log('[PACK-OPEN] preview:cards', JSON.stringify({ packId: pack.id, cards: cards.length, sinceMountMs: Date.now() - mountedAtRef.current }));
  }, [cards.length, pack.id]);

  // ── сетка карточек: общая галерея и полоса масштаба (шаги 1/2/3/5 колонок, щипок и ползунок; шаг запоминается общим для всех списков) ──
  const width = screenW - SIDE * 2;
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const gridTopRef = useRef(260);
  const [scrollY, setScrollY] = useState(0);
  const [gridTop, setGridTop] = useState(260);
  const { step, setStep, gesture, morph, morphFrom } = useCardsGridStep({
    count: cards.length,
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
  const onZoomStep = useCallback((next: number) => setStep(next, undefined, 'ползунок'), [setStep]);
  const zoomCopy = useMemo(() => triLang(lang, {
    ru: { smaller: 'Мельче', larger: 'Крупнее' }, uk: { smaller: 'Дрібніше', larger: 'Крупніше' }, en: { smaller: 'Smaller', larger: 'Larger' },
    es: { smaller: 'Más pequeño', larger: 'Más grande' }, 'pt-BR': { smaller: 'Menor', larger: 'Maior' }, vi: { smaller: 'Nhỏ hơn', larger: 'Lớn hơn' },
    id: { smaller: 'Lebih kecil', larger: 'Lebih besar' }, tr: { smaller: 'Daha küçük', larger: 'Daha büyük' }, pl: { smaller: 'Mniejsze', larger: 'Większe' },
  }), [lang]);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const raw = event.nativeEvent.contentOffset.y;
    scrollYRef.current = raw;
    const y = Math.round(raw / 40) * 40;
    setScrollY((prev) => (prev === y ? prev : y));
  }, []);
  // зачем: перевод едет в плитке отдельным полем (галерея показывает его, когда kit научится рисовать лицо карточки с переводом).
  const items = useMemo(() => cards.map((card) => ({
    id: card.id,
    front: card.en,
    ipa: card.transcription ?? null,
    back: resolveFlashcardBackText(card, cardContentLang),
  })), [cardContentLang, cards]);
  const byId = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  // зачем: до добавления набор можно послушать — нажатие на плитку озвучивает слово, как раньше на строке слова.
  const speakCard = useCallback((id: string) => {
    const card = byId.get(id);
    if (!card) return;
    onSpeak(card.en, { language: inferExpoSpeechLanguage(card.en, card.packLanguage), cardAudio: true });
  }, [byId, onSpeak]);

  return (
    <View testID="pack-preview" style={styles.root}>
      <GestureDetector gesture={gesture}>
        <ScrollView
          ref={scrollRef}
          testID="pack-preview-scroll"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          stickyHeaderIndices={[1]}
          onScroll={onScroll}
          keyboardShouldPersistTaps="handled"
          decelerationRate="fast"
          onLayout={(e) => {
            if (firstLayoutLoggedRef.current) return;
            firstLayoutLoggedRef.current = true;
            console.log('[PACK-OPEN] preview:first-layout', JSON.stringify({ packId: pack.id, cards: cards.length, listH: Math.round(e.nativeEvent.layout.height), sinceMountMs: Date.now() - mountedAtRef.current }));
          }}
          onContentSizeChange={(_w, h) => console.log('[PACK-OPEN] preview:content-size', JSON.stringify({ packId: pack.id, h: Math.round(h), sinceMountMs: Date.now() - mountedAtRef.current }))}
        >
          <View>
          <PackTopBarRow
            left={<PackBackBare g={g} testID="pack-preview-back" label={backLabel} onPress={onBack} />}
            right={<PackSquareButton g={g} testID="pack-preview-more" label={moreLabel} onPress={onMore} />}
          />

          {/* `setHead()` макета: название 34/40, автор, «уровень · N карточек · ♥ N», ряд кнопок. */}
          <Text maxFontSizeMultiplier={1.15} testID="pack-preview-title" accessibilityRole="header" style={[styles.title, { color: g.text }]}>{title}</Text>
          <View style={styles.authorRow}>
            <View style={[styles.ava, { backgroundColor: g.opaqueControl }]}><Ionicons name="person" size={14} color={g.mutedText} /></View>
            <Text testID="pack-preview-author" style={[styles.author, { color: g.secondary }]}>{author.name}</Text>
          </View>
          <View style={styles.metaRow}>
            {level ? <View style={[styles.lvl, { backgroundColor: g.dividerTone, boxShadow: nestedBoxShadow(g) }]}><Text style={[styles.lvlText, { color: g.text }]}>{level}</Text></View> : null}
            <Text style={[styles.metaText, { color: g.secondary }]}>{`${count} ${packCardsWord(lang, count)}`}</Text>
            <View style={styles.likes} accessible accessibilityLabel={String(liveLikes)}>
              <Ionicons name="heart-outline" size={18} color={g.secondary} />
              <Text style={[styles.metaText, { color: g.secondary }]}>{liveLikes}</Text>{/* guard-ok: счётчик, не подпись */}
            </View>
            {liveComments > 0 ? (
              <TouchableOpacity testID={`pack-comments-${pack.id}`} accessibilityRole="button" accessibilityLabel={commentsLabel} onPress={() => onOpenComments()} hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }} style={styles.likes}>
                <Ionicons name="chatbubble-outline" size={18} color={g.secondary} />
                <Text style={[styles.metaText, { color: g.secondary }]}>{liveComments}</Text>{/* guard-ok: счётчик, не подпись */}
              </TouchableOpacity>
            ) : null}
          </View>
          <View style={styles.actions}>
            <CommunityPackSocialBar pack={pack} lang={lang} t={t} owned={false} variant="setAdd" onAdded={onAdded} onRequestPurchase={onRequestPurchase} />
            <CommunityPackSocialBar pack={pack} lang={lang} t={t} owned={false} variant="setHeart" />
          </View>

          {/* Набор из ролика (D131): превью ролика остаётся — у обычных наборов блока нет. */}
          {pack.videoId ? <View style={{ marginTop: 18 }}><PackVideoHero pack={pack} lang={lang} t={t} /></View> : null}
          </View>

          {/* `zoomBar()` макета: прилипающая полоса масштаба между кнопками и сеткой. */}
          <ZoomBar g={g} step={step} onStep={onZoomStep} smallerLabel={zoomCopy.smaller} largerLabel={zoomCopy.larger} />

          <View
            style={styles.gridWrap}
            onLayout={(event) => { const y = Math.round(event.nativeEvent.layout.y); gridTopRef.current = y; setGridTop(y); }}
          >
            {cards.length > 0 ? (
              <CardsGallery
                g={g}
                cards={items}
                width={width}
                step={step}
                morph={morph}
                morphFrom={morphFrom}
                scrollY={Math.max(0, scrollY - gridTop)}
                viewportH={screenH}
                onOpen={speakCard}
                onSpeak={speakCard}
                speakLabel={speakLabel}
              />
            ) : cardsLoading ? (
              // зачем (packs-simple-004): пока карточки грузятся фоном — заготовки высотой плитки шага 0 (118), без прыжка.
              <View testID="pack-preview-cards-loading" style={styles.skeletons}>
                {Array.from({ length: Math.min(Math.max(pack.cardCount, 3), 6) }).map((_, index) => (
                  <SkeletonBlock key={index} width="100%" height={SKELETON_ROW_H} borderRadius={16} />
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
      </GestureDetector>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: SIDE, paddingBottom: 48 },
  title: { marginTop: 14, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.5 },
  authorRow: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ava: { width: 23, height: 23, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  author: { flexShrink: 1, fontSize: 16, lineHeight: 22 },
  metaRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 18, flexWrap: 'wrap' },
  metaText: { fontSize: 16, lineHeight: 22 },
  likes: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  lvl: { minWidth: 38, height: 26, paddingHorizontal: 9, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  lvlText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  actions: { marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  gridWrap: { marginTop: 0 },
  skeletons: { gap: 10 },
});
