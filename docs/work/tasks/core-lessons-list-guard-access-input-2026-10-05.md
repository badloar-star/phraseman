# Task packet: сторож lessons_list_liquid_glass — вызов resolveLessonAccess через accessInput

Governance-ID: TG-F0787B77F4A0
Status: In progress (найдено при прогоне сторожей после 30d8fd672; покраснел от моего 767dc8175)
Owner: сессия 1 · ЯДРО

## Outcome

767dc8175 (флаг Dev Hub «Уроки как Free») перевёл вызов на `resolveLessonAccess(accessInput)`, где accessInput =
applyDevAsFreeToLessonAccess({...}). Сторож ищет буквально `resolveLessonAccess({` и краснеет, хотя решение доступа
то же. Обновляем: обработчик зовёт resolveLessonAccess и строит вход через applyDevAsFreeToLessonAccess({ … }).

## Scope

tests/lessons_list_liquid_glass_source_contract.test.mjs — одна проверка.

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

Урок: после правки файла гонять ВСЕ node-сторожа, которые его читают (здесь пропустил 767dc8175).

## Verification

node --test файла — зелёный.

## Rollback

git revert коммита.
