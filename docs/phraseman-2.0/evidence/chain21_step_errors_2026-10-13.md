# Ошибки шагов chain21 (Сверка, 13.10) — id → шаг → что на экране/в журнале

Снято роботом `parity_batch_shoot` по DEV_LINKS_R1.md (+тема). «Выполнено до сбоя» — шаги, прошедшие по журналу робота.

| id | route (next=) | выполнено до сбоя | сбойный шаг / ошибка |
|---|---|---|---|
| dialogs-015 | /ai_dialog_home | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:He | error 14124мс step_target_not_found:#dialogue-v2-translate-*+ждали_metro_3мс |
| dialogs-016 | /ai_dialog_home | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-prepared-bot-voice-*;  | error 16694мс step_target_not_found:#dialogue-v2-prepared-bot-voice-*+ждали_metro_3мс |
| dialogs-019 | /ai_dialog_home | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:He | error 14093мс step_target_not_found:#dialogue-v2-why-*+ждали_metro_2мс |
| dialogs-020 | /ai_dialog_home | tap:#dialogue-v2-world-toggle-*; tap:#dialogue-v2-catalogue-row-*; tap:#dialogue-v2-briefing-start; wait:3000; tap:#dialogue-v2-session-input; type:He | error 14298мс step_target_not_found:#dialogue-v2-why-*+ждали_metro_4мс |
| practice-001 | /flashcards_blitz_session?deck=saved%26sec=60 | wait:4000; await:#fc-blitz-opt-target; не выполнен: Error: step_target_not_found:#fc-blitz-opt-target | error 16459мс step_target_not_found:#fc-blitz-opt-target+ждали_metro_4мс |
| practice-002 | /flashcards_blitz_session?deck=saved%26sec=60 | wait:4000; await:#fc-blitz-opt-target; не выполнен: Error: step_target_not_found:#fc-blitz-opt-target | error 13920мс step_target_not_found:#fc-blitz-opt-target+ждали_metro_2мс |
| practice-003 | /flashcards_blitz_session?deck=saved%26sec=60 | wait:4000; await:#fc-blitz-opt-target; не выполнен: Error: step_target_not_found:#fc-blitz-opt-target | error 15924мс step_target_not_found:#fc-blitz-opt-target+ждали_metro_2мс |
| system-010 | /(tabs)/home | wait:2000 | blank_too_long 9692мс marker+шагов_1+пусто_6_повторов+ждали_metro_3мс |
| system-015 | /(tabs)/home | wait:1500; tap:#home-app-messages-button; не выполнен: Error: step_target_not_found:#home-app-messages-button | error 14136мс step_target_not_found:#home-app-messages-button+ждали_metro_2мс |
| results-009 | /streak_stats | wait:1500; see:#stats-activity-365; не выполнен: Error: step_target_not_found:#stats-activity-365 | error 13501мс step_target_not_found:#stats-activity-365+ждали_metro_3мс |
| mistakes-panel-021 | /mistakes_hub | wait:1500; tap:#mistakes-hub-start; wait:800; tap:#mistakes-hub-sheet-start; wait:2500; tap:#mistake-practice-menu | error 11448мс step_target_not_found:#mistake-practice-menu+ждали_metro_5мс |
| coins-004 | /coin_rank | wait:1500; tap:#coin-rank-upgrade; await:#coin-rank-pending-spinner; не выполнен: Error: step_target_not_found:#coin-rank-pending-spinner | error 13285мс step_target_not_found:#coin-rank-pending-spinner+ждали_metro_4мс |
| video-004 | /lingman_videos | wait:2500; see:#youtube-premiere-live; не выполнен: Error: step_target_not_found:#youtube-premiere-live | error 19896мс step_target_not_found:#youtube-premiere-live+ждали_metro_3мс |

Пояснения: step_target_not_found = на экране на момент шага нет элемента с таким testID (экран другой, элемент не смонтирован, либо шаблонный testID не совпал). system-010: кадр был пустым 6 повторов (blank_too_long) — приложение осталось на тёмном/пустом экране после `errorscreen=on`.
