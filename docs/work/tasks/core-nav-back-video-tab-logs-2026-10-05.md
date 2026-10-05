# Task packet: [NAV-BACK] — «назад» из плейлиста ведёт на экран канала вместо вкладки «Видео» (сперва логи)

Governance-ID: TG-AD0263BEB6ED
Status: In progress (Сверка 06:10, BUG_video_back_to_channel_0609.png)
Owner: сессия 1 · ЯДРО

## Outcome

Вкладка «Видео» → «Плейлисты» → плейлист → системное «назад» → новый экран /lingman_videos («Professor Lingman», вкладка
«Главная»). По коду (app/navigation_back.ts): popBackCandidate возвращает кандидата только если его раздел совпадает с
разделом покидаемого экрана; /lingman_playlist — раздел 'lingman', а /video и /(tabs)/video нет в SECTION_ROOTS →
история сбрасывается, safeRouterBack уходит на fallback '/lingman_videos' (dismissTo/replace) — новый экземпляр экрана.
Шаг 1 — лог каждого решения «назад» с причиной; починка (вкладка /video в раздел 'lingman') — после воспроизведения.

## Scope

app/navigation_back.ts: console.warn [NAV-BACK] в safeRouterBack (откуда, кандидат, выбор, способ) и в popBackCandidate
(причина сброса истории). Поведение не меняется.

## Architecture

Не меняется.

## Security and privacy

Только пути экранов (без параметров запроса — basePath).

## Technical debt

После диагноза: починка SECTION_ROOTS; строку [NAV-BACK] оставить (ядро навигации без логов — повторяющийся класс багов).

## Verification

Тесты navigation_back*; синтаксис; воспроизведение Сверкой.

## Rollback

git revert коммита.
