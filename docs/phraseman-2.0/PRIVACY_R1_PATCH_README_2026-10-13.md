# Патч политики конфиденциальности R1 — как применить после «да» владельца (вопрос 13)

Патч: `docs/phraseman-2.0/PRIVACY_R1_PATCH_2026-10-13.diff` (собран из HEAD 13.10; НЕ применён).
Обоснование и тексты ru/en — `PRIVACY_R1_GAPS_2026-10-13.md`.

## Что меняет (4 файла: `legal/` — исходник, `app/legal/` — копия в приложении; основная и iOS-версии одинаково)

| Правка | Раздел | Суть |
|---|---|---|
| П-1 | §10 Support diagnostics | «lets you view the entries» → «lets you view the **most recent** entries» (форма показывает последние 12) |
| П-2 | §13 Voice | новый абзац: запись голоса в Диалогах только во временной папке телефона, Knowly её не получает; уходит распознанный текст; на Android — системный распознаватель (может быть Google) |
| П-3 | §20 Deletion | новый абзац: после удаления — минимальная запись (хэши идентификаторов, дата, причина); на время 14 дней — сама заявка |
| П-3б | §19 Retention | строка: минимальная запись о выполненном удалении хранится |
| дата | вступление | «Last updated: October 12, 2026» → «October 13, 2026» (если применяете позже — поправьте дату в обоих файлах; сторож `legal_copies_sync_contract` требует одинаковую дату у основной и iOS-версии) |

Политика только на английском — переводов для Ядра нет. Русский текст в `PRIVACY_R1_GAPS` — для владельца, не для публикации.

## Команды

```bash
git apply --check docs/phraseman-2.0/PRIVACY_R1_PATCH_2026-10-13.diff
```

```bash
git apply docs/phraseman-2.0/PRIVACY_R1_PATCH_2026-10-13.diff
```

```bash
npm run legal:sync
```

`legal:sync` ничего не публикует: перезаписывает локальные копии — `privacy.html`, `admin/oauth-privacy.html`, `admin/v2/oauth-privacy.html`,
`knowly-www/legal/privacy/index.html`, `knowly-www/legal/privacy-ios/index.html`. Проверка после него:

```bash
npm run test:one -- tests/legal_copies_sync_contract.test.ts tests/support_diagnostics_privacy_contract.test.ts tests/aa_guest_honesty_contract.test.ts
```

Публикация сайта (`hosting:knowly-www`) и админки — отдельным шагом, по решению владельца.

## Откат до публикации

```bash
git apply -R docs/phraseman-2.0/PRIVACY_R1_PATCH_2026-10-13.diff
```
