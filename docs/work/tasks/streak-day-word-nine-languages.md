# Task packet: форма слова «день» в рубежах серии — языковой объект на 9 языков

Governance-ID: TG-CA233622B541
Status: Planned
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: сторож переводов `scripts/scan_i18n_design_zone.mjs` (Ядро 89c443d86); поручение координатора 15.10 — вносить после сигнала Сверки «№7 снят»

## Outcome

`streakDayWord` в `components/streak/moments/streak_moments_strings.ts` берёт формы слова «день» из языкового объекта на все девять языков (ru, uk, en, es, pt-BR, vi, id, tr, pl) вместо русских/украинских литералов в `switch`; сторож переводов перестаёт считать 6 литералов в этом файле; поведение (выбор формы по числу) не меняется.

## Scope

In scope: `components/streak/moments/streak_moments_strings.ts` (функция `streakDayWord` и таблица форм); тест `tests/streak_moments_v3_contract.test.tsx` как проверка неизменности.

Out of scope: тексты рубежей (TITLES и др. — уже девятиязычные), чужие таблицы строк, сам сторож.

## Architecture

No architecture change: таблица `Record<Lang, [one, few, many]>` и тот же выбор по правилам множественного числа (ru/uk — три формы, pl/en/es/pt-BR — две, vi/id/tr — одна).

## Security and privacy

Только строки интерфейса.

## Technical debt

Pay now: литералы вне переводчика.

## Verification

`node scripts/scan_i18n_design_zone.mjs` — в списке нет `streak_moments_strings.ts`; `tests/streak_moments_v3_contract.test.tsx` — «N passed» по слоту.

## Rollback

git revert коммита.
