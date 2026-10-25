# Task packet: контраст панели голосового ответа по замеру Тем + проверка типов после e8aa1c456

Governance-ID: TG-7E81ED29F56C
Governance-ID: TG-4CA6BB5B47BA
Status: In progress
Owner: Learning V2 session; замер Тем efbcf6f17 (по поручению координатора), находка Ревизора по проверке типов

## Outcome

Пять давних мест SpeakingPanel читаются во всех темах: подсказка (textMuted), «нечётко» (янтарь через legibleOn к тексту шторки, ≥ 4,5),
звёзды «хорошо/почти» (тот же оттенок, ≥ 3:1 на карточке), «Готово» на зелёной заливке (correctText темы), значок «стоп» на красной
заливке (тон шторки, доведённый к белому до 4,5). Плюс 0 ошибок типов: speakingNoSpeechText принимает string (проп lang панели).

## Scope

Дополнение (Ревизор → координатор 25.10): таймаут судьи на короткой фразе — нейтральная подпись «не успел разобрать», «длинная фраза» только от 6 слов; threw/score_null — та же нейтральная, не «ближе к телефону».

components/SpeakingPanel.tsx, components/speaking_no_speech_copy.ts, тест-сторож. Оттенки и раскладка не меняются, только доводка контраста токенами.

## Architecture

legibleOn из constants/liquidGlassSurfaceRoles (тот же, что у тем). onCorrect — необязательное поле SpeakingPanelTheme из correctText
источника; старые вызовы inlineSpeakingResultColor без card/textPrimary дают прежний цвет.

## Security and privacy

Только цвета; данных нет.

## Technical debt

Тексты подписи «не успел разобрать» — черновики до Переводчика; порог «длинной фразы» 6 слов — по замеру, пересмотреть после журнала timeout.

## Verification

Тест speaking_panel_contrast_tokens; перемер Тем скриптом scripts/speaking_panel_contrast_measure.ts по хэшу.

## Rollback

Revert коммита.
