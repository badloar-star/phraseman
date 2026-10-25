# Task packet: политика — «Where available in the app» перед фразой о немедленном удалении (5 · ВХОД)

Governance-ID: TG-339335EADFCC
Status: In progress
Owner: 5 · ВХОД И АККАУНТ (решение координатора по замечанию Ревизора к 7868dd51c; владелец спит)

## Outcome

Фраза в legal/privacy_policy_en*.json: «Where available in the app, you can also choose to delete your account immediately; in that
case your data is deleted right away and cannot be restored.» — честно до запуска экрана варианта Б (флаг выкл) и сервера 713677ddd.
legal:sync → app/legal (байт в байт с legal), privacy.html, admin oauth-privacy, knowly-www. Сайт НЕ публикуется. После
включения флага вместе с сервером «Where available in the app» можно убрать.

## Scope

legal/privacy_policy_en.json, legal/privacy_policy_en_ios.json и выход legal:sync.

## Architecture

Нет изменений кода.

## Security and privacy

Юридическое обещание не опережает поведение.

## Technical debt

Убрать оговорку при запуске.

## Verification

legal_copies_sync_contract и сторожа политики; app/legal = legal байт в байт.

## Rollback

git revert.
