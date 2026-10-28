# Ядро · разбор красных тестов на HEAD перед OTA 2.0.3 — координатор 28.10

Governance-ID: TG-7349E59B66C2
Status: In progress
Owner: 1 · ЯДРО

## Outcome
По каждому красному тесту из списка Ревизора (session_runtime_contract, system_tts_only, episode_exit_resume, lesson_exit_sheet,
season_wire, study_speech_locale, test_runner_coverage, season_shared_modal): вердикт «устаревшее ожидание после намеренной
правки» (тогда тест обновляется, если его файл чистый) или «настоящая поломка поведения» (стоп и отчёт координатору).

## Scope
In scope: прогон этих тестов в чистом снимке `git archive HEAD`; чтение коммитов-причин; правка ТОЛЬКО чистых (без
незакоммиченных правок) файлов тестов при устаревшем ожидании. Out of scope: код приложения, файлы Codex с правками
(study_speech_locale_contract, learning_v2_system_tts_only — изменены в дереве), публикация OTA.

## Architecture
Снимок HEAD во временной папке с junction на node_modules репозитория; jest точечно по 9 файлам через светофор.

## Security and privacy
Без данных пользователей.

## Technical debt
Обновлённые ожидания тестов несут комментарий «зачем» со ссылкой на намеренный коммит.

## Verification
Каждый тест: причина падения из вывода, коммит-причина, вердикт; после правок — тесты зелёные в снимке.

## Rollback
Откат коммита правок тестов.
