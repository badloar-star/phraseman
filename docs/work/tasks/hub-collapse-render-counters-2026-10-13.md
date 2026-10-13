# Task packet: временный dev-лог числа рендеров каталога хаба Диалогов

Governance-ID: TG-15867A7A0883
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по просьбе координатора 13.10

## Outcome

Сверка проверяет по журналу, что при раскрытии/закрытии категории (схлопывание шапки хаба, `aee10c22a`) каталог не перерисовывается. Для этого в `DialogueV2CatalogueContainer` и `DialogueV2CatalogueSection` добавляются ВРЕМЕННЫЕ строки `[HUB-COLLAPSE] render Container n=…` и `render Section n=…` (счётчик на `useRef`, только в dev). После проверки Сверкой счётчики убираются; лог решения `decideHubCollapse` остаётся.

## Scope

In scope: два счётчика в `components/dialogs/DialogueV2CatalogueContainer.tsx` и `DialogueV2CatalogueSection.tsx`; сторож на их временность и dev-условие.

Out of scope: сама логика схлопывания и любые другие рендеры.

## Architecture

`useRef` с инкрементом на каждом рендере и вывод через `console.log` под `globalThis.__DEV__ === true` (голая ссылка на `__DEV__` падает в jest). В стор-сборке строка не выполняется. Метка `// ВРЕМЕННО` и тест-напоминание делают удаление проверяемым.

## Security and privacy

Данные пользователя не пишутся: только номер рендера и название компонента.

## Technical debt

Contain: временный код. Снять после проверки Сверкой (запись RUN hub_collapse после R12); напоминание — в коммите и в тесте.

## Verification

Тест-сторож (`npm run test:one`, один процесс под светофором): счётчики есть, под dev-условием, помечены «ВРЕМЕННО»; лог `decideHubCollapse` на месте.

## Rollback

git revert коммита или удаление двух блоков с пометкой «ВРЕМЕННО».
