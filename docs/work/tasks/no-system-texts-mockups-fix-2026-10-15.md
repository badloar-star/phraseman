# Task packet: 4 строки с системными словами по таблице C Макетов (9 языков)

Governance-ID: TG-A2DBBE42F464
Status: In progress
Owner: сессия «Специалист по переводам» (поручение координатора от Макетов, 15.10)
Related epic/enabler: правило владельца 15.10 «никаких системных текстов»; таблица C в
docs/phraseman-2.0/evidence/parity_moments_v1/NO_SYSTEM_TEXTS_MOCKUPS_2026-10-15.md (e9660c5c7)

## Outcome

Четыре места больше не говорят про «соединение» и «защитный маркер»: выход из аккаунта в Настройках, незаконченная смена аккаунта
(два места), отложенный код друга, баннер без сети. Тексты — от Макетов, на «ты», сразу на 9 языках.

## Scope

In scope: `app/(tabs)/settings.tsx` (строки 1516, 1600, 1815 — только тексты), `components/referral_code_sheet.tsx:128`,
`components/OfflineBanner.tsx:341`. Out of scope: вёрстка, логика, прочие строки этих файлов.

## Architecture

No architecture change: замена значений строк в существующих вызовах L()/triLang.

## Security and privacy

Не применимо: только видимые тексты.

## Technical debt

Нет новой. Сторож против системных слов — предложен координатору в no-system-texts-audit-2026-10-15.md.

## Verification

Сторожа i18n (i18n_missing_en_fallback, ru_strings_no_ukrainian_letters, untranslated_ui_positional) + тесты баннера и кода друга
через slot.sh; numstat при коммите — только свои строки.

## Rollback

`git revert` коммита — вернутся прежние тексты.
