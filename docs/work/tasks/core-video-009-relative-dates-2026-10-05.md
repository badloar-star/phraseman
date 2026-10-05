# Task packet: video-009 — относительные даты роликов и названия в 2 строки

Governance-ID: TG-E3762BEB6CFC
Status: In progress (Сверка video-009; координатор 05.10: «формат длительности, „N видео · язык“, даты»)
Owner: сессия 1 · ЯДРО

## Outcome

Макет video.html: даты роликов относительные («2 дня назад», «месяц назад»), названия в строках списка — до 2 строк.
Сейчас дата числом «30.09.2026» (formatLingmanVideoDate), название в 4–5 строк. Делаем помощник
formatRelativeVideoDate(iso, lang, nowMs) на 9 языков интерфейса (без Intl.RelativeTimeFormat — в Hermes его нет) и
применяем в карточке ролика (YoutubeVideoCard) и на экране ролика; компактные строки — numberOfLines 2.
Не делаем (нет данных/не код): длительность на обложке — в снимке каталога нет длительности (нужен сервер, вопрос
координатору); подпись «N видео · Английский» — код берёт название канала из каталога, там «Английский» (данные админки).

## Scope

components/video/formatRelativeVideoDate.ts (новый), tests/format_relative_video_date.test.ts,
components/youtube/YoutubeVideoCard.tsx, app/lingman_video_watch.tsx.

## Architecture

Чистая функция; formatLingmanVideoDate остаётся для прочих мест.

## Security and privacy

Не затрагивает.

## Technical debt

Длительность ролика — нужна в контракте каталога (сервер). Относительная дата не обновляется «на лету» в открытом
экране — пересчёт на рендере, этого достаточно.

## Verification

Тест помощника; сторожа видео; склейка Сверки video-009.

## Rollback

git revert коммита.
