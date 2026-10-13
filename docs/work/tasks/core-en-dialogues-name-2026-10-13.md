# Task packet: одно английское название раздела «Dialogues»

Governance-ID: TG-444AC661B671
Status: Done
Owner: Ядро (сессия 1)
Related: координатор 13.10; EN_PASS_RESULT_R1_AUTH_2026-10-13.md; STORE_RELEASE_NOTES_2_0_DRAFT.md («Dialogues»)

## Outcome

Раздел по-английски везде называется «Dialogues», как во вкладке, на Главной и в текстах для магазинов: «Source: Dialogs» →
«Source: Dialogues», «Spanish/German/French AI dialogues are still being reviewed» → «… dialogues …», «AI dialogues with no daily counter» →
«Dialogues with no daily counter». В окне согласия на ИИ и в ограничении по возрасту «AI dialogues» оставлено НАМЕРЕННО: там речь
о том, что это ИИ (раскрытие для согласия и проверки магазина), и русский текст там тоже «AI-диалоги».

## Scope

In scope: app/flashcards/source_labels.ts, app/ai_dialog_target_gate.ts, components/paywall/PaywallProofCards.tsx (только en).
Out of scope: окно согласия, ограничение по возрасту, другие языки.

## Architecture

No architecture change.

## Security and privacy

Раскрытие ИИ в согласии сохранено.

## Technical debt

- Нет.

## Verification

Сканеры переводов; поиск оставшихся «AI dialog» в en.

## Rollback

Откат коммита.
