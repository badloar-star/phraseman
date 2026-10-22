# Task packet: Learning V2 — только голос телефона (TTS), без записей

Governance-ID: TG-E2B1B0EB7B15
Status: In progress
Owner: сессия Learning V2; слово владельца 22.10 через координатора: «…АУДИО … МЫ УБРАЛИ ВСЕ ИЗ ПРИЛОЖЕНИЯ И СМЕНИЛИ
НА ТТС! КАКОГО … ОНО СНОВА … КАК БЫЛО». План выкладки записей в Storage (HANDOVER 18.10) отменён этим словом.

## Outcome

В занятиях Learning V2 любой звук — голос телефона (системный TTS). Записи mp3 не играются, не готовятся и не грузятся.
Тесты 19.10 (learning_v2_system_tts_only, bundled_session_material) зелёные; старые тесты записей переписаны по смыслу.

## Scope

In scope: app/learning_v2_course_released_session_client_v3.ts (audioDelivery = device_system_tts_only, без audioChild),
app/learning_v2_direct_session_player_v1.tsx (без useAudioPlayer / playLocalAudio / resolve*Audio), связка 19.10 «только TTS»
([id].tsx, lessons.tsx, use_managed_spoken_audio_player, audio_session_coordinator + тесты), снятие живых импортов
single_voice / lesson_audio_index (bootstrap_audio_seed, LearningV2ChaptersCourse) — сами файлы чистит 5 · ВХОД.
Out of scope: content/** (Codex), генератор записей scripts/generate_learning_v2_factory_production_audio.mjs.

## Architecture

Единый путь звука в занятии: speakPreviewText → общий useAudio (systemTtsOnly, язык курса). Плеер записей и пакеты
записей из занятия уходят. Журнал [V2-AUDIO-TTS]: что озвучено, язык, длительность, сбой.

## Security and privacy

Голос телефона работает локально; новых данных и сетевых вызовов нет (наоборот, меньше загрузок).

## Technical debt

- Pay now: мёртвые пути записей удаляются из живого кода; файлы данных записей помечены 5 · ВХОД к удалению.

## Verification

tsc через слот; тесты звука/TTS/занятий; сторожа стиля.

## Rollback

git revert коммита возвращает записи первым источником.

Governance-ID: TG-ACC8778CE729

Governance-ID: TG-2AAD85B3ABA6
Governance-ID: TG-D3BAE8C492E1
Governance-ID: TG-34E226E9CD75

Governance-ID: TG-DA4C09C73C2C
