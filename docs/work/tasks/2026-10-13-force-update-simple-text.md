# Task packet: окно обязательного обновления — простой текст на 9 языках (D168); чистка после R1 (D169)

Governance-ID: TG-3AB9E6EEAC1E
Status: In progress
Owner: сессия «3 · Макеты» по поручению координатора (решение владельца)
Related epic/enabler: untranslated-ui-to-zero, components/ForceUpdateGate.tsx (зона Авторизации)

## Outcome

1. ForceUpdateGate (режим force): на всех 9 языках простой текст «Вышла новая версия PhraseMan. Обнови приложение, чтобы продолжить.» вместо текста маскота; отдельная ветка для ru и её пометка i18n-ok больше не нужны.
2. 03_DECISIONS.md: D168 — простой текст окна обновления (владелец 13.10); D169 — чистка после R1: неподключённые ModeDemoPlayer.tsx и ExamResultPreviewAdminModal.tsx не удаляются до сборки, удаляются после R1 (как D91), до того — исключения сторожа переводов.

## Scope

In scope: components/ForceUpdateGate.tsx (только функция defaultBody, коммит патчем своих хунков), docs/phraseman-2.0/03_DECISIONS.md (две строки).

Out of scope: заголовок и кнопка окна, режим optional, логика гейта.

## Architecture

No architecture change: замена текста в triLang.

## Security and privacy

Данных пользователей нет.

## Technical debt

Contain: удаление двух неподключённых файлов — после R1 (D169).

## Verification

Синтаксис файла — разбор TypeScript по одному файлу; сторож переводов не растёт; длина текста сверена с окном (текст короче прежнего маскота).

## Rollback

Откат коммита.
