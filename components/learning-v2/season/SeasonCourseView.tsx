// ════════════════════════════════════════════════════════════════════════════
// SeasonCourseView.tsx — экран «Обучение» Learning V2 по гибриду «Сезон и карусель карт» (эталон course-hybrid-1-4.html, «Способ 2»).
//
// зачем (владелец 21.10): обложка главы-сезона с «Продолжить эпизод N» (или «Начать с эпизода 1» + «Не хочу с начала» у новичка), под ней выбор
// главы и карусель карт эпизодов; подпись выбранного эпизода и нижний ряд «Вся глава · Слова · Теория». Здесь — фаза 2: «в процессе» и «новичок».
// Раскрытая карта, закрытый эпизод, «Вся глава» веером и экзамен — фаза 3 (события onCardOpen / onWholeChapter уже выведены наружу).
// Компонент — чистая вёрстка и движение: данные курса (названия, фразы, сцены, слова) приходят пропсами от родителя, чтобы экран не привязывался
// к файлам контента, которые ведёт Codex; прогресс — готовая колода (season_course_model) из уже посчитанного снимка, новых чтений Firebase нет.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Lang } from '../../../constants/i18n';
import { LinearGradient } from '../../SafeLinearGradient';
import { useLv2Glass } from '../LearningV2Glass';
import SeasonCarousel from './SeasonCarousel';
import SeasonCardFace from './SeasonCardFace';
import { seasonArtCached, seasonCardShift, seasonChapterHue, type SeasonTheme } from './season_art';
import { seasonText, seasonEpisodeLabel } from './season_copy';
import {
  seasonChapterOfIndex, seasonChapterProgress, type SeasonDeck, type SeasonEpisodeCard,
} from './season_course_model';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

const WHITE = '#FFFFFF'; // theme-exempt: текст на градиентной обложке белый в обеих темах (эталон `.c1hero { color: #fff }`)
const WHITE_SOFT = 'rgba(255,255,255,0.86)'; // theme-exempt: подпись на обложке, эталон `.c1kick`
const GLYPH = 'rgba(255,255,255,0.12)'; // theme-exempt: крупный значок главы на обложке, эталон `.c1hero .gl`
const PILL = 'rgba(255,255,255,0.16)'; // theme-exempt: «стеклянная» пилюля на обложке, эталон `.c1pill`
const SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.36)'] as const; // theme-exempt: затемнение низа обложки, эталон `.c1hero .scrim`
const BTN_INK = '#121318'; // theme-exempt: текст белой кнопки на обложке, эталон `.qbtn.white`
const BAR = 'rgba(255,255,255,0.28)'; // theme-exempt: дорожка прогресса на обложке, эталон `.c1res .bar`

export type SeasonEpisodeInfo = Readonly<{
  /** Название эпизода («Комплименты вслух»). */
  title: string;
  /** Ключевая фраза эпизода — на карте. */
  phrase: string;
  /** Доля пройденного заданий текущего эпизода 0…1; null — не текущий / неизвестно. */
  progress: number | null;
  /** «задание 6 из 20» (для текущего) или «20 заданий» (для остальных) — готовая строка. */
  taskLine: string | null;
  /** Перевод ключевой фразы (раскрытая карта); null — нет. */
  translation: string | null;
  /** Слова эпизода чипами (раскрытая карта). */
  words: readonly string[];
  /** Число заданий (раскрытая карта: «20 заданий»); null — неизвестно. */
  tasksCount: number | null;
}>;

export type SeasonChapterInfo = Readonly<{ scene: string; icon: IonName }>;

export type SeasonCourseViewProps = Readonly<{
  lang: Lang;
  theme: SeasonTheme;
  lessonOrdinal: number;
  lessonTitle: string;
  arcTitle: string | null;
  chapterCount: number;
  deck: SeasonDeck;
  newcomer: boolean;
  /** Строка под «Продолжить»: «Комплименты вслух, задание 6 из 20». */
  resumeLine: string | null;
  episodeInfo: (card: SeasonEpisodeCard) => SeasonEpisodeInfo;
  chapterInfo: (chapterOrdinal: number) => SeasonChapterInfo;
  topPadding: number;
  /** Высота зоны часов, если страница полноэкранная (TabTopBleedContext): обложка идёт от самого верха экрана и занимает 392 dp целиком. 0/не задано — как раньше. */
  topBleed?: number;
  bottomPadding: number;
  avatarSlot?: React.ReactNode;
  reducedMotion: boolean;
  onPrimary: (card: SeasonEpisodeCard) => void;
  onNotFromStart?: () => void;
  onCardOpen: (index: number) => void;
  /** Карусель встала на карту (после свайпа/тапа) — родителю нужно для «Вся глава». */
  onSelectedChange?: (index: number) => void;
  /** Поставить карусель на карту: родитель меняет seq, чтобы вернуться на ту же карту повторно («К эпизоду N», возврат из веера). */
  focus?: Readonly<{ index: number; seq: number }>;
  onLessonPicker: () => void;
  onChapterPicker: () => void;
  onWholeChapter: () => void;
  onWords: () => void;
  onTheory: () => void;
}>;

function SeasonCourseView(props: SeasonCourseViewProps) {
  const { lang, theme, deck, lessonOrdinal } = props;
  const g = useLv2Glass();
  const dark = theme === 'dark';
  const startIndex = props.focus ? props.focus.index : deck.currentIndex;
  const [selected, setSelected] = useState(startIndex);
  const { onSelectedChange } = props;
  const settle = useCallback((index: number) => {
    setSelected(index);
    onSelectedChange?.(index);
  }, [onSelectedChange]);
  // фокус пришёл снаружи — подпись и выбор главы следуют за картой (сама карусель встаёт на неё через recenterKey)
  useEffect(() => {
    if (props.focus) setSelected(props.focus.index);
  }, [props.focus]);
  const currentCard = deck.cards[deck.currentIndex];
  const currentEpisode = currentCard && currentCard.kind === 'episode' ? currentCard : (deck.cards.find((c): c is SeasonEpisodeCard => c.kind === 'episode') ?? null);
  const heroChapter = currentCard ? currentCard.chapterOrdinal : 1;
  const heroInfo = props.chapterInfo(heroChapter);
  const heroArt = seasonArtCached(seasonChapterHue(lessonOrdinal, heroChapter), 0, theme);

  const selectedCard = deck.cards[selected] ?? currentCard;
  const selectedChapter = selectedCard ? seasonChapterOfIndex(deck, selected) : null;
  const sectionInfo = props.chapterInfo(selectedCard ? selectedCard.chapterOrdinal : heroChapter);
  const progress = selectedCard ? seasonChapterProgress(deck, selectedCard.chapterOrdinal) : { done: 0, total: 0 };

  const renderCard = useCallback((index: number) => {
    const card = deck.cards[index];
    if (!card) return null;
    const info = props.chapterInfo(card.chapterOrdinal);
    const art = seasonArtCached(seasonChapterHue(lessonOrdinal, card.chapterOrdinal), seasonCardShift(card.sessionOrdinal), theme);
    if (card.kind === 'exam') {
      return (
        <SeasonCardFace kind="exam" state={card.state} ordinal={card.chapterOrdinal} art={art} dark={dark} glyph={info.icon}
          phrase={`${seasonText(lang, 'exam')} ${card.chapterOrdinal}`} progress={null} />
      );
    }
    const ep = props.episodeInfo(card);
    return <SeasonCardFace kind="episode" state={card.state} ordinal={card.sessionOrdinal} art={art} dark={dark} glyph={info.icon} phrase={ep.phrase} progress={ep.progress} />;
  }, [dark, deck.cards, lang, lessonOrdinal, props, theme]);

  const labelFor = useCallback((index: number) => {
    const card = deck.cards[index];
    if (!card) return '';
    return card.kind === 'exam' ? `${seasonText(lang, 'exam')} ${card.chapterOrdinal}` : seasonEpisodeLabel(lang, card.sessionOrdinal);
  }, [deck.cards, lang]);

  const caption = useMemo(() => {
    if (!selectedCard) return { kicker: '', title: '' };
    if (selectedCard.kind === 'exam') return { kicker: seasonText(lang, 'exam'), title: seasonText(lang, 'exam') };
    const ep = props.episodeInfo(selectedCard);
    return { kicker: [seasonEpisodeLabel(lang, selectedCard.sessionOrdinal), ep.taskLine].filter(Boolean).join(', '), title: ep.title };
  }, [lang, props, selectedCard]);

  const primaryLabel = props.newcomer
    ? seasonText(lang, 'startEpisode', { n: currentEpisode?.sessionOrdinal ?? 1 })
    : seasonText(lang, 'continueEpisode', { n: currentEpisode?.sessionOrdinal ?? 1 });
  const kicker = [seasonText(lang, 'lesson', { n: lessonOrdinal }), props.arcTitle].filter(Boolean).join(' · ');

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: props.bottomPadding }} showsVerticalScrollIndicator={false} testID="season-course">
      <View style={[styles.hero, props.topBleed && props.topBleed > 0 ? styles.heroTall : null]} testID="season-hero">
        <LinearGradient colors={[heroArt.from, heroArt.to]} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={[heroArt.glow, 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.6 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View style={styles.heroGlyph} pointerEvents="none"><Ionicons name={heroInfo.icon} size={310} color={GLYPH} /></View>
        <LinearGradient colors={SCRIM} style={styles.scrim} pointerEvents="none" />
        <View style={[styles.heroTop, { top: props.topPadding + 8 }]}>
          <Pressable hitSlop={8} accessibilityRole="button" onPress={props.onLessonPicker} style={styles.pill} testID="season-lesson-pill">
            <Text style={styles.pillText}>{seasonText(lang, 'lesson', { n: lessonOrdinal })}</Text>
            <Ionicons name="chevron-down" size={13} color={WHITE} />
          </Pressable>
          <View style={styles.flex} />
          {props.avatarSlot ?? null}
        </View>
        <View style={[styles.heroBody, props.topBleed && props.topBleed > 0 ? styles.heroBodyTall : null]}>
          <Text style={styles.kicker}>{kicker}</Text>
          <Text accessibilityRole="header" style={styles.heroTitle}>{props.lessonTitle}</Text>
          <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={primaryLabel} onPress={() => currentEpisode && props.onPrimary(currentEpisode)} style={styles.primary} testID="season-primary">
            <Ionicons name="play" size={18} color={BTN_INK} />
            <Text style={styles.primaryText}>{primaryLabel}</Text>
          </Pressable>
          {props.newcomer && props.onNotFromStart ? (
            <Pressable hitSlop={8} accessibilityRole="button" onPress={props.onNotFromStart} style={styles.glass} testID="season-not-from-start">
              <Ionicons name="school-outline" size={18} color={WHITE} />
              <Text style={styles.glassText}>{seasonText(lang, 'notFromStart')}</Text>
            </Pressable>
          ) : props.resumeLine ? (
            <View style={styles.resume}>
              <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.round((currentEpisode ? props.episodeInfo(currentEpisode).progress ?? 0 : 0) * 100)}%` }]} /></View>
              <Text style={styles.resumeText} numberOfLines={2}>{props.resumeLine}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.section}>
        <Pressable hitSlop={8} accessibilityRole="button" onPress={props.onChapterPicker} style={styles.sectionLeft} testID="season-chapter-picker">
          <Text style={[styles.sectionKicker, { color: g.secondary }]}>{seasonText(lang, 'chapterOf', { n: selectedCard?.chapterOrdinal ?? 1, m: props.chapterCount })}</Text>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: g.text }]} numberOfLines={2}>{sectionInfo.scene}</Text>
            <Ionicons name="chevron-down" size={14} color={g.secondary} />
          </View>
        </Pressable>
        <Text style={[styles.sectionRight, { color: g.secondary }]}>{seasonText(lang, 'doneOf', { k: progress.done, n: progress.total })}</Text>
      </View>

      <SeasonCarousel
        count={deck.cards.length}
        initialIndex={startIndex}
        recenterKey={props.focus ? props.focus.seq : 0}
        renderCard={renderCard}
        onIndexSettled={settle}
        onCenterPress={props.onCardOpen}
        reducedMotion={props.reducedMotion}
        accessibilityLabelForIndex={labelFor}
        testID="season-carousel"
      />

      <View style={styles.caption} testID="season-caption">
        <Text style={[styles.captionKicker, { color: g.secondary }]}>{caption.kicker}</Text>
        <Text style={[styles.captionTitle, { color: g.text }]} numberOfLines={3}>{caption.title}</Text>
      </View>

      <View style={styles.actions}>
        {selectedChapter ? (
          <ActionChip icon="copy-outline" label={seasonText(lang, 'wholeChapter')} onPress={props.onWholeChapter} testID="season-whole-chapter" />
        ) : null}
        <ActionChip icon="albums-outline" label={seasonText(lang, 'words')} onPress={props.onWords} testID="season-words" />
        <ActionChip icon="book-outline" label={seasonText(lang, 'theory')} onPress={props.onTheory} testID="season-theory" />
      </View>
    </ScrollView>
  );
}

function ActionChip({ icon, label, onPress, testID }: Readonly<{ icon: IonName; label: string; onPress: () => void; testID: string }>) {
  const g = useLv2Glass();
  return (
    <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} testID={testID} style={({ pressed }) => [styles.chip, { opacity: pressed ? 0.72 : 1 }]}>
      <Ionicons name={icon} size={16} color={g.text} />
      <Text style={[styles.chipText, { color: g.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { height: 380, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden' },
  // зачем (владелец 22.10: высота сцен 46 % для всех; scenes-compact.html «Обучение · Сезон», вариант 2): 392 dp вместе с зоной часов, фон от верха экрана
  heroBodyTall: { bottom: 44 },
  heroTall: { height: 392, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  heroGlyph: { position: 'absolute', right: -54, top: 64, transform: [{ rotate: '-8deg' }] },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 320 },
  heroTop: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: { height: 40, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PILL },
  pillText: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: WHITE },
  heroBody: { position: 'absolute', left: 20, right: 20, bottom: 22 },
  kicker: { fontSize: 13, lineHeight: 17, color: WHITE_SOFT },
  heroTitle: { marginTop: 4, fontSize: 30, lineHeight: 36, fontWeight: '700', letterSpacing: -0.5, color: WHITE },
  primary: { marginTop: 16, height: 50, borderRadius: 25, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: WHITE },
  primaryText: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: BTN_INK },
  glass: { marginTop: 12, height: 50, borderRadius: 25, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: PILL },
  glassText: { fontSize: 16, lineHeight: 21, fontWeight: '600', color: WHITE },
  resume: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { width: 64, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: BAR },
  barFill: { height: 4, backgroundColor: WHITE },
  resumeText: { flex: 1, fontSize: 13, lineHeight: 17, color: WHITE_SOFT },
  section: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 20, paddingTop: 22 },
  sectionLeft: { flex: 1, minWidth: 0 },
  sectionKicker: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { flexShrink: 1, fontSize: 21, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  sectionRight: { paddingBottom: 3, fontSize: 16, lineHeight: 21, fontVariant: ['tabular-nums'] },
  caption: { alignItems: 'center', marginTop: 6, paddingHorizontal: 20 },
  captionKicker: { fontSize: 16, lineHeight: 21, textAlign: 'center' },
  captionTitle: { marginTop: 2, fontSize: 19, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  // зачем (Сверка 22.10, ss_side_7/9; эталон course-hybrid-1-4): действия — текст со значком без подложки, разнесены по ширине; высота 40 остаётся зоной нажатия
  actions: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 14, paddingHorizontal: 8, flexWrap: 'wrap' },
  chip: { height: 40, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
});

export default memo(SeasonCourseView);
