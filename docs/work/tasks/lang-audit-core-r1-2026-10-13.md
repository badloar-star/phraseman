# Task packet: аудит 9 языков интерфейса в зоне Ядра (LANG_AUDIT_CORE_R1) + перевод недостающего

Governance-ID: TG-078F2ADCE50A
Status: Done
Owner: Ядро (сессия 1)
Related: слово владельца 13.10 «исправить и починить интерфейс на других языках» (через координатора)

## Outcome

docs/phraseman-2.0/LANG_AUDIT_CORE_R1_2026-10-13.md: зона Ядра (уроки старые, меню/интро/теория/экзамен, энергия, Шпиль,
«Мои ошибки», заметки о выпуске) — неполные языковые объекты, кириллица вне переводов, рантайм [I18N-FALLBACK]. Настоящие
пропуски переводятся на все 9 языков (первый — «Подсказка» в конструкторе фраз теории WordBankBuilder).

## Scope

In scope: сканер scripts/scan_i18n_design_zone.mjs (только чтение, --json), правки строк в файлах зоны Ядра, отчёт.
Out of scope: Learning V2 (Codex), чужие зоны (Дизайн, Авторизация), учебный контент курса.

## Architecture

No architecture change.

## Security and privacy

Не касается данных.

## Technical debt

- Мёртвые модули с русскими запасными текстами (lesson_teaching_notes.ts, ENERGY_GATE_MESSAGES_*) — к удалению после R1.

## Verification

Сканер по зоне до/после; тест theory_word_bank (если есть) и сторож переводов.

## Rollback

Откат коммита.
