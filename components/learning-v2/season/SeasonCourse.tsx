// ════════════════════════════════════════════════════════════════════════════
// SeasonCourse.tsx — экран «Обучение» целиком: карусель (SeasonCourseView) + раскрытая карта (SeasonExpandedCard) + «Вся глава» веером (SeasonChapterFan).
//
// зачем (владелец 21.10, «Способ 2», фаза 3): держит состояние экрана — какая карта раскрыта, показан ли веер и какая глава в нём, куда сфокусировать
// карусель после «К эпизоду N» или возврата из веера. Данные курса и действия приходят пропсами (как у SeasonCourseView): экран не читает сеть и контент Codex.
// Экзамен главы: карта и раскрытая карта рисуются, а действия «Сдать экзамен» и «Открыть экзаменом главы» — только при SEASON_CHAPTER_EXAM_ENABLED (по умолчанию выключен,
// логики экзамена в коде ещё нет, её сделает Learning V2).
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import SeasonChapterFan, { type SeasonFanCard, type SeasonFanChapterPill } from './SeasonChapterFan';
import SeasonCourseView, { type SeasonCourseViewProps } from './SeasonCourseView';
import SeasonExpandedCard, { type SeasonExamPanel, type SeasonExpandedAction } from './SeasonExpandedCard';
import { seasonArtCached, seasonCardShift, seasonChapterHue } from './season_art';
import { seasonText, seasonEpisodeLabel } from './season_copy';
import { seasonCardText, seasonTasksLabel } from './season_copy_card';
import { SEASON_CHAPTER_EXAM_ENABLED } from './season_flags';
import { seasonChapterOfIndex, seasonChapterProgress, seasonUnlockAfter, type SeasonEpisodeCard } from './season_course_model';

export type SeasonCourseProps = Omit<SeasonCourseViewProps, 'onCardOpen' | 'onWholeChapter' | 'focus' | 'onSelectedChange'> & Readonly<{
  /** Действия экзамена главы: вызываются только при включённом флаге. */
  onStartExam?: (chapterOrdinal: number) => void;
  onOpenByExam?: (chapterOrdinal: number) => void;
  /** Окно экзамена: описание, факты, цена ⚡1 / строка Plus по главе (данные Learning V2). */
  examInfo?: (chapterOrdinal: number) => Readonly<{ description: string | null; panel: SeasonExamPanel }> | null;
  /** Только превью/Сверка (dev_season_preview): стартовая карта, раскрытая карта и открытый веер. В бою не передаётся. */
  initialState?: Readonly<{ selectedIndex: number; expandedIndex: number | null; fanChapter: number | null }>;
}>;

function SeasonCourse(props: SeasonCourseProps) {
  const { lang, theme, deck, lessonOrdinal } = props;
  const dark = theme === 'dark';
  const start = props.initialState;
  const startIndex = start ? start.selectedIndex : deck.currentIndex;
  const [selected, setSelected] = useState(startIndex);
  const [expanded, setExpanded] = useState<number | null>(start ? start.expandedIndex : null);
  const [fanChapter, setFanChapter] = useState<number | null>(start ? start.fanChapter : null);
  const [focus, setFocus] = useState<Readonly<{ index: number; seq: number }>>({ index: startIndex, seq: 0 });

  const refocus = useCallback((index: number) => {
    setFocus((cur) => ({ index, seq: cur.seq + 1 }));
    setSelected(index);
  }, []);

  const artFor = useCallback((chapter: number, ordinal: number) => seasonArtCached(seasonChapterHue(lessonOrdinal, chapter), seasonCardShift(ordinal), theme), [lessonOrdinal, theme]);

  // ── раскрытая карта ──
  const expandedProps = useMemo(() => {
    if (expanded === null) return null;
    const card = deck.cards[expanded];
    if (!card) return null;
    const chapter = props.chapterInfo(card.chapterOrdinal);
    const locked = card.state === 'locked';
    const close = () => setExpanded(null);
    const common = { dark, glyph: chapter.icon, closeLabel: seasonCardText(lang, 'closeCard'), onClose: close, reducedMotion: props.reducedMotion, state: card.state, art: artFor(card.chapterOrdinal, card.sessionOrdinal) } as const;
    const examActions = SEASON_CHAPTER_EXAM_ENABLED;
    if (card.kind === 'exam') {
      const after = seasonUnlockAfter(deck, expanded);
      const examInfo = props.examInfo ? props.examInfo(card.chapterOrdinal) : null;
      const primary: SeasonExpandedAction | null = examActions && !locked && props.onStartExam
        ? { label: seasonCardText(lang, 'startExam'), icon: 'trophy', onPress: () => { close(); props.onStartExam?.(card.chapterOrdinal); } }
        : null;
      return { ...common, kind: 'exam' as const, chipLabel: seasonText(lang, 'exam'), rightLabel: null, phrase: `${seasonText(lang, 'exam')} ${card.chapterOrdinal}`, translation: examInfo ? examInfo.description : null, exam: examInfo ? examInfo.panel : null, title: null, words: [] as readonly string[], lockLine: locked && after !== null ? seasonText(lang, 'locked', { n: after }) : null, primary, secondary: null };
    }
    const info = props.episodeInfo(card);
    const after = seasonUnlockAfter(deck, expanded);
    const current = deck.cards[deck.currentIndex];
    let primary: SeasonExpandedAction | null;
    if (locked) {
      primary = current ? { label: seasonCardText(lang, 'toEpisode', { n: current.sessionOrdinal }), icon: 'play', onPress: () => { close(); refocus(deck.currentIndex); } } : null;
    } else if (card.state === 'current') {
      primary = { label: props.newcomer ? seasonText(lang, 'startEpisode', { n: card.sessionOrdinal }) : seasonText(lang, 'continueEpisode', { n: card.sessionOrdinal }), icon: 'play', onPress: () => { close(); props.onPrimary(card); } };
    } else {
      primary = { label: seasonCardText(lang, 'repeatEpisode', { n: card.sessionOrdinal }), icon: 'play', onPress: () => { close(); props.onPrimary(card); } };
    }
    let secondary: SeasonExpandedAction | null = null;
    if (locked && examActions && props.onOpenByExam) {
      secondary = { label: seasonCardText(lang, 'openByExam'), icon: 'trophy', onPress: () => { close(); props.onOpenByExam?.(card.chapterOrdinal); } };
    } else if (!locked && props.newcomer && card.state === 'current' && props.onNotFromStart) {
      secondary = { label: seasonText(lang, 'notFromStart'), icon: 'school-outline', onPress: () => { close(); props.onNotFromStart?.(); } };
    }
    return {
      ...common, kind: 'episode' as const, chipLabel: seasonEpisodeLabel(lang, card.sessionOrdinal),
      rightLabel: locked ? seasonCardText(lang, 'preview') : seasonTasksLabel(lang, info.tasksCount ?? 0),
      phrase: info.phrase, translation: info.translation, title: info.title, words: info.words,
      lockLine: locked && after !== null ? seasonText(lang, 'locked', { n: after }) : null, primary, secondary,
    };
  }, [artFor, dark, deck, expanded, lang, props, refocus]);

  // ── веер «Вся глава» ──
  const fan = useMemo(() => {
    if (fanChapter === null) return null;
    const span = deck.chapters.find((c) => c.chapterOrdinal === fanChapter);
    if (!span) return null;
    const cards: SeasonFanCard[] = deck.cards.slice(span.firstIndex, span.lastIndex + 1).map((card) => ({
      key: card.id,
      kind: card.kind,
      state: card.state,
      ordinal: card.sessionOrdinal,
      art: artFor(card.chapterOrdinal, card.sessionOrdinal),
      phrase: card.kind === 'exam' ? seasonText(lang, 'exam') : props.episodeInfo(card as SeasonEpisodeCard).phrase,
    }));
    // пилюли глав: пройденные — с галочкой, выбранная в веере — «включена», достигнутая, но не выбранная — обычная, дальние — с замком
    const progressChapter = deck.cards[deck.currentIndex]?.chapterOrdinal ?? 1;
    const pills: SeasonFanChapterPill[] = deck.chapters.map((c) => ({
      ordinal: c.chapterOrdinal,
      label: seasonCardText(lang, 'chapterShort', { n: c.chapterOrdinal }),
      state: c.chapterOrdinal === fanChapter ? 'current' : c.chapterOrdinal < progressChapter ? 'done' : c.chapterOrdinal === progressChapter ? 'open' : 'locked',
    }));
    return { span, cards, pills };
  }, [artFor, deck, fanChapter, lang, props]);

  const [fanSelected, setFanSelected] = useState(() => {
    // веер открыт со старта (превью): выбранная карта — стартовая, в пределах своей главы
    const span = start && start.fanChapter !== null ? deck.chapters.find((c) => c.chapterOrdinal === start.fanChapter) : undefined;
    return span ? Math.max(0, Math.min(startIndex - span.firstIndex, span.lastIndex - span.firstIndex)) : 0;
  });
  const openFan = useCallback(() => {
    const chapter = seasonChapterOfIndex(deck, selected);
    if (!chapter) return;
    setFanChapter(chapter.chapterOrdinal);
    setFanSelected(Math.max(0, Math.min(selected - chapter.firstIndex, chapter.lastIndex - chapter.firstIndex)));
  }, [deck, selected]);
  const pickFanChapter = useCallback((ordinal: number) => {
    const span = deck.chapters.find((c) => c.chapterOrdinal === ordinal);
    if (!span) return;
    setFanChapter(ordinal);
    const currentInChapter = deck.currentIndex >= span.firstIndex && deck.currentIndex <= span.lastIndex;
    setFanSelected(currentInChapter ? deck.currentIndex - span.firstIndex : 0);
  }, [deck]);

  if (fan && fanChapter !== null) {
    const card = deck.cards[fan.span.firstIndex + fanSelected];
    const info = card && card.kind === 'episode' ? props.episodeInfo(card) : null;
    const progress = seasonChapterProgress(deck, fanChapter);
    const chapterInfo = props.chapterInfo(fanChapter);
    const primary = card && card.kind === 'episode' && card.state !== 'locked'
      ? { label: card.state === 'current' ? seasonText(lang, 'continueEpisode', { n: card.sessionOrdinal }) : seasonCardText(lang, 'repeatEpisode', { n: card.sessionOrdinal }), onPress: () => { setFanChapter(null); props.onPrimary(card); } }
      : null;
    return (
      <ScrollView contentContainerStyle={{ paddingBottom: props.bottomPadding }} showsVerticalScrollIndicator={false}>
        <SeasonChapterFan
          dark={dark}
          lessonTitle={seasonText(lang, 'lesson', { n: lessonOrdinal })}
          topPadding={props.topPadding}
          avatarSlot={props.avatarSlot}
          sectionKicker={seasonText(lang, 'chapterOf', { n: fanChapter, m: props.chapterCount })}
          sectionTitle={chapterInfo.scene}
          sectionRight={seasonText(lang, 'doneOf', { k: progress.done, n: progress.total })}
          pills={fan.pills}
          onPickChapter={pickFanChapter}
          onPickChapterTitle={props.onChapterPicker}
          cards={fan.cards}
          selected={fanSelected}
          onSelect={setFanSelected}
          onReturn={(index) => { const target = fan.span.firstIndex + index; setFanChapter(null); refocus(target); }}
          selKicker={card ? (card.kind === 'exam' ? seasonText(lang, 'exam') : [seasonEpisodeLabel(lang, card.sessionOrdinal), info?.taskLine].filter(Boolean).join(', ')) : ''}
          selTitle={info ? info.title : card ? seasonText(lang, 'exam') : ''}
          primary={primary}
        />
      </ScrollView>
    );
  }

  return (
    <View style={styles.root}>
      <SeasonCourseView
        {...props}
        focus={focus}
        onSelectedChange={setSelected}
        onCardOpen={setExpanded}
        onWholeChapter={openFan}
      />
      {expandedProps ? <SeasonExpandedCard {...expandedProps} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });

export default memo(SeasonCourse);
