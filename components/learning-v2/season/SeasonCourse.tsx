// ════════════════════════════════════════════════════════════════════════════
// SeasonCourse.tsx — экран «Обучение» целиком: карусель (SeasonCourseView) + раскрытая карта (SeasonExpandedCard) + полноэкранные списки «Все главы» / «Эпизоды главы» (SeasonPickScreens).
//
// зачем (владелец 21.10, «Способ 2», фаза 3): держит состояние экрана — какая карта раскрыта, показан ли веер и какая глава в нём, куда сфокусировать
// карусель после «К эпизоду N» или возврата из списка. 22.10 (владелец, макет lesson-hub-final.html): веер «Вся глава» заменён двумя полноэкранными списками. Данные курса и действия приходят пропсами (как у SeasonCourseView): экран не читает сеть и контент Codex.
// Экзамен главы: карта и раскрытая карта рисуются, а действия «Сдать экзамен» и «Открыть экзаменом главы» — только при SEASON_CHAPTER_EXAM_ENABLED (по умолчанию выключен,
// логики экзамена в коде ещё нет, её сделает Learning V2).
// ════════════════════════════════════════════════════════════════════════════
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View, useWindowDimensions, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';

import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { useIsTabPage } from '../../tab_top_bleed';
import { episodeModalLog, seasonLayoutLog } from './season_modal_log';

import { SeasonChapterEpisodesScreen, SeasonChaptersScreen } from './SeasonPickScreens';
import SeasonCourseView, { type SeasonCourseViewProps } from './SeasonCourseView';
import SeasonExpandedCard, { type SeasonExamPanel, type SeasonExpandedAction } from './SeasonExpandedCard';
import { hexChroma, hexHue, seasonThemedArt } from './season_art';
import { scenePaletteCached, sceneTopHex } from '../../scene/scene_palette';
import { useTheme } from '../../ThemeContext';
import { useLv2Glass } from '../LearningV2Glass';
import { seasonText, seasonEpisodeLabel } from './season_copy';
import { seasonCardText, seasonTasksLabel } from './season_copy_card';
import { CHAPTER_EXAM_PASS_CORRECT_V1, CHAPTER_EXAM_QUESTION_COUNT_V1 } from '../../../modules/learning-v2/exam/chapter_exam_v1';
import { SEASON_CHAPTER_EXAM_ENABLED, SEASON_EPISODE_WINDOW_ENABLED } from './season_flags';
import { seasonUnlockAfter, type SeasonCard, type SeasonEpisodeCard } from './season_course_model';
import SeasonLockHint, { type SeasonLockHintFrame, type SeasonLockHintRequest } from './SeasonLockHint';
import { placementOpensAfterText } from '../../../app/learning_v2_placement_entry_copy';
import { notePlacementLockHint } from '../../../app/learning_v2_placement_entry_diagnostics';
import { useTabContentBottomPad } from '../../../hooks/use-tab-content-bottom-pad';
import { seasonEpisodeCtaV1 } from './season_episode_cta';
import { seasonExamCaption, type SeasonExamStatus } from './season_exam_caption';
import type { SeasonExamCaptionView } from './SeasonCourseView';
import { learningV2ChapterExamCopy } from '../learning_v2_chapter_exam_copy';
import { SEASON_COUNT_LOG, seasonEpisodeSubtitle, seasonEpisodeTasksShown } from '../../home/v2/scene/home_scene_count';
import { hapticWarning } from '../../../hooks/use-haptics';

const LOG = '[SEASON-WIRE]';

/** Какой полноэкранный список открыт поверх хаба (null — хаб). */
export type SeasonListScreen = null | Readonly<{ kind: 'chapters' }> | Readonly<{ kind: 'episodes'; chapter: number }>;

export type SeasonCourseProps = Omit<SeasonCourseViewProps, 'onCardOpen' | 'onAllChapters' | 'focus' | 'onSelectedChange' | 'lockShake' | 'examCaption'> & Readonly<{
  /** Действия экзамена главы: вызываются только при включённом флаге. */
  onStartExam?: (chapterOrdinal: number) => void;
  onOpenByExam?: (chapterOrdinal: number) => void;
  /** Окно экзамена: описание, факты, цена ⚡1 / строка Plus по главе (данные Learning V2). */
  examInfo?: (chapterOrdinal: number) => Readonly<{ description: string | null; panel: SeasonExamPanel }> | null;
  /** Состояние экзамена главы (можно сдать / пауза / сдан) по записям на телефоне; нет — «можно сдать». */
  examStatus?: (chapterOrdinal: number, nowMs: number) => SeasonExamStatus;
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
  const themeAccent = useLv2Glass().accent;
  const themeHue = hexHue(themeAccent);
  const { liquidGlassThemeId } = useTheme();
  // зачем (баг владельца 28.10, серая тема — яркая сцена): насыщенность палитры сцены от насыщенности ТЕКУЩЕЙ темы, не эталонная
  const themeChroma = hexChroma(themeAccent);
  // зачем (владелец 22.10: «ПРАВИЛО НАРУШЕНО» — под часами светлая полоса над обложкой; закон «сейф-зона — часть общей композиции»): страховка. Обложка рисуется от верха экрана, когда страница вкладки полноэкранная
  // (topBleed > 0). Если страница по какой-то причине осталась под отступом оболочки (topBleed = 0, но это страница вкладки), зона часов закрашивается цветом верха обложки, а не фоном страницы; причину пишет журнал [SEASON-TOP].
  const insetsTop = useStableSafeAreaInsets().top;
  const isTabPage = useIsTabPage();
  // зачем (Ревизор по поручению координатора, сдвиг вправо на снимках владельца; СПЕРВА ЛОГИ): [SEASON-LAYOUT] — корень «Обучения» в окне. Окно эпизода (SeasonExpandedCard) — absoluteFill от этого корня:
  // если корень шире окна (diffW) или сдвинут (winX), карточка уедет вместе с ним. Одна строка на смену значений; при сдвиге — warn (виден в logcat сразу)
  const rootRef = useRef<View>(null);
  const win = useWindowDimensions();
  const rootLogKey = useRef('');
  const measureRoot = useCallback((x: number, y: number, width: number, height: number) => {
    rootRef.current?.measureInWindow((winX, winY) => {
      const diffW = Math.round(width - win.width);
      const key = [x, y, width, height, winX, winY, win.width].map((n) => Math.round(n)).join('|');
      if (key === rootLogKey.current) return;
      rootLogKey.current = key;
      const bad = Math.round(winX) !== 0 || diffW !== 0;
      seasonLayoutLog(bad ? 'warn' : 'info', JSON.stringify({ at: 'season_root', x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height), winX: Math.round(winX), winY: Math.round(winY), windowW: Math.round(win.width), diffW, offsetX: Math.round(winX), isTabPage, route: isTabPage ? 'tab' : 'push_course_screen', verdict: bad ? 'ROOT_SHIFTED_OR_WIDER_THAN_WINDOW' : 'root_matches_window' })); // guard-ok: числа раскладки корня
    });
  }, [isTabPage, win.width]);
  const onRootLayout = useCallback((e: LayoutChangeEvent) => {
    const { x, y, width, height } = e.nativeEvent.layout;
    measureRoot(x, y, width, height);
  }, [measureRoot]);
  const topBand = isTabPage && !(props.topBleed !== undefined && props.topBleed > 0) && insetsTop > 0 ? insetsTop : 0;
  // зачем (вердикт владельца 29.10, scenePalette): полоса под часами закрашена верхним цветом обложки — он теперь из единой палитры сцены (тот же, что рисует обложка)
  const topBandColor = useMemo(() => sceneTopHex(scenePaletteCached(liquidGlassThemeId, theme, 'season', 1080, 1029, 2.625)), [liquidGlassThemeId, theme]);
  useEffect(() => {
    if (topBand > 0) console.warn(`${LOG} [SEASON-TOP] страховка включена: страница вкладки без bleed — зона часов закрашена цветом обложки`, JSON.stringify({ topBleed: props.topBleed ?? null, insetsTop, topBand, color: topBandColor })); // guard-ok: ветка и значения, которые её решили
  }, [insetsTop, props.topBleed, topBand, topBandColor]);
  const artFor = useCallback((chapter: number, ordinal: number, exam = false) => seasonThemedArt(themeHue, chapter, ordinal, theme, exam, themeChroma), [themeHue, themeChroma, theme]);

  // ── раскрытая карта ──
  const expandedProps = useMemo(() => {
    if (expanded === null) return null;
    const card = deck.cards[expanded];
    if (!card) return null;
    const chapter = props.chapterInfo(card.chapterOrdinal);
    // зачем (журнал [EPISODE-MODAL]): каждое закрытие окна называет причину; onClose Pressable получает событие — причину передаём явно, а не аргументом
    const close = (reason?: unknown) => { episodeModalLog('info', 'closed', JSON.stringify({ reason: typeof reason === 'string' ? reason : 'button', card: card.id, kind: card.kind }), true); setExpanded(null); };
    const common = { dark, glyph: chapter.icon, closeLabel: seasonCardText(lang, 'closeCard'), onClose: () => close('backdrop_or_x'), reducedMotion: props.reducedMotion, art: artFor(card.chapterOrdinal, card.sessionOrdinal, card.kind === 'exam'), logMeta: { lesson: lessonOrdinal, session: card.sessionOrdinal } } as const;
    const examActions = SEASON_CHAPTER_EXAM_ENABLED;
    if (card.kind === 'exam') {
      const examInfo = props.examInfo ? props.examInfo(card.chapterOrdinal) : null;
      // зачем (координатор 24.10; эталон chapter-exam-season.html, zoomX): «Начать экзамен» с ▶ — только когда экзамен можно сдать (не пауза, не сдан);
      // под ней стеклянная «Позже» — закрывает карту (крестик эталона остаётся)
      const status: SeasonExamStatus = props.examStatus ? props.examStatus(card.chapterOrdinal, Date.now()) : { state: 'available' };
      const primary: SeasonExpandedAction | null = examActions && props.onStartExam && status.state === 'available'
        ? { label: learningV2ChapterExamCopy(lang, 'start'), icon: 'play', onPress: () => { close(); props.onStartExam?.(card.chapterOrdinal); } }
        : null;
      // зачем (владелец 25.10, макет exam-window-real.html на настоящих снимках; раньше у сданного экзамена окно показывало описание «можно сдать» и только «Закрыть»):
      // сдан — галочка, «Экзамен сдан», «{c} из {q} верно. Глава {n} открыта.», белая «▶ К главе {n}» + «Закрыть»; пауза — часы, «Пересдать через {m} мин», «Попытка: {c} из {q}.», «Закрыть».
      // Тексты «от 10 верных» / «~N минут» в этих состояниях не показываются. «К главе» ведёт туда же, куда одноимённая кнопка под каруселью (refocus на первую карту главы).
      const examClose: SeasonExpandedAction = { label: seasonCardText(lang, 'closeCard'), onPress: () => close('exam_close_button') };
      if (status.state === 'passed') {
        const nextChapter = card.chapterOrdinal < props.chapterCount ? card.chapterOrdinal + 1 : null;
        const nextIndex = nextChapter === null ? -1 : deck.cards.findIndex((c) => c.chapterOrdinal === nextChapter);
        const toChapter: SeasonExpandedAction | null = nextChapter !== null && nextIndex >= 0
          ? { label: seasonCardText(lang, 'examToChapter', { n: nextChapter }), icon: 'play', onPress: () => { close('to_chapter'); refocus(nextIndex); } }
          : null;
        const scoreLine = nextChapter !== null ? seasonCardText(lang, 'examWinScore', { c: status.correct, q: CHAPTER_EXAM_QUESTION_COUNT_V1, n: nextChapter }) : null;
        console.log('[EPISODE-MODAL]', 'exam_window_state', JSON.stringify({ state: 'passed', correct: status.correct, questions: CHAPTER_EXAM_QUESTION_COUNT_V1, nextChapter, toChapter: toChapter !== null })); // guard-ok: ветка и значения, которые её решили
        return { ...common, kind: 'exam' as const, sealIcon: 'checkmark' as const, chipLabel: seasonText(lang, 'exam'), rightLabel: null, phrase: seasonCardText(lang, 'examWinPassed'), translation: scoreLine, exam: null, title: null, words: [] as readonly string[], primary: toChapter, secondary: examClose };
      }
      if (status.state === 'cooldown') {
        console.log('[EPISODE-MODAL]', 'exam_window_state', JSON.stringify({ state: 'cooldown', lastCorrect: status.lastCorrect, questions: CHAPTER_EXAM_QUESTION_COUNT_V1, minutesLeft: status.minutesLeft })); // guard-ok: ветка и значения, которые её решили
        return { ...common, kind: 'exam' as const, sealIcon: 'time-outline' as const, chipLabel: seasonText(lang, 'exam'), rightLabel: null, phrase: seasonCardText(lang, 'examRetakeIn', { m: status.minutesLeft }), translation: seasonCardText(lang, 'examWinAttempt', { c: status.lastCorrect, q: CHAPTER_EXAM_QUESTION_COUNT_V1 }), exam: null, title: null, words: [] as readonly string[], primary: null, secondary: examClose };
      }
      let secondary: SeasonExpandedAction | null = null;
      if (primary) secondary = { label: learningV2ChapterExamCopy(lang, 'later'), onPress: close };
      // зачем (Сверка: окно экзамена в состоянии «сдан/пауза» — нижняя половина пустая, закрыть можно только по подложке; в эталоне такого окна нет — заказано у Макетов): пока — одна стеклянная «Закрыть», без выдумок
      else secondary = { label: seasonCardText(lang, 'closeCard'), onPress: () => close('exam_close_button') };
      return { ...common, kind: 'exam' as const, chipLabel: seasonText(lang, 'exam'), rightLabel: null, phrase: `${seasonText(lang, 'exam')} ${card.chapterOrdinal}`, translation: examInfo ? examInfo.description : null, exam: examInfo ? examInfo.panel : null, title: null, words: [] as readonly string[], primary, secondary };
    }
    const info = props.episodeInfo(card);
    // зачем (владелец 25.10, ЗАМОК «открыто ≠ пройдено»): «Повторить» — только у пройденного; открытый экзаменом/тестом — «Начать эпизод N»
    const cta = seasonEpisodeCtaV1(card, props.newcomer === true);
    const ctaLabel = cta === 'start_with' ? seasonText(lang, 'startEpisode', { n: card.sessionOrdinal })
      : cta === 'continue' ? seasonText(lang, 'continueEpisode', { n: card.sessionOrdinal })
        : cta === 'begin' ? seasonCardText(lang, 'beginEpisode', { n: card.sessionOrdinal })
          : seasonCardText(lang, 'repeatEpisode', { n: card.sessionOrdinal });
    const primary: SeasonExpandedAction = { label: ctaLabel, icon: 'play', onPress: () => { close(); props.onPrimary(card); } };
    let secondary: SeasonExpandedAction | null = null;
    if (props.newcomer && card.state === 'current' && props.onNotFromStart) {
      secondary = { label: seasonText(lang, 'notFromStart'), icon: 'school-outline', onPress: () => { close(); props.onNotFromStart?.(); } };
    }
    // зачем (Сверка 24.10: «0 заданий», а в сессии 19; подзаголовок повторял заголовок «Первый пропуск»): число заданий — только
    // известное из данных курса (в лёгком индексе его нет → подписи нет, а не «0»); подзаголовок не повторяет крупную строку
    const tasksShown = seasonEpisodeTasksShown(info.tasksCount);
    const subtitle = seasonEpisodeSubtitle(info.title, info.phrase);
    console.log(`${SEASON_COUNT_LOG} окно эпизода`, JSON.stringify({ card: card.id, state: card.state, tasksCount: info.tasksCount, source: info.tasksCount === null ? 'нет в лёгком индексе курса' : 'данные курса', shown: tasksShown, subtitle: subtitle === null ? (info.title ? 'скрыт: равен заголовку' : 'нет') : 'есть' })); // guard-ok: одна строка на раскрытие карты
    return {
      ...common, kind: 'episode' as const, chipLabel: seasonEpisodeLabel(lang, card.sessionOrdinal),
      rightLabel: tasksShown === null ? null : seasonTasksLabel(lang, tasksShown),
      phrase: info.phrase, translation: info.translation, title: subtitle, words: info.words,
      primary, secondary,
    };
  }, [artFor, dark, deck, expanded, lang, props]);

  // ЗАМОК ВЛАДЕЛЬЦА 22.10: «просто пусть вибрирует и замочек трясется! не надо открыть вот этот модал его не должно быть!» — тап по закрытому эпизоду НЕ раскрывает карту: вибрация + тряска плашки с замком
  const [lockShake, setLockShake] = useState<Readonly<{ index: number; seq: number }> | null>(null);
  // зачем (жалоба №8; владелец 29.10, макет VCtfXrJuZn37rcsTvnLDMm одобрен): к тряске добавлена НЕ модальная плашка внизу «Откроется после
  // занятия N» и, пока тест не использован (onNotFromStart есть), кнопка «Не хочу с начала». Окна по-прежнему нет (замок 22.10).
  const [lockHint, setLockHint] = useState<SeasonLockHintRequest | null>(null);
  const [lockHintDismissSeq, setLockHintDismissSeq] = useState(0);
  const lockHintFrame = useRef<SeasonLockHintFrame | null>(null);
  const shakeLocked = useCallback((index: number, from: string) => {
    const after = seasonUnlockAfter(deck, index);
    const withButton = !!props.onNotFromStart;
    console.log(`${LOG} нажатие → закрытая карта: вибрация и тряска замка, модала нет`, JSON.stringify({ index, from, state: deck.cards[index]?.state ?? null, unlockAfter: after, hint: after === null ? 'нет: перед картой нет непройденного занятия' : withButton ? 'плашка с кнопкой' : 'плашка: только текст' })); // guard-ok: ветка и значение, которое её решило
    void hapticWarning();
    setLockShake((cur) => ({ index, seq: (cur ? cur.seq : 0) + 1 }));
    if (after === null) return;
    setLockHint((cur) => ({ seq: (cur ? cur.seq : 0) + 1, text: placementOpensAfterText(lang, 'session', after), withButton }));
    notePlacementLockHint(withButton, after);
  }, [deck, lang, props.onNotFromStart]);
  // «до любого тапа»: касание вне плашки прячет её, а сам тап идёт дальше (onTouchStart не перехватывает касание)
  const onRootTouchStart = useCallback((e: GestureResponderEvent) => {
    const frame = lockHintFrame.current;
    if (!frame) return;
    const { pageX, pageY } = e.nativeEvent;
    const inside = pageX >= frame.x && pageX <= frame.x + frame.width && pageY >= frame.y && pageY <= frame.y + frame.height;
    if (!inside) setLockHintDismissSeq((n) => n + 1);
  }, []);
  const onLockHintButton = useCallback(() => props.onNotFromStart?.('plaque'), [props]);
  const tabBottomPad = useTabContentBottomPad();
  const lockHintBottom = isTabPage ? tabBottomPad : Math.max(props.bottomPadding, 24);
  // зачем (жалоба владельца, iPhone 2.0.2: окно эпизода «иногда» съезжает вправо; СПЕРВА ЛОГИ): условие «иногда» — тап сразу после броска карусели, повторный тап, открытие не той карты, что в центре
  const lastSettleAt = useRef(0);
  const lastOpenAt = useRef(0);
  const onSettled = useCallback((index: number) => { lastSettleAt.current = Date.now(); setSelected(index); }, []);
  const openCard = useCallback((index: number) => {
    const card = deck.cards[index];
    const now = Date.now();
    episodeModalLog('info', 'tap_on_card', JSON.stringify({ index, card: card ? card.id : null, kind: card ? card.kind : null, state: card ? card.state : null, selected, alreadyOpen: expanded, sinceSettleMs: lastSettleAt.current === 0 ? null : now - lastSettleAt.current, sinceLastOpenMs: lastOpenAt.current === 0 ? null : now - lastOpenAt.current, branch: card && card.state === 'locked' ? 'locked_card_shake_no_window' : expanded === index ? 'repeat_tap_window_already_open' : 'open_window' }), true); // guard-ok: ветка и значения, которые её решили
    lastOpenAt.current = now;
    if (card && card.state === 'locked') { shakeLocked(index, 'carousel'); return; }
    // зачем (СЛОВО ВЛАДЕЛЬЦА 26.10: окно эпизода «ВООБЩЕ НЕ ДОЛЖНО СУЩЕСТВОВАТЬ»): тап по эпизоду сразу запускает занятие; окно — только у экзамена
    if (card && card.kind !== 'exam' && !SEASON_EPISODE_WINDOW_ENABLED) {
      console.log('[EPISODE-OPEN]', JSON.stringify({ from: 'season_carousel', lesson: card.lessonOrdinal, session: card.sessionOrdinal, state: card.state, to: 'onPrimary → запуск занятия, без окна' })); // guard-ok: откуда тап, какой эпизод, куда ведём
      props.onPrimary(card);
      return;
    }
    setExpanded(index);
  }, [deck.cards, expanded, props, selected, shakeLocked]);

  // зачем (Сверка, Android: «Назад» при открытом окне эпизода уводило в classic lessons_list; координатор 25.10): открыто окно — «Назад» закрывает окно и больше ничего.
  // Подписка живёт только пока окно открыто (после подписки Сезона на «Назад» — вызывается первой) и возвращает true.
  useEffect(() => {
    if (expanded === null) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      episodeModalLog('info', 'closed', JSON.stringify({ reason: 'hardware_back', index: expanded }), true);
      setExpanded(null);
      return true;
    });
    return () => sub.remove();
  }, [expanded]);

  // зачем (эталон chapter-exam-season.html, capX pause: «Пересдать через 59 мин»): отсчёт минут — раз в 30 с и только пока на карусели
  // выбрана карта экзамена на паузе (Performance Bible: никаких вечных таймеров)
  const [examNowMs, setExamNowMs] = useState(() => Date.now());
  const selectedExamCard = deck.cards[selected]?.kind === 'exam' ? deck.cards[selected] : null;
  const selectedExamCooldown = selectedExamCard !== null && props.examStatus !== undefined && props.examStatus(selectedExamCard.chapterOrdinal, examNowMs).state === 'cooldown';
  useEffect(() => {
    if (!selectedExamCooldown) return undefined;
    const id = setInterval(() => setExamNowMs(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [selectedExamCooldown]);

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
    if (card && card.state === 'locked') { shakeLocked(index, 'list'); return; }
    setExpanded(index);
  }, [deck.cards, refocus, shakeLocked]);

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

  // зачем (координатор 24.10; эталон chapter-exam-season.html, capX avail / pause / pass): подпись под каруселью у карты экзамена по его
  // состоянию; «Сдать экзамен» раскрывает карту, «К главе N» переводит карусель на первую карту следующей главы.
  // Обычная функция, не хук: выше стоят ранние return экранов «Все главы» / «Эпизоды главы».
  const chapterTotal = deck.chapters.length;
  const examCaption = props.examInfo ? (card: SeasonCard): SeasonExamCaptionView | null => {
    const status: SeasonExamStatus = props.examStatus ? props.examStatus(card.chapterOrdinal, examNowMs) : { state: 'available' };
    const nextEpisodes = deck.cards.filter((c) => c.kind === 'episode' && c.chapterOrdinal === card.chapterOrdinal + 1);
    const nextRange = nextEpisodes.length > 0 ? { a: nextEpisodes[0]!.sessionOrdinal, b: nextEpisodes[nextEpisodes.length - 1]!.sessionOrdinal } : null;
    const built = seasonExamCaption({
      lang, chapterOrdinal: card.chapterOrdinal, chapterCount: chapterTotal, status, canStart: !!props.onStartExam,
      questions: CHAPTER_EXAM_QUESTION_COUNT_V1, passFrom: CHAPTER_EXAM_PASS_CORRECT_V1, nextRange,
    });
    console.log(`${LOG} подпись экзамена`, JSON.stringify({ chapter: card.chapterOrdinal, status: status.state, action: built.action?.kind ?? null })); // guard-ok: какая подпись и почему
    const action = built.action;
    if (!action) return { kicker: built.kicker, title: built.title, action: null, note: built.note };
    const index = deck.cards.findIndex((c) => (action.kind === 'open' ? c.id === card.id : c.chapterOrdinal === action.chapter));
    const onPress = () => {
      console.log(`${LOG} нажатие → подпись экзамена`, JSON.stringify({ kind: action.kind, chapter: card.chapterOrdinal, toIndex: index })); // guard-ok: куда ведёт нажатие
      if (index < 0) return;
      if (action.kind === 'open') openCard(index); else refocus(index);
    };
    return { kicker: built.kicker, title: built.title, action: { label: action.label, icon: action.icon, onPress }, note: built.note };
  } : undefined;

  return (
    <View ref={rootRef} onLayout={onRootLayout} onTouchStart={onRootTouchStart} style={styles.root}>
      {topBand > 0 ? <View pointerEvents="none" testID="season-top-cover" style={[styles.topCover, { top: -topBand, height: topBand, backgroundColor: topBandColor }]} /> : null}
      <SeasonCourseView
        {...props}
        focus={focus}
        onSelectedChange={onSettled}
        onCardOpen={openCard}
        lockShake={lockShake}
        onAllChapters={openChapters}
        examCaption={examCaption}
      />
      {expandedProps ? <SeasonExpandedCard {...expandedProps} /> : null}
      <SeasonLockHint
        request={lockHint}
        dismissSeq={lockHintDismissSeq}
        buttonLabel={seasonText(lang, 'notFromStart')}
        onButton={onLockHintButton}
        bottom={lockHintBottom}
        reducedMotion={props.reducedMotion}
        frameRef={lockHintFrame}
      />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 }, topCover: { position: 'absolute', left: 0, right: 0, zIndex: 1 } });

export default memo(SeasonCourse);
