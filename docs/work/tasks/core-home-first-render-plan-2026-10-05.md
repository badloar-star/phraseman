# План (без правок): синхронная работа первого рендера Главной — кандидаты на разбивку

Governance-ID: TG-AF3DE7654555
Status: Plan — правка после пакета [JS-STALL] 02:26 и «ок» координатора; зона Главной — согласовать с Дизайном
Owner: сессия 1 · ЯДРО (координатор 05.10)

## Outcome

Пакет 01:26: между ready (+5,4 с) и первым кадром Главной JS-поток стоит ~2 с (FALLBACK 400 мс опоздал на
1,6 с), Главная рисуется через 0,35 с после сплеша. Цель — найти, что занимает поток, и разбить на «нужно
для первого кадра» / «после кадра». Статический разбор (не замер), стоимость оценена по коду.
Фактическая опора: home_paint.module_eval selfSumMs 850–889 мс на 989 модулях (пакет 00:30).

## Список (по вероятной цене)

1. home.tsx:4–122 — ~60 статических импортов; при `import('./home')` (_layout.tsx:30–31, React.lazy) весь
   чанк вычисляется одним блоком. Тяжёлые и НЕ нужные для первого кадра: achievements.ts (94 КБ),
   SurveySheetModal (37 КБ), PlayerProfileModal (25 КБ), PremiumCelebrationModal (21 КБ), VipCelebrationModal,
   SavedCardsFlight, FeatureIntroEntry, mistake_hub_advice (20 КБ), lingman_youtube (32 КБ),
   home_feature_tips (29 КБ). Нужны: шапка, «Продолжить», плитки, DailyPhraseCard (58 КБ — ниже сгиба?).
2. home.tsx:1037–1046 — `belowFoldReady` выставляется, но НИГДЕ не читается: второй проход D4 (1029) не
   реализован; renderHomeV2 (2020–2126) монтирует видео-рейл, «Сегодня», фразу дня сразу.
3. home.tsx:2200–2330 — закрытые модалки смонтированы на первом рендере (профиль, титулы, премиум/VIP-праздник,
   полёт карточек, вступление фич).
4. home.tsx:2138 — computeHomeTitles на каждом рендере (нужен только модалке титулов).
5. home.tsx:1940–2010 — плитки и филлеры строятся на каждом рендере без useMemo (~8 triLang × 9 языков,
   require картинок).
6. home.tsx:1154–1174 — после multiGet пачка setState → каскад ре-рендеров (homeOnboardingDone →
   homeRuntimeActive → эффекты 1298/1009/816/850/978), каждый пересобирает п.4–5.
7. home.tsx:1298–1335 — loadData через 80 мс после homeRuntimeActive (JSON.parse 1447/1504 после await).
8. home.tsx:433–460, 580–627 — хуки и инициализаторы: useTodayTasks (firstFrameState — замерить),
   buildLastLessonFromHydration → lessonNamesForStudyTarget (нужно для кадра — оптимизировать, не откладывать).
9. home.tsx:551–560, 1336–1340, 2187 + _layout.tsx:40 — app_first_content_ready шлют 4 места (до 3×3 событий);
   каждое трогает premount в _layout (916–952).
10. _layout.tsx:916–952 — премаунт вкладок (require './lessons' и др., 220–240 мс каждая) по событию или
    через 1600 мс — на dev попадает в то же окно, пока Главная не интерактивна.
11. _layout.tsx:46 — DevHubSheetGate импортируется статически (нужен только при ENABLE_DEV_TOOLS).

## Гипотеза №1

Самый большой синхронный кусок — вычисление модулей чанка Главной при `import('./home')` (п.1).
Разбивка: в статических импортах оставить только видимое на первом экране; модалки, achievements,
mistake_hub_advice, lingman_youtube и всё ниже сгиба — ленивыми (require / React.lazy) с монтированием после
первого кадра через уже существующий, но неиспользуемый belowFoldReady (п.2).
Проверка гипотезы — [JS-STALL]: разрыв, совпадающий с home_paint.module_eval, подтверждает её.

## Scope

Только план. Правки — после пакета 02:26, «ок» координатора и согласования с Дизайном (их зона).

## Architecture

Без изменений кода.

## Security and privacy

Не затрагивается.

## Technical debt

belowFoldReady — мёртвое состояние; либо подключить (п.2), либо удалить.

## Verification

Пакет 02:26: [JS-STALL] + home_paint.module_eval + HOME-PAINT.

## Rollback

Не требуется (документ).
