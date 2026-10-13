# Task packet: dev-ссылки после «Шпиль → Пик» — задание дня «Пройти ступени Пика» и «Что нового» (координатор 13.10 ~16:15)

Governance-ID: TG-6709A2198EF7
Status: In progress
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

**1. Задание дня «Пройти ступени Пика»** — строка «Сегодня» на Главной (`modules/today-tasks/today_tasks_view.ts`, 95d30d485).
- В реестре visual_parity строки нет: специалист-строки «Задание Сегодня» (overlays-specialist-030…035) `removed_by_owner`, home-001…006 — Главная без этого задания.
- Задание выпадает только при живом конфиге Пика (`readTodayTaskLiveness` → `loadSpireConfig().enabled`; в проде выключен) и при случайном выборе дня. На эмуляторе кадр недостижим.
- Нужна dev-подмена `todaytask=spire`: только память, в показе списка «Сегодня» последнее нетронутое задание заменяется на «Пройти ступени Пика» 0/3. Набор дня в хранилище не пишется, облака нет. Ссылка — Сверке напрямую, строки реестра нет; заводит её владелец реестра.

**2. «Что нового» с текстом про Пик.** Окно `ReleaseNotesV2Modal` в этом выпуске выключено (`configuredV2Release()` → null). Текст «Мы добавили Пик и обновили Карточки» — демо-объявление `DEV_MESSAGE_BODY` (`app_messages.ts`). Его показывает уже готовая ссылка system-012 (`appmessage=announcement`, окно «сообщение команды», только память) и слот сообщений Настроек (`slot=message`). Новой ссылки не нужно. uk — языковой проход Сверки (`uiLang` принимает только en).

## Scope

In scope: новый `app/dev_today_tasks.ts`; `hooks/use_today_tasks.ts` (подмена в мемо показа); `app/dev_state_fixtures.ts` (параметр `todaytask`).
Out of scope: генерация дня, хранилище заданий, реестр.

## Architecture

- `dev_today_tasks.ts` по образцу `dev_overlays_off.ts`: флаг в памяти, `__DEV__ && !IS_STORE_RELEASE`, подписка для `useSyncExternalStore`, лог `[DEV-STATE] todaytask`.
- Хук: `const devSpire = useSyncExternalStore(...)`. В `useMemo` показа: если флаг включён и задания Пика нет — последнее задание дня в копии состояния заменяется на свежее `spire_steps`. Только в копии; `state` и хранилище не меняются.
- dev_state: `todaytask=spire|off` → шаг `todaytask`.

## Security and privacy

Только память dev-сборки; в стор-сборке установка отклоняется, геттер — false.

## Technical debt

- Строку реестра под задание «Пройти ступени Пика» заводит владелец реестра (Макеты).

## Verification

- syncheck; тесты today-tasks (`tests/*today*`).
- Ссылка `dev_state?onboarding=done&intros=seen&todaytask=spire&overlays=off&next=/(tabs)/home` → в «Сегодня» строка «Пройти ступени Пика 0/3».

## Rollback

`git revert` коммита.
