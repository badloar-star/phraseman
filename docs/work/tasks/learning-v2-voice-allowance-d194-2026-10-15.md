# D194: цифра «осталось сегодня» на микрофоне голосовых заданий курса V2 (15.10)

Governance-ID: TG-E5AC34F88CAA

## Outcome
На кнопке микрофона (76) в голосовых заданиях курса V2 виден остаток дневных голосовых попыток по макету `docs/design/v2-app/learning-v2-voice-limit.html` (46d477ec5): Free — цифра, 0 — «PLUS» и приглушённый микрофон с подписью «Голос на сегодня закончился», тап ведёт на пейвол Plus; Plus и «неизвестно» — без цифры; при списании «тик» 420 мс. Решение владельца D194 (к сборке 16.10).

## Scope
Новый `components/VoiceAllowanceBadge.tsx`; необязательные свойства `allowance` у `app/flashcards/SpeakHoldButton.tsx` (без `allowance` поведение Карточек не меняется); вшивка в `app/learning_v2_direct_session_player_v1.tsx` (только свои строки — в файле незакоммиченные правки Codex 23/3). Счётчик и гейт — Ядро: `app/voice_daily_allowance.ts` (`useVoiceDailyAllowance`, `voiceDailyAllowanceGate`, `recordVoiceDailyAttempt`, `VOICE_LIMIT_PAYWALL_CONTEXT = 'ai_voice_input'`). Обычные Уроки не трогаем.

## Architecture
Хук Ядра отдаёт `{ kind: 'plus'|'limited'|'unknown', remaining, exhausted, limit }` синхронно из памяти (без чтений Firestore). Плеер: гейт в `startVoiceHold` (после проверок доступности кнопки), списание в момент первого `listening` попытки (`${interactionId}:${voicePanelEpoch}:${seq}`), при 0 — `router.push('/premium_modal', { context: 'ai_voice_input', source: 'learning_v2_course_voice' })`; сессия при 0 идёт дальше. Бейдж рисуется только при `kind === 'limited'`.

## Security and privacy
Данные не затрагиваются: счётчик уже хранится ключом `dialogue_v2_voice_attempts_v1` (входит в список стирания при выходе).

## Technical debt
Размеры текста бейджа по D145: цифра 16/20 (в макете 15), «PLUS» 13 (в макете 12) — макет подтянуть.

## Verification
Тест бейджа (цифра, PLUS, плюс/неизвестно без бейджа), контракт вшивки в плеер, тест `SpeakHoldButton` без `allowance` (Карточки как были).

## Rollback
Откат коммита.
