# Task packet: звуки V2 уважают речь (озвучку) — условие включения sound_v2

Governance-ID: TG-60983217A76D
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: поручение координатора 15.10 — `audio_never_permanently_silent_contract` красный на `modules/sound_v2/sound_v2_runtime.ts`

## Outcome

Эффекты V2 не перебивают озвучку фраз (TTS) и не звучат поверх неё: пока идёт речь (spokenActive) и ещё 250 мс после неё, банк молчит и пишет причину `voice_active`; начало речи гасит играющие эффекты сразу. Сторож «ни один источник звука не играет мимо владения» зелёный, а исключение для рантайма V2 записано с причиной и подкреплено проверкой, что рантайм действительно сверяется с речью.

## Scope

In scope: `modules/sound_v2/sound_bank.ts` (причина `voice_active`, гашение при начале речи), `modules/sound_v2/sound_v2_runtime.ts` (признак речи + пауза 250 мс), `tests/audio_never_permanently_silent_contract.test.ts` (запись исключения с причиной), тесты `sound_v2_*`.

Out of scope: сам арбитр `sound_arbiter.ts`, флаг sound_v2, каталог звуков.

## Architecture

Эффекты V2 — тот же класс, что `expo_sfx_backend.ts` (короткие UI-звуки, намеренно микшируются, владение речью им не нужно: если бы они брали `claimSpokenAudio`, они бы останавливали озвучку). Границу даёт общая картина активности звука (`audio_activity`) — те же сигналы, что у SoundArbiter (запись, речь, пост-речевая пауза 250 мс).

## Security and privacy

Микрофон: эффект не должен попадать в запись — условие `quiet_recording` сохраняется. Данных пользователя нет.

## Technical debt

Pay now: эффекты V2 мимо проверки речи — закрыто. Contain: владелец звука решает, нужен ли V2 отдельный лимит одновременных звуков (сейчас потолок 12 плееров).

## Verification

`npm run test:one` по слоту: `audio_never_permanently_silent_contract`, `sound_v2_bank`, `sound_v2_wiring`, `sound_v2_single_path_guard`, `sound_v2_recent_dedupe`, `sound_v2_singleton`, `sound_v2_catalog`; строго «N passed».

## Rollback

git revert коммита.
