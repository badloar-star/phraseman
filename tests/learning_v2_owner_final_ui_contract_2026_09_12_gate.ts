import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lessons = readFileSync("app/(tabs)/lessons.tsx", "utf8");
const pulse = readFileSync("components/learning-v2/LearningV2ChaptersCourse.tsx", "utf8");
const modal = readFileSync("components/LearningV2SessionOutcomeSheet.tsx", "utf8");
const energyBar = readFileSync("components/EnergyBar.tsx", "utf8");
const pocket = readFileSync("components/learning-v2/LearningV2WordPocketOverlayV1.tsx", "utf8");

// зачем: 2026-09-13 владелец закрыл курс Learning V2 от людей до его готовности —
// вход в уроки обязан открывать СТАРЫЕ уроки. Прежняя проверка требовала
// обратного (`initialPage = "v2"`) и сторожила ОТМЕНЁННОЕ правило. Актуальный
// сторож входа: tests/lessons_entry_opens_legacy_guard.test.ts.
assert.match(
  lessons,
  /initialPage\s*=\s*"lessons"/,
  "lesson entry must open the legacy course while Learning V2 is unfinished",
);
assert.doesNotMatch(lessons, /learning-v2-toggle-fullscreen/, "Learning V2 must not need an expand-screen control");
assert.match(lessons, /renderLessonCard=\{/);
assert.match(lessons, /learning-v2-lesson-progress-ring-/);
assert.match(lessons, /page === "v2" && studyTarget === "en"\) return LEARNING_V2_OWNER_EN_TITLES_RU/);
assert.doesNotMatch(lessons, /studyTarget === "en" && lang === "ru"/);
const lessonNameOffset = lessons.indexOf("{name}");
const lessonNameBlock = lessons.slice(
  lessons.lastIndexOf("<Text", lessonNameOffset),
  lessons.indexOf("</Text>", lessonNameOffset),
);
assert.doesNotMatch(lessonNameBlock, /numberOfLines|maxFontSizeMultiplier/);
assert.match(lessons, /<RuneBalanceChip/);
assert.match(lessons, /<EnergyBar[\s\S]*?compact/);
assert.match(energyBar, /testID="energy-numeric-pill"/);
assert.match(energyBar, /maxWidth/);
assert.match(energyBar, /const ENERGY_PILL_WIDTH = 60/);
assert.doesNotMatch(energyBar, /showWhenPremium/);
assert.match(energyBar, /if \(hasPremiumAccess\) return null/);
assert.match(lessons, /Сразу к практике/u);
// зачем (1fc9ad395, 15.10): маршрут занятия собирает общий помощник learningV2SessionHrefV1 — «Сразу к практике»
// передаёт skipIntro в него, а он кодирует параметр как "1". Проверяем суть, а не прежнюю форму записи в lessons.tsx.
const sessionLaunch = readFileSync("app/learning_v2_session_launch_v1.ts", "utf8");
assert.match(lessons, /learningV2SessionHrefV1\(\{[\s\S]{0,600}?\bskipIntro,/);
assert.match(sessionLaunch, /skipIntro:\s*input\.skipIntro \? '1' : undefined/);
assert.match(lessons, /onUnavailableLessonPress=\{/);
assert.match(lessons, /Урок ещё в работе/u);
// зачем (f8e8295ea, волна 4б 10.10): серые литералы вынесены в именованные константы — проверяем смысл «недоступный урок приглушён», а не форму записи
assert.match(lessons, /!learningV2Available[\s\S]{0,120}EXEMPT_COLOR_21\s*:\s*EXEMPT_COLOR_22/u);
assert.match(lessons, /const EXEMPT_COLOR_21 = '#B5BABD';/);
assert.match(lessons, /const EXEMPT_COLOR_22 = '#555960';/);
// зачем (координатор 18.10): карта LearningV2PulseCourse 30.09 заменена на LearningV2ChaptersCourse (`pulse` выше — уже новый файл).
// Живой смысл перепривязан к новой карте; проверки снятого решениями владельца удалены с причиной.
// Удалено `props.renderLessonCard` в карте: новая карта рисует строки глав и занятий сама (эталон 1.6), свойство осталось
// только в типе. Что «Уроки» по-прежнему передают свою карточку урока — проверяет `renderLessonCard=\{` выше.
// Удалено `isPulseLessonMapAvailable`: новая карта не режет уроки по геометрии Pulse — доступность занятия решают материал и состояние (ниже).
// Удалено `devReady`: отдельного «готово для разработчика» в карте нет; открытие всего — общий devUnlockAll вкладки «Уроки».
assert.match(pulse, /isSessionMaterialAvailable/);
// Смысл «занятие открывается, только если у него есть материал и оно достижимо» — в новой форме.
assert.match(pulse, /const available = hasMaterial && \(row\.state === "current" \|\| row\.state === "completed"\)/);
assert.match(pulse, /!hasMaterial \? "construct-outline"/);
// Смысл «пройденное занятие помечено иначе» — значок «галочка» (иконки как в Диалогах, без текстур).
assert.match(pulse, /row\.state === "completed" \? "checkmark"/);
assert.match(pulse, /construct-outline/);
// «Старые уроки — отдельной кнопочкой» (владелец 17.10): кнопка «Классический курс» в строке «Урок N».
assert.match(pulse, /<PressableHybrid testID="learning-v2-open-classic-course"[\s\S]{0,200}onPress=\{props\.onLegacyLessons\}/);
assert.doesNotMatch(
  pulse,
  /learning-v2-open-dialogs/,
  "the level rail must not contain the Dialogs utility action",
);
assert.match(
  lessons,
  /onPress=\{openDialogs\}/,
  "removing Dialogs from the level rail must preserve the existing Dialogs feature",
);
// Удалено `learning-v2-pulse-map-entry` и `styles.mapHeaderTitle`: анимация входа и заголовок шапки старой карты Pulse.
// В новой карте заголовок — строка «Урок N» и название урока (эталон 1.6), без отдельной шапки карты.
assert.match(modal, /testID="learning-v2-session-modal-close"/);
assert.match(modal, /accessibilityLabel=\{closeLabel\}/);
assert.match(modal, /testID="learning-v2-session-modal-kicker"/);
assert.match(modal, /testID="learning-v2-session-skip-intro"/);
// Запрет «объёмной» плашки с толстым нижним краем (текстуры сняты владельцем) остаётся. Имя orbPlate в новой шторке — плоская
// площадка под значком занятия (тон и затемнение, без обводки), поэтому запрещаем сам приём, а не имя.
assert.doesNotMatch(modal, /borderBottomWidth:\s*5/);
assert.match(modal, /learning-v2-session-modal-duration/);
assert.match(modal, /learning-v2-session-modal-words/);
assert.match(modal, /learning-v2-session-modal-attempts/);
assert.doesNotMatch(modal, /styles\.grabber|GestureDetector/);
assert.match(lessons, /factoryNativeLearningV2NewWordCountV1/);
assert.doesNotMatch(lessons, /wordsLabel=\{triLang\(lang, \{ ru: "4 новых слова"/u);
assert.match(pocket, /BackHandler\.addEventListener\("hardwareBackPress", handleBack\)/);
assert.match(pocket, /accessibilityLabel=\{copy\.speak\(card\.en\)\}/);
assert.doesNotMatch(lessons, /count=\{1\}[\s\S]{0,100}clearLearningV2RuneFlight/,
  "the map must not fabricate a one-rune flight after a completed transition");

process.stdout.write("LEARNING V2 OWNER FINAL UI CONTRACT 2026-09-12: PASS\n");
