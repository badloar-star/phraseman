import fs from 'fs';
import path from 'path';

/**
 * Контракт «до кнопки действия всегда можно добраться».
 *
 * зачем 2026-08-02 (владелец: «на многих экранах нет скролла, например Моя
 * практика — у пользователей маленькие экраны и кнопки Готово нет»; скриншот
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
  'app/_admin_celebration_lab.tsx',
  'app/_layout.tsx',
  'app/flashcards/FlashcardsCategoryHub.tsx',
  'app/personal_plan_exercise_transition.tsx',
  'app/trainer_words_session.tsx',
  'components/DialogVictoryCelebration.tsx',
  'components/ExplainReportButton.tsx',
  'components/IntroFullAccessModal.tsx',
  'components/ReportErrorButton.tsx',
  'components/SpeakingPanel.tsx',
  'components/VerbLetterBank.tsx',
  'components/account/AccountLogoutFlow.tsx',
  'components/admin_panel/CompassStackPreviewModal.tsx',
  'components/customization/AvatarEditorSheet.tsx',
  'components/onboarding_aha/AhaScene.tsx',
  'components/onboarding_aha/SpeechBeat.tsx',
  'components/paywall/PaywallCtaBlock.tsx',
  'components/roulette_win_modal.tsx',
  'components/BoonChestModal.tsx',
];

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
});
