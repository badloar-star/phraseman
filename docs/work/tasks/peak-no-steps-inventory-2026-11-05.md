# Task packet: инвентаризация слов «ступени» в Пике (запрет владельца, 05.11)

Governance-ID: TG-FD0C2F784A33
Status: In progress
Owner: 10 · ПЕРЕВОДЧИК
Related epic/enabler: запрет владельца на слово «ступени» в Пике (координатор, 05.11)

## Outcome

Составлен полный список ключей i18n Пика и Моментов, где есть слово «ступень» и его переводы. Список передан Моментам (клиент Пика) и Ревизору (сторож). Тексты ранжирования переписаны без ступеней. Вопрос о игровых словах («ступень пройдена») вынесен координатору. Успех: инвентарь в docs/work/peak_no_steps_inventory_2026-11-05.md, сообщения отправлены, коммит сделан.

## Scope

In scope: строки в components/spire/spire_game_strings.ts, spire_strings.ts, spire_plurals.ts, spire_record_copy.ts, components/spire/moments/moments_strings.ts, position_moment_strings.ts; документ инвентаризации.
Out of scope: код компонентов Пика (правит Моменты), серверные поля rankBy, сами игровые механики, игровые слова «ступень пройдена» до решения координатора.

## Architecture

Строки — данные для клиента. Код не меняется в этом пакете; замены подключает сессия Моментов.

## Security and privacy

Персональных данных нет.

## Technical debt

Функции spireStepsWord и друзья остаются до уборки клиента. Игровые ключи (stepPassed и др.) ждут решения координатора.

## Verification

Инвентарь проверен скриптом по файлам; коммит через safe_commit с --expect.

## Rollback

`git revert` коммита документа; строки в коде не менялись.
