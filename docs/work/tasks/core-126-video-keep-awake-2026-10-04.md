# Task packet: §126 п.9 — видео гаснет через 5 минут

Governance-ID: TG-94EA8E61CB15
Status: Done (keep-awake); позиция — отдельно
Owner: Ядро

## Outcome
Пока видео играет, экран не засыпает: удержание экрана (expo-keep-awake, уже в зависимостях) берётся вместе с арендой звука видео и снимается вместе с ней (пауза, конец, вытеснение, размонтирование). Раньше удержания не было нигде — экран гас по системному таймауту (~5 мин).

## Scope
components/youtube/YoutubeInlinePlayer.tsx.

## Architecture
Тот же жизненный цикл, что audioClaimRef: activateKeepAwakeAsync(tag) при взятии аренды, deactivateKeepAwake(tag) в releaseAudioClaim. Тег по videoId — несколько плееров не мешают друг другу.

## Security and privacy
Без данных.

## Technical debt
«Не помнит позицию»: последней позиции нигде нет (publishYoutubePosition — только живая шина для подсветки фраз). Сохранение позиции по videoId + старт с неё — отдельной задачей.

## Verification
Тесты плеера/видео, typecheck.

## Rollback
Откат коммита.
