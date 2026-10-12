# Task packet: патч выреза Learning V2 и описание — в репозиторий; два пункта «Утром решить»

Governance-ID: TG-6E82D9FF4F98
Status: In progress
Owner: сессия «1 · Ядро» (координатор 12.10: «C:/Temp ненадёжно — копии в репозиторий»).

## Outcome
`docs/phraseman-2.0/handoff/r1_cut_v2.patch` и `r1_cut_v2.md` — копии из C:/Temp (код НЕ применяется). В
`docs/phraseman-2.0/RELEASE_PRECHECK_STATUS_2026-10-12.md`, «Утром решить», — два пункта с одной строкой «что меняется
для человека» и графой «да / нет»: вырез Learning V2 из R1; гейт сверки только по r1.

## Scope
In: два файла в docs/phraseman-2.0/handoff/, раздел отчёта. Out: наложение патча, переключение precheck.

## Architecture
Только документы; патч лежит как файл, git его не применяет.

## Security and privacy
Без данных.

## Technical debt
Патч стареет с каждым коммитом в 10 затронутых файлах — перед наложением `git apply --check`, при отказе пересобрать.

## Verification
`git apply --check docs/phraseman-2.0/handoff/r1_cut_v2.patch` на HEAD; файлы идентичны копиям в C:/Temp (sha256).

## Rollback
`git revert`.
