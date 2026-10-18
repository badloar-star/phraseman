# Task packet: видео — «0д 7ч 52мин» → «Через 7 ч 52 мин», чистка заголовков «| |», строка ника «слишком часто», s32 (координатор)

Governance-ID: TG-94F6DD281332
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R07

## Outcome

1. Отсчёт премьеры показывает «Через 7 ч 52 мин» (и аналоги на 9 языках): без «0д» при нуле дней, с предлогом/словом «через», единицы отделены неразрывным пробелом, нулевые ведущие единицы опускаются.
2. Заголовки роликов из YouTube с пустыми разделителями («…АНГЛИЙСКИЙ | | Учим…») показываются чисто: «…АНГЛИЙСКИЙ | Учим…», без двойных пробелов. Чистка — только при показе (данные не меняются).
3. Строка для ника «Слишком часто, попробуй через минуту» на 9 языках — отдаётся Сайту ключом (файл ника у Сайта).
4. s32 — текст курса V2 (файлы у Codex): готовый текст передаётся координатору.

## Scope

In scope: `app/youtube_title_display.ts` (новый, чистка заголовка + отсчёт), `components/youtube/YoutubePremiereHero.tsx`, `YoutubeVideoCard.tsx`, `YoutubeVideoGridCard.tsx` — только вывод заголовка и строка отсчёта.

Out of scope: данные каталога, сервер, файлы V2, файл ника.

## Architecture

Новый маленький модуль без зависимостей от вида: `cleanYoutubeTitle(raw)` и `premiereCountdownText(lang, d, h, m, s)`. Компоненты вызывают его при рендере.

## Security and privacy

Не применимо.

## Technical debt

- Чистка на каждом рендере (дешёвые regex по строке ≤300 знаков) — Accept: заметной нагрузки нет; при желании — один раз в нормализаторе каталога после релиза.

## Verification

- `babel.parseSync` изменённых файлов;
- тесты-сторожа видео (`lingman_videos_catalog_contract`, `youtube_premiere_motion_contract`, `youtube_preview_layout_contract`) через светофор;
- `git diff --numstat` — только мои строки.

## Строка ника для Сайта (ключ `nickTooOften`)

«Слишком часто, попробуй через минуту»:
- ru «Слишком часто — попробуй через минуту»
- uk «Занадто часто — спробуй за хвилину»
- en «Too often — try again in a minute»
- es «Demasiado seguido: inténtalo en un minuto»
- pt-BR «Rápido demais — tente de novo em um minuto»
- vi «Đổi quá nhanh — hãy thử lại sau một phút»
- id «Terlalu sering — coba lagi semenit lagi»
- tr «Çok sık — bir dakika sonra tekrar dene»
- pl «Za często — spróbuj za minutę»

## s32 для Codex (файлы Learning V2)

en/l01/s32, задание 1 (сборка «We are proud»):
- ru «Ваша команда гордится готовой выставкой. Соберите фразу от имени всей команды»
- uk «Ваша команда пишається готовою виставкою. Складіть фразу від імені всієї команди»
- дубль: `prompt` и `localizedMeaning` одинаковые → плеер (`modules/learning-v2/modes/phrase_builder_mode_v1.tsx`, стр. 199/203) рисует фразу дважды; `prompt` лучше короткий «Соберите фразу» / «Складіть фразу».

## Rollback

`git revert <коммит>`.
