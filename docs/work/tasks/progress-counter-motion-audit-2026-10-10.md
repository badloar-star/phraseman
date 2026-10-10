# Task packet: прогресс-бары (800 мс) и счётчики (650 мс) — приведение к kit.js

Governance-ID: TG-6ABF46A8A49F
Status: In progress
Owner: сессия «2 · Дизайн» (поручение координатора 10.10 04:10)
Related epic/enabler: press-standard-and-sheet-timing-2026-10-10.md; гейт «приложение = макет»

## Outcome

1. В OWNER_MOCKUP_CORRECTIONS (раздел D) две строки: DuoPressable оставлен, HybridAlertShell не менять.
2. Прогресс-бары и счётчики (XP/монеты/серия) в общих компонентах и экранах: длительность и кривая = `KIT_MOTION` (полоса 800 мс cubic-bezier(.2,.8,.2,1), счётчик 650 мс cubic-bezier(.3,1.4,.5,1)); где это один общий компонент — править его, где разрозненно — свести к общему или перечислить.

## Scope

In scope: общие компоненты полос/счётчиков и их прямые потребители, тесты-контракты. Out of scope: логика начисления, сервер, Learning V2, Шпиль, файлы Codex.

## Architecture

Источник — `constants/motionHybrid.ts` (`KIT_MOTION.progressMs/progressEase/counterMs/pressEase`), зеркало kit.css:127–134.

## Security and privacy

Не затрагивает данные.

## Technical debt

Contain: расхождения, требующие макета или решения владельца, фиксируются списком.

## Verification

Синтаксис (babel), узкие контракты (по файлам, через слот), без полного сюита.

## Rollback

Отдельные коммиты, `git revert`.

## Результат (10.10 ~06:00)

**Документы.** OWNER_MOCKUP_CORRECTIONS D.18 (`DuoPressable` оставлен, решите, нужен ли общий кит-эталон), D.19 (`HybridAlertShell` не менять); нумерация раздела E сдвинута (17 → 20), чтобы номера были уникальны.

**Прогресс-бары → kit.css `.trk > i` (800 мс cubic-bezier(.2,.8,.2,1)).**
- Новый общий `components/KitProgressFill.tsx`: scaleX на UI-потоке, число и кривая из `KIT_MOTION`, первый кадр сразу в нужной доле (без «роста с нуля»), reduce-motion без движения. Раньше заливки практики/слов/глаголов/предлогов/опроса ставили `scaleX` мгновенно — скачок на каждый ответ.
- На него переведены: `PracticeProgressRow` (все режимы практики), `lesson_words`, `lesson_irregular_verbs`, `preposition_drill`, `SurveySheetModal`.
- Выровнены по числам кита без смены структуры: `GradientProgressBar` (было 380 мс, out-quad), `StatProgressRow` (было пружиной), `DailyPollCard` (было 420 мс, out-cubic).
- Сторож `tests/kit_progress_fill_contract.test.ts`.

**Счётчики.** В ките «счётчик» — это `numup/numdn` на числе в пилюле (650 мс cubic-bezier(.3,1.4,.5,1), ключевые кадры 35 %: ±5 px, scale 1.22/.82). `EnergyBar` уже делает `numdn` (230 + 420 мс); выровнена кривая первой половины (в CSS кривая действует на каждый интервал). Остаётся расхождением, не менял (нужен макет или решение): 
| Где | Что в приложении | Что в макете |
|---|---|---|
| `PracticeRuneCounter` | рост: вся пилюля scale 1.28 за 140 + 220 мс, count-up 900 мс; убыль: руна 1.45 за 180/420/300 мс | `.num.up` на числе 650 мс; count-up «+N» 900 мс и баланса 700 мс (practice.html) |
| `AnimatedCountUpText` по умолчанию 900 мс, `count_up.ts` 620 мс | разные длительности | 900/700 мс в practice.html, в `KIT_MOTION` числа нет |
| Сердца в худе (`SessionAttemptsHud`, `SESSION_ATTEMPTS_MOTION`) | тряска каждого сердца 5 × 60 мс, ±3 px | тряска пилюли 520 мс cubic-bezier(.3,1.4,.5,1), ±5/±5/∓3/±3 px (practice.html `.pill.shake`) — закреплено сторожем Learning V2, не менял |
| `components/ui/v2_ui.tsx` | `v2motion.slow` 320 мс | старое семейство «турнира» (Арена удалена), не трогал |

## Дополнение (10.10, по решению координатора 04:50)

- Count-up практики (`PracticeRuneCounter`) — 650 мс (`KIT_MOTION.counterMs`, было 900). Бамп при начислении теперь на ЧИСЛЕ (translateY −5 px, scale 1.22, 35 %/65 % от 650 мс, кривая cubic-bezier(.3,1.4,.5,1) — kit `.num.up`), а не на всей пилюле. Убыль рун (владельческая анимация руны) не менял. Общий `AnimatedCountUpText` по умолчанию остался 900 мс — им пользуется Learning V2 (вне релиза); `count_up.ts` нигде не импортируется.
- Тряска сердец (5×60 мс) — не трогать (сторож Learning V2, в релиз не идёт).
- `KitProgressFill` переписан на core `Animated` (нативный драйвер): Reanimated в окружениях, где тесты импортируют экраны (урезанный мок react-native / частичный мок reanimated), падал. Проверено: `kit_progress_fill_contract`, `daily_poll_card_contract`, `practice_rune_counter`, `lesson_words_bank_regression` (мок заливки), `survey_sheet_modal` (RNTL, обновлена одна строка про scaleX), `irregular_verbs_attempts_integration`, `lesson_words_attempts_integration`, `survey_offer_render`, `session_attempts_hud`, `home_rune_balance_render` — зелёные. Красные не из-за меня: `report_error_button_locale` (подпись «Suscripción, compra o fragmentos»), `gustav_french_vocabulary_target_gate` (`lesson_words` без `shouldBlockLessonAccess`).
