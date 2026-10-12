# DEV_LINKS_LANG_SWITCH — смена языка без перезапуска (R1 п.3, Авторизация 13.10)

Файл генерируется: `python scripts/dev_links_lang_switch.py`. Руками не править.

**Как проходить (важно):** строки одной тройки (шаг 1/3, 2/3, 3/3 — номера подряд) идут ПОДРЯД, БЕЗ `force-stop` между ними — иначе это проверка
холодного старта, а не смены языка. `force-stop` — только перед первой строкой тройки. Кадр «б» должен быть целиком на новом языке:
любая русская строка на английском кадре (или наоборот) = прилипшая строка → строка журнала `[LANG-SWITCH]` / `[DEV-STATE] uiLang`
и путь экрана — Авторизации. `[I18N-FALLBACK]` в журнале = у строки нет английского. Шпиль на английском показывает экран
«закрыт для языка» — это правильно (п.76).

## Интерфейс: русский → английский → русский

| id | экран · состояние | ссылка | перед кадром | shot list | тапы | уникальна | образец |
|---|---|---|---|---|---|---|---|
| lang-switch-001 | Главная · 1/3 русский (исходный) | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&uiLang=off&next=/(tabs)/home` | force-stop |  | wait:1500 | нет |  |
| lang-switch-002 | Главная · 2/3 английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&uiLang=en&next=/(tabs)/home` | сразу после 001, без force-stop |  | wait:1500 | нет |  |
| lang-switch-003 | Главная · 3/3 снова русский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&uiLang=off&next=/(tabs)/home` | сразу после 002, без force-stop |  | wait:1500 | нет |  |
| lang-switch-004 | Уроки — список · 1/3 русский (исходный) | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&studyTarget=en&uiLang=off&next=/(tabs)/lessons` | force-stop |  | wait:1500 | нет |  |
| lang-switch-005 | Уроки — список · 2/3 английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&studyTarget=en&uiLang=en&next=/(tabs)/lessons` | сразу после 004, без force-stop |  | wait:1500 | нет |  |
| lang-switch-006 | Уроки — список · 3/3 снова русский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&studyTarget=en&uiLang=off&next=/(tabs)/lessons` | сразу после 005, без force-stop |  | wait:1500 | нет |  |
| lang-switch-007 | Диалоги — хаб · 1/3 русский (исходный) | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&coinRank=6&uiLang=off&next=/ai_dialog_home` | force-stop |  | wait:1500 | нет |  |
| lang-switch-008 | Диалоги — хаб · 2/3 английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&coinRank=6&uiLang=en&next=/ai_dialog_home` | сразу после 007, без force-stop |  | wait:1500 | нет |  |
| lang-switch-009 | Диалоги — хаб · 3/3 снова русский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&coinRank=6&uiLang=off&next=/ai_dialog_home` | сразу после 008, без force-stop |  | wait:1500 | нет |  |
| lang-switch-010 | Карточки — хаб · 1/3 русский (исходный) | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&cards=demo&plus=on&studyTarget=en&enStudyPrompt=off&uiLang=off&next=/flashcards` | force-stop |  | wait:1500 | нет |  |
| lang-switch-011 | Карточки — хаб · 2/3 английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&cards=demo&plus=on&studyTarget=en&enStudyPrompt=off&uiLang=en&next=/flashcards` | сразу после 010, без force-stop |  | wait:1500 | нет |  |
| lang-switch-012 | Карточки — хаб · 3/3 снова русский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&cards=demo&plus=on&studyTarget=en&enStudyPrompt=off&uiLang=off&next=/flashcards` | сразу после 011, без force-stop |  | wait:1500 | нет |  |
| lang-switch-013 | Карточки — сохранённые · 1/3 русский (исходный) | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&cards=demo&plus=on&studyTarget=en&enStudyPrompt=off&uiLang=off&next=/flashcards_collection?cat=saved` | force-stop |  | wait:1500 | нет |  |
| lang-switch-014 | Карточки — сохранённые · 2/3 английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&cards=demo&plus=on&studyTarget=en&enStudyPrompt=off&uiLang=en&next=/flashcards_collection?cat=saved` | сразу после 013, без force-stop |  | wait:1500 | нет |  |
| lang-switch-015 | Карточки — сохранённые · 3/3 снова русский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&cards=demo&plus=on&studyTarget=en&enStudyPrompt=off&uiLang=off&next=/flashcards_collection?cat=saved` | сразу после 014, без force-stop |  | wait:1500 | нет |  |
| lang-switch-016 | Настройки · 1/3 русский (исходный) | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&uiLang=off&next=/(tabs)/settings` | force-stop |  | wait:1500 | нет |  |
| lang-switch-017 | Настройки · 2/3 английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&uiLang=en&next=/(tabs)/settings` | сразу после 016, без force-stop |  | wait:1500 | нет |  |
| lang-switch-018 | Настройки · 3/3 снова русский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&uiLang=off&next=/(tabs)/settings` | сразу после 017, без force-stop |  | wait:1500 | нет |  |
| lang-switch-019 | Аккаунт · 1/3 русский (исходный) | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&uiLang=off&next=/account_details` | force-stop |  | wait:1500 | нет |  |
| lang-switch-020 | Аккаунт · 2/3 английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&uiLang=en&next=/account_details` | сразу после 019, без force-stop |  | wait:1500 | нет |  |
| lang-switch-021 | Аккаунт · 3/3 снова русский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&uiLang=off&next=/account_details` | сразу после 020, без force-stop |  | wait:1500 | нет |  |
| lang-switch-022 | Статистика и серия · 1/3 русский (исходный) | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=on&uiLang=off&next=/streak_stats` | force-stop |  | wait:1500 | нет |  |
| lang-switch-023 | Статистика и серия · 2/3 английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=on&uiLang=en&next=/streak_stats` | сразу после 022, без force-stop |  | wait:1500 | нет |  |
| lang-switch-024 | Статистика и серия · 3/3 снова русский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=on&uiLang=off&next=/streak_stats` | сразу после 023, без force-stop |  | wait:1500 | нет |  |
| lang-switch-025 | Мои ошибки · 1/3 русский (исходный) | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&mistakes=demo&studyTarget=en&uiLang=off&next=/mistakes_hub` | force-stop |  | wait:1500 | нет |  |
| lang-switch-026 | Мои ошибки · 2/3 английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&mistakes=demo&studyTarget=en&uiLang=en&next=/mistakes_hub` | сразу после 025, без force-stop |  | wait:1500 | нет |  |
| lang-switch-027 | Мои ошибки · 3/3 снова русский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&mistakes=demo&studyTarget=en&uiLang=off&next=/mistakes_hub` | сразу после 026, без force-stop |  | wait:1500 | нет |  |
| lang-switch-028 | Монеты · 1/3 русский (исходный) | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&coinRank=5&coins=12480&uiLang=off&next=/runes_wallet` | force-stop |  | wait:1500 | нет |  |
| lang-switch-029 | Монеты · 2/3 английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&coinRank=5&coins=12480&uiLang=en&next=/runes_wallet` | сразу после 028, без force-stop |  | wait:1500 | нет |  |
| lang-switch-030 | Монеты · 3/3 снова русский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&coinRank=5&coins=12480&uiLang=off&next=/runes_wallet` | сразу после 029, без force-stop |  | wait:1500 | нет |  |
| lang-switch-031 | Видео — канал · 1/3 русский (исходный) | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&videopacks=catalog&studyTarget=en&uiLang=off&next=/lingman_videos` | force-stop |  | wait:1500 | нет |  |
| lang-switch-032 | Видео — канал · 2/3 английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&videopacks=catalog&studyTarget=en&uiLang=en&next=/lingman_videos` | сразу после 031, без force-stop |  | wait:1500 | нет |  |
| lang-switch-033 | Видео — канал · 3/3 снова русский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&videopacks=catalog&studyTarget=en&uiLang=off&next=/lingman_videos` | сразу после 032, без force-stop |  | wait:1500 | нет |  |
| lang-switch-034 | Сообщество · 1/3 русский (исходный) | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&cards=demo&plus=on&studyTarget=en&enStudyPrompt=off&uiLang=off&next=/(tabs)/community` | force-stop |  | wait:1500 | нет |  |
| lang-switch-035 | Сообщество · 2/3 английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&cards=demo&plus=on&studyTarget=en&enStudyPrompt=off&uiLang=en&next=/(tabs)/community` | сразу после 034, без force-stop |  | wait:1500 | нет |  |
| lang-switch-036 | Сообщество · 3/3 снова русский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&cards=demo&plus=on&studyTarget=en&enStudyPrompt=off&uiLang=off&next=/(tabs)/community` | сразу после 035, без force-stop |  | wait:1500 | нет |  |

## Изучаемый язык: английский → испанский → английский

Кадр «б»: уроки, диалоги, карточки и Главная — для испанского (названия, фразы, наборы); ничего от английского не осталось.

| id | экран · состояние | ссылка | перед кадром | shot list | тапы | уникальна | образец |
|---|---|---|---|---|---|---|---|
| lang-switch-037 | Главная · 1/3 изучаю английский | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&studyTarget=en&next=/(tabs)/home` | force-stop |  | wait:2000 | нет |  |
| lang-switch-038 | Главная · 2/3 изучаю испанский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&studyTarget=es&next=/(tabs)/home` | сразу после 037, без force-stop |  | wait:2000 | нет |  |
| lang-switch-039 | Главная · 3/3 снова английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&studyTarget=en&next=/(tabs)/home` | сразу после 038, без force-stop |  | wait:2000 | нет |  |
| lang-switch-040 | Уроки — список · 1/3 изучаю английский | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=on&studyTarget=en&next=/(tabs)/lessons` | force-stop |  | wait:2000 | нет |  |
| lang-switch-041 | Уроки — список · 2/3 изучаю испанский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=on&studyTarget=es&next=/(tabs)/lessons` | сразу после 040, без force-stop |  | wait:2000 | нет |  |
| lang-switch-042 | Уроки — список · 3/3 снова английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=on&studyTarget=en&next=/(tabs)/lessons` | сразу после 041, без force-stop |  | wait:2000 | нет |  |
| lang-switch-043 | Диалоги — хаб · 1/3 изучаю английский | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&coinRank=6&studyTarget=en&next=/ai_dialog_home` | force-stop |  | wait:2000 | нет |  |
| lang-switch-044 | Диалоги — хаб · 2/3 изучаю испанский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&coinRank=6&studyTarget=es&next=/ai_dialog_home` | сразу после 043, без force-stop |  | wait:2000 | нет |  |
| lang-switch-045 | Диалоги — хаб · 3/3 снова английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=off&coinRank=6&studyTarget=en&next=/ai_dialog_home` | сразу после 044, без force-stop |  | wait:2000 | нет |  |
| lang-switch-046 | Карточки — хаб · 1/3 изучаю английский | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=on&studyTarget=en&next=/flashcards` | force-stop |  | wait:2000 | нет |  |
| lang-switch-047 | Карточки — хаб · 2/3 изучаю испанский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=on&studyTarget=es&next=/flashcards` | сразу после 046, без force-stop |  | wait:2000 | нет |  |
| lang-switch-048 | Карточки — хаб · 3/3 снова английский без перезапуска | `phraseman://dev_state?onboarding=done&intros=seen&overlays=off&plus=on&studyTarget=en&next=/flashcards` | сразу после 047, без force-stop |  | wait:2000 | нет |  |
