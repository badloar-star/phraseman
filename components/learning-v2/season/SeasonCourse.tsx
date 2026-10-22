// ════════════════════════════════════════════════════════════════════════════
// SeasonCourse.tsx — экран «Обучение» целиком: карусель (SeasonCourseView) + раскрытая карта (SeasonExpandedCard) + полноэкранные списки «Все главы» / «Эпизоды главы» (SeasonPickScreens).
//
// зачем (владелец 21.10, «Способ 2», фаза 3): держит состояние экрана — какая карта раскрыта, показан ли веер и какая глава в нём, куда сфокусировать
// карусель после «К эпизоду N» или возврата из списка. 22.10 (владелец, макет lesson-hub-final.html): веер «Вся глава» заменён двумя полноэкранными списками. Данные курса и действия приходят пропсами (как у SeasonCourseView): экран не читает сеть и контент Codex.
// Экзамен главы: карта и раскрытая карта рисуются, а действия «Сдать экзамен» и «Открыть экзаменом главы» — только при SEASON_CHAPTER_EXAM_ENABLED (по умолчанию выключен,
// логики экзамена в коде ещё нет, её сделает Learning V2).
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { useIsTabPage } from '../../tab_top_bleed';

import { SeasonChapterEpisodesScreen, SeasonChaptersScreen } from './SeasonPickScreens';
import SeasonCourseView, { type SeasonCourseViewProps } from './SeasonCourseView';
import SeasonExpandedCard, { type SeasonExamPanel, type SeasonExpandedAction } from './SeasonExpandedCard';
import { hexHue, seasonThemedArt } from './season_art';
import { useLv2Glass } from '../LearningV2Glass';
import { seasonText, seasonEpisodeLabel } from './season_copy';
import { seasonCardText, seasonTasksLabel } from './season_copy_card';
import { SEASON_CHAPTER_EXAM_ENABLED } from './season_flags';
import { seasonUnlockAfter, type SeasonEpisodeCard } from './season_course_model';

const LOG = '[SEASON-WIRE]';

/** Какой полноэкранный список открыт поверх хаба (null — хаб). */
export type SeasonListScreen = null | Readonly<{ kind: 'chapters' }> | Readonly<{ kind: 'episodes'; chapter: number }>;

export type SeasonCourseProps = Omit<SeasonCourseViewProps, 'onCardOpen' | 'onAllChapters' | 'focus' | 'onSelectedChange'> & Readonly<{
  /** Действия экзамена главы: вызываются только при включённом флаге. */
  onStartExam?: (chapterOrdinal: number) => void;
  onOpenByExam?: (chapterOrdinal: number) => void;
  /** Окно экзамена: описание, факты, цена ⚡1 / строка Plus по главе (данные Learning V2). */
  examInfo?: (chapterOrdinal: number) => Readonly<{ description: string | null; panel: SeasonExamPanel }> | null;
  /** Только превью/Сверка (dev_season_preview): стартовая карта, раскрытая карта и открытый список. В бою не передаётся. */
  initialState?: Readonly<{ selectedIndex: number; expandedIndex: number | null; screen: SeasonListScreen }>;
}>;

function SeasonCourse(props: SeasonCourseProps) {
  const { lang, theme, deck, lessonOrdinal } = props;
  const dark = theme === 'dark';
  const start = props.initialState;
  const startIndex = start ? start.selectedIndex : deck.currentIndex;
  const [selected, setSelected] = useState(startIndex);
  const [expanded, setExpanded] = useState<number | null>(start ? start.expandedIndex : null);
  const [screen, setScreen] = useState<SeasonListScreen>(start ? start.screen : null);
  const [focus, setFocus] = useState<Readonly<{ index: number; seq: number }>>({ index: startIndex, seq: 0 });

  const refocus = useCallback((index: number) => {
    setFocus((cur) => ({ index, seq: cur.seq + 1 }));
    setSelected(index);
  }, []);

  // зачем (закон владельца 22.10): цвет карточек — оттенок текущей темы, а не свой оттенок главы
  const themeHue = hexHue(useLv2Glass().accent);
  // зачем (владелец 22.10: «ПРАВИЛО НАРУШЕНО» — под часами светлая полоса над обложкой; закон «сейф-зона — часть общей композиции»): страховка. Обложка рисуется от верха экрана, когда страница вкладки полноэкранная
  // (topBleed > 0). Если страница по какой-то причине осталась под отступом оболочки (topBleed = 0, но это страница вкладки), зона часов закрашивается цветом верха обложки, а не фоном страницы; причину пишет журнал [SEASON-TOP].
  const insetsTop = useStableSafeAreaInsets().top;
  const isTabPage = useIsTabPage();
  const topBand = isTabPage && !(props.topBleed !== undefined && props.topBleed > 0) && insetsTop > 0 ? insetsTop : 0;
  const topBandColor = useMemo(() => seasonThemedArt(themeHue, deck.cards[deck.currentIndex]?.chapterOrdinal ?? 1, 0, theme).from, [deck.cards, deck.currentIndex, theme, themeHue]);
  useEffect(() => {
    if (topBand > 0) console.warn(`${LOG} [SEASON-TOP] страховка включена: страница вкладки без bleed — зона часов закрашена цветом обложки`, JSON.stringify({ topBleed: props.topBleed ?? null, insetsTop, topBand, color: topBandColor })); // guard-ok: ветка и значения, которые её решили
  }, [insetsTop, props.topBleed, topBand, topBandColor]);
  const artFor = useCallback((chapter: number, ordinal: number, exam = false) => seasonThemedArt(themeHue, chapter, ordinal, theme, exam), [themeHue, theme]);

  // ── раскрытая карта ──
  const expandedProps = useMemo(() => {
    if (expanded === null) return null;
    const card = deck.cards[expanded];
    if (!card) return null;
    const chapter = props.chapterInfo(card.chapterOrdinal);
    const locked = card.state === 'locked';
    const close = () => setExpanded(null);
    const common = { dark, glyph: chapter.icon, closeLabel: seasonCardText(lang, 'closeCard'), onClose: close, reducedMotion: props.reducedMotion, state: card.state, art: artFor(card.chapterOrdinal, card.sessionOrdinal, card.kind === 'exam') } as const;
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

  // ── полноэкранные списки: «Все главы» и «Эпизоды главы» ──
  const currentCard = deck.cards[deck.currentIndex];
  const currentEpisode = currentCard && currentCard.kind === 'episode' ? currentCard : null;
  // «Продолжить эпизод N» внизу списков — тот же главный путь, что на обложке (экран Learning V2 решает вкладка)
  const listPrimary = useMemo(() => (currentEpisode
    ? {
      label: props.newcomer ? seasonText(lang, 'startEpisode', { n: currentEpisode.sessionOrdinal }) : seasonText(lang, 'continueEpisode', { n: currentEpisode.sessionOrdinal }),
      onPress: () => { console.log(`${LOG} нажатие → «Продолжить» из списка`, JSON.stringify({ lesson: lessonOrdinal, session: currentEpisode.sessionOrdinal })); setScreen(null); props.onPrimary(currentEpisode); }, // guard-ok: куда ведёт нажатие
    }
    : null), [currentEpisode, lang, lessonOrdinal, props]);
  const openChapters = useCallback(() => {
    console.log(`${LOG} нажатие → «Все главы»`, JSON.stringify({ lesson: lessonOrdinal, chapters: deck.chapters.length })); // guard-ok: куда ведёт нажатие
    setScreen({ kind: 'chapters' });
  }, [deck.chapters.length, lessonOrdinal]);
  const closeList = useCallback((from: string) => {
    console.log(`${LOG} «назад» из списка`, JSON.stringify({ from, to: 'хаб', carouselIndex: selected })); // guard-ok: куда ведёт нажатие
    setScreen(null);
    refocus(selected);
  }, [refocus, selected]);
  // нажатие по строке эпизода/экзамена: хаб встаёт на эту карту и раскрывает её — как нажатие по карте в карусели (там же «Открыть экзаменом», «К эпизоду N»)
  const pickCardFromList = useCallback((index: number) => {
    const card = deck.cards[index];
    console.log(`${LOG} нажатие → карта из списка`, JSON.stringify({ index, kind: card ? card.kind : null, session: card ? card.sessionOrdinal : null, state: card ? card.state : null })); // guard-ok: куда ведёт нажатие
    setScreen(null);
    refocus(index);
    setExpanded(index);
  }, [deck.cards, refocus]);

  // зачем (проверка 22.10): аппаратная «назад» на полноэкранных списках ведёт на шаг назад (эпизоды → главы → хаб), а не уводит с вкладки — как кнопка ScreenBackButton
  useEffect(() => {
    if (!screen) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log(`${LOG} аппаратная «назад» из списка`, JSON.stringify({ from: screen.kind, to: screen.kind === 'episodes' ? 'главы' : 'хаб' })); // guard-ok: куда ведёт нажатие
      if (screen.kind === 'episodes') setScreen({ kind: 'chapters' });
      else { setScreen(null); refocus(selected); }
      return true;
    });
    return () => sub.remove();
  }, [refocus, screen, selected]);

  if (screen && screen.kind === 'chapters') {
    return (
      <SeasonChaptersScreen
        lang={lang}
        deck={deck}
        lessonOrdinal={lessonOrdinal}
        lessonTitle={props.lessonTitle}
        chapterScene={(chapter) => props.chapterInfo(chapter).scene}
        bottomPadding={props.bottomPadding}
        primary={listPrimary}
        onBack={() => closeList('chapters')}
        onPickChapter={(chapter) => { console.log(`${LOG} нажатие → эпизоды главы`, JSON.stringify({ chapter })); setScreen({ kind: 'episodes', chapter }); }} // guard-ok: куда ведёт нажатие
      />
    );
  }
  if (screen && screen.kind === 'episodes') {
    return (
      <SeasonChapterEpisodesScreen
        lang={lang}
        deck={deck}
        chapterOrdinal={screen.chapter}
        chapterCount={props.chapterCount}
        chapterScene={props.chapterInfo(screen.chapter).scene}
        episodeInfo={props.episodeInfo}
        bottomPadding={props.bottomPadding}
        primary={listPrimary}
        // «назад» из эпизодов ведёт к списку глав (там главу и выбирали)
        onBack={() => { console.log(`${LOG} «назад» из списка`, JSON.stringify({ from: 'episodes', to: 'главы' })); setScreen({ kind: 'chapters' }); }} // guard-ok: куда ведёт нажатие
        onPickCard={pickCardFromList}
      />
    );
  }

  return (
    <View style={styles.root}>
      {topBand > 0 ? <View pointerEvents="none" testID="season-top-cover" style={[styles.topCover, { top: -topBand, height: topBand, backgroundColor: topBandColor }]} /> : null}
      <SeasonCourseView
        {...props}
        focus={focus}
        onSelectedChange={setSelected}
        onCardOpen={setExpanded}
        onAllChapters={openChapters}
      />
      {expandedProps ? <SeasonExpandedCard {...expandedProps} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 }, topCover: { position: 'absolute', left: 0, right: 0, zIndex: 1 } });

export default memo(SeasonCourse);
