# Task packet: приветствие «С возвращением» на Главной без рода (Переводчик, координатор 22.10)

Governance-ID: TG-4605DE3201D0
Status: Done — коммит в окно
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

`HOME_SCENE_COPY.welcome` в `components/home/v2/scene/home_scene_copy.ts`: убрать мужской род, когда пол человека неизвестен.
Проверка всех 9 языков:
- мужской род только в двух: es «Bienvenido de nuevo» и pt-BR «Bem-vindo de volta»;
- ru «С возвращением», uk «З поверненням», en «Welcome back», vi «Chào mừng trở lại», id «Selamat datang kembali»,
  tr «Tekrar hoş geldin», pl «Witaj z powrotem» — без рода.

Замены — самые короткие естественные варианты:
- es «Hola de nuevo» (13 знаков против 19);
- pt-BR «Olá de novo» (11 против 18).

Обе короче нынешних, поэтому строка на 360 dp не удлиняется. Предложенные координатором «Te damos la bienvenida» и
«Boas-vindas» не взял: первое длиннее, второе без «снова» теряет смысл возвращения.

## Scope

In scope: две подстроки в `welcome`. Out of scope: прочие экраны с «Bienvenido» / «Bem-vindo»; онбординг — отдельной задачей,
если координатор скажет.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Не проверено носителем.

## Verification

`babel.parseSync`; `git diff --numstat` = 2/1 (одна строка + комментарий «зачем»); поиск по тестам старых строк.

## Rollback

`git revert <коммит>`.
