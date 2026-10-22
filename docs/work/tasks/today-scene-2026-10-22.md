# Task packet: «Сегодня» в стиле «Сцена», вариант A, пять состояний

Governance-ID: TG-27CB07B4A87D
Governance-ID: TG-8DA0436DA565
Governance-ID: TG-6534986517B3
Governance-ID: TG-892C262A8C94
Governance-ID: TG-CF79DDB2D007
Governance-ID: TG-368092C6A79B
Governance-ID: TG-35A284636784
Governance-ID: TG-370D2BC385F7
Governance-ID: TG-F797F50B0F26
Governance-ID: TG-64B0FBA91380
Governance-ID: TG-E8B032E24853
Governance-ID: TG-BE47095D90FA
Governance-ID: TG-697D91ABA73E
Governance-ID: TG-5B7EEA40E325
Governance-ID: TG-1D8206ED4D26
Governance-ID: TG-8C4DAAE2F7F4
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: эталон docs/design/v2-app/today-scene-concepts.html, вариант A (владелец утвердил 22.10); приказ координатора

## Outcome

Экран заданий дня (/today_tasks) за флагом TODAY_SCENE_V2_ENABLED (dev — вкл, релиз — выкл) рисуется «Сценой»: кольца дня справа, крупное «N из 3», кнопка следующего задания, панель «Задания дня». Пять состояний: утро, день, вечер (серия под угрозой), все задания выполнены, видео вместо диалога. Dev-вход /dev_today_scene_preview?state=…&theme=…

## Scope

In scope: новые файлы в components/home/v2/today_scene/ (чистое решение о состоянии, тексты на 9 языках, экран), флаг, dev-вход, минимальная врезка в app/today_tasks.tsx (только ветка по флагу), тесты.
Out of scope: HomeV2TodayCard.tsx, TodayActivityHistory.tsx, HomePollV2Card.tsx (чужие незакоммиченные правки — не трогаю), блоки сцены Главной (components/home/v2/scene/* — зона «3 · МАКЕТЫ», их только читаю), логика заданий и награды.

## Architecture

Состояние считается чистой функцией из заданий дня на телефоне и часов (новых чтений базы нет). Кольца — существующий TodayRingsSlot (докрутка «до → после» уже есть). Цвета сцены — homeSceneTokens(accent) из сцены Главной, чтобы два экрана совпадали. Экран только рисует ответ функции.

## Security and privacy

Новых данных не собираем и не передаём; используются уже локальные задания дня и серия.

## Technical debt

- Defer: лента истории дней в сцене появится после коммита TodayActivityHistory её автором (файл чужой, незакоммиченный).

## Verification

Юнит-тесты состояний и текстов; сторож подключения; точечная проверка типов; снимки эмулятора по пяти состояниям при свободном замке.

## Rollback

Флаг в false или `git revert`.
