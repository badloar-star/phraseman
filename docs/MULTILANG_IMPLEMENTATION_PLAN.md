# Multilingual Implementation Plan — PhraseMan
> Создан: 2026-04-11 | Статус: ПЛАНИРОВАНИЕ | Ветка: `feature/multilang`

---

## Цель

Добавить полную поддержку мультиязычности:
- **3 языка интерфейса:** RU, UK, EN
- **Матрица обучения (6 пар):**
  - RU интерфейс → учим EN или UK
  - UK интерфейс → учим EN или RU
  - EN интерфейс → учим RU или UK

Вся работа ведётся в ветке `feature/multilang`. В `master` не мержить до полной готовности.

---

## 1. Архитектурное решение

### Два независимых контекста вместо одного `lang`

```typescript
// СЕЙЧАС:
export type Lang = 'ru' | 'uk';

// СТАНЕТ:
export type UILang    = 'ru' | 'uk' | 'en';  // язык интерфейса
export type LearnLang = 'ru' | 'uk' | 'en';  // что изучаем
```

### Матрица языков

| Интерфейс | Изучает | Смысл |
|-----------|---------|-------|
| RU        | EN      | Русскоязычный учит английский (текущий сценарий) |
| RU        | UK      | Русскоязычный учит украинский |
| UK        | EN      | Украиноязычный учит английский |
| UK        | RU      | Украиноязычный учит русский |
| EN        | RU      | Англоязычный учит русский |
| EN        | UK      | Англоязычный учит украинский |

### AsyncStorage ключи

| Ключ           | Тип     | Описание |
|----------------|---------|----------|
| `ui_lang`      | UILang  | Язык интерфейса (заменяет `app_lang`) |
| `learn_lang`   | LearnLang | Что изучает пользователь (новый) |

**Миграция:** при первом запуске скопировать `app_lang` → `ui_lang`, установить `learn_lang = 'en'`.

---

## 2. Новые типы данных

### 2.1 LangContext.tsx — расширить интерфейс контекста

```typescript
interface LangCtx {
  // Интерфейс
  uiLang: UILang;
  s: Strings;
  setUILang: (l: UILang) => Promise<void>;

  // Обучение
  learnLang: LearnLang;
  setLearnLang: (l: LearnLang) => Promise<void>;
}
```

### 2.2 Структура данных уроков

```typescript
// lesson_data_*.ts — добавить textEN для интро экранов
interface LessonIntroScreen {
  textRU: string;
  textUK: string;
  textEN?: string; // НОВОЕ
}

// lesson_cards_data.ts — добавить EN объяснения
interface PhraseCard {
  correctRu: string; correctUk: string;
  wrongRu: string;   wrongUk: string;
  secretRu: string;  secretUk: string;
  // НОВОЕ:
  correctEn?: string; wrongEn?: string; secretEn?: string;
}
```

### 2.3 Утилитарная функция выбора текста

```typescript
// Для получения объяснения карточки под конкретную пару (uiLang, learnLang)
function getCardText(card: PhraseCard, type: 'correct'|'wrong'|'secret', uiLang: UILang): string {
  if (uiLang === 'uk') return card[`${type}Uk`];
  if (uiLang === 'en') return card[`${type}En`] ?? card[`${type}Ru`]; // fallback
  return card[`${type}Ru`];
}

// Для получения текста фразы для ввода (зависит от learnLang)
function getPhraseText(phrase: LessonPhrase, learnLang: LearnLang): string {
  if (learnLang === 'uk') return phrase.ukrainian;
  if (learnLang === 'ru') return phrase.russian;
  return phrase.english;
}
```

---

## 3. Полный реестр изменений по файлам

### 3.1 КРИТИЧНЫЕ — без них не работает ничего

#### `components/LangContext.tsx`
- [ ] Строка 4: `Lang = 'ru' | 'uk'` → `UILang = 'ru' | 'uk' | 'en'`, добавить `LearnLang`
- [ ] Строки 7–131: переименовать `RU` → `RU_UI`, `UK` → `UK_UI`
- [ ] ДОБАВИТЬ объект `EN_UI` (~130 строк, все UI строки на английском)
- [ ] Строки 259–311: расширить `LangCtx` интерфейс, добавить `uiLang`, `learnLang`, `setUILang`, `setLearnLang`
- [ ] Строка 279: добавить загрузку `learn_lang` из AsyncStorage
- [ ] Строка 279: добавить миграцию `app_lang` → `ui_lang`
- [ ] Строка 291: `s: lang === 'uk' ? UK : RU` → `s: getUIStrings(uiLang)`
- [ ] Строки 300–310: `getLeague(points, lang)` → `getLeague(points, uiLang: UILang)`

#### `constants/i18n.ts`
- [ ] Строка 2: `Lang = 'ru' | 'uk'` → синхронизировать с LangContext (`UILang`)
- [ ] Рассмотреть объединение с LangContext (дублирование)

#### `app/_layout.tsx`
- [ ] Найти загрузку `app_lang` и заменить на `ui_lang` + `learn_lang`
- [ ] Обновить `handleLangSelect` → принимать `UILang`
- [ ] Обновить валидацию: `v === 'ru' || v === 'uk'` → добавить `v === 'en'`

#### `components/onboarding.tsx`
- [ ] Добавить шаги `'ui_lang'` и `'learn_lang'` в порядок онбординга
- [ ] Новый флоу: `demo2 → demo → ui_lang → learn_lang → name → test_offer → ...`
- [ ] Добавить UI для выбора языка интерфейса (3 кнопки: RU / UK / EN)
- [ ] Добавить UI для выбора языка обучения (зависит от uiLang, исключить сам uiLang)
- [ ] Обновить `AsyncStorage.multiSet` → сохранять `ui_lang` и `learn_lang`
- [ ] Обновить прогресс-бар онбординга (больше шагов)

---

### 3.2 ВАЖНЫЕ — функциональность сломается

#### `app/(tabs)/settings.tsx`
- [ ] `const { lang, setLang } = useLang()` → `const { uiLang, setUILang, learnLang, setLearnLang } = useLang()`
- [ ] `const isUK = lang === 'uk'` → `const isUK = uiLang === 'uk'`
- [ ] Секция "Язык интерфейса": добавить третью кнопку EN
- [ ] ДОБАВИТЬ новую секцию "Изучаю" с выбором learnLang

#### `app/(tabs)/home.tsx`
- [ ] `const { s, lang } = useLang()` → `const { s, uiLang, learnLang } = useLang()`
- [ ] Все `lang === 'uk'` → `uiLang === 'uk'` (для UI элементов)
- [ ] `getLeague(points, lang)` → `getLeague(points, uiLang)`

#### `app/(tabs)/quizzes.tsx`
- [ ] `const { lang } = useLang()` → `const { uiLang, learnLang } = useLang()`
- [ ] `getQuizPhrases(level, 10, lang)` → `getQuizPhrases(level, 10, learnLang)`

#### `app/quizzes.tsx`
- [ ] То же: `lang` → `uiLang` / `learnLang` в нужных местах

#### `app/lesson1.tsx`
- [ ] `const { s, lang } = useLang()` → `const { s, uiLang, learnLang } = useLang()`
- [ ] Все UI строки: использовать `uiLang`
- [ ] Логика составления слов, выбора правильного ответа: использовать `learnLang`
- [ ] Параметр `lang: 'ru' | 'uk'` в пропсах → `uiLang: UILang`, `learnLang: LearnLang`

#### `app/lesson_words.tsx`
- [ ] `function buildCard(word, roundIndex, all, lang: 'ru' | 'uk')` → `learnLang: LearnLang`
- [ ] Логика выбора `word.ru` / `word.uk` → `word[learnLang]`

#### `app/lesson_irregular_verbs.tsx`
- [ ] `function LearnTab({ verbs, lang, ... })` → `learnLang: LearnLang`
- [ ] Тип перевода (поле `tr`) → использовать `learnLang` для выбора ru/uk/en

#### `app/flashcards.tsx`
- [ ] `const { lang } = useLang()` → `const { uiLang, learnLang } = useLang()`
- [ ] Отображение перевода карточки: `learnLang`
- [ ] UI надписи: `uiLang`

---

### 3.3 ДАННЫЕ УРОКОВ

#### `app/lesson_data_1_8.ts` и все `lesson_data_*.ts`
- [ ] Добавить `textEN` в каждый `LessonIntroScreen`
- [ ] Добавить утилитарную функцию `getPhraseText(phrase, learnLang)`
- [ ] Обновить типы интерфейсов

#### `app/lesson_cards_data.ts`
- [ ] Добавить поля `correctEn`, `wrongEn`, `secretEn` в интерфейс `PhraseCard`
- [ ] Заполнить данные для всех карточек (см. Фазу 5 — требует агентов)

---

### 3.4 ВСЕ ОСТАЛЬНЫЕ ФАЙЛЫ (40+ файлов)

Везде где `const { lang } = useLang()` — заменить на `{ uiLang, learnLang }`.
Везде где параметр `lang: 'ru' | 'uk'` — уточнить: это UI или Learn, заменить тип.

| Файл | Что менять |
|------|-----------|
| `app/(tabs)/hall_of_fame.tsx` | `lang` → `uiLang` |
| `app/(tabs)/index.tsx` | `lang` → `uiLang` |
| `app/(tabs)/_layout.tsx` | `lang` → `uiLang` |
| `app/achievements_screen.tsx` | `lang` → `uiLang` |
| `app/avatar_select.tsx` | `lang` → `uiLang` |
| `app/beta_testers.tsx` | `lang` → `uiLang` |
| `app/daily_tasks_screen.tsx` | `lang` → `uiLang` |
| `app/diagnostic_test.tsx` | `lang` → `uiLang` |
| `app/dialogs.tsx` | `lang` → `uiLang` |
| `app/dialog_vocab.tsx` | `lang` → `uiLang` |
| `app/exam.tsx` | `lang` → `uiLang` |
| `app/hint.tsx` | `lang` → `uiLang` |
| `app/league_screen.tsx` | `lang` → `uiLang` |
| `app/premium_modal.tsx` | `lang` → `uiLang` |
| `app/review.tsx` | `lang` → `uiLang` / `learnLang` |
| `app/settings_edu.tsx` | `lang` → `uiLang` |
| `app/streak_stats.tsx` | `lang` → `uiLang` |
| `app/lesson_complete.tsx` | `lang` → `uiLang` |
| `app/lesson_help.tsx` | `lang` → `uiLang` |
| `app/lesson_intro_screens.tsx` | `lang` → `uiLang` + добавить EN тексты |
| `app/lesson_lock_system.ts` | `lang: 'ru'\|'uk'` → `UILang` |
| `app/medal_utils.ts` | `lang: 'ru'\|'uk'` → `UILang` |
| `app/notifications.ts` | `lang: 'ru'\|'uk'` → `UILang` (для текста) |
| `app/league_engine.ts` | `lang` → `uiLang` |
| `components/DailyPhraseCard.tsx` | `lang` → `uiLang` |
| `components/AddToFlashcard.tsx` | проверить использование `lang` |
| `components/onboarding.tsx` | полная переработка (см. выше) |

---

## 4. Объект EN_UI (английский интерфейс)

Полный перевод всех строк из `LangContext.tsx`. Требует профессионального перевода:

```typescript
const EN_UI: typeof RU_UI = {
  tabs: {
    home: 'Home', lessons: 'Lessons', quizzes: 'Quizzes',
    hallFame: 'Hall of Fame', settings: 'Settings',
  },
  home: {
    greeting: (n: string) => `${n}`,
    greetingPrefix: (g: string) => g,
    sub: 'Continue today?',
    streakLabel: 'Streak',
    streakDays: 'days in a row',
    continueBtn: 'Continue',
    startBtn: 'Start',
    leagueLabel: 'Club of the week',
    testBtn: 'Knowledge test',
    testSub: 'Find your level',
    examBtn: 'Exam',
  },
  lessonMenu: {
    start: 'Start lesson',
    continue: 'Continue lesson',
    vocab: 'Vocabulary',
    verbs: 'Irregular verb forms',
    theory: 'Theory',
    fromScratch: 'Starting from scratch',
    wordsOfLesson: 'Words of this lesson',
    verbsOfLesson: 'Irregular forms only',
    theoryOfLesson: 'Grammar & rules',
  },
  lesson: {
    undo: 'Undo', cheat: 'Cheat sheet', theory: 'Theory',
    oral: 'Oral', next: 'Next', check: 'Check',
    typeHere: 'Type your answer...', listenTitle: 'Listening...',
  },
  lessonComplete: {
    title: 'Lesson complete!',
    subtitle: (n: number) => `Lesson ${n} done at 100%`,
    bonus: '+500 XP',
    rest: 'Take a short break — you\'ve earned it.',
    nextLesson: 'Next lesson',
    repeatLesson: 'Repeat lesson',
    backHome: 'Back to home',
  },
  quizzes: {
    selectLevel: 'Select level', easy: 'Easy', medium: 'Medium', hard: 'Hard',
    done: 'Quiz complete!', again: 'Play again',
    back: 'Select level', fixErrors: 'Fix mistakes', timeUp: 'Time\'s up',
    perAnswer: 'pt/answer',
  },
  hallFame: {
    title: 'Hall of Fame',
    empty: 'No one yet.\nComplete a quiz and claim your spot!',
    rank: 'Rank', player: 'Player', points: 'Points',
    weekReset: 'Resets every Sunday',
  },
  leagues: [
    { name: 'Seeker',    min: 0 },
    { name: 'Learner',   min: 100 },
    { name: 'Scholar',   min: 300 },
    { name: 'Speaker',   min: 700 },
    { name: 'Wordsmith', min: 1500 },
    { name: 'Professor', min: 3000 },
  ],
  settings: {
    title: 'Settings', profile: 'Profile',
    name: 'Name / nickname', nameSub: (n: string) => n || 'Not set',
    lang: 'Interface language', appearance: 'Appearance',
    theme: 'Theme', themeDark: 'Dark', themeLight: 'Light',
    learning: 'Learning', learnSet: 'Learning settings',
    feedback: 'Feedback or suggestion', help: 'Help',
    premium: 'Premium', premiumSub: 'All lessons & quizzes — €3.99/mo',
    changeName: 'Change name', cancel: 'Cancel', save: 'Save',
    nameError: 'Enter a name', namePlaceholder: 'Enter name...',
  },
  edu: {
    title: 'Learning settings',
    autoCheck: 'Auto-check', autoCheckSub: 'Check when last word is typed',
    voiceOut: 'Read answer aloud', voiceOutSub: 'Pronounce phrase after answer',
    autoAdvance: 'Auto-advance after answer', autoAdvanceSub: 'Move to next automatically on correct answer',
    hardMode: 'Keyboard input', hardModeSub: 'Type sentence manually',
    speed: 'Pronunciation speed', speedHint: 'Release slider to hear a sample',
  },
  words: {
    title: (n: number) => `${n}. Vocabulary`,
    training: 'Training', wordList: 'Word list',
    allLearned: 'All words learned!',
    learnedOf: (a: number, b: number) => `${a} / ${b} learned`,
    plusPoints: (n: number) => `+${n} pts`,
  },
  verbs: {
    title: (n: number) => `${n}. Verb forms`,
    training: 'Training', list: 'List',
    base: 'Base', past: 'Past Simple', pp: 'Past Participle', tr: 'Translation',
    guessPast: 'Past Simple of:', guessPP: 'Past Participle of:',
    done: 'Training complete!', repeat: 'Repeat',
  },
  diagnostic: {
    title: 'Knowledge test', subtitle: 'Professor\'s test',
    desc: '20 questions · 30 seconds each\nDetermines level from A1 to C2',
    prevResult: 'Previous result',
    start: 'Start test',
    yourLevel: 'Your level',
    correct: 'Correct answers',
    skipped: (n: number) => `Skipped (timer): ${n}`,
    again: 'Retake test',
    backHome: 'Back to home',
    timeUp: 'Time\'s up — question skipped',
    points: (n: number) => `+${n} pts`,
  },
  onboarding: {
    chooseLang: 'Choose your language',
    enterName: 'Enter your name or nickname',
    placeholder: 'Your name...',
    next: 'Continue',
    nameError: 'Please enter a name to continue',
  },
  premium: {
    locked: 'Without Premium you lose access\nto 31 lessons, quizzes and Hall of Fame',
    freeCont: 'Continue for free (Lesson 1)',
    cta: 'Start 7 days free',
    ctaSub: 'Subscribe — €3.99/mo',
    legal: 'Cancel anytime in App Store / Google Play settings.',
    features: ['All 32 lessons', 'All quiz levels', 'Hall of Fame & leagues', 'Voice input', 'Detailed stats'],
  },
};
```

---

## 5. Новый онбординг

### Флоу шагов

```
Было:  beta → demo2 → demo → name → test_offer → streak → time → referral
Стало: beta → demo2 → demo → ui_lang → learn_lang → name → test_offer → streak → time → referral
```

### Экран выбора языка интерфейса (`ui_lang`)

- Отображать на ВСЕХ трёх языках (до того как пользователь выбрал)
- Флаги или названия: 🇷🇺 Русский / 🇺🇦 Українська / 🇺🇸 English
- При нажатии: немедленно переключить язык, перейти к следующему шагу

### Экран выбора языка обучения (`learn_lang`)

- Отображать на уже выбранном `uiLang`
- Исключить сам `uiLang` из вариантов (нельзя изучать то, что знаешь)
- Пример для `uiLang = 'ru'`: варианты EN и UK

---

## 6. Порядок реализации (фазы)

### Фаза 1: Типы и контекст _(1–2 дня)_
1. Создать типы `UILang`, `LearnLang` в `LangContext.tsx`
2. Добавить состояния `uiLang` и `learnLang` в `LangProvider`
3. Добавить AsyncStorage логику с миграцией `app_lang → ui_lang`
4. Создать объект `EN_UI` (английский интерфейс)
5. Обновить `LangCtx` интерфейс и `LangProvider` возвращаемые значения

### Фаза 2: Критичные экраны _(1–2 дня)_
1. `_layout.tsx` — обновить загрузку языков
2. `onboarding.tsx` — добавить новые шаги `ui_lang` и `learn_lang`
3. `settings.tsx` — добавить выбор языка обучения

### Фаза 3: Замена `lang` во всех файлах _(2–3 дня)_
1. Пройтись по всем 40+ файлам из раздела 3.4
2. Заменить `{ lang }` на `{ uiLang, learnLang }` везде
3. Определить по контексту: это UI или Learn язык?
4. Обновить сигнатуры функций: `lang: 'ru' | 'uk'` → нужный тип

### Фаза 4: Логика уроков _(2–3 дня)_
1. `lesson1.tsx` — разделить логику UI и learn
2. `lesson_words.tsx` — `buildCard` принимает `learnLang`
3. `lesson_irregular_verbs.tsx` — использовать `learnLang`
4. `flashcards.tsx` — показывать перевод по `learnLang`
5. `quizzes.tsx` — выбор фраз по `learnLang`

### Фаза 5: Данные и переводы _(3–5 дней + агенты)_
1. Добавить `textEN` в все `LessonIntroScreen` объекты (lesson_data_*.ts)
2. Добавить `correctEn`, `wrongEn`, `secretEn` в `lesson_cards_data.ts`
3. Заполнить данные с помощью Claude агентов (нативный уровень, не буквальный перевод)
4. Проверить качество переводов

### Фаза 6: Тестирование _(2–3 дня)_
1. Проверить все 6 комбинаций матрицы вручную
2. Проверить AsyncStorage миграцию для "старых" пользователей
3. Проверить онбординг от начала до конца на всех языках
4. TypeScript — убедиться что нет ошибок типов

### Фаза 7: Чистка и мерж _(1 день)_
1. Удалить устаревшие ссылки на `app_lang`
2. Консолидировать `constants/i18n.ts` (дублирование с LangContext)
3. Мерж `feature/multilang` → `master`

---

## 7. Риски и важные моменты

### Критичные риски

| Риск | Решение |
|------|---------|
| Потеря настройки языка при обновлении | Миграция: `app_lang` → `ui_lang` при первом запуске |
| TypeScript ошибки в 40+ файлах | Сначала менять только типы, потом логику |
| Данные уроков без EN объяснений | Fallback на RU, заполнять итеративно |
| Логика: `lang` — UI или Learn? | Анализировать контекст каждого места |

### Чеклист перед мержем

- [ ] Все 6 пар языков работают сквозь весь флоу
- [ ] Онбординг: новые пользователи правильно выбирают оба языка
- [ ] Settings: текущие настройки отображаются верно
- [ ] Старые пользователи: не сбрасываются настройки при обновлении
- [ ] TypeScript: `npx tsc --noEmit` проходит без ошибок
- [ ] Все строки интерфейса на EN — качественный английский (не машинный перевод)

### Особые случаи

- **`getLeague()` и `getNextLeague()`** — принимают `lang`, нужно передавать `uiLang`
- **`notifications.ts`** — тексты уведомлений, нужен `uiLang` (не learnLang)
- **`medal_utils.ts`** — тексты подсказок, нужен `uiLang`
- **`constants/i18n.ts`** — дублирует LangContext, рассмотреть объединение
- **Диалоги** — `dialogs_data.ts` пока поддерживает только RU/UK; для EN нужны новые диалоги

---

## 8. Инструкции по работе в изоляции

```bash
# Создать ветку
git checkout -b feature/multilang

# Работать только в этой ветке
# НЕ мержить в master до завершения всех фаз

# Проверка TypeScript
npx tsc --noEmit

# Запуск для тестирования
npx expo start
```

---

_Документ будет обновляться по мере прогресса. Фазы отмечаются как завершённые._
