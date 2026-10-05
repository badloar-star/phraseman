# Task packet: восемь устаревших сторожей плеера Learning V2

Governance-ID: TG-2DD8F4A75ABC
Status: In progress
Owner: сессия 1 · ЯДРО (координатор 05.10)

## Outcome

Сторожа ищут строки старой архитектуры. По каждой проверке: поведение сохранилось — перевести на новое место;
убрано намеренно (найти коммит) — снять с причиной. Код приложения не трогаем; зона Codex (factory_*) — сообщить.

## Scope

tests/learning_v2_session_runtime_contract, learning_v2_factory_production_audio_contract,
learning_v2_mode_router_family_coverage, learning_v2_new_word_encounter_player_contract.

## Architecture

Только тесты.

## Security and privacy

Не затрагивается.

## Technical debt

Сторожа по тексту исходника хрупки; где можно — проверять поведение.

## Verification

Прогон четырёх сюитов.

## Rollback

git revert.
