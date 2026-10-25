import fs from 'fs';
import path from 'path';

/**
 * Контракт «до кнопки действия всегда можно добраться».
 *
 * зачем 2026-08-02 (владелец: «на многих экранах нет скролла — у
 * пользователей маленькие экраны и кнопки Готово нет»; скриншот
 * с выбором наборов карточек): экран центрирует контент во весь рост
 * (flex:1 + justifyContent:'center') и НЕ имеет прокрутки. Пока контент
 * помещается, всё выглядит правильно. Но на низком экране центрированный блок
 * обрезается СВЕРХУ И СНИЗУ — кнопка «Готово»/«Продолжить» уходит за границу,
 * и доскроллить до неё нечем: человек застревает и не может завершить действие.
 *
 * Храповик: список ниже — ИЗВЕСТНЫЙ ДОЛГ на момент ввода контракта. Он может
 * только уменьшаться. Любой НОВЫЙ экран такого вида тест не пропустит.
 */

const ROOT = path.join(__dirname, '..');

const SCROLLERS = /ScrollView|FlatList|SectionList|VirtualizedList|KeyboardAwareScroll/;
/** Кнопка, без которой человек не может продолжить. */
const ACTION = /(Готово|Продолжить|Сохранить|Начать|Далее|Понятно|Применить|Подтвердить|Отправить|onDone|onConfirm|onSubmit|onContinue|onSave|onApply)/;
const CENTERED_FULL_HEIGHT = /flex:\s*1/;
const CENTERING = /justifyContent:\s*'center'/;

/**
 * Экраны, уже имевшие эту проблему на момент ввода контракта. Список МОЖЕТ
 * ТОЛЬКО СОКРАЩАТЬСЯ: починил экран — удали строку. Добавлять сюда новые файлы
 * нельзя, для этого и существует тест.
 */
const KNOWN_DEBT: readonly string[] = [
  'app/_layout.tsx',
  // зачем 2026-08-16: гибрид «Световод + Чекан» стал единственной реализацией
  // (project_motion_program.md) — тот же долг центрирования без скролла
  // переехал из точки входа (теперь тонкая обёртка) в Hybrid-файл.
  'components/DialogVictoryCelebrationHybrid.tsx',
  // зачем (04.10): ExplainReportButton и ReportErrorButton починены (прокрутка есть) — убраны из долга.
  'components/SpeakingPanel.tsx',
  'components/VerbLetterBank.tsx',
  'components/onboarding_aha/AhaScene.tsx',
  'components/onboarding_aha/SpeechBeat.tsx',
  'components/roulette_win_modal.tsx',
];

/**
 * Ложные срабатывания эвристики (разбор 04.10, каждый файл прочитан). Эвристика смотрит на файл
 * целиком: `flex:1` и `justifyContent:'center'` у мелких контролов плюс слово-действие в пропсе или
 * комментарии дают совпадение без полноэкранного центрированного блока. Сюда — ТОЛЬКО с причиной;
 * настоящая ловушка (кнопка уходит за низкий экран) — баг экрана, а не запись в этот список.
 */
const FALSE_POSITIVES: Readonly<Record<string, string>> = {
  'app/flashcards/CollectionHeaderV2.tsx': 'шапка: flex:1 у поля поиска, центр у круглых кнопок',
  'app/flashcards/ExpandedCardV2.tsx': 'карточка растёт по тексту (мин. 230), стопка прокручивается; действия — плитки ряда',
  'app/flashcards/FlashcardsCategoryHub.tsx': 'центр только у плиток/пилюль; «Продолжить» — текст строки',
  'app/learning_v2_modes_showcase_run/[family].tsx': 'dev-only (редирект при !__DEV__), сцена space-between с доком',
  'components/FeedbackRatingCard.tsx': 'встроенная карточка: центр у звёзд и кнопки, «Отправить» в комментарии',
  'components/account/NicknameEditModal.tsx': 'панель 88% ширины, не во всю высоту; основной вид — нижняя шторка',
  'components/dialogs/DialogHowToSaySheet.tsx': 'нижняя шторка flex-end с maxHeight 80% экрана',
  'components/lessons/LessonsListGlassCard.tsx': 'строка списка; onDone — колбэк анимации',
  'components/practice/PracticeStates.tsx': 'панель состояния ~250px: значок, заголовок, текст, одна кнопка',
  'components/spire/SpireTour.tsx': 'вёрстка сверху вниз со spacer, без центрирования (зона Codex; риск переполнения отмечен)',
  'components/v2/V2Kit.tsx': 'набор мелких примитивов без полноэкранного контейнера',
  // 25.10 (Ревизор, прогон 05:00; разбор 2 · ДИЗАЙН, файлы прочитаны): экзамен главы — эвристика не знает LearningV2PracticeViewport и слово onDone в колбэке озвучки
  'app/learning-v2/chapter-exam.tsx': 'вопрос внутри LearningV2PracticeViewport (прокрутка на низком экране), подвал с кнопкой «Проверить/Дальше» вне вьюпорта; центрирование только у паузы после провала, там кнопок нет; onDone — колбэк озвучки',
  'components/learning-v2/LearningV2ChapterExamSheet.tsx': 'нижняя шторка flex-end: кнопки внизу, на низком экране обрезается верх (значок/заголовок), а не кнопки; слово «Начать» — подпись кнопки',
};

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (/node_modules|__tests__/.test(entry.name)) continue;
      walk(full, out);
    } else if (/\.tsx$/.test(entry.name) && !/\.test\.tsx$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

function findTrappedScreens(): string[] {
  const trapped: string[] = [];
  for (const dir of ['app', 'components']) {
    for (const file of walk(path.join(ROOT, dir))) {
      const source = fs.readFileSync(file, 'utf8');
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      if (FALSE_POSITIVES[rel]) continue;
      if (SCROLLERS.test(source)) continue;
      if (!ACTION.test(source)) continue;
      if (!CENTERED_FULL_HEIGHT.test(source) || !CENTERING.test(source)) continue;
      // Совсем короткие компоненты не переполняют даже низкий экран.
      const weight = (source.match(/<Text|<FlowText/g) || []).length
        + (source.match(/\.map\(/g) || []).length * 4;
      if (weight < 6) continue;
      trapped.push(rel);
    }
  }
  return trapped.sort();
}

describe('reachable action buttons contract', () => {
  it('не допускает НОВЫХ экранов с кнопкой действия без прокрутки', () => {
    const debt = new Set(KNOWN_DEBT);
    const fresh = findTrappedScreens().filter((file) => !debt.has(file));
    expect({
      newTrappedScreens: fresh,
      hint: fresh.length
        ? 'Экран центрирует контент во всю высоту без прокрутки, а внизу кнопка действия. '
          + 'На низком экране кнопка уходит за границу и человек застревает. '
          + 'Оберните контент в ScrollView с contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }} '
          + '— на больших экранах вид не изменится, на маленьких появится прокрутка.'
        : 'ok',
    }).toEqual({ newTrappedScreens: [], hint: 'ok' });
  });

  it('список известного долга может только сокращаться', () => {
    const trapped = new Set(findTrappedScreens());
    const alreadyFixed = KNOWN_DEBT.filter((file) => !trapped.has(file));
    expect({
      staleDebtEntries: alreadyFixed,
      hint: alreadyFixed.length
        ? 'Эти экраны уже починены — удалите их из KNOWN_DEBT, чтобы храповик не ослаб.'
        : 'ok',
    }).toEqual({ staleDebtEntries: [], hint: 'ok' });
  });

  it('список ложных срабатываний не хранит удалённые файлы', () => {
    const missing = Object.keys(FALSE_POSITIVES).filter((file) => !fs.existsSync(path.join(ROOT, file)));
    expect(missing).toEqual([]);
  });
});
