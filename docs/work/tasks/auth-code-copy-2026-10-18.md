# Task packet: тексты кода входа и «нет интернета» — 9 языков (эталон auth-states.html, блок 7, 2a53f1783)

Governance-ID: TG-4EF0690BAAEA
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R07

## Outcome

Новый файл копий `components/auth/auth_code_copy.ts` с текстами на 9 языков:
- «Код действует ещё {m:ss}»;
- «Отправили новый код»;
- «Код не подошёл. Проверь все 6 цифр.»;
- «Повторная отправка через {m:ss}»;
- общее для правила «только успех»: «Нет интернета — сохраним, как только он появится» (единственное сообщение при входе и выходе).
Время подставляет код (готовая строка `m:ss`), между словом и временем — неразрывный пробел.

## Scope

In scope: новый файл `components/auth/auth_code_copy.ts`.

Out of scope: подключение в экраны (Дизайн/Авторизация), `auth_provider`, `account_switch_*`, `auth_error_copy.ts`.

## Architecture

Чистые функции над `triLang`, без зависимостей от вида. В `components/` — не маршрут, заглушка не нужна.

## Security and privacy

Не применимо: тексты.

## Technical debt

- Функции пока не вызываются — Accept temporarily: подключают Дизайн/Авторизация по эталону.

## Verification

- `babel.parseSync`; `git diff --numstat`.

## Rollback

`git revert <коммит>`.
