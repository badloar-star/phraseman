# Task packet: порядок EN-прохода робота по ~40 ключевым экранам R1 (к вопросу владельца 4)

Governance-ID: TG-7D409A219EC2
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (координатор 13.10)

## Outcome

docs/phraseman-2.0/EN_PASS_ORDER_R1_2026-10-13.md — упорядоченный список ~40 экранов (онбординг, Главная, Уроки, Карточки, Диалоги,
вход в Шпиль, пейволы, Профиль, Настройки, уведомления, вход и удаление аккаунта) с готовыми ссылками `uiLang=en`, шагами и тем, на что
смотреть на кадре. Ссылки берутся из DEV_LINKS_EN_PASS.md (уже с uiLang=en) или из DEV_LINKS_R1.md с добавленным uiLang=en тем же правилом.
Робот не запускается.

## Scope

In scope: генератор списка в scratchpad, документ. Out of scope: запуск робота, код.

## Architecture

dev_state?uiLang=en — только память, в стор-сборке отклоняется (8bae34fd7); флаг ENGLISH_UI_LOCALE_ENABLED не трогается.

## Security and privacy

Только dev-ссылки; prod_write_guard проверяет исходные строки DEV_LINKS_R1.

## Technical debt

- Contain: нет.

## Verification

Каждая ссылка — из существующих строк таблиц; проверка, что все id нашлись.

## Rollback

Удалить документ.
