// ═══════════════════════════════════════════════════════════
// dev_season_preview — DEV-превью экрана «Обучение» («Сезон и карусель карт», способ 2) на моках (только разработка).
//
// зачем (координатор 21.10, Сверка): состояния экрана снимаются по ссылке рядом с эталоном course-hybrid-1-4.html / chapter-exam-season.html, а боевая вкладка
// «Уроки» не подменяется и боевой прогресс не трогается:
//   /dev_season_preview?state=cover | newcomer | carousel | locked_open | chapter_picker | exam_card | exam_open &theme=dark|light
//   cover — «в процессе» (эпизод 12, phone 5); newcomer — «Начать с эпизода 1» + «Не хочу с начала» (phone 6); carousel — карусель на закрытом эпизоде 14 (phone 7);
//   locked_open — раскрытая закрытая карта; chapter_picker — «Вся глава» веером, глава 2 (phone 8); exam_card — карусель на карте «Экзамен главы 2» (phone 9);
//   exam_open — раскрытая карта экзамена (кнопки «Сдать экзамен» нет: SEASON_CHAPTER_EXAM_ENABLED=false). По умолчанию state=cover, theme — как сейчас в приложении.
// Экран — тот же SeasonCourse, что пойдёт в бой; прогресс — моки в тех же строках курса (components/learning-v2/season/season_preview_fixtures.ts). Тема меняется
// ТОЛЬКО в памяти процесса (app/dev_appearance_override.ts): сохранённый выбор темы и облако не тронуты; уходя с экрана, возвращаем прежнее.
// В релизе маршрута нет: ENABLE_DEV_TOOLS && !IS_STORE_RELEASE, иначе уводим на Главную. Охраняет tests/season_dev_preview_contract.test.ts.
// ═══════════════════════════════════════════════════════════
import { Redirect, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Image } from 'expo-image';
import ScreenGradient from '../components/ScreenGradient';
import { coinRankDisplaySource } from '../components/coins/coin_rank_display';
import { PlusAvatarRing } from '../components/plus/PlusAvatarRing';
import { STORY_RING_SLOT } from '../components/stories/story_ring_constants';
import { useLang } from '../components/LangContext';
import { useTheme } from '../components/ThemeContext';
import SeasonCourse from '../components/learning-v2/season/SeasonCourse';
import {
  SEASON_PREVIEW_LESSON,
  isSeasonPreviewState,
  seasonPreviewChapterInfo,
  seasonPreviewEpisodeInfo,
  seasonPreviewResumeLine,
  seasonPreviewSetup,
  type SeasonPreviewState,
} from '../components/learning-v2/season/season_preview_fixtures';
import { ENABLE_DEV_TOOLS, IS_STORE_RELEASE } from './config';
import { getDevAppearance, setDevAppearance } from './dev_appearance_override';

const noop = (): void => undefined;
/** Ранг монеты-аватара в превью (как у dev-входа Главной). */
const PREVIEW_COIN_RANK = 5;

function Inner() {
  const params = useLocalSearchParams<{ state?: string; theme?: string }>();
  const { lang } = useLang();
  const { isDark } = useTheme();
  const state: SeasonPreviewState = isSeasonPreviewState(params.state) ? params.state : 'cover';
  const wanted = params.theme === 'dark' || params.theme === 'light' ? params.theme : null;

  // тема ссылкой: в памяти процесса, на выходе возвращаем то, что было (без записи в хранилище и облако)
  useEffect(() => {
    if (!wanted) return undefined;
    const before = getDevAppearance();
    setDevAppearance(wanted);
    return () => setDevAppearance(before);
  }, [wanted]);

  const setup = useMemo(() => seasonPreviewSetup(state), [state]);
  const episodeInfo = useCallback((card: Parameters<typeof seasonPreviewEpisodeInfo>[1]) => seasonPreviewEpisodeInfo(lang, card, setup.newcomer), [lang, setup.newcomer]);
  const resumeLine = useMemo(() => seasonPreviewResumeLine(lang, setup.deck, setup.newcomer), [lang, setup.deck, setup.newcomer]);
  const theme = (wanted ?? (isDark ? 'dark' : 'light'));
  // зачем (Сверка 22.10, ss_side_*; эталон: справа в шапке аватар с ромбом Plus): мок-аватар из того же источника, что у Главной; в бою аватар приходит от хозяина экрана (avatarSlot), без новых чтений
  const coinSource = useMemo(() => coinRankDisplaySource(PREVIEW_COIN_RANK, STORY_RING_SLOT), []);
  const avatar = useMemo(() => (
    <PlusAvatarRing plus size={STORY_RING_SLOT}>
      <Image testID="dev-season-avatar" accessible={false} source={coinSource} style={s.avatar} contentFit="contain" />
    </PlusAvatarRing>
  ), [coinSource]);

  useEffect(() => {
    console.log(`[DEV-STATE] season_preview route state=${state} fromParam=${String(params.state ?? 'нет→cover')} theme=${theme} fromParam=${String(params.theme ?? 'нет→приложение')} newcomer=${String(setup.newcomer)} cards=${setup.deck.cards.length} current=${setup.deck.currentIndex} selected=${setup.initialState.selectedIndex} expanded=${String(setup.initialState.expandedIndex)} fan=${String(setup.initialState.fanChapter)}`); // guard-ok: dev-маршрут, в релизе не открывается (Redirect на Главную)
  }, [state, params.state, params.theme, theme, setup]);

  return (
    <View style={s.root} testID="dev-season-preview">
      <ScreenGradient artBackdrop="home">
        <SafeAreaView edges={['top']} style={s.root}>
          {/* key: смена состояния пересоздаёт экран — локальные состояния (раскрытая карта, веер, позиция карусели) стартуют заново */}
          <SeasonCourse
            key={`${state}|${theme}`}
            lang={lang}
            theme={theme}
            lessonOrdinal={SEASON_PREVIEW_LESSON.ordinal}
            lessonTitle={SEASON_PREVIEW_LESSON.title}
            arcTitle={SEASON_PREVIEW_LESSON.arc}
            chapterCount={SEASON_PREVIEW_LESSON.chapterCount}
            deck={setup.deck}
            newcomer={setup.newcomer}
            resumeLine={resumeLine}
            episodeInfo={episodeInfo}
            chapterInfo={seasonPreviewChapterInfo}
            topPadding={0}
            avatarSlot={avatar}
            bottomPadding={140}
            reducedMotion={false}
            initialState={setup.initialState}
            onPrimary={noop}
            onNotFromStart={noop}
            onLessonPicker={noop}
            onChapterPicker={noop}
            onWords={noop}
            onTheory={noop}
          />
        </SafeAreaView>
      </ScreenGradient>
    </View>
  );
}

export default function DevSeasonPreviewRoute() {
  if (!ENABLE_DEV_TOOLS || IS_STORE_RELEASE) return <Redirect href="/" />;
  return <Inner />;
}

const s = StyleSheet.create({
  root: { flex: 1 },
  avatar: { width: STORY_RING_SLOT, height: STORY_RING_SLOT },
});
