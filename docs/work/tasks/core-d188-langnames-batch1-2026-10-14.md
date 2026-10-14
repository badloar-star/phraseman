# Task packet (пачка 1, коммит 20:30): D188-следствие — название изучаемого языка в интерфейсе берётся из studyTarget

Governance-ID: TG-70277DC71C67
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: D188 (все 5 языков открыты); владелец 14.10 «У НАС ЖЕ НЕ ТОЛЬКО АНГЛИЙСКИЙ ЯЗЫК, ПРАВДА»

## Outcome

Ни один видимый текст интерфейса (кроме поверхностей, существующих только для английского: уроки, экзамены, диагностика)
не называет изучаемый язык «английским / по-английски / English», если человек учит es/fr/de/it. Название берётся из
studyTarget через constants/study_language_words.ts (формы name/gen/adv на 9 языках интерфейса). Мужской род
(«говорил») убран нейтральной формулировкой. Сторож: для каждого из 5 изучаемых языков в строках затронутых поверхностей нет
чужого названия языка. Онбординг — только текст, вид заморожен. Шуточные тексты — нейтрально и со смыслом, тон сохранён.

## Scope

Сегодня: онбординг (clean_onboarding_copy_core/_language, aha_scenes), Главная (home.tsx, home_feature_tips), пуши
(notifications.ts), Plus (paywall_profile — свой хунк, окно согласовать с Авторизацией), Диалоги (ai_dialog_scenarios,
ai_dialog_briefing_copy, ai_companion_session), Карточки (flashcards_say_it_copy, community_pack_create), Ошибки
(practiceCopy, mistake_practice_session), настройки (settings_edu). Завтра: шаринг, ачивки, друзья, «под вопросом».
17.10: functions/src/gift_certificate_phrases.ts. Инвентарь — docs/phraseman-2.0/D188_LANG_NAMES_INVENTORY_2026-10-14.md.
Out of scope: учебный контент, *_target_gate (уже по языку), названия языков в списках выбора, внутренние промпты.

## Architecture

Одна таблица слов; поверхности получают studyTarget из уже существующего контекста (StudyTargetContext / peek), без новых
чтений. Строки-константы превращаются в функции (lang, studyTarget).

## Security and privacy

Данных не добавляется.

## Technical debt

Contain: ачивки/шаринг — завтра; сервер — к 17.10.

## Verification

Сторож по 5 языкам × затронутые поверхности; существующие стражи переводов и онбординга; типы затронутых файлов.

## Rollback

Вернуть константные строки из git (по пачкам, каждая пачка — свой коммит).
