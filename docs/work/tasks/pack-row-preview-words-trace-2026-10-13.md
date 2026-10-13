# Task packet: cards-v2-025 — в строке набора каталога один чип слова вместо трёх (сначала журнал)

Governance-ID: TG-1A795F0251B2
Governance-ID: TG-77FED0458FF9
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по команде координатора («сначала лог, что приходит в строку»)
Related epic/enabler: components/packs/packDeckModel.ts (`packDeckWords` читает `pack.previewWords`), app/dev_state_cards_demo.ts (DEMO_COMMUNITY: по 3 слова)

## Outcome

В журнале видно, сколько слов реально приходит в строку набора каталога (`previewWords`: есть ли поле, длина, слова), откуда набор (каталог в памяти, диск, сеть, dev-подмена), и сколько чипов нарисовано. По журналу — вердикт: данные (в строку пришло 1 слово) или вёрстка (пришло 3, нарисован 1). Починка — после журнала.

## Scope

In scope: журнал в app/flashcards/FlashcardsCategoryHub.tsx (`CommunityPackRowBase`, один раз на набор и длину) и в app/community_packs/communityFirestore.ts (`seedCommunityCatalogForDev`: длины previewWords в итоговой строке), без смены поведения.

Out of scope: правка вёрстки/данных до получения журнала.

## Architecture

No architecture change: диагностический журнал, дедупликация по `id:длина`, потолок строк за запуск.

## Security and privacy

В журнал — id набора и слова превью из карточек публичного/демо-набора; персональных данных нет.

## Technical debt

Pay now: «механизм есть, а данных не дали» — класс бага, который лечится журналом на входе строки.

## Verification

Строки `[PACK-DECK]` из прогона Сверки по cards-v2-025 (`catalog=demo`).

## Rollback

git revert коммита.
