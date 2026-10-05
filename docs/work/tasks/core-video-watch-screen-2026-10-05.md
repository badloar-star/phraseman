# Task packet: video-011 — отдельный экран ролика (плеер, набор к ролику, фразы по таймкодам)

Governance-ID: TG-D2F59FBC8A9A
Status: In progress (Сверка video-011 🔴; координатор 05.10 принял: все входы → один экран, «Тренировать» не трогать,
нет набора → нет блока, премьера во вкладке остаётся встроенной; конфликт (1)/(2) по вкладке — вкладку пока не
переключаем, см. Technical debt)
Owner: сессия 1 · ЯДРО

## Outcome

По макету docs/design/v2-app/video.html (watch, телефон 11): плеер во всю ширину 16:9 с ✕, название 20/26, строка
«канал · дата · просмотры», блок «Набор к ролику · N карточек · M добавили · Добавить себе +», «Фразы из видео N» с
таймкодами (подсветка текущей, тап — перемотка, закладка). Экран открывается мгновенно из того, что есть: ролик — из
снимка каталога (или параметров маршрута), фразы — из кэша памяти/диска, набор — из кэша каталога видео-наборов
(peek), сеть только фоном и только если кэш старше TTL. Лог [VIDEO-SCREEN] open {source, videoId, phrasesFrom,
packFrom}.

## Scope

- app/video_phrases_client.ts — кэш фраз (память + AsyncStorage, TTL 6 ч, stale-while-revalidate).
- components/youtube/YoutubeVideoPhrases.tsx — первый кадр из кэша, сеть только при протухшем кэше; проп
  `onSourceResolved` для лога экрана.
- app/lingman_video_watch.tsx — новый экран (маршрут).
- app/lingman_playlist.tsx — тап по ролику → экран ролика (вместо встроенного плеера).
- app/flashcards_video_packs.tsx — набор «Из видео» → экран ролика.
- app/lingman_videos.tsx — deep-link ?videoId на обычный ролик → редирект на экран ролика (ссылки не ломаются).

## Architecture

Новый маршрут /lingman_video_watch?videoId&channelId&source. Данные: peekYoutubeCatalogScreenSnapshot,
peekVideoMarketPacks/loadVideoMarketPacks (тот же кэш и TTL, что у раздела «Из видео»), кэш фраз в клиенте фраз.
«Добавить себе» — существующий CommunityPackSocialBar variant="videoAdd" (оптимистичность и защита от гонок в нём).

## Security and privacy

Кэшируются только опубликованные фразы ролика (публичный контент). Новых данных пользователя нет.

## Technical debt

Вкладка «Видео» пока не переключена на экран ролика: «Тренировать» живёт только под встроенным плеером вкладки, решение
у владельца. Раскрывашка «Фразы из видео» во вкладке остаётся до этого решения. Длительность ролика на обложке и
относительные даты — video-009, отдельно.

## Verification

Синтаксис (babel_check); тест video_phrases_contract + новый тест кэша фраз (при памяти); Сверка: склейка
«макет | эмулятор» для video-011, строки [VIDEO-SCREEN].

## Rollback

git revert коммита.
