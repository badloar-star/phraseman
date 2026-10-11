/**
 * «Набор до добавления» — community-redesign.html #c1 экран 4 «Набор внутри» (решение владельца 11.10; раньше packs-simple.html кадр 4):
 * сверху плашка набора (общий PackRow, без «+»), «Слова · N», строки слов `.wr`, внизу «Добавить себе».
 *
 * зачем отдельным компонентом (указание координатора 04.10): экран набора `flashcards_collection.tsx`
 * показывает и СВОИ наборы (эталон «Карточек», CARDS_LOCKED, сессия Карточек). Вид режима просмотра
 * вынесен сюда, а экран набора лишь выбирает ветку — свой набор не меняется ни на пиксель.
 *
 * Данные и обработчики приходят от экрана набора как есть: добавление/покупка живут в
 * `CommunityPackSocialBar` (оптимистично, откат при отказе, защита от двойного нажатия),
 * жалоба — `ReportPackModal`, обсуждение — `PackCommentsSheet`.
 */
import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useScaledTextStyles } from '../../hooks/useLineScale';
import { LinearGradient } from '../../components/SafeLinearGradient';
import SkeletonBlock from '../../components/SkeletonShimmer';
import { FlowText } from '../../components/text-integrity/FlowText';
import { useTheme } from '../../components/ThemeContext';
import { triLang, type Lang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
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
import { PackRow, PackRowAuthorMeta } from '../../components/packs/PackRow';
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

const PAD = 20;

/** `.wr + .wr` макета #c1 (экран 4): строки слов без карточек, между ними тонкая линия (внутренняя тень 1px). */
function RowGap() {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  return <View style={{ height: 1, backgroundColor: g.hairlineSoft }} />;
}

const WordRow = memo(function WordRow({ card, lang, g, onSpeak }: {
  card: CardItem;
  lang: FlashcardContentLang;
  g: ReturnType<typeof liquidGlassTokens>;
  onSpeak: (text: string, opts?: SpeakOpts) => void;
}) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const back = resolveFlashcardBackText(card, lang);
  // зачем: до добавления набор можно послушать — нажатие на строку озвучивает слово, как раньше на карточке.
  const speak = useCallback(() => {
    onSpeak(card.en, { language: inferExpoSpeechLanguage(card.en, card.packLanguage), cardAudio: true });
  }, [card.en, card.packLanguage, onSpeak]);
  return (
    <TouchableOpacity
      testID={`pack-preview-word-${card.id}`}
      accessibilityRole="button"
      accessibilityLabel={back ? `${card.en}, ${back}` : card.en}
      activeOpacity={0.8}
      onPress={speak}
      style={styles.row}
    >
      {/* зачем (макет #c1, экран 4, `.wr`): слева «динамик» 44 без подложки, справа слово 20/700 и перевод под ним. */}
      <View style={styles.speaker}>
        <Ionicons name="volume-medium-outline" size={20} color={g.text} />
      </View>
      <View style={styles.wordBox}>
        <FlowText testID={`pack-preview-word-en-${card.id}`} provenance="user" style={[styles.word, { color: g.text }]}>
          {card.en}
        </FlowText>
        {back ? (
          <FlowText testID={`pack-preview-word-tr-${card.id}`} provenance="user" style={[styles.tr, { color: g.secondary }]}>
            {back}
          </FlowText>
        ) : null}
      </View>
    </TouchableOpacity>
  );
});

export default function CommunityPackPreview({
  pack, cards, lang, cardContentLang, t, onBack, onMore, onAdded, onRequestPurchase, onOpenComments, onSpeak, cardsLoading = false,
}: Props) {
  // зачем (координатор 05.10, FONTSCALE2): межстрочный растёт с системным шрифтом; при 1.0 тот же объект стилей
  const styles = useScaledTextStyles(baseStyles);
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const author = useCommunityAuthor(pack, lang);
  const title = packTitleForInterface(pack, cardContentLang) || packHubCodeName(pack);
  const backLabel = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });
  const moreLabel = triLang(lang, { ru: 'Ещё', uk: 'Ще', en: 'More', es: 'Más', 'pt-BR': 'Mais', vi: 'Thêm', id: 'Lainnya', tr: 'Daha fazla', pl: 'Więcej' });
  const wordsLabel = triLang(lang, { ru: 'Слова', uk: 'Слова', en: 'Words', es: 'Palabras', 'pt-BR': 'Palavras', vi: 'Từ', id: 'Kata', tr: 'Kelimeler', pl: 'Słowa' });
  const commentsLabel = triLang(lang, { ru: 'Отклики', uk: 'Відгуки', en: 'Comments', es: 'Comentarios', 'pt-BR': 'Comentários', vi: 'Bình luận', id: 'Komentar', tr: 'Yorumlar', pl: 'Komentarze' });
  const count = cards.length > 0 ? cards.length : pack.cardCount;

  /**
   * Свежие счётчики набора — одно чтение, как раньше делал `previewMeta` (каталог мог быть старше на часы).
   * зачем: плашка набора внутри (макет #c1, экран 4) рисуется общим PackRow; цифры берём из каталога и
   * подменяем свежими, как придут (большее из двух — не «прыгаем» вниз от устаревшего ответа).
   */
  const [counts, setCounts] = React.useState(() => ({ likes: pack.likesCount ?? 0, added: pack.addedCount ?? 0 }));
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
   * на этом экране сразу двигают цифры плашки — сдвигом поверх значения каталога/свежего чтения, без сети.
   * Та же модель, что в хабе (packLiveCounts): база — текущие цифры (каталог → свежее чтение); пришло чтение с
   * другими цифрами — сдвиг отбрасывается, поэтому поздний ответ сервера, уже учёвший лайк, не даёт N+2 (ревью 11.10, п.2).
   */
  const base = useMemo(
    () => packBaseCounts({ likesCount: counts.likes, addedCount: counts.added, commentsCount: pack.commentsCount }),
    [counts.likes, counts.added, pack.commentsCount],
  );
  const baseRef = useRef(base);
  baseRef.current = base;
  const [overlay, setOverlay] = React.useState<PackCountsOverlay>(EMPTY_PACK_COUNTS_OVERLAY);
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
  const liveAdded = live.added;
  const liveComments = live.comments;

  // зачем (координатор 05.10, «набор из 500 фраз открывается 13,8 с, данные готовы за 0,5 с, тормозит отрисовка»): сперва логи этапов —
  // сколько строк, когда первый кадр/раскладка; строки в ScrollView.map рисовались ВСЕ 500 разом, теперь виртуализированный список (вид тот же).
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

  const header = (
    <View>
      {/* `.topbar` макета #c1 (экран 4): «назад» без подложки слева, «⋮» в круге 44 справа. */}
      <View style={styles.topbar}>
        <TouchableOpacity testID="pack-preview-back" accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} hitSlop={4}
          style={styles.round}>
          <Ionicons name="chevron-back" size={22} color={g.text} />
        </TouchableOpacity>
        <TouchableOpacity testID="pack-preview-more" accessibilityRole="button" accessibilityLabel={moreLabel} onPress={onMore} hitSlop={4}
          style={[styles.round, { backgroundColor: g.hairlineSoft, boxShadow: [{ inset: true, offsetX: 0, offsetY: 0, blurRadius: 0, spreadDistance: 1, color: g.hairlineSoft }] }]}>
          <Ionicons name="ellipsis-vertical" size={20} color={g.text} />
        </TouchableOpacity>
      </View>

      {/* зачем (владелец 11.10, макет #c1 экран 4): шапка набора — та же плашка, что в каталоге, без «+» (добавление — кнопкой внизу). */}
      <PackRow
        variant="plate"
        g={g}
        lang={lang}
        title={title}
        testID="pack-preview-plate"
        titleTestID="pack-preview-title"
        accessibilityLabel={`${title}, ${author.name}, ${count}`}
        leading={{ kind: 'count', count }}
        style={styles.plate}
        meta={(
          <PackRowAuthorMeta
            g={g}
            authorName={author.name}
            coinRank={author.coinRank}
            likes={liveLikes}
            added={liveAdded}
            comments={liveComments}
            authorTestID="pack-preview-author"
            onCommentsPress={() => onOpenComments()}
            commentsTestID={`pack-comments-${pack.id}`}
            commentsLabel={commentsLabel}
          />
        )}
      />

      {/* Набор из ролика (D131): превью ролика остаётся — у обычных наборов блока нет. */}
      {pack.videoId ? <View style={{ marginTop: 18 }}><PackVideoHero pack={pack} lang={lang} t={t} /></View> : null}

      {/* `.lab` макета: «Слова · 49» 15/600 → 16 (D145), вторичным тоном, 22 сверху и 10 снизу. */}
      <Text testID="pack-preview-words-label" accessibilityRole="header" style={[styles.lab, { color: g.secondary }]}>
        {`${wordsLabel} · ${count}`}
      </Text>
    </View>
  );

  return (
    <View testID="pack-preview" style={styles.root}>
      <FlatList
        data={cards}
        keyExtractor={(card) => card.id}
        renderItem={({ item }) => <WordRow card={item} lang={cardContentLang} g={g} onSpeak={onSpeak} />}
        ListHeaderComponent={header}
        // зачем (packs-simple-004): пока карточки грузятся фоном — строки-заготовки высотой 62 (как WordRow `.wr`), без прыжка.
        ListEmptyComponent={cardsLoading ? (
          <View testID="pack-preview-cards-loading" style={{ gap: 1 }}>
            {Array.from({ length: Math.min(Math.max(pack.cardCount, 3), 6) }).map((_, index) => (
              <SkeletonBlock key={index} width="100%" height={62} borderRadius={14} />
            ))}
          </View>
        ) : null}
        ItemSeparatorComponent={RowGap}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={32}
        windowSize={7}
        removeClippedSubviews={false} // зачем: сторож краша Android ReactClippingViewManager — отсечение выключено
        onLayout={(e) => {
          if (firstLayoutLoggedRef.current) return;
          firstLayoutLoggedRef.current = true;
          console.log('[PACK-OPEN] preview:first-layout', JSON.stringify({ packId: pack.id, cards: cards.length, listH: Math.round(e.nativeEvent.layout.height), sinceMountMs: Date.now() - mountedAtRef.current }));
        }}
        onContentSizeChange={(w, h) => console.log('[PACK-OPEN] preview:content-size', JSON.stringify({ packId: pack.id, h: Math.round(h), sinceMountMs: Date.now() - mountedAtRef.current }))} decelerationRate="fast"
      />

      {/* `.bot2`: нижняя кнопка на затухании фона, список уходит под неё. */}
      <View pointerEvents="box-none" style={styles.bottom}>
        <LinearGradient pointerEvents="none" colors={[`${g.bg}00`, `${g.bg}F0`]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
        <CommunityPackSocialBar pack={pack} lang={lang} t={t} owned={false} variant="previewCta" onAdded={onAdded} onRequestPurchase={onRequestPurchase} />
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: PAD, paddingBottom: 130 },
  topbar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // `.ib` макета #c1: круг 44 (у «назад» — без подложки, `.ib.bare`); кромка — внутренняя тень, не обводка.
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  plate: { marginTop: 10 },
  lab: { marginTop: 22, marginBottom: 10, fontSize: 16, lineHeight: 21, fontWeight: '600' },
  // `.wr`: строка слова 62+, промежуток 12, без карточки.
  row: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  speaker: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  wordBox: { flex: 1, minWidth: 0 },
  // зачем: `.wr .w` макета 20/700 (заголовочный размер ≥19 по D145), перевод `.w i` 14/500 → 13 (D145).
  word: { fontSize: 20, lineHeight: 25, fontWeight: '700' },
  tr: { fontSize: 13, lineHeight: 17, fontWeight: '500', marginTop: 2 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: PAD, paddingTop: 18, paddingBottom: 12 },
});
