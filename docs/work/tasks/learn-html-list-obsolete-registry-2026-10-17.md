# Task packet: learn.html — кадры старого списка со вкладками «Уроки | V2» устарели (реестр visual_parity)

Governance-ID: TG-486C24D85538
Status: In progress
Owner: 3 · МАКЕТЫ (координатор 17.10)
Related epic/enabler: 98f738846 (вкладка «Обучение» открывает карту V2, вкладок «Уроки | V2» больше нет), 318fabdfb

## Outcome

Строки реестра, где эталон — список уроков learn.html со вкладками «Уроки | V2» (раздел A «Список уроков»: learn-001…learn-010, A1–A9 и A8б), помечены как снятые словом владельца. Эталон старого списка — экран «Классический курс» в приложении. Гейт visual_parity не требует сверять эти кадры. Остальные 87 строк learn.html (окна A10–A12, пейвол, комбо, меню урока, вступление, урок, итоги, экзамены) остаются в сверке.

## Scope

В объёме: docs/phraseman-2.0/registries/visual_parity.json — 10 строк learn-001…learn-010: status → removed_by_owner, removed_reason, reviewed_by, reviewed_at.
Вне объёма: сам learn.html (координатор: файл не переделывать), остальные строки, код.

## Architecture

Новое поле пересборка (scripts/visual_parity_build.mjs:buildRows) стёрла бы. Штатные переносимые поля — status и removed_reason; гейт (tests/visual_parity_gate.test.mjs) пропускает removed_by_owner при непустой причине. diffs и доказательства строк не трогаем.

## Security and privacy

Не затрагивает: реестр макетов, без данных пользователей.

## Technical debt

- Contain: learn.html раздел A остаётся в файле со вкладками; координатор решил его не переделывать. Метка в реестре — граница.

## Verification

- tests/visual_parity_gate.test.mjs через slot.sh run — «N passed», 0 failed.
- git diff --numstat реестра: только 10 строк learn-001…010.

## Rollback

git revert коммита: вернёт прежние статусы (pending/diff) этих 10 строк.
