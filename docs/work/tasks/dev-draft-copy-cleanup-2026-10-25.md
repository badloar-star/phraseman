# Task packet: тексты «как черновик разработчика» — убрать механику, время и жаргон из видимых строк (Переводчик, координатор 25.10)

Governance-ID: TG-F984C20CFB77
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Жалоба владельца на тест 25.10: «это черновик разраба или приложение?!». Решение координатора по пунктам, на всех 9 языках, только тексты
(и пустые места вёрстки там, где показ убран):
1. `app/(tabs)/lessons.tsx` шторка занятия: `durationLabel` «≈ 5 минут» и `attemptsLabel` «3 попытки» не передаются; `sessionLabel`
   «Сессия» → «Занятие» (ru/uk/pl; es/pt-BR/en/vi/id/tr — уже нейтральные Sesión/Sessão/Session/Buổi/Sesi/Oturum). Так же подпись
   под кружком карты «Сессия N» → «Занятие N» (тот же класс, иначе сторож красный). `components/LearningV2SessionOutcomeSheet.tsx`:
   плитки фактов без значения не рисуются, ряд без фактов не рисуется — нет пустых плиток.
2. `lessons.tsx` подсказка «Сессия ещё в работе» → «Это занятие скоро откроется» ×9.
3. `app/learning_v2_session_intro_check.tsx`: eyebrow «ПРОВЕРКА ИНТРО» → «КОРОТКАЯ ПРОВЕРКА» ×9; `eyebrowDetail` «3 вопроса · до 9 звёзд»
   убран вместе со строкой и стилем; «Попытка {n}» убрана из показа (кнопка «Пропустить» прижата вправо); подсказка доступности
   «Вопрос получит ноль звёзд…» убрана; «Собрано {st} в этой сессии» → «за занятие» (ru/uk/pl/vi); a11y «Закрыть проверку интро» →
   «Закрыть проверку» ×9, «Пропустить вопрос интро» → «Пропустить вопрос» (ru/uk/en); кнопка «Начать сессию» → «Начать занятие» (ru/uk/pl/vi).
4. `app/pos_workout_engine.ts`: «slot-дриллы / slot drills / slots» → «короткие упражнения / short exercises» ×9; второй nextStep
   (ru/uk были английскими) — по-русски/украински, id «slot pendek» → «latihan singkat».
5. `app/learning_v2_session_intro.tsx`: a11y «Закрыть интро» → «Закрыть» ×9.
Сторож `tests/no_dev_jargon_visible_copy_2026_10_25.test.ts`: в ru-строках этих файлов нет «минут», «попытк», «сесси», «интро», «дрилл»,
«ноль звёзд»; исключение — разработческий переключатель `learning-v2-dev-unlock-all-sessions` (`__DEV__ && ENABLE_DEV_TOOLS`).

## Scope

In scope: перечисленные строки и пустые места вёрстки. Out of scope: тест «Не хочу с начала» (уже чист, bf3cabfd8, d9182a2df), логика попыток/звёзд.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Слово «сессия» в комментариях кода и именах переменных остаётся — сторож читает только ru-строки.
- `pos_workout_engine.ts` профили на экран сейчас не попадают (getPosWorkoutProfile никто не вызывает) — правка на будущее включение.

## Verification

Новый сторож; `tests/short_screen_layout_contract.test.ts`, `tests/learning_v2_owner_final_ui_contract_2026_09_12_gate.ts` (testID фактов остаются в источнике);
разбор файлов babel; `scan_untranslated_ui`; `informal_address_ru_uk_guard`.

## Rollback

`git revert <коммит>`.
