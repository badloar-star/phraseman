import fs from 'node:fs';
import path from 'node:path';
// зачем (Ф4, владелец 22.10 «ПОЧЕМУ РАЗДЕЛ УРОКИ ЕЩЁ НЕ СДЕЛАН?»; координатор): «Сезон и карусель» подключён во вкладку «Уроки» под флагом, на реальных данных,
// классический курс остаётся достижимым, нажатия ведут туда же, что у старой карты, журнал [SEASON-WIRE] на месте.
import { readSource } from './helpers/read_source';

const wire = readSource('components/learning-v2/season/SeasonCourseConnected.tsx');
const flags = readSource('components/learning-v2/season/season_flags.ts');
const lessons = readSource('app/(tabs)/lessons.tsx');

describe('Сезон во вкладке «Уроки»', () => {
  it('флаг: в разработке включён, в выпуске выключен', () => {
    expect(flags).toMatch(/SEASON_SCENE_V2_ENABLED: boolean = ENABLE_DEV_TOOLS && !IS_STORE_RELEASE/);
  });
  it('вкладка подставляет Сезон под флагом, старая карта остаётся запасной', () => {
    expect(lessons).toContain('SEASON_SCENE_V2_ENABLED ? (SeasonCourseConnected as unknown as typeof LearningV2ChaptersCourse) : LearningV2ChaptersCourse');
    expect(lessons).toContain('<LessonsCourseSurface');
    expect(lessons).not.toMatch(/<LearningV2ChaptersCourse\b/);
  });
  it('данные курса реальные: строки прогресса, колода, названия из плана; моков нет', () => {
    expect(wire).toContain('buildLearningV2CourseAccordionMapFromPreparedProgressV1');
    expect(wire).toContain('buildSeasonDeck');
    expect(wire).toContain('learningV2SessionTitleForLocaleV1');
    expect(wire).not.toContain('season_preview_fixtures');
  });
  it('нажатия: эпизод → onSessionPress, «Все уроки» с классическим курсом, «Слова», «Теория»', () => {
    expect(wire).toContain('onSessionPress(card.lessonOrdinal, card.sessionOrdinal, card.sourceState)');
    expect(wire).toContain('onLegacy={props.onLegacyLessons}');
    // зачем (владелец 22.10): «Слова» — слова ЭТОГО урока (экран Learning V2), а не раздел «Карточки»
    expect(wire).toContain("pathname: '/learning_v2_lesson_words', params: { lesson: String(lesson) }");
    expect(wire).not.toContain("router.push('/flashcards'");
    expect(wire).toContain('LearningV2TheorySheet');
  });
  it('журнал [SEASON-WIRE]: вход, урок/глава, источник, каждое нажатие', () => {
    for (const key of ['вход', 'урок/глава', 'нажатие → занятие', 'нажатие → «Все уроки»', 'нажатие → «Слова»', 'нажатие → «Теория»']) expect(wire).toContain(key);
    expect(wire).toContain('[SEASON-WIRE]');
  });
  it('шрифт не сжимается, спиннера на весь экран нет', () => {
    expect(wire).not.toContain('adjustsFontSizeToFit');
    expect(wire).not.toContain('ActivityIndicator');
  });
});

describe('Сезон: экзамен главы (Learning V2 22.10)', () => {
  it('флаг экзамена: в разработке вкл, в выпуске выкл', () => {
    expect(flags).toMatch(/SEASON_CHAPTER_EXAM_ENABLED: boolean = ENABLE_DEV_TOOLS && !IS_STORE_RELEASE/);
  });
  it('колода получает опции экзамена, результаты — из локального хранилища без сети', () => {
    expect(wire).toContain('includeExam: SEASON_CHAPTER_EXAM_ENABLED, examAvailableWhenReached: true, examPassedChapters');
    expect(wire).toContain('peekLearningV2ChapterExamRecordsV1');
    expect(wire).toContain('loadLearningV2ChapterExamRecordsV1');
    expect(wire).toContain("learningV2PassedChaptersV1(examRecords, 'en', lesson)");
  });
  it('кнопки экзамена идут на экран Learning V2 только по флагу запуска (до сигнала не рисуются)', () => {
    expect(flags).toMatch(/SEASON_CHAPTER_EXAM_START_ENABLED = false as boolean/);
    expect(wire).toContain('onStartExam={SEASON_CHAPTER_EXAM_START_ENABLED ? onStartExam : undefined}');
    expect(wire).toContain('onOpenByExam={SEASON_CHAPTER_EXAM_START_ENABLED ? onOpenByExam : undefined}');
    expect(wire).toContain("learningV2ChapterExamHrefV1({ lessonOrdinal: lesson, chapterOrdinal, source: 'exam_card' })");
    expect(wire).toContain("chapterOrdinal: chapterOrdinal - 1, source: 'open_by_exam'");
  });
  it('окно экзамена: факты из данных Learning V2, цена ⚡1 для Free, строка для Plus', () => {
    expect(wire).toContain('CHAPTER_EXAM_QUESTION_COUNT_V1');
    expect(wire).toContain('LEARNING_V2_CHAPTER_EXAM_MINUTES_V1');
    expect(wire).toContain("energyBadge: !examFree, plusLine: examFree ? learningV2ChapterExamCopy(lang, 'plusFree') : null");
    const card = readSource('components/learning-v2/season/SeasonExpandedCard.tsx');
    expect(card).toContain('testID="season-exam-facts"');
    expect(card).toContain('testID="season-exam-energy"');
    expect(card).toContain('testID="season-exam-plus"');
  });
});

describe('Сезон: обложка 46 % от самого верха (владелец 22.10)', () => {
  const layout = readSource('app/(tabs)/_layout.tsx');
  const view = readSource('components/learning-v2/season/SeasonCourseView.tsx');
  it('страница «Уроки» полноэкранная под флагом сезона, шапка отступает сама', () => {
    expect(layout).toContain('SEASON_SCENE_V2_ENABLED ? [logicalTabToPhysicalPage(1, pageLayout)] : []');
    expect(lessons).toContain('const seasonBleed = useTabTopBleedInset();');
    expect(lessons).toContain('isRetainedTab ? 12 + seasonBleed : insets.top + 12');
    expect(lessons).toContain('bleedTop={isRetainedTab && seasonBleed === 0 ? insets.top : 0}');
    expect(wire).toContain('topBleed={bleed}');
  });
  it('обложка: не менее 392 dp вместе с зоной часов (растёт, а не наезжает на HUD), заголовок 30/36, кнопка 50, низ 44', () => {
    expect(view).toMatch(/heroTall: \{ minHeight: 392/);
    expect(view).toContain('paddingTop: props.topPadding + 8 + HUD_ROW_HEIGHT + 12');
    // ЗАМОК ВЛАДЕЛЬЦА 22.10: «меньше шрифт и более компактно!» — было 30/36; кегль теперь из season_hero_title_metrics (сторож размеров: season_hero_title_fit_contract)
    expect(view).toMatch(/heroTitle: \{ fontWeight: '700', letterSpacing: -0\.3, color: WHITE \}/);
    expect(view).toContain('seasonHeroTitleSize(props.lessonTitle)');
    expect(view).toMatch(/primaryRow: \{ marginTop: 16,/);
    expect(view).toMatch(/primary: \{ height: 50,/);
    expect(view).toContain('heroBodyTall: { paddingBottom: 44 }');
  });
});

describe('Сезон: «Слова» и «Теория» — плитки в строке с «Продолжить» (владелец 22.10, макет lesson-hub-words-theory.html, вариант 2)', () => {
  const view2 = readSource('components/learning-v2/season/SeasonCourseView.tsx');
  const copy2 = readSource('components/learning-v2/season/season_copy.ts');
  it('в обложке строка: главная кнопка (уже, короткая подпись) + две стеклянные плитки 70 × 50 со значком и подписью, V2Pressable; в обоих режимах обложки', () => {
    expect(view2).toContain('<View style={styles.primaryRow}>');
    expect(view2).toContain('<HeroTile icon="albums-outline"');
    expect(view2).toContain('<HeroTile icon="book-outline"');
    expect(view2).toMatch(/heroTile: \{ width: 70, height: 50, borderRadius: 18,/);
    expect(view2).toContain("backgroundColor: dark ? PILL : PILL_ON_LIGHT");
    expect(view2).toContain("props.newcomer ? seasonText(lang, 'startShort') : seasonText(lang, 'continueShort')");
    expect(view2).toContain('accessibilityLabel={primaryLabel}');
    for (const key of ['continueShort', 'startShort']) expect((copy2.split('\n').find((l) => l.trim().startsWith(`${key}:`)) ?? '').match(/'[^']+'/g)?.length).toBe(9);
  });
  it('голого текста и чипов больше нет: ни под каруселью, ни в обложке', () => {
    for (const gone of ['HeroChip', 'ActionChip', 'heroChips', 'styles.chip', 'styles.actions']) expect(view2).not.toContain(gone);
    expect(view2).not.toContain('{tall ? null : (');
    expect(view2).not.toMatch(/import {[^}]*Pressable[^}]*} from 'react-native'/);
  });
});

describe('Сезон: хаб урока — три плитки и полноэкранные списки (владелец 22.10, макет lesson-hub-final.html)', () => {
  const view3 = readSource('components/learning-v2/season/SeasonCourseView.tsx');
  const course = readSource('components/learning-v2/season/SeasonCourse.tsx');
  const tiles = readSource('components/learning-v2/season/SeasonNavTiles.tsx');
  const picks = readSource('components/learning-v2/season/SeasonPickScreens.tsx');
  const copy = readSource('components/learning-v2/season/season_copy_card.ts');
  it('сторож «нет веера и чипов глав»: ни «Вся глава», ни скрытого меню по заголовку главы, файла веера нет', () => {
    for (const src of [view3, course, wire]) {
      expect(src).not.toContain('onWholeChapter');
      expect(src).not.toContain('SeasonChapterFan');
      expect(src).not.toContain('season-whole-chapter');
      expect(src).not.toContain('season-chapter-picker');
      expect(src).not.toContain('onChapterPicker');
    }
    expect(fs.existsSync(path.join(__dirname, '..', 'components/learning-v2/season/SeasonChapterFan.tsx'))).toBe(false);
  });
  it('сторож «три кнопки есть»: «Все главы», «Все уроки», «Классический курс» под обложкой, подписи на 9 языках', () => {
    expect(view3).toContain('<SeasonNavTiles');
    for (const key of ['allChaptersLabel', 'allLessonsLabel', 'classicLabel']) expect(view3).toContain(key);
    for (const id of ['season-all-chapters', 'season-all-lessons-button', 'season-classic-course']) expect(tiles).toContain(`testID="${id}"`);
    for (const key of ['allChapters', 'allLessons', 'classicCourse']) {
      const line = copy.split('\n').find((l) => l.trim().startsWith(`${key}:`)) ?? '';
      expect(line.match(/'[^']+'/g)?.length).toBe(9);
    }
    expect(tiles).not.toMatch(/borderWidth|borderColor/);
  });
  it('нажатия: «Все главы» → список глав, «Все уроки» → список уроков, «Классический курс» → классика; журнал [SEASON-WIRE]', () => {
    expect(course).toContain('onAllChapters={openChapters}');
    expect(course).toContain('<SeasonChaptersScreen');
    expect(course).toContain('<SeasonChapterEpisodesScreen');
    expect(wire).toContain('onAllLessons={onAllLessonsButton}');
    expect(wire).toContain('onClassic={onClassic}');
    // зачем (владелец 22.10: «старый курс назвать»): плитка берёт свой ключ classicCourse («Старый курс»), а не название вкладки legacyLessonsLabel
    expect(wire).not.toContain('classicLabel=');
    expect(view3).toContain("seasonCardText(lang, 'classicCourse')");
    expect(wire).toContain('onLegacyLessons();');
    for (const key of ['нажатие → «Все главы»', 'нажатие → «Классический курс»', 'нажатие → эпизоды главы', 'нажатие → карта из списка']) expect(wire + course).toContain(key);
  });
  it('списки поверх шапки вкладки: общая кнопка «назад» (ScreenBackButton) во всех трёх, строки через V2Pressable, без обводок', () => {
    expect(picks).toContain('<ScreenBackButton');
    expect(picks).toContain('export const SeasonListHeader');
    expect(wire).toContain('<SeasonListHeader');
    expect(wire).not.toContain('BackGlyph');
    expect(picks).toContain('<V2Pressable');
    expect(picks).not.toMatch(/borderWidth|borderColor/);
    expect(picks).not.toContain('adjustsFontSizeToFit');
    expect(picks).not.toContain('ActivityIndicator');
  });
  it('карточка «Ваши прошлые уроки» с хаба ушла: «Классический курс» — плитка и строка в «Все уроки»', () => {
    expect(wire).not.toContain('SeasonLegacyCard');
    expect(wire).not.toContain('legacyCard=');
    expect(wire).toContain('onLegacy={props.onLegacyLessons}');
  });
});

describe('Сезон: прогресс классики на плитке и звёзды результата (владелец 22.10)', () => {
  const tiles2 = readSource('components/learning-v2/season/SeasonNavTiles.tsx');
  const face = readSource('components/learning-v2/season/SeasonCardFace.tsx');
  const picks2 = readSource('components/learning-v2/season/SeasonPickScreens.tsx');
  const view4 = readSource('components/learning-v2/season/SeasonCourseView.tsx');
  it('«Классический курс»: прогресс «12 из 50» одной строкой на плитке из уже загруженного прогресса; высота 58, шрифт не ужимается', () => {
    expect(wire).toContain("classicValue={props.legacyProgress ? seasonText(lang, 'doneOf', { k: props.legacyProgress.done, n: props.legacyProgress.total }) : null}");
    expect(view4).toContain('classicValue={props.classicValue ?? null}');
    expect(tiles2).toContain('testID={`${testID}-value`}');
    expect(tiles2).toMatch(/tile: \{ height: 58,/);
    expect(tiles2).not.toContain('adjustsFontSizeToFit');
    expect(tiles2).not.toMatch(/borderWidth|borderColor/);
    expect(wire).not.toMatch(/getDoc|firestore|fetch\(/i);
  });
  it('звёзды: у пройденных — из звёзд занятий в памяти (не меньше одной), цвета seasonStarTones; в списке эпизодов справа вместо галочки', () => {
    expect(wire).toContain("const stars = card.state === 'done' ? (starsReady ? Math.max(1, props.stars[card.id] ?? 1) : 'pending' as const) : null;");
    expect(wire).toContain('useSyncExternalStore(subscribeLearningV2SessionStarResults, isLearningV2SessionStarResultsHydrated');
    expect(view4).toContain('seasonStarTones(themeHue)');
    expect(view4).toContain("stars={card.state === 'done' ? ep.stars ?? null : null} starTones={starTones}");
    expect(face).toContain('testID="season-card-stars"');
    // ЗАМОК ВЛАДЕЛЬЦА 22.10: «звёздочки даже если не пройдено — просто пустые» — ряд из трёх звёзд на каждой карточке, заполнены только у пройденных
    expect(face).toContain("name={i <= starsFilled ? 'star' : 'star-outline'}");
    expect(face).toContain('starTones.filled');
    expect(face).toContain('starTones.empty');
    expect(picks2).toContain('-stars');
    expect(picks2).toContain("(stars !== null || pending ? card.sessionOrdinal : 'checkmark')");
    expect(picks2).toContain("info.stars === 'pending'");
  });
});

describe('Сезон: карточка — крупный номер и звёзды по центру, название под каруселью (выбор владельца 22.10, вариант 3)', () => {
  const flags2 = readSource('components/learning-v2/season/season_flags.ts');
  const face2 = readSource('components/learning-v2/season/SeasonCardFace.tsx');
  const view5 = readSource('components/learning-v2/season/SeasonCourseView.tsx');
  it('одна константа SEASON_CARD_TITLE_LAYOUT = 3; вариантов 1 и 2 и параметра превью в коде нет', () => {
    expect(flags2).toContain('export const SEASON_CARD_TITLE_LAYOUT = 3 as const;');
    expect(flags2).not.toContain('SeasonCardTitleLayout');
    for (const src of [face2, view5, readSource('app/dev_season_preview.tsx'), wire]) expect(src).not.toContain('titleLayout');
    expect(fs.existsSync(path.join(__dirname, '..', 'components/learning-v2/season/season_card_position.ts'))).toBe(false);
  });
  it('лицо карточки: по центру крупный номер, под ним звёзды (место под них на всех карточках — номера не прыгают); названия на карточке нет', () => {
    expect(face2).toMatch(/centerWrap: \{[^}]*alignItems: 'center', justifyContent: 'center'/);
    expect(face2).toContain('<Text style={styles.bigNumber}>{ordinal}</Text>');
    expect(face2).toContain('testID="season-card-stars"');
    expect(face2).toMatch(/stars: \{ marginTop: 6, height: 18,/);
    expect(face2).not.toContain('season-card-title');
    expect(face2).not.toContain('adjustsFontSizeToFit');
  });
  it('вид: под каруселью всегда «Эпизод N» и название выбранной карты (в том числе у экзамена)', () => {
    expect(view5).toContain('<Text style={[styles.captionTitle, { color: g.text }]} numberOfLines={3}>{caption.title}</Text>');
    expect(view5).not.toContain('selectedCard?.kind === \'exam\' ?');
  });
});

describe('Сезон: Optimistic UI и крайние случаи хаба и списков (проверка 22.10)', () => {
  const guard = readSource('components/learning-v2/season/season_tap_guard.ts');
  const course2 = readSource('components/learning-v2/season/SeasonCourse.tsx');
  const tiles3 = readSource('components/learning-v2/season/SeasonNavTiles.tsx');
  const view6 = readSource('components/learning-v2/season/SeasonCourseView.tsx');
  it('двойной тап по «Продолжить» и «Классический курс» не открывает экран дважды; отказ пишет причину', () => {
    expect(guard).toContain('SEASON_TAP_GUARD_MS = 700');
    expect(guard).toContain('двойной тап проигнорирован');
    expect(wire).toContain("seasonTapTooSoon(primaryTapRef, 'primary')");
    expect(wire).toContain("seasonTapTooSoon(classicTapRef, 'classic')");
  });
  it('аппаратная «назад» закрывает полноэкранные списки на шаг назад, а не уводит с вкладки', () => {
    expect(course2).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(wire).toContain("BackHandler.addEventListener('hardwareBackPress'");
  });
  it('нет ни одной главы — плитка «Все главы» приглушена; нет прогресса классики — значения на плитке нет; шрифт не ужимается', () => {
    expect(view6).toContain('allChaptersDisabled={deck.chapters.length === 0}');
    expect(tiles3).toContain('disabled={disabled}');
    expect(tiles3).toContain('{value ? <Text');
    expect(tiles3).toMatch(/label: \{[^}]*lineHeight: 15/);
    expect(tiles3).toContain('numberOfLines={2}');
  });
  it('без сети: только локальные данные (колода, звёзды в памяти), спиннеров и чтений нет', () => {
    const all = [course2, tiles3, view6, readSource('components/learning-v2/season/SeasonPickScreens.tsx')].join('\n');
    expect(all).not.toMatch(/ActivityIndicator|fetch\(|httpsCallable|getDoc|firestore|AsyncStorage/i);
  });
});

describe('Сезон: звёзды без прыжка, названия на 8 языках, название проявляется по свайпу (координатор 22.10)', () => {
  const face3 = readSource('components/learning-v2/season/SeasonCardFace.tsx');
  const store = readSource('app/learning_v2_session_star_results_store.ts');
  it('звёзды рисуются только после подъёма в память (флаг хранилища), мягкий fade 180 мс; до этого — без звёзд', () => {
    expect(store).toContain('export function isLearningV2SessionStarResultsHydrated(): boolean');
    expect(face3).toContain('const STARS_FADE_MS = 180;');
    expect(face3).toContain("typeof stars === 'number'");
    expect(face3).toContain('withTiming(starsShown ? 1 : 0, { duration: STARS_FADE_MS })');
  });
  it('названия эпизодов — на языке интерфейса (10 · ПЕРЕВОДЧИК) с откатом к «Эпизод N»; в строке под «Продолжить» тоже', () => {
    expect(wire).toContain('learningV2SessionTitleForLocaleV1(card.lessonOrdinal, card.sessionOrdinal, lang)');
    expect(wire).not.toContain('learningV2SessionTitleV1(');
  });
});

describe('Сезон: обложка рисуется от верхнего края, без полосы под часами (закон владельца 22.10)', () => {
  const top = readSource('components/learning-v2/season/SeasonCourseView.tsx');
  const course3 = readSource('components/learning-v2/season/SeasonCourse.tsx');
  const layout2 = readSource('app/(tabs)/_layout.tsx');
  const lessons2 = readSource('app/(tabs)/lessons.tsx');
  it('сторож: обложка — первый элемент прокрутки без своего отступа и фона в зоне часов; градиенты на всю обложку; отступ содержимого — padding тела, а не сдвиг обложки', () => {
    const hero = /hero: \{[^}]*\}/.exec(top)?.[0] ?? '';
    const heroTall = /heroTall: \{[^}]*\}/.exec(top)?.[0] ?? '';
    for (const style of [hero, heroTall]) {
      expect(style).not.toMatch(/margin|padding|backgroundColor|top:/);
    }
    expect(top).toContain("<LinearGradient colors={[heroArt.from, heroArt.to]} start={{ x: 0.33, y: 0 }} end={{ x: 0.67, y: 1 }} style={StyleSheet.absoluteFill} />");
    expect(top).toContain('paddingTop: props.topPadding + 8 + HUD_ROW_HEIGHT + 12');
    expect(top).toContain('<ScrollView contentContainerStyle={{ paddingBottom: props.bottomPadding }}');
  });
  it('страница «Уроки» с Сезоном полноэкранная (зона часов = часть обложки), подключение передаёт bleed; журнал [SEASON-TOP] пишет положение обложки в окне и вердикт', () => {
    expect(layout2).toContain('SEASON_SCENE_V2_ENABLED ? [logicalTabToPhysicalPage(1, pageLayout)] : []');
    expect(lessons2).toContain('bleedTop={isRetainedTab && seasonBleed === 0 ? insets.top : 0}');
    expect(wire).toContain('topBleed={bleed}');
    for (const key of ['[SEASON-TOP] вход', '[SEASON-TOP] обложка', 'measureInWindow', 'ПОЛОСА над обложкой', 'обложка от верха экрана, полосы нет']) expect(top).toContain(key);
  });
  it('страховка: страница вкладки без bleed — зона часов закрашена цветом верха обложки (не фоном страницы), с предупреждением в журнал', () => {
    expect(course3).toContain('isTabPage && !(props.topBleed !== undefined && props.topBleed > 0) && insetsTop > 0 ? insetsTop : 0');
    expect(course3).toContain('testID="season-top-cover"');
    expect(course3).toContain('страховка включена');
    expect(course3).toContain("topCover: { position: 'absolute', left: 0, right: 0, zIndex: 1 }");
  });
});
