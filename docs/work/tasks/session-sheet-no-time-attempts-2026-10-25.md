# Task packet: шторка занятия Learning V2 — убрать плитки «минут» и «попыток» целиком (Переводчик, координатор/Ревизор 25.10, блокирует выпуск)

Governance-ID: TG-FDA68E46598C
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

🔴 Ревизора по f305f6ed6: `lessons.tsx` перестал передавать `durationLabel`/`attemptsLabel`, а у `LearningV2SessionOutcomeSheet`
значения по умолчанию русские («≈ 5 минут», «3 попытки») — плитки показывались на русском всем языкам, и это те самые черновые
слова, которые владелец велел убрать. Решение координатора: плитки времени и попыток убрать полностью — пропсы, значения по
умолчанию и рендер; плитка слов остаётся (её значение передаёт экран уроков). Значение по умолчанию у слов — пустая строка,
чтобы русский текст не мог всплыть ни в одном языке.

## Scope

In scope: `components/LearningV2SessionOutcomeSheet.tsx`; гейт `tests/learning_v2_owner_final_ui_contract_2026_09_12_gate.ts`
(ждал testID плиток времени/попыток); новый сторож `tests/owner_locks_session_sheet_no_time_attempts_2026_10_25.test.mjs`;
строка в `docs/work/OWNER_LOCKS.md` и путь в `tests/owner_locks_registry.test.cjs` (только свои строки, `--patch`).
Out of scope: окно экзамена главы, ряд фактов закрытого занятия (уже без фактов), `lv2_locked_session_sheet_contract` —
Дизайн уже обновил его в 9382a0236 (проверяет `stats.length === 0`), правка не нужна.

## Architecture

No architecture change: из массива фактов шторки уходят два элемента, из типа пропсов — два необязательных поля.

## Security and privacy

Не применимо — данные не собираются и не передаются.

## Technical debt

- `OWNER_LOCKS.md` и реестр сторожей общие — коммит только моими строками через `--patch`.

## Verification

Разбор `.tsx` babel; `node --test` нового сторожа, `owner_locks_registry`, `no_dev_jargon_visible_copy_2026_10_25`;
гейт через tsx; `lv2_locked_session_sheet_contract` точечно через слот.

## Rollback

`git revert <коммит>`.
