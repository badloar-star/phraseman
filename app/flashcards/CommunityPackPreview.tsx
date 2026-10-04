/**
 * «Набор до добавления» — packs-simple.html кадр 4 (замок 04.10).
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
import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from '../../components/SafeLinearGradient';
import { FlowText } from '../../components/text-integrity/FlowText';
import { useTheme } from '../../components/ThemeContext';
import { triLang, type Lang } from '../../constants/i18n';
import { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import type { Theme } from '../../constants/theme';
import { inferExpoSpeechLanguage, type SpeakOpts } from '../../hooks/use-audio';
import CommunityPackSocialBar from '../community_packs/CommunityPackSocialBar';
import { useCommunityAuthorName } from '../community_packs/packAuthorNames';
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
};

const PAD = 20;

function WordRow({ card, lang, g, onSpeak }: {
  card: CardItem;
  lang: FlashcardContentLang;
  g: ReturnType<typeof liquidGlassTokens>;
  onSpeak: (text: string, opts?: SpeakOpts) => void;
}) {
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
      style={[styles.row, { borderColor: g.glassEdge, backgroundColor: g.card }]}
    >
      <FlowText testID={`pack-preview-word-en-${card.id}`} provenance="user" style={[styles.word, { color: g.text }]}>
        {card.en}
      </FlowText>
      {back ? (
        <FlowText testID={`pack-preview-word-tr-${card.id}`} provenance="user" style={[styles.tr, { color: g.secondary }]}>
          {back}
        </FlowText>
      ) : null}
    </TouchableOpacity>
  );
}

export default function CommunityPackPreview({
  pack, cards, lang, cardContentLang, t, onBack, onMore, onAdded, onRequestPurchase, onOpenComments, onSpeak,
}: Props) {
  const { liquidGlassThemeId } = useTheme();
  const g = liquidGlassTokens(liquidGlassThemeId);
  const authorName = useCommunityAuthorName(pack, lang);
  const title = packTitleForInterface(pack, cardContentLang) || packHubCodeName(pack);
  const backLabel = triLang(lang, { ru: 'Назад', uk: 'Назад', en: 'Back', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' });
  const moreLabel = triLang(lang, { ru: 'Ещё', uk: 'Ще', en: 'More', es: 'Más', 'pt-BR': 'Mais', vi: 'Thêm', id: 'Lainnya', tr: 'Daha fazla', pl: 'Więcej' });
  const cardsLabel = triLang(lang, { ru: 'Карточки', uk: 'Картки', en: 'Cards', es: 'Tarjetas', 'pt-BR': 'Cartões', vi: 'Thẻ', id: 'Kartu', tr: 'Kartlar', pl: 'Karty' });
  const count = cards.length > 0 ? cards.length : pack.cardCount;

  return (
    <View testID="pack-preview" style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* `.topbar`: круглые «назад» и «⋮» 42 по краям, высота 44. */}
        <View style={styles.topbar}>
          <TouchableOpacity testID="pack-preview-back" accessibilityRole="button" accessibilityLabel={backLabel} onPress={onBack} hitSlop={4}
            style={[styles.round, { borderColor: g.glassEdge, backgroundColor: g.opaqueControl }]}>
            <Ionicons name="chevron-back" size={20} color={g.text} />
          </TouchableOpacity>
          <TouchableOpacity testID="pack-preview-more" accessibilityRole="button" accessibilityLabel={moreLabel} onPress={onMore} hitSlop={4}
            style={[styles.round, { borderColor: g.glassEdge, backgroundColor: g.opaqueControl }]}>
            <Ionicons name="ellipsis-vertical" size={18} color={g.text} />
          </TouchableOpacity>
        </View>

        <FlowText testID="pack-preview-title" provenance="user" accessibilityRole="header" style={[styles.title, { color: g.text }]}>
          {title}
        </FlowText>

        <View style={styles.authorRow}>
          <FlowText testID="pack-preview-author" provenance="user" style={[styles.author, { color: g.secondary }]}>
            {authorName}
          </FlowText>
          <CommunityPackSocialBar pack={pack} lang={lang} t={t} owned={false} variant="previewMeta" onOpenComments={onOpenComments} />
        </View>

        {/* Набор из ролика (D131): превью ролика остаётся — у обычных наборов блока нет. */}
        {pack.videoId ? <View style={{ marginTop: 18 }}><PackVideoHero pack={pack} lang={lang} t={t} /></View> : null}

        {/* `.sec .ti` + `.n`: «Карточки» 20/26 и число приглушённым тоном. */}
        <View style={styles.sec}>
          <Text style={[styles.secTitle, { color: g.text }]}>
            {cardsLabel}
            <Text style={[styles.secCount, { color: g.mutedText }]}>{`  ${count}`}</Text>
          </Text>
        </View>

        <View style={{ gap: 9 }}>
          {cards.map((card) => <WordRow key={card.id} card={card} lang={cardContentLang} g={g} onSpeak={onSpeak} />)}
        </View>
      </ScrollView>

      {/* `.bot2`: нижняя кнопка на затухании фона, список уходит под неё. */}
      <View pointerEvents="box-none" style={styles.bottom}>
        <LinearGradient pointerEvents="none" colors={[`${g.bg}00`, `${g.bg}F0`]} locations={[0, 0.4]} style={StyleSheet.absoluteFill} />
        <CommunityPackSocialBar pack={pack} lang={lang} t={t} owned={false} variant="previewCta" onAdded={onAdded} onRequestPurchase={onRequestPurchase} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: PAD, paddingBottom: 130 },
  topbar: { height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1, // guard-ok: исключение 2.0 (24.09) — 1px полупрозрачная кромка `.rb`
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '700', marginTop: 14 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  author: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 22 },
  sec: { marginTop: 26, marginBottom: 14, marginHorizontal: 2 },
  secTitle: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  secCount: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  row: {
    minHeight: 64,
    borderRadius: 14,
    borderWidth: 1, // guard-ok: исключение 2.0 (24.09) — 1px полупрозрачная обводка `.card`
    paddingVertical: 9,
    paddingLeft: 18,
    paddingRight: 16,
    justifyContent: 'center',
  },
  // зачем: `.tt.m` макета 17/600 и `.st` 15; шкала D145 (решение владельца 04.10) — 16 и 16.
  word: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  tr: { fontSize: 16, lineHeight: 20, marginTop: 1 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: PAD, paddingTop: 18, paddingBottom: 12 },
});
