# Task packet: диагностический лог [SETS-HERO] для героя вкладки «Наборы»

Governance-ID: TG-5FC55E5780A5
Status: In progress
Owner: сессия «Темы»
Related epic/enabler: TG-AFA4E1EB8336 (Наборы по rev8, часть 1)

## Outcome

Понять, почему герой-сцена (пьедестал, «Набор месяца», «Твой набор») не видна на вкладке «Наборы» в текущей сборке, по фактам из лога, а не по догадке. Владелец видит вкладку без героя; по логу будет ясно, отрисован ли герой, с каким числом наборов и при каком условии.

## Scope

In scope: одна строка `console.log('[SETS-HERO] …')` в `CommunityContestStage` перед `return` (components/packs/CommunityScene.tsx) и одна строка лога перед рендером `CommunityContestStage` в `FlashcardsCategoryHub` (app/flashcards/FlashcardsCategoryHub.tsx).
Out of scope: любые изменения раскладки и данных; лог не меняет поведение.

## Architecture

Цепочка: `app/(tabs)/community.tsx` → `app/flashcards_packs.tsx` (embedded) → `FlashcardsCategoryHub` (`sceneMode`) → `CommunityContestStage`. Лог пишет условия входа в герой: sceneMode, число наборов каталога, язык, наличие автора, верхний отступ, «мой» набор. Инвариант: лог не влияет на рендер (JSX-выражение возвращает undefined).

## Security and privacy

Лог пишет только счётчики и язык интерфейса; идентификаторов пользователей и содержимого наборов в лог не попадает (`hasAuthor` — только логическое значение).

## Technical debt

- Accept temporarily: лог временный, снимается после починки; по правилу владельца логи на ранних выходах и в catch остаются постоянно — здесь ранних выходов нет.

## Verification

- Синтаксис обоих файлов проверен парсером (`@babel/parser`, typescript+jsx) — OK.
- Эмулятор снимает вкладку «Наборы» текущей сборки и присылает фрагмент лога `[SETS-HERO]`.

## Rollback

Удалить две строки лога — поведение не меняется.
