# Task packet: окно решения модерации наборов — термины как в остальном приложении (vi, pl)

Governance-ID: TG-45D905CB16A4
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: координатор 13.10 (Дизайн 6358e4b99 написал переводы сам)

## Outcome

Человек видит в окне модерации то же слово «набор», что во всём разделе Карточек: vi — «bộ thẻ» (не «gói»), pl — «zestaw»
(не «pakiet»). Остальные языки уже совпадают (pt-BR pacote, id paket, tr paket, en pack).

## Scope

In scope: `app/community_packs/community_moderation_copy.ts` (строки vi и pl). Out of scope: ru/uk/es/en/pt-BR/id/tr — совпадают.

## Architecture

No architecture change: только строки в чистом модуле текстов.

## Security and privacy

Не касается.

## Technical debt

- Accept temporarily: переводы vi/pl/tr/id/pt-BR носителем не проверены (как и остальные в приложении); владелец — Ядро.

## Verification

Тест community_moderation_copy зелёный; опрос терминов по коду (vi «bộ thẻ» ×30+, pl «zestaw» ×20+).

## Rollback

Откат одного коммита.
