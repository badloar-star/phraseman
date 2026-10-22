# Task packet: «Диалоги» (Сцена) — новые строки каталога, вычитка 9 языков (Переводчик → 2 · ДИЗАЙН)

Governance-ID: TG-678F34E723E2
Status: In progress
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Строки из d156df4ff: «Пока всё открытое пройдено», «Следующие диалоги откроются с новым рангом», «Откроется на ранге N»,
«N целей · первая: …», «Показать ещё · N», «Все». Файлы закоммичены, чужих правок нет. ru — из эталона, не трогаю.

Исправлено:
- `components/dialogs/scene/dialogs_scene_copy.ts` `noOpenTitle` — звучало канцелярски:
  en «Everything unlocked is done» → **«You’ve finished everything unlocked»**;
  es «Todo lo desbloqueado está hecho» → **«Ya completaste todo lo desbloqueado»**;
  pl «Wszystko, co odblokowane, ukończone» → **«Wszystko odblokowane już ukończone»**.
- `noOpenSub` pt-BR: «com um novo **nível**» → **«com um novo rank»** — в приложении ранг по-португальски «Rank» («nível» = уровень).
- `components/dialogs/DialogueV2CatalogueContainer.tsx` `lockedAtRank` pt-BR: «Desbloqueia no **nível** N» → **«Desbloqueia no rank N»**.

Отмечаю: Дизайн исправил склонение имени после «с» — теперь «с Мариной» (было «с Марина»), как я предлагал.

Верно без правок: «Все / Показать ещё / N целей · первая: …» на всех языках (pl «pierwszy» согласован с «cel»),
«Откроется на ранге N» на остальных 8 языках (vi «hạng», id «peringkat», tr «{n}. rütbede», pl «na randze» — как в приложении).

## Scope

In scope: строки текста в двух файлах. Out of scope: логика, ru.

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync` обоих файлов; поиск тестов со старыми строками.

## Rollback

`git revert <коммит>`.
