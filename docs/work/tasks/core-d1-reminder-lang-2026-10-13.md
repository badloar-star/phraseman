# Task packet: напоминание D+1 на языке интерфейса + разбор скелетона видео после смены цели

Governance-ID: TG-298806CAA922
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: аудит смены языка R1 п.3 (Авторизация)

## Outcome

Пуш D+1 после первого урока приходит на языке интерфейса для всех 9 языков (раньше — русский для en/pt-BR/vi/id/tr/pl).
Подозрение «скелетон видео на Главной до перезапуска после en→es→en» — сначала логами, по факту.

## Scope

In scope: `app/lesson_complete.tsx` (язык D+1 через `resolveNotificationLang`), тест; логи в `app/home_video_load_pipeline.ts` при
необходимости. Out of scope: `app/(tabs)/home.tsx` (Дизайн) — только отчёт и просьба владельцу файла.

## Architecture

No architecture change: та же чистая функция `resolveNotificationLang`, что у энергии и серии (ace26d405).

## Security and privacy

Не касается: язык уведомления, без новых данных.

## Technical debt

- Pay now: ручной разбор языка в D+1 заменён общим помощником.

## Verification

Тест-сторож: в lesson_complete нет ручного `uk ? uk : es ? es : ru`, D+1 зовёт resolveNotificationLang.

## Rollback

Откат одного коммита.
