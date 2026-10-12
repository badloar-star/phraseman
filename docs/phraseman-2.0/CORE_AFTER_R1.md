# Ядро — работы после R1

Список того, что сознательно отложено до выхода R1 (не трогать до релиза). Ведёт сессия «1 · Ядро».

| # | Что | Почему ждёт | Источник |
|---|---|---|---|
| 1 | Удалить сцену онбординга «ага» (`components/onboarding_aha/` кроме `TypewriterText`, который нужен CleanOnboarding) **и её контракты** (`tests/onboarding_aha_*`, `speech_beat_audioend_session_lifecycle`, упоминания в `motion_allowlist_contract`, `speaking_hold_ui_contract`, `speech_na_surfaces_contract`, `reachable_action_buttons_contract`, `audio_runtime_ownership_contract`, `loud_playback_audio_mode_contract`, `speech_capture_*`, `informal_address_ru_uk_guard`) и аудио `assets/audio/onboarding_aha/` | сцена недостижима с 16.08 (f52b9d128); удаление большое и задевает 10+ сторожей — не перед релизом | координатор 12.10, вариант (1) |
| 2 | Режим чистых кадров без перезагрузок от чужих правок — но НЕ через `DevSettings.setHotLoadingEnabled` при старте (в bridgeless это само перезагружает JS → петля, откат f63d09e4a) | нужен способ, который ничего не переключает на старте; проверять одним холодным стартом на эмуляторе | координатор 12.10 |
