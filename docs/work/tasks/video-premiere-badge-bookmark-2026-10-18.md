# Task packet: Видео — убрать плашки с обложки (премьера и закладка сетки)

Governance-ID: TG-D8615D96B08B
Status: In progress
Owner: сессия «2 · ДИЗАЙН»
Related epic/enabler: R07 (Видео)

## Outcome

Владелец (кнопка «Да, убрать плашки с обложки», через координатора 18.10):
1. Шапка премьеры: на кадре остаются только ▶ и (у обычных карточек) длительность; пилюля состояния уходит с обложки в ОДНУ строку под обложкой: «⚑ Скоро премьера · через 7 ч 52 мин» (идёт сейчас — «● Премьера сейчас»). Строка отсчёта отдельно не дублируется.
2. «Напомнить» — компактная кнопка (не на всю ширину, 40 высотой).
3. Карточка сетки «2 колонки»: закладка уходит с обложки в правый край строки меты (круг 28 под обложкой), обложка чистая: длительность и ничего больше.
4. Образцы `video.html` (шапка) и `video-redesign.html` (сетка) приведены к этому ДО кода; сторожа обновлены.

## Scope

In scope: `docs/design/v2-app/video.html`, `docs/design/v2-app/video-redesign.html`, `components/youtube/YoutubePremiereHero.tsx`, `components/youtube/YoutubeVideoGridCard.tsx`, тесты `youtube_preview_layout_contract`, `lingman_videos_catalog_contract`, `video_tab_liquid_glass_source_contract`.

Out of scope: логика избранного/напоминаний, данные каталога, `YoutubeVideoCard.tsx`, экран ролика, `video-favorites-mockup.html` (снимок прежнего состояния).

## Architecture

Только вёрстка двух компонентов. Тестовые идентификаторы `youtube-premiere-countdown`, `-remind`, `-thumbnail`, `-details`, `video-save-<id>` сохраняются. Новый `youtube-premiere-state` теперь в блоке под обложкой (сторож обновлён).

## Security and privacy

Не применимо: данные не меняются.

## Technical debt

- Строка меты в сетке получает минимальную высоту 28 (круг закладки) — карточки на 14 px выше, зато одинаковой высоты. Accept.

## Verification

- `babel.parseSync` изменённых .tsx;
- тесты-сторожа видео через светофор (`slot.sh run`);
- склейка «макет | эмулятор» — через Сверку (самопроверка исполнителя не засчитывается).

## Rollback

`git revert` коммита: образцы, два компонента и тесты возвращаются вместе.
