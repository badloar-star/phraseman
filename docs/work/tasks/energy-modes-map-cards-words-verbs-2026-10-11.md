# Карта точек энергии: «Карточки: тренировка», «Слова», «Неправильные глаголы» (11.10)

Governance-ID: TG-93BC2B86E18D

## Outcome
Карта для Ядра (ТЗ `docs/phraseman-2.0/ENERGY_MODES_OWNER_BRIEF_2026-10-11.md`): где в зоне Авторизации энергия списывается за старт (режим А), где ошибка ответа (точка режима Б), сердечки, шторки, сохранение позиции. Только чтение, код не менялся.

## Scope
Экраны: flashcards_swipe / truefalse / recall / speaking / blitz, lesson_words, lesson_irregular_verbs. Строки сняты с РАБОЧЕГО дерева 11.10 (Ядро параллельно правит useSessionAttempts / EnergyContext) — перепроверять перед правкой.

## Architecture
- Режим: `app/energy_mode.ts` (`useEnergyMode`, `chargesEnergyOnMistake`, `energyActivityForAttemptsSessionId`), ключ `energy_mistake_charge` в `app/remote_flags.ts` (дефолт false = А), админка `admin/v2/legacy.html` (`saveControlPanelBool`).
- Единая точка ошибки — хук `useSessionAttempts.registerVerdict({verdict:'pedagogical_wrong'})` → в режиме Б `spendMistakeEnergy`; на последней энергии фаза `stopped_no_energy`, эффект `energy_exhausted`. Экраны лишь передают `attempts` в `SessionAttemptsHud` (подменяется на `EnergyAttemptsHud` + `EnergyStopSheet`).
- Старт в режиме Б: `confirmActivityStart` → `'unlimited'` при ≥1 энергии, иначе `'insufficient'` → `NoEnergyModal` → `EnergyNeededSheet`.
- Plus: `EnergyContext.readUnlimited` → `'unlimited'`/`outcome='free'`, ничего не снимается.
- Энергия только локальная (AsyncStorage `energy_state` + журнал операций), серверного списания нет.

### Таблица
| Экран | Старт (режим А) | Ошибка (точка Б) | HUD | «Нет энергии» | Позиция |
|---|---|---|---|---|---|
| flashcards_swipe | `startSession` → `confirmSpendOne` (~2456), возврат `refundActiveSwipeEnergy` | `applyAnswer` → `registerVerdict` (~3056) | `SessionAttemptsHud` ~3846 | `NoEnergyModal activity="flashcards"` ~4326 | ключ `flashcard-swipe:{target}:{decks}` стабилен; ввод блокируется `phase!=='active'` |
| flashcards_truefalse | как swipe (обёртка) | как swipe | ~3727 + EnergyBar | как swipe | ДЕЛИТ ключ со swipe |
| flashcards_recall | `confirmSpendOne` ~416 | `recordVerdict` → `registerAttemptVerdict` ~612 | ~823 | ~955/1192 | ключ СЛУЧАЙНЫЙ на заход (~150) — остановка не переживает выход |
| flashcards_speaking | `confirmSpeakEnergy` ~585 | `registerVerdict` ~956; нейтральные (cancelled/no_speech/technical_error) не снимают | ~1395 | ~1823 | ключ стабилен, позиция только в памяти |
| flashcards_blitz | `confirmBlitzEnergy` на раунд ~590 | `registerVerdict` ~975 | ~1457; плейсхолдер ~1312 без `attempts` | `setEnergyGate('denied')` ~619, ~1558 | ключ на `roundId` |
| lesson_words | `useFirstQuestionEnergyGate` ~2819 (`finalizeOn:'first_answer'`, повторный вход 10 мин бесплатно) | `handleChoice` → `registerVerdict` ~2990 | ~3234 | `NoEnergyModal activity="lesson_words"` ~3787 | ключ `lesson-words:{target}:{lessonId}` |
| lesson_irregular_verbs | `useFirstQuestionEnergyGate` ~303 | `handleTap` → `registerVerdict` ~494 | ~788 | ~1358 | ключ `irregular-verbs:{target}:{lessonId}` |

Энергию НЕ тратят (и не должны): flashcards_training_setup, хаб, коллекция, packs/editor/audio/voice_picker, вкладки «Словарь/список».

## Security and privacy
Не затрагивается: данные не собираются и не передаются.

## Technical debt / риски для Ядра
1. `lesson_words`, `irregular_verbs`, swipe (~3091), speaking (~979/1056): ветка удержания карточки срабатывает только на `attempts_exhausted`; на `energy_exhausted` экран может по таймеру уйти к следующему вопросу под шторкой → после Plus человек увидит НЕ тот же вопрос. В lesson_words / irregular_verbs нет блокировки ввода по `phase!=='active'`.
2. Блиц: таймер раунда по настенным часам не паузится в `stopped_no_energy` — шторка «съедает» раунд; нужно решение, что значит «то же место».
3. Recall: случайный ключ сессии противоречит допущению «остановка сохраняется»; `/flashcards_recall_session` нет в `session_attempts_registry.ts`.
4. Swipe и true/false делят ключ → общая остановка на одни колоды.
5. Плейсхолдер блица при загрузке рисует 3 сердечка в режиме Б.
6. Списание за ошибку фоном (`void spendMistakeEnergy`): при сбое журнала остановка наступила, энергия не снята — нужен лог/повтор.
7. lesson_words (~3642) и irregular_verbs (~1188) закрывают окно «нет энергии» по `energy>0` без `bonusEnergy`.
8. Plus в остановке: `EnergyAttemptsHud` держит карточку смонтированной ради `onResume` — проверить на эмуляторе на всех экранах.

## Verification
Карта собрана чтением (grep/выдержки) рабочего дерева; проверка поведения — прогон обоих режимов на эмуляторе (Сверка/Эмулятор).

## Rollback
Документ; откат коммита.
