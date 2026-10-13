# Task packet: settings-gap-034 — подпись голоса в «Обучении» без сырого id и без переноса названия строки

Governance-ID: TG-C75684E553C3
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: settings-gap-034 (кадр Сверки 12.10 18:31), прежняя правка 59ba4d58d (12.10 22:28)

## Outcome

Строка «Голос озвучки (EN)» показывает человеческое короткое имя голоса («Австралия · 2» — язык уже в названии строки;
настоящее имя вроде «Samantha» — как есть), название строки не переносится на две строки (вёрсткой, без сжатия шрифта).

## Scope

In scope: `app/flashcards/voice_display_name.ts` (компактный вид), `app/flashcards/tts_voices.ts` (`voiceTitle` с опцией),
`app/settings_edu.tsx` (вызов + вёрстка строки), тесты. Out of scope: экран выбора голоса (там полный вид «язык (регион)»).

## Architecture

No architecture change: чистая функция подписи получает опцию `compact`.

## Security and privacy

Не касается.

## Technical debt

- Contain: на очень узких экранах значение справа переносится (text-integrity), название — нет.

## Verification

Тесты подписи (`voice_display_name`, `settings_edu_voice_label_lang_contract`); лог `[VOICE-NAME]` с полем compact; Сверка — пересъёмка settings-gap-034.

## Rollback

Откат коммита.
