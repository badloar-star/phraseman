# Task packet: финальный проход — Apple на Android, лайк набора, «Ответ не пришёл» (координатор 06:04)

Governance-ID: TG-6CFE36F98E86
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R07

## Outcome

1. Ветка «Apple на Android без настройки» (d25a07fa2) показывает человеку «Вход через Apple на этом телефоне сейчас недоступен. Войди через Google.» на 9 языках — проверено в HEAD.
2. Строк с текстом для разработчиков (EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID, Services ID) в словарях нет — остались только комментарии и журнал; удалять нечего.
3. Новые строки с 05:10 (27 ключей): 9 языков, без заглушек и системных слов. Исправлен вьетнамский тост лайка набора: «Không thích được» читается как «не могу полюбить» → «Chưa thích được bộ thẻ. Hãy thử lại», снятие лайка → «Chưa bỏ thích được. Hãy thử lại».

## Scope

In scope: две vi-строки в `app/community_packs/CommunityPackSocialBar.tsx`.

Out of scope: логика лайка, другие языки (верны), файлы Авторизации.

## Architecture

No architecture change: меняется только текст.

## Security and privacy

Не применимо.

## Technical debt

- Новый долг не вносится: две строки текста на одном языке. Проверка остальных ~300 связок «слово + число» — после релиза (решение координатора 05:03).

## Verification

- `night2.mjs "2026-10-18 05:10"`: 27 ключей, 0 замечаний;
- `babel.parseSync` файла; поиск тестов со старым vi-текстом;
- `git diff --numstat` — только мои строки.

## Rollback

`git revert <коммит>`.
