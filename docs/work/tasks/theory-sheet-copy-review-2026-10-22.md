# Task packet: строки шторки теории Learning V2 — вычитка 8 языков

Governance-ID: TG-19F996F2FC96
Status: In progress
Owner: «10 · ПЕРЕВОДЧИК»
Related epic/enabler: R07

## Outcome

`components/learning-v2/LearningV2TheorySheet.tsx` (закоммичен в c4559f4fd, чужих правок нет), `copyFor`:
- `check` en: «Check yourself» — идиома «уймись, следи за собой». → **«Test yourself»**.
- `check` tr: «Kendini dene» — «попробуй себя». → **«Kendini sına»** («проверь себя»).
- `check` pt-BR: «Teste você mesmo» — мужской род («mesmo»). → **«Teste seus conhecimentos»**.
- `returnTo` vi: «Quay lại **bài** {n}/{m}» — «bài» на экранах курса = «урок». → **«Quay lại bài tập {n}/{m}»**.

Остальное верно: kicker, close, listen, returnTo на uk/en/es/pt-BR/id/tr/pl, кнопка «Теория» в плеере
(`app/learning_v2_direct_session_player_v1.tsx:1374`). ru — из макета, не трогаю.

## Scope

In scope: четыре строки текста в `LearningV2TheorySheet.tsx`. Out of scope: логика, сгенерированные тексты теории
(`modules/learning-v2/theory/generated/*` — их вычитка идёт по черновикам `docs/work/theory_drafts/`).

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync`; поиск тестов со старыми строками.

## Rollback

`git revert <коммит>`.
