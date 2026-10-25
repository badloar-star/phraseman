# Цвета ролей во вступлении и «Скажи так»: английский / частица с подложкой / перевод / формула (подключение)

Governance-ID: TG-8AE765C6D857

## Outcome
Владелец 25.10 утвердил «МАКСИМУМ И ПОДЛОЖКА»: частица = particle (оттенок с «Максимума») + подложка accentSoft + жирный; английский = langText жирный; русский = gloss; «+ →» = mutedText. Координатор: одна чистая функция разбора текста на роли при показе (латиница → английский; служебные am/is/are, a/an/the, this/these, there, do/does, will, to, not; окончания -s/-es; «+/→» → формула), общая для абзацев вступления (части plain и bodyByLocale без частей) и ситуации «Скажи так»; в «Проверь себя» — без подсветки; разбор мемоизирован по строке; сторож + замок «цвета ролей из темы, частицы с подложкой».

## Scope
In scope: `app/learning_v2_intro_text_roles.ts` (разбор, кэш), `components/learning-v2/IntroRoleText.tsx` (показ), `constants/liquidGlassIntroTextRoles.ts` (роли по токенам активной темы), подключение в `app/learning_v2_session_intro.tsx` (IntroReaderParagraph, только роль plain) и `components/learning-v2/LearningV2TaskBody.tsx` (LearningV2SituationCard), сторож-замок, строка OWNER_LOCKS.
Out of scope: «Проверь себя», тексты курса, разметка частей, роли target/targetWrong/gloss/маркеры — как были.

## Architecture
splitIntroTextRoles(text) → сегменты {text, role: lang|particle|gloss|formula|plain}, кэш Map по строке (≤ 500 записей). IntroRoleText рисует вложенные Text: lang — langText 700, particle — particle 700 на accentSoft, gloss — gloss, formula — mutedText, plain (пробелы/знаки) — цвет перевода. Цвета — introTextRolesForTokens(g, themeId) с кэшем по токенам.

## Security and privacy
Не касается.

## Technical debt
Словарь служебных слов и правило окончаний — эвристика при показе; разметка курса (semantic) остаётся главнее.

## Verification
Юнит-тест разбора (служебные, -s/-es, формула, кириллица, кэш), контраст ролей — существующий intro_text_roles_contrast, тесты экранов вступления и ситуации.

## Rollback
Откатить коммит.
