# Task packet: моя доля остатка английских строк — два настоящих пропуска и пара `имяRu`/`имяEn` в одном объекте

Governance-ID: TG-B0A889B5491F
Status: Done
Owner: 5 · АВТОРИЗАЦИЯ (раздел файлов с 1 · Ядро, приказ координатора 12.10)
Related epic/enabler: английский интерфейс в R1 (владелец п.76)

## Outcome

Английский интерфейс перестаёт показывать русский в двух местах: тост «Не хватает энергии» в меню урока (не было `messageEn`) и
подпись кнопки «Сообщить об ошибке» на интро урока для экранного диктора (была только по-русски). Сторож признаёт переводом пары
`titleRu`/`titleEn`, `goalRu`/`goalEn`, `nextStepHintRu`/`nextStepHintEn` — тем же строгим правилом, что тосты: английский того же имени
в том же объекте и непустой.

## Scope

In scope: `app/lesson_menu.tsx` (messageEn у одного тоста), `app/lesson_intro_screens.tsx` (accessibilityLabel через triLang, 9 языков),
`scripts/untranslated_ui_positional.mjs` (вид пары — любое имя, не только message/label), `tests/untranslated_ui_positional.test.mjs`.

Out of scope: `app/flashcards_blitz_session.tsx` (чужие незакоммиченные правки), `app/dev-account-v2-ios-proof.tsx` (служебный dev-экран —
отдельное решение), файлы Ядра.

## Architecture

No architecture change: тексты и правило скрипта проверки. Инвариант сторожа: пара засчитывается только при английском ТОГО ЖЕ имени
в том же объекте, непустом и без кириллицы.

## Security and privacy

Не затрагивает данные, сеть, авторизацию: тексты интерфейса и скрипт проверки.

## Technical debt

- Pay now: два настоящих пропуска перевода.
- Accept temporarily: в тосте меню урока нет pt-BR/vi/id/tr/pl (были и раньше) — триггер показа тоста отдаёт ru-фолбэк; владелец — Ядро (тексты).

## Verification

- `node --test tests/untranslated_ui_positional.test.mjs`.
- Отчёт сканера: исчезают lesson_menu, lesson_intro_screens, ai_dialog_session; новых находок нет.
- Проверка синтаксиса двух экранов (transpile).

## Rollback

`git revert` коммита: тексты и правило возвращаются, данных не касается.
