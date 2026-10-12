# Task packet: решения владельца (журнал п.81) — светлые карточки уроков, состояния заявки/языка, PLUS на микрофоне

Governance-ID: TG-EE822CCE9092
Governance-ID: TG-306995E3F11A
Governance-ID: TG-DD89FB41F83B
Governance-ID: TG-7AACD68B5DB5
Governance-ID: TG-1E17DF51FD4F
Governance-ID: TG-F60F98C98222
Governance-ID: TG-6E52EB61644B
Governance-ID: TG-51E9CC186027
Governance-ID: TG-02450FFAFE94
Governance-ID: TG-4BE9A1ABB213
Governance-ID: TG-85112C842AA6
Governance-ID: TG-E8FACE757646
Governance-ID: TG-F85B08D8148A
Governance-ID: TG-D2D0D76CF923
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по заданию координатора (12.10, вечер)
Related epic/enabler: docs/phraseman-2.0/R1_THEMEMODE_LEGACY_MAP.md, макеты Макетов

## Outcome

(1) Карточки уроков при светлом оформлении светлые (светлая ветка bookPalette по токенам, контраст-тест). (2) В приложении есть состояния «Отправляем заявку…» в Сообществе (community-010, Optimistic UI заявки в друзья) и кнопка языка на настройке тренировки Карточек (cards-027). (3) «PLUS» на микрофоне в Диалогах (dialogs-028) — вид; правило «голос только Plus» у Ядра. (4) Экран урока как есть; тост серии строкой сверху как сейчас.

## Scope

In scope: app/(tabs)/lessons.tsx (LessonCard, bookPalette), components/lessons/*, экраны Сообщество/Карточки/Диалоги по строкам реестра, тесты контраста.
Out of scope: правило доступа к голосу (Ядро), серверные функции.

## Architecture

Токены темы (liquidGlassTokens, appearance light), без своих hex; существующие паттерны Optimistic UI.

## Security and privacy

Данных не добавляет; заявка в друзья — существующий поток.

## Technical debt

Pay now: светлая тема не должна оставлять тёмные плашки с белым текстом.

## Verification

Тесты контраста по всем темам × ползунок, сторожа экранов, срез типов.

## Rollback

Откат коммитов.
