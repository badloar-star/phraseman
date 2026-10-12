# Task packet: светлый акцент, раздел 1 — перевод на токены Тем accentGraphic / accentTextSafe

Governance-ID: TG-5BB0435BD867
Governance-ID: TG-A345B7E6945D
Governance-ID: TG-F269DBF77C72
Status: In progress
Owner: сессия «2 · ДИЗАЙН» по команде координатора
Related epic/enabler: c62e8fc70 (токены Тем), fd60c8c11 (исходная волна раздела 1)

## Outcome

Строки экранов app/, добавленные в fd60c8c11 на сырых `accentBorder`/`accentText`, читают `accentGraphic` (графика) и `accentTextSafe` (текст). В светлых градиентных темах вид остаётся «глубоким», в тёмном — байт-в-байт `accent` (раньше сдвигался: graphite #F2F1F6 → #F4F5F8EB). Мера успеха: tests/accent_graphic_token зелёный, тёмный вид не изменён.

## Scope

In scope: только добавленные мной в fd60c8c11 строки (community, flashcards_swipe/recall/blitz, lesson_complete, lesson_irregular_verbs, DeckSelectionTile, ai_*_session, lesson1 и др.) и hooks/use_accent_graphics.ts (`border: tokens.accentGraphic`, `text: tokens.accentTextSafe`).

Out of scope: экраны Авторизации (вход/аккаунт/профиль/промокод/код друга/поддержка — забирает Авторизация), чужие хунки, `progressGradient`, остальные ~331 использование сырых токенов (под храповиком 524ee6c6f).

## Architecture

No architecture change: те же места чтения цвета, меняется только имя токена на уже существующий в палитре Тем.

## Security and privacy

Не затрагивает данные, права, секреты.

## Technical debt

Pay now: убираем собственный долг волны fd60c8c11 (сырые токены). Остальное — под храповиком.

## Verification

Проверка типов по затронутым файлам, tests/accent_graphic_token.test.ts, пины DeckSelectionTile (два node-теста), база light-accent-graphics-baseline, numstat коммита (только мои строки).

## Rollback

git revert коммита: возвращает прежние имена токенов, данных не касается.
