# Task packet: длительность роликов на обложках — где теряется, логи, сквозная передача

Governance-ID: TG-1142EAB573EF
Status: In progress
Owner: сессия «1 · Ядро» (координатор 22:20: «durationSec пуст у части роликов — проверь источник, реши»)

## Outcome
Разбор: сервер берёт длительность из YouTube Data API (videos.list contentDetails.duration →
`parseYoutubeDurationSeconds`); отпечаток публикации каталога учитывает все поля, кроме просмотров, — длительность
доходит. Нет длительности по природе у эфиров и премьер (YouTube отдаёт P0D/пусто) и у роликов из RSS (в RSS её нет).
Карточки сетки и «Все видео» пустую плашку уже не рисуют. Найдено: лента Главной теряла поле при переводе каталог →
лента (`catalogVideoToRailVideo`, у `LingmanYoutubeVideo` поля не было).
1. `durationSec` проходит в ленту Главной (`LingmanYoutubeVideo.durationSec`).
2. Логи `[ALL-VIDEOS]` и `[VIDEO-CATALOG]`: сколько роликов без длительности и в каком они состоянии — чтобы Сверка
   по журналу увидела, это эфиры/премьеры или реальная дыра данных.

## Scope
In: `app/lingman_youtube.ts` (тип), `app/home_video_rail_source.ts` (передача), `app/all_channel_videos_source.ts` (лог),
тест. Out: вёрстка карточки Главной (Дизайн решает, рисовать ли плашку), серверный синк (менять не нужно).

## Architecture
Без новых чтений: поле уже есть в снимке каталога, теряется только на клиенте.

## Security and privacy
Публичные данные YouTube.

## Technical debt
- Pay now: потеря поля в ленте Главной.
- Contain: RSS длительность не отдаёт — для роликов из RSS её нет, пока лента не перейдёт на каталог.

## Verification
Тест передачи поля; тесты видео; точечный typecheck.

## Rollback
Отдельный коммит.
