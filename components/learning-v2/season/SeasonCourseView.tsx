// ════════════════════════════════════════════════════════════════════════════
// SeasonCourseView.tsx — экран «Обучение» Learning V2 по гибриду «Сезон и карусель карт» (эталон course-hybrid-1-4.html, «Способ 2»).
//
// зачем (владелец 21.10): обложка главы-сезона с «Продолжить эпизод N» (или «Начать с эпизода 1» + «Не хочу с начала» у новичка), под ней выбор
// главы и карусель карт эпизодов; подпись выбранного эпизода. Здесь — фаза 2: «в процессе» и «новичок».
// Раскрытая карта, закрытый эпизод и экзамен — фаза 3 (событие onCardOpen выведено наружу).
// 22.10 (владелец, макет lesson-hub-final.html): веер и чипы глав убраны; под обложкой — три плитки «Все главы / Все уроки / Классический курс» (SeasonNavTiles), списки — SeasonPickScreens.
// Компонент — чистая вёрстка и движение: данные курса (названия, фразы, сцены, слова) приходят пропсами от родителя, чтобы экран не привязывался
// к файлам контента, которые ведёт Codex; прогресс — готовая колода (season_course_model) из уже посчитанного снимка, новых чтений Firebase нет.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { useIsTabPage } from '../../tab_top_bleed';
import { useTabContentBottomPad, useTabPillTop } from '../../../hooks/use-tab-content-bottom-pad';
import { seasonLayoutLog } from './season_modal_log';
import V2Pressable from '../../v2/V2Pressable';
import ScreenBackButton, { SCREEN_BACK_RESERVED, SCREEN_BACK_SIZE, screenBackTop } from '../../v2/ScreenBackButton';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Lang } from '../../../constants/i18n';
import { LinearGradient } from '../../SafeLinearGradient';
import { useLv2Glass } from '../LearningV2Glass';
import { logSceneTheme } from '../../home/v2/scene/scene_theme_log';
import { useTheme } from '../../ThemeContext';
import SeasonCarousel from './SeasonCarousel';
import SeasonNavTiles from './SeasonNavTiles';
import SeasonCardFace from './SeasonCardFace';
import { hexChroma, hexHue, seasonThemedArt, type SeasonTheme } from './season_art';
import { seasonStarTones } from './season_star_tones';
import { seasonText, seasonEpisodeLabel } from './season_copy';
import { seasonCardText } from './season_copy_card';
import { seasonHeroTitleSize } from './season_hero_title_metrics';
import {
  seasonChapterProgress, type SeasonDeck, type SeasonEpisodeCard,
} from './season_course_model';
import { SEASON_COUNT_LOG } from '../../home/v2/scene/home_scene_count';
import { reportSeasonCoverTop, useScrollAtTop } from '../../../hooks/use_scene_status_bar';
import type { SeasonCard } from './season_course_model';

/** Подпись экзамена под каруселью (эталон chapter-exam-season.html, ex1): тексты и кнопка уже с действием. */
export type SeasonExamCaptionView = Readonly<{ kicker: string; title: string; action: Readonly<{ label: string; icon: 'trophy' | 'play'; onPress: () => void }> | null; note: string | null }>;

type IonName = React.ComponentProps<typeof Ionicons>['name'];

const WHITE = '#FFFFFF'; // theme-exempt: текст на градиентной обложке белый в обеих темах (эталон `.c1hero { color: #fff }`)
const WHITE_SOFT = 'rgba(255,255,255,0.86)'; // theme-exempt: подпись на обложке, эталон `.c1kick`
const PILL = 'rgba(255,255,255,0.16)'; // theme-exempt: «стеклянная» пилюля на обложке, эталон `.c1pill`
// зачем (аудит контраста светлой темы 22.10, координатор): белый «Урок N» на светлой подложке-пилюле (белый 16 % поверх from) давал 3,69–4,26:1 при норме 4,5 на всех 224 оттенках глав;
// в светлой теме пилюля — тёмное стекло (чёрный 18 %), белый текст на ней ≥ 4,92:1; в тёмной оформление прежнее (5,73:1)
const PILL_ON_LIGHT = 'rgba(0,0,0,0.18)'; // theme-exempt: тёмное стекло пилюли «Урок N» на светлой обложке
const SCRIM = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.36)'] as const; // theme-exempt: затемнение низа обложки, эталон `.c1hero .scrim`
const BTN_INK = '#121318'; // theme-exempt: текст белой кнопки на обложке, эталон `.qbtn.white`
const HUD_ROW_HEIGHT = 44; // высота самой высокой кнопки HUD (книга слов 44) — ниже неё начинаются кикер и заголовок
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
  /** Звёзды результата 0–3 пройденного эпизода (владелец 22.10: «оценка пройденного урока — звёздочки»); null / нет — у эпизода звёзд нет (текущий, закрытый). */
  /** 'pending' — звёзды занятий ещё не подняты в память (нет звёзд, не «1»). */
  stars?: number | 'pending' | null;
}>;

export type SeasonChapterInfo = Readonly<{ scene: string; icon: IonName }>;

export type SeasonCourseViewProps = Readonly<{
  lang: Lang;
  theme: SeasonTheme;
  lessonOrdinal: number;
  lessonTitle: string;
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
  /** Подпись под каруселью у карты экзамена по её состоянию (эталон chapter-exam-season.html); нет — «Экзамен главы» без кнопки. */
  examCaption?: (card: SeasonCard) => SeasonExamCaptionView | null;
  /** Карусель встала на карту (после свайпа/тапа) — родителю нужно для «Вся глава». */
  onSelectedChange?: (index: number) => void;
  /** Поставить карусель на карту: родитель меняет seq, чтобы вернуться на ту же карту повторно («К эпизоду N», возврат из веера). */
  focus?: Readonly<{ index: number; seq: number }>;
  onLessonPicker: () => void;
  // зачем (владелец 22.10, макет lesson-hub-final.html): веер «Вся глава» и чипы глав убраны; вместо них три явные кнопки под обложкой — «Все главы», «Все уроки», «Классический курс»
  onAllChapters: () => void;
  onAllLessons: () => void;
  onClassic: () => void;
  /** Прогресс классики одной строкой («12 из 50») для плитки; null — классику не начинали (владелец 22.10: «Показать в плитке»). */
  classicValue?: string | null;
  /** Тап по закрытому эпизоду: какую карту встряхнуть (замок трясётся, модала нет); seq растёт на каждый тап. */
  lockShake?: Readonly<{ index: number; seq: number }> | null;
  onWords: () => void;
  onTheory: () => void;
  /**
   * Экран открыт поверх вкладок (push /learning-v2/course: плитка «Уроки» и «Продолжить» на Главной, возврат из занятия, диплинк) —
   * таббара нет, поэтому слева штатная «Назад» (ScreenBackButton: одно место на всё приложение), строка «Урок N» сдвинута вправо.
   * зачем (владелец 25.10, 2.0.2: «из раздела „Уроки“ невозможно выйти назад!!! нет кнопки назад, нет таббара»).
   */
  pushBack?: boolean;
}>;

function SeasonCourseView(props: SeasonCourseViewProps) {
  const { lang, theme, deck, lessonOrdinal } = props;
  const g = useLv2Glass();
  const { liquidGlassThemeId } = useTheme();
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
  // зачем (закон владельца 22.10): обложка и карты — оттенки текущей темы
  const themeHue = hexHue(g.accent);
  // зачем (баг владельца 28.10, серая тема — яркая сцена): насыщенность палитры сцены от насыщенности ТЕКУЩЕЙ темы, не эталонная
  const themeChroma = hexChroma(g.accent);
  const heroArt = seasonThemedArt(themeHue, heroChapter, 0, theme, false, themeChroma);
  useEffect(() => {
    logSceneTheme('lessons:season-cover', liquidGlassThemeId, theme, 'seasonThemedArt(themeHue, themeChroma)', { accent: g.accent, from: heroArt.from, to: heroArt.to, glow: heroArt.glow, tintChroma: Math.round(themeChroma * 1000) / 1000 });
  }, [g.accent, liquidGlassThemeId, heroArt.from, heroArt.to, heroArt.glow, theme, themeChroma]);
  // зачем (владелец 22.10, 4 · ТЕМЫ 17a7af053): звёзды результата на карточках — оттенки текущей темы, цвета только из seasonStarTones
  const starTones = useMemo(() => seasonStarTones(themeHue), [themeHue]);

  // зачем (закон «сперва логи», владелец 22.10: «ПРАВИЛО НАРУШЕНО» — под часами светлая полоса над обложкой): [SEASON-TOP] показывает всё, что решает, начинается ли обложка с y = 0:
  // зона часов страницы (topBleed из TabTopBleedContext), безопасный верх, страница ли это вкладки, тема и фон, а после раскладки — положение обложки В ОКНЕ (должно быть 0).
  const topInsets = useStableSafeAreaInsets();
  const isTabPage = useIsTabPage();
  const heroRef = useRef<View>(null);
  useEffect(() => {
    console.log('[SEASON-TOP] вход', JSON.stringify({ topBleed: props.topBleed ?? null, topPadding: props.topPadding, insetsTop: topInsets.top, isTabPage, tall: props.topBleed !== undefined && props.topBleed > 0, theme, bg: g.bg, rule: 'обложка от y=0, insets.top — только отступ содержимого' })); // guard-ok: значения, решающие раскладку верха
  }, [g.bg, isTabPage, props.topBleed, props.topPadding, theme, topInsets.top]);
  const onHeroLayout = useCallback((event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    heroRef.current?.measureInWindow((_x, windowY, _w, windowHeight) => {
      const band = windowY > 0.5;
      const log = band ? console.warn : console.log;
      log('[SEASON-TOP] обложка', JSON.stringify({ layoutY: y, layoutHeight: height, windowY, windowHeight, topBleed: props.topBleed ?? null, insetsTop: topInsets.top, isTabPage, verdict: band ? `ПОЛОСА над обложкой ${Math.round(windowY)} px (фон страницы виден под часами)` : 'обложка от верха экрана, полосы нет' })); // guard-ok: итог раскладки верха
    });
  }, [isTabPage, props.topBleed, topInsets.top]);

  const selectedCard = deck.cards[selected] ?? currentCard;
  const sectionInfo = props.chapterInfo(selectedCard ? selectedCard.chapterOrdinal : heroChapter);
  const progress = selectedCard ? seasonChapterProgress(deck, selectedCard.chapterOrdinal) : { done: 0, total: 0 };
  // зачем (Сверка 24.10, одно правило числа): «k из n» под каруселью — эпизоды выбранной главы из колоды (прогресс курса на телефоне)
  useEffect(() => {
    console.log(`${SEASON_COUNT_LOG} обложка`, JSON.stringify({ chapter: selectedCard ? selectedCard.chapterOrdinal : null, done: progress.done, total: progress.total, source: 'колода главы: выпущенные эпизоды, пройденные по прогрессу курса' })); // guard-ok: одна строка на смену главы/числа
  }, [progress.done, progress.total, selectedCard?.chapterOrdinal]); // eslint-disable-line react-hooks/exhaustive-deps -- зачем: только номер главы

  const renderCard = useCallback((index: number) => {
    const card = deck.cards[index];
    if (!card) return null;
    const info = props.chapterInfo(card.chapterOrdinal);
    const art = seasonThemedArt(themeHue, card.chapterOrdinal, card.sessionOrdinal, theme, card.kind === 'exam', themeChroma);
    if (card.kind === 'exam') {
      return (
        <SeasonCardFace kind="exam" state={card.state} ordinal={card.chapterOrdinal} art={art} dark={dark} glyph={info.icon}
          phrase={`${seasonText(lang, 'exam')} ${card.chapterOrdinal}`} progress={null} shakeSeq={props.lockShake && props.lockShake.index === index ? props.lockShake.seq : 0} />
      );
    }
    const ep = props.episodeInfo(card);
    return <SeasonCardFace kind="episode" state={card.state} ordinal={card.sessionOrdinal} art={art} dark={dark} glyph={info.icon} phrase={ep.phrase} progress={ep.progress} stars={card.state === 'done' ? ep.stars ?? null : null} starTones={starTones} shakeSeq={props.lockShake && props.lockShake.index === index ? props.lockShake.seq : 0} />;
  }, [dark, deck.cards, lang, starTones, themeHue, themeChroma, props, theme]);

  const labelFor = useCallback((index: number) => {
    const card = deck.cards[index];
    if (!card) return '';
    return card.kind === 'exam' ? `${seasonText(lang, 'exam')} ${card.chapterOrdinal}` : seasonEpisodeLabel(lang, card.sessionOrdinal);
  }, [deck.cards, lang]);

  const caption = useMemo(() => {
    if (!selectedCard) return { kicker: '', title: '' };
    // зачем (координатор 24.10; эталон chapter-exam-season.html, capX): подпись экзамена — по его состоянию (можно сдать / пауза / сдан);
    // закрытая карта экзамена — «Глава N» / «Экзамен главы» без кнопки
    if (selectedCard.kind === 'exam') {
      const exam = selectedCard.state !== 'locked' && props.examCaption ? props.examCaption(selectedCard) : null;
      return exam ? { kicker: exam.kicker, title: exam.title, exam } : { kicker: seasonCardText(lang, 'chapterShort', { n: selectedCard.chapterOrdinal }), title: seasonText(lang, 'exam') };
    }
    const ep = props.episodeInfo(selectedCard);
    return { kicker: [seasonEpisodeLabel(lang, selectedCard.sessionOrdinal), ep.taskLine].filter(Boolean).join(', '), title: ep.title };
  }, [lang, props, selectedCard]);

  // зачем (владелец 22.10: последний выбранный эталон — scenes-compact.html «Обучение · Сезон», вариант 2; координатор): на полноэкранной обложке чипы «Слова» и «Теория» стоят ВНУТРИ обложки под кнопкой, внизу остаётся только «Вся глава»
  const tall = props.topBleed !== undefined && props.topBleed > 0;
  const primaryLabel = props.newcomer
    ? seasonText(lang, 'startEpisode', { n: currentEpisode?.sessionOrdinal ?? 1 })
    : seasonText(lang, 'continueEpisode', { n: currentEpisode?.sessionOrdinal ?? 1 });

  // зачем (координатор 24.10, Р2): обложка тёмная — оболочка вкладок держит светлые значки строки состояния, пока обложка под часами;
  // вкладку видит оболочка, прокрутку — здесь (меняется только на пересечении порога)
  const [coverAtTop, onCoverScroll] = useScrollAtTop();
  // зачем (координатор 25.10: на 411 dp «Сдать экзамен» под таб-баром): на странице вкладки низ контента не выше плавающего таб-бара —
  // отступ не меньше useTabContentBottomPad (высота капсулы + зазор)
  const tabBottomPad = useTabContentBottomPad();
  const contentBottomPad = isTabPage ? Math.max(props.bottomPadding, tabBottomPad) : props.bottomPadding;
  // зачем (владелец 25.10, iPhone 2.0.2: «Сдашь — откроется глава 2 · 12 вопросов…» видна ПОД капсулой таб-бара, хотя отступ низа уже учитывает таб-бар; координатор: СПЕРВА ЛОГИ):
  // [SEASON-LAYOUT] at:'caption' — где подпись под каруселью В ОКНЕ против верха капсулы: низ подписи, верх капсулы, перекрытие, отступы (bottomPadding / таб-бар / итоговый), прокрутка и высота содержимого.
  // Тот же замер при остановке прокрутки: докрученная до конца страница обязана держать подпись выше капсулы (overlapPx ≤ 0). Одна строка на смену значений; перекрытие — warn.
  const win = useWindowDimensions();
  const pillTop = useTabPillTop();
  const captionRef = useRef<View>(null);
  const scrollInfo = useRef({ y: 0, contentH: 0, viewportH: 0 });
  const captionLogKey = useRef('');
  const logCaption = useCallback((why: string) => {
    captionRef.current?.measureInWindow((_x, y, _w, h) => {
      const capsuleTopY = win.height - pillTop;
      const bottom = y + h;
      const overlapPx = Math.round(bottom - capsuleTopY);
      const s = scrollInfo.current;
      const atEnd = s.contentH > 0 && s.y + s.viewportH >= s.contentH - 1;
      const key = [why, y, h, win.height, pillTop, s.y, s.contentH, s.viewportH].map((n) => (typeof n === 'number' ? Math.round(n) : n)).join('|');
      if (key === captionLogKey.current) return;
      captionLogKey.current = key;
      const bad = overlapPx > 0 && atEnd; // под капсулой в конце прокрутки = ошибка; в начале страница ещё прокручивается и подпись может быть ниже — это не дефект
      seasonLayoutLog(bad ? 'warn' : 'info', JSON.stringify({ at: 'caption', why, captionY: Math.round(y), captionH: Math.round(h), captionBottom: Math.round(bottom), windowH: Math.round(win.height), pillTop: Math.round(pillTop), capsuleTopY: Math.round(capsuleTopY), overlapPx, atEnd, scrollY: Math.round(s.y), contentH: Math.round(s.contentH), viewportH: Math.round(s.viewportH), bottomPadding: props.bottomPadding, tabBottomPad: Math.round(tabBottomPad), contentBottomPad: Math.round(contentBottomPad), isTabPage, verdict: bad ? 'CAPTION_UNDER_TABBAR_AT_END' : 'ok' }));
    });
  }, [contentBottomPad, isTabPage, pillTop, props.bottomPadding, tabBottomPad, win.height]);
  const onPageScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollInfo.current.y = e.nativeEvent.contentOffset.y;
    onCoverScroll(e);
  }, [onCoverScroll]);
  useEffect(() => {
    console.log('[SEASON-BOTTOM] отступ низа', JSON.stringify({ isTabPage, given: props.bottomPadding, tab: tabBottomPad, used: contentBottomPad })); // guard-ok: одна строка на смену отступа
  }, [contentBottomPad, isTabPage, props.bottomPadding, tabBottomPad]);
  useEffect(() => {
    reportSeasonCoverTop({ mounted: true, atTop: coverAtTop });
  }, [coverAtTop]);
  useEffect(() => () => reportSeasonCoverTop({ mounted: false, atTop: true }), []);

  return (
    <>
    <ScrollView contentContainerStyle={{ paddingBottom: contentBottomPad }} showsVerticalScrollIndicator={false} testID="season-course" onScroll={onPageScroll} scrollEventThrottle={32}
      onLayout={(e) => { scrollInfo.current.viewportH = e.nativeEvent.layout.height; }}
      onContentSizeChange={(_w, h) => { scrollInfo.current.contentH = h; logCaption('content_size'); }}
      onMomentumScrollEnd={() => logCaption('scroll_end')} onScrollEndDrag={() => logCaption('drag_end')}>
      <View ref={heroRef} onLayout={onHeroLayout} style={[styles.hero, props.topBleed && props.topBleed > 0 ? styles.heroTall : null]} testID="season-hero">
        <LinearGradient colors={[heroArt.from, heroArt.to]} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={[heroArt.glow, 'transparent']} start={{ x: 1, y: 0 }} end={{ x: 0.35, y: 0.6 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <LinearGradient colors={SCRIM} style={styles.scrim} pointerEvents="none" />
        <View style={[styles.heroTop, props.pushBack
          // зачем: строка шапки по центру круга «Назад» (48) и справа от него — не под ним и не на 16 dp ниже
          ? { top: screenBackTop(topInsets.top) + (SCREEN_BACK_SIZE - HUD_ROW_HEIGHT) / 2, left: SCREEN_BACK_RESERVED }
          : { top: props.topPadding + 8 }]}>
          <V2Pressable hitSlop={8} accessibilityRole="button" onPress={props.onLessonPicker} style={[styles.pill, dark ? null : { backgroundColor: PILL_ON_LIGHT }]} testID="season-lesson-pill">
            <Text style={styles.pillText}>{seasonText(lang, 'lesson', { n: lessonOrdinal })}</Text>
            <Ionicons name="chevron-down" size={13} color={WHITE} />
          </V2Pressable>
          <View style={styles.flex} />
          {/* зачем (аудит контраста светлой темы 22.10, координатор): энергия в шапке вкладки «Уроки» без капсулы красится под светлый ФОН ЭКРАНА (текст/акцент темы), а здесь лежит на тёмном градиенте и световом пятне обложки (≈2,5–3:1);
              в светлой теме HUD стоит на плите цвета карточки темы — тексты и акцент темы читаются на ней ≥ 4,5:1 (тот же токен opaqueCard, что в аудите заданий) */}
          {props.avatarSlot ? (!dark && tall ? <View testID="season-hud-plate" style={[styles.hudPlate, { backgroundColor: g.opaqueCard }]}>{props.avatarSlot}</View> : props.avatarSlot) : null}
        </View>
        <View style={[styles.heroBody, props.topBleed && props.topBleed > 0 ? styles.heroBodyTall : null, { paddingTop: props.topPadding + 8 + HUD_ROW_HEIGHT + 12 }]}>
          {/* ЗАМОК ВЛАДЕЛЬЦА 22.10: «вот это убираем!» — строки-кикера «Урок N · …» над заголовком на обложке нет (ни в режиме с зоной часов, ни без неё); номер урока — в плашке слева сверху */}
          {/* ЗАМОК ВЛАДЕЛЬЦА 22.10: «меньше шрифт и более компактно!» — кегль заголовка из season_hero_title_metrics, перенос только по словам */}
          <Text accessibilityRole="header" style={[styles.heroTitle, seasonHeroTitleSize(props.lessonTitle)]}>{props.lessonTitle}</Text>
          {/* зачем (владелец 22.10, выбор варианта 2 макета lesson-hub-words-theory.html): «Слова» и «Теория» — плитки в строке с «Продолжить» (стекло в тоне обложки, 70 × 50), без чипов и без голого текста под каруселью; во всех режимах обложки (с зоной часов и без неё) */}
          <View style={styles.primaryRow}>
            <V2Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={primaryLabel} onPress={() => currentEpisode && props.onPrimary(currentEpisode)} outerStyle={styles.primaryOuter} style={styles.primary} testID="season-primary">
              <Ionicons name="play" size={18} color={BTN_INK} />
              <Text style={styles.primaryText} numberOfLines={1}>{props.newcomer ? seasonText(lang, 'startShort') : seasonText(lang, 'continueShort')}</Text>
            </V2Pressable>
            <HeroTile icon="albums-outline" label={seasonText(lang, 'words')} onPress={props.onWords} dark={dark} testID="season-words" />
            <HeroTile icon="book-outline" label={seasonText(lang, 'theory')} onPress={props.onTheory} dark={dark} testID="season-theory" />
          </View>
          {props.newcomer && props.onNotFromStart ? (
            <V2Pressable hitSlop={8} accessibilityRole="button" onPress={props.onNotFromStart} style={styles.glass} testID="season-not-from-start">
              <Ionicons name="school-outline" size={18} color={WHITE} />
              <Text style={styles.glassText}>{seasonText(lang, 'notFromStart')}</Text>
            </V2Pressable>
          ) : props.resumeLine ? (
            <View style={styles.resume}>
              <View style={styles.bar}><View style={[styles.barFill, { width: `${Math.round((currentEpisode ? props.episodeInfo(currentEpisode).progress ?? 0 : 0) * 100)}%` }]} /></View>
              <Text style={styles.resumeText} numberOfLines={2}>{props.resumeLine}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <SeasonNavTiles
        allChaptersLabel={seasonCardText(lang, 'allChapters')}
        allChaptersDisabled={deck.chapters.length === 0}
        allLessonsLabel={seasonCardText(lang, 'allLessons')}
        classicLabel={seasonCardText(lang, 'classicCourse')}
        classicValue={props.classicValue ?? null}
        onAllChapters={props.onAllChapters}
        onAllLessons={props.onAllLessons}
        onClassic={props.onClassic}
      />

      <View style={styles.section}>
        <View style={styles.sectionLeft} testID="season-chapter-title">
          <Text style={[styles.sectionKicker, { color: g.secondary }]}>{seasonText(lang, 'chapterOf', { n: selectedCard?.chapterOrdinal ?? 1, m: props.chapterCount })}</Text>
          <View style={styles.sectionTitleRow}>
            <Text style={[styles.sectionTitle, { color: g.text }]} numberOfLines={2}>{sectionInfo.scene}</Text>
          </View>
        </View>
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

      <View ref={captionRef} onLayout={() => logCaption('layout')} style={styles.caption} testID="season-caption">
        <Text style={[styles.captionKicker, { color: g.secondary }]}>{caption.kicker}</Text>
        {/* зачем (владелец 22.10, выбор варианта 3): на карточке только номер и звёзды — «Эпизод N» и название эпизода здесь, под каруселью */}
        <Text style={[styles.captionTitle, { color: g.text }]} numberOfLines={3}>{caption.title}</Text>
        {/* зачем (эталон chapter-exam-season.html, правка владельца 22.10 №10): «Сдать экзамен» раскрывает карту экзамена (там «Начать
            экзамен» с ⚡1 / строкой Plus — запуск и списание в одном месте), под кнопкой — «Сдашь — откроется глава N · 12 вопросов, сдать от 10» */}
        {'exam' in caption && caption.exam && caption.exam.action ? (
          <V2Pressable
            testID="season-caption-exam"
            accessibilityRole="button"
            accessibilityLabel={caption.exam.action.label}
            onPress={caption.exam.action.onPress}
            scaleTo={0.97}
            style={[styles.captionExam, { backgroundColor: g.accent }]}
          >
            <Ionicons name={caption.exam.action.icon} size={18} color={g.accentInk} />
            <Text style={[styles.captionExamText, { color: g.accentInk }]}>{caption.exam.action.label}</Text>
          </V2Pressable>
        ) : null}
        {'exam' in caption && caption.exam && caption.exam.note ? (
          <Text testID="season-caption-exam-note" style={[styles.captionNote, { color: g.secondary }]}>{caption.exam.note}</Text>
        ) : null}
      </View>

    </ScrollView>
    {/* зачем: «Назад» вне прокрутки — место не уезжает с обложкой (замок владельца 22.10 «назад в одном месте»); цвет круга — по обложке */}
    {props.pushBack ? <ScreenBackButton screen="season_course_push" fallback="/(tabs)/home" sceneTop={heroArt.from} testID="season-push-back" /> : null}
    </>
  );
}

/** Плитка «Слова» / «Теория» в строке с главной кнопкой обложки: стекло в тоне обложки (тёмное стекло на светлой), значок + подпись, 70 × 50 (макет lesson-hub-words-theory.html, вариант 2). */
function HeroTile({ icon, label, onPress, dark, testID }: Readonly<{ icon: IonName; label: string; onPress: () => void; dark: boolean; testID: string }>) {
  return (
    <V2Pressable hitSlop={4} accessibilityRole="button" accessibilityLabel={label} onPress={onPress} testID={testID} style={[styles.heroTile, { backgroundColor: dark ? PILL : PILL_ON_LIGHT }]}>
      <Ionicons name={icon} size={18} color={WHITE} />
      <Text style={styles.heroTileText} numberOfLines={1}>{label}</Text>
    </V2Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // зачем (Сверка §21, координатор 22.10: «HUD-плашка налезает на строку «Урок 2 · …» и заголовок во всех темах»): обложка — не фиксированная высота с текстом, прижатым к низу, а минимальная высота 380/392 и поток; тексты и кнопки лежат ПОД строкой HUD (отступ сверху = безопасный верх + 8 + строка 44 + 12) и при нехватке места обложка вырастает, а не наезжает на HUD
  hero: { minHeight: 380, borderBottomLeftRadius: 34, borderBottomRightRadius: 34, overflow: 'hidden' },
  // зачем (владелец 22.10: высота сцен 46 % для всех; scenes-compact.html «Обучение · Сезон», вариант 2): 392 dp вместе с зоной часов, фон от верха экрана
  heroBodyTall: { paddingBottom: 44 },
  hudPlate: { borderRadius: 22, paddingHorizontal: 6, paddingVertical: 2, flexDirection: 'row', alignItems: 'center' },
  heroTall: { minHeight: 392, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  scrim: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 320 },
  heroTop: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pill: { height: 40, paddingHorizontal: 14, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: PILL },
  pillText: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: WHITE },
  heroBody: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 20, paddingBottom: 22 },
  heroTitle: { fontWeight: '700', letterSpacing: -0.3, color: WHITE },
  primaryRow: { marginTop: 16, flexDirection: 'row', gap: 8 },
  primaryOuter: { flex: 1 },
  primary: { height: 50, borderRadius: 25, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: WHITE },
  heroTile: { width: 70, height: 50, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 2 },
  heroTileText: { fontSize: 13, lineHeight: 15, fontWeight: '700', color: WHITE },
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
  captionExam: { marginTop: 14, height: 50, borderRadius: 25, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, alignSelf: 'stretch' },
  captionExamText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  captionNote: { marginTop: 10, fontSize: 13, lineHeight: 17, textAlign: 'center' },
});

export default memo(SeasonCourseView);
