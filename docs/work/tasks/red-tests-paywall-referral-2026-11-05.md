# Красные тесты зоны Paywall/рефералы/вход (ночной выпуск 05.11, поручение координатора)

Governance-ID: TG-3ADA823F057B
Governance-ID: TG-5F4453567B5D
Status: В работе
Owner: «5 · ВХОД»

## Outcome

Красные тесты моей зоны приведены в соответствие с принятым состоянием кода или вынесены в KNOWN_ISSUES с названием владельца. Код приложения не меняется.

## Scope

`tests/registration_prompt_responsive_contract.test.ts`, `tests/paywall_m_flag_fork_2026_10_25.test.ts`, `tests/paywall_context_headline_contract.test.ts` (language_add без пилюли — по таблице макета `docs/design/v2-app/paywall-context-texts.md` строка 27), устаревшая строка флагов в `tests/referral_ladder_2026_10_29.test.tsx` (патч на HEAD), `docs/work/release/KNOWN_ISSUES_2026-11-05.md` (дописать про осиротевшую WIP лесенки: `compactFriends`, `friends.tsx`).

## Architecture

Тесты фиксируют уже принятые решения: нативный пейвол C (единый путь, 32e96110a), лог на раннем выходе «Позже», отсутствие пилюли у `language_add`. WIP лесенки (compactFriends, пять строк «Как это работает», вход «Ввести код друга») зависит от чужих незакоммиченных правок `app/(tabs)/friends.tsx`, флаг `referral_ladder_enabled` по умолчанию выключен → в сборку не берём.

## Security and privacy

Данные не затрагиваются.

## Technical debt

Лесенка рефералов (WIP) и light_accent_graphics_ratchet на ней — в KNOWN_ISSUES до решения владельца WIP.

## Verification

Точечный прогон перечисленных тестов; полный прогон — у координатора.

## Rollback

Откат коммитов тестов.
