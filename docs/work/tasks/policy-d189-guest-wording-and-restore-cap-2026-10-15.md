# Task packet: «да» владельца 15.10 — PAYWALL_RESTORE_CAP + уточнение политики D189 (гость)

Governance-ID: TG-1C708496A1E0
Governance-ID: TG-1B38CC6691CB
Governance-ID: TG-562A38852E41
Governance-ID: TG-082BB10403BC
Status: В работе
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

1) Применить `docs/phraseman-2.0/handoff/PAYWALL_RESTORE_CAP.patch` (потолок ожидания у «Восстановить покупки», пакет
   `docs/work/tasks/paywall-restore-cap-2026-10-14.md`): git apply → два теста → safe_commit в окно кода.
2) Политика §19 и §20 (EN, обычная и iOS): «гость удаляется сразу» → «сразу — только когда сервер подтвердил, что Google/Apple не привязан;
   иначе обычные 14 дней» (соответствует коду D189 aadca729d + c1516a23e). `npm run legal:sync` разносит текст в app/legal, корневые
   privacy.html, admin/*oauth-privacy.html, knowly-www/legal/privacy(-ios). Страница data-deletion уже говорит «не позже конца 14 дней» — верно, не меняется.

## Scope

In scope: `legal/privacy_policy_en.json`, `legal/privacy_policy_en_ios.json` (+ сгенерированные копии через legal:sync); патч восстановления.
Out of scope: условия использования, другие разделы политики, сервер.

## Architecture

Текст — единственный источник `legal/*.json`, копии только через legal:sync (README legal/).

## Security and privacy

Правка делает текст политики точнее: обещание «сразу» больше не шире фактического поведения сервера.

## Technical debt

- Абзац про сторис (§3) и лестница итога недели (§5, вариант Б у Ядра) — отдельно.

## Verification

- Политика: в legal/ и копиях нет старых фраз; новая фраза в обоих вариантах; JSON валиден; legal:sync без ошибок.
- Патч: paywall_restore_cap_contract + paywall_init_cap_contract — N passed; babel-парс.
- Правки app/ — только когда Сверка не снимает прогон (Metro перезагрузка).

## Rollback

`git revert`.
