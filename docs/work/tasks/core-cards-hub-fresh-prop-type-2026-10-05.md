# Task packet: полная проверка типов — поле fresh попало внутрь типа labels (CardsHubV2)

Governance-ID: TG-9440AA2CA4CB
Status: In progress (решено по рекомендации: координатор ждёт зелёную полную проверку типов для монет v3.1)
Owner: сессия 1 · ЯДРО

## Outcome

Полная проверка типов 05.10 11:54 дала 2 ошибки, обе от одной причины. В коммите 787f73028 (хаб новичка
cards-section-003) поле `fresh?` вставили внутрь `labels: Readonly<{ … trainA11y: string`, а не в `Props`. В итоге
FlashcardsHubScreen передаёт `fresh`, которого у Props нет (TS2322), а CardsHubV2 деструктурирует его (TS2339).
Фикс: закрыть `labels` как было до коммита (`trainA11y: string }>;`) и оставить `fresh?` полем Props.

## Scope

app/flashcards/CardsHubV2.tsx — только объявление типа Props. Логика и вёрстка не меняются.

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

Сборщик (babel) такие ошибки не ловит: в рантайме всё работало, сломаны были только типы. Ловит только полная
проверка типов, а её регулярно снимает сторож памяти. Отсюда класс «HEAD с ошибками типов живёт часами».

## Verification

Полная проверка типов: 0 ошибок. Сторожа хаба карточек (fc_cards_hub_entry_contract и node-сторожа).

## Rollback

git revert коммита.
