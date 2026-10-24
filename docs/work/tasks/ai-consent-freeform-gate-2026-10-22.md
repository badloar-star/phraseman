# Task packet: окно согласия на ИИ перед «Свободным разговором»

Governance-ID: TG-E4950F05271C
Status: Done — проверено (30 + 2 набора; чужие красные: dev_intro_consent_preview, dialogue_v2_plus_tools)
Owner: 5 · ВХОД И АККАУНТ (координатор 22.10; тексты — 10 · ПЕРЕВОДЧИК, cebe1bbe1, пакет ai-dialog-consent-copy-free-mode-2026-10-22.md)

## Outcome

«Свободный разговор» (app/dialogue_v2_freeform.tsx) открывается только после согласия на ИИ, как сценарные сессии и компаньон:
экран целиком за общим шлюзом AiDialogConsentGate. В окне — своё вступление introductionFree (9 языков Переводчика). Если сервер
ответит ai_consent_required, экран снова показывает окно согласия, а не «недоступно». Логи [AI-CONSENT] на каждом решении.
Сторож: каждый вход ИИ — через шлюз или окно согласия.

## Scope

- components/AiDialogConsentModal.tsx — проп mode ('scenario' | 'free'), introductionFree.
- app/ai_dialog_consent_gate.tsx — проп mode, логи [AI-CONSENT], повторный запрос согласия по ответу сервера (контекст).
- app/dialogue_v2_freeform.tsx — экран за шлюзом (mode="free"); ответ ai_consent_required → повторный запрос.
- app/dialogue_v2_freeform_client.ts — причина ai_consent_required.
- tests/ai_entry_consent_gate_contract.test.ts — сторож.

## Architecture

Шлюз уже монтирует экран ИИ только после согласия (сессия не стартует, сеть не трогается). Свободный разговор становится его
ребёнком: внешний маршрут = шлюз, внутренний компонент = прежний экран. Повторный запрос — через React-контекст шлюза.

## Security and privacy

Новых данных нет. Текст окна совпадает с политикой (раздел ИИ: «free-form companion chat», распознанный текст уходит в OpenAI,
запись голоса остаётся на телефоне) — сверено Переводчиком. Серверной проверки согласия у freeform-функций пока нет — клиентская
обработка ai_consent_required готова к ней (передано координатору).

## Technical debt

Сервер не проверяет согласие в dialogue_v2_freeform_callable — отдельная задача Ядра.

## Verification

babel.parseSync, срез типов, тесты шлюза/окна/свободного разговора, новый сторож, тесты «ты» и текстов.

## Rollback

git revert коммита: свободный разговор снова без шлюза.
