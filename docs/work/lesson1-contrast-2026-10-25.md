# Классический урок — контраст во всех темах (25.10.2026)

Задача координатора: классический урок целиком — `app/lesson1.tsx` и его компоненты (плитки слов, ввод, подсказки, итог урока, «Мои ошибки»),
во всех **174 сочетаниях** (29 тем × светлая/тёмная × Спокойно/Акцент/Максимум). Только изучение, код не правился.

## Как замерено

`npx tsx scripts/lesson1_contrast_measure.ts` — статический разбор **44 файлов**:
- `app/lesson1.tsx`;
- `components/practice`, `speech`, `feedback`, `session_attempts`, `results`, `lesson_exit`, `lesson_moments`, `mistakes-panel`,
  `mistake-practice`;
- отдельные компоненты урока: `LessonReviewSheet`, `ExplainSheet`, `NoEnergyModal`, `AiMistakeCard`, `MistakeEli5Modal`, `EnergyBar` и другие.

Как работает разбор:
- В каждой строке с цветом текста или значка цвет берётся из токенов (`glass.*` → `liquidGlassTokens`, `t.*` → `makeLiquidGlassTheme`,
  `semanticInk(glass)`, `mpColors(g)`, литерал).
- У тернарника меряются обе ветки.
- Подложка ищется в той же строке, иначе у ближайшего родителя выше по отступу. Если её нет — текст меряется на фоне экрана и на карточке.
- Чернила заливок (`accentInk`, `ctaInk`, `ctaFillInk`, `textOnGold`…) без найденной подложки не меряются на фоне — их подложки найдены
  вручную и вынесены в «ручные пары».

Пороги: текст — 4,5, значок — 3,0.

## Итог

**151 пара цвет/подложка + 7 ручных. В живом коде урока одно настоящее нарушение, ещё одно — в мёртвом файле.**

1. **🔴 Бейдж счётчика подсказок в уроке — `app/lesson1.tsx` (~1650–1661).** Цифра оставшихся подсказок `glass.accentInk` стоит на
   маленьком бейдже `backgroundColor: canUse50 ? glass.cta : glass.mutedText`. Это не пара темы:
   - подсказки есть — `accentInk` на `cta`: **18 из 174, до 1,04** (светлые `grad_full_*` на Спокойно — цифру не видно);
   - подсказок нет — `accentInk` на `mutedText`: **14 из 174, до 2,18**.

   **Замена:** на `cta` — `glass.ctaInk` (пара темы, не ниже 4,56); неактивный бейдж — `buttonFillDisabled` / `buttonInkDisabled` (4,61).
   0 нарушений. Последний коммит в файле — `aa2bbfc3e` (Мастерская); зона урока — Learning V2.
2. **`components/feedback/ProgressProofBlock.tsx:17` — мёртвый код.** Там `t.textSecond` для текста, а это `cta` (цвет заливки): 38 из 174,
   до 1,00 — тот же класс ошибки, что в `SpeakingPanel` (efbcf6f17). Компонент нигде не подключён — в уборку, чинить нечего.

**Проходит во всех 174 сочетаниях:**
- плитки слов (текст `glass.text`, при вспышке `ctaInk` на `cta` — 4,56);
- ввод и проверка ответа, «правильный ответ» на `correctBg` (в светлом — `glass.text`, в тёмном — `t.correct` 5,44);
- подсказки и объяснения (`ExplainSheet`, `AiMistakeCard`, `MistakeEli5Modal`);
- окно «нет энергии» (`accentInk` на `accent` — 4,56);
- итог урока `ResultsSequence`;
- «Мои ошибки» (`PanelKit`, `PracticeKit`): чипы `accentInk` на `accent`, кнопка `ctaFillInk` на `ctaFill` (4,51), «верно / неверно» через `mpColors`.

**Отдельно, уже в работе:** панель голосового ответа урока (`SpeakingPanel`) — 5 мест, отчёт `docs/work/speaking-panel-contrast-2026-10-25.md`,
передано Learning V2.

**Не разобрано автоматически (12 строк)** — цвет из локальной переменной или палитры экрана, список в выводе скрипта:
- `sx.primary` у поля ввода;
- `PracticeStates` с `messageColor`;
- момент «идеальный урок» (`LessonPerfectMoment`) на палитре Пика `useSpirePalette` — она измерена в `docs/work/spire-contrast-2026-10-25.md`;
- две строки со сложными условиями на `t.correct` / `t.wrong` — эти пары измерены в других строках и проходят.

## Таблица разбора и ручные пары

- Файлов: 44, пар цвет/подложка: 151 (подложка рядом: 12), не разобрано выражений: 12
- Нарушают хотя бы в одном сочетании: 2 (подложка рядом: 1)

| Файл:строка | Цвет | Подложка | Порог | Минимум | Где | Нарушений | Владелец | Код |
| app/lesson1.tsx:1395 | theme.correct | theme.correctBg | 4,50 | 4,02 | grad_jade · светлая · max | 9 из 174 | workshop · aa2bbfc3e | `style={{ color: glass.isLight ? glass.text : t.correct, fontWeight: '600', fontSize: interactiveAnswerFont, te` |
| components/feedback/ProgressProofBlock.tsx:17 | theme.textSecond | _не рядом: экран и карточка_ | 4,50 | 1,00 | grad_aurora · светлая · max | 38 из 174 | 2 feat: add lightweight motion a · 036736d62 | `<Text style={[styles.accumulated, { color: t.textSecond, fontSize: f.body }]}>{model.accumulated}</Text>` |

#### Ручные пары (подложка найдена по коду глазами)

| № | Что | Порог | Минимум | Где | Нарушений |
|---|---|---|---|---|---|
| B1 | lesson1 бейдж подсказок: accentInk на cta (подсказки есть) | 4,50 | 1,04 | grad_full_ref_signal_lime · светлая · calm | **18 из 174** |
| B2 | lesson1 бейдж подсказок: accentInk на mutedText (подсказок нет) | 4,50 | 2,18 | grad_ice · светлая · max | **14 из 174** |
| B1* | замена: ctaInk на cta | 4,50 | 4,56 | grad_lilac · светлая · accent | 0 из 174 |
| B2* | замена: buttonInkDisabled на buttonFillDisabled | 4,50 | 4,61 | grad_aurora · тёмная · max | 0 из 174 |
| W1 | lesson1 плитка слова при вспышке: ctaInk на cta | 4,50 | 4,56 | grad_lilac · светлая · accent | 0 из 174 |
| A1 | accentInk на accent (NoEnergyModal, ResultsSequence, PanelKit, PracticeKit) | 4,50 | 4,56 | grad_lilac · светлая · accent | 0 из 174 |
| A2 | ctaFillInk на ctaFill (PanelKit, кнопка) | 4,50 | 4,51 | grad_full_olive · светлая · calm | 0 из 174 |
