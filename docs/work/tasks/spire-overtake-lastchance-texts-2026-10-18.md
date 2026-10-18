# Task packet: тексты Пика — «обгоняет на N монет за неделю» и кнопка «Последнего шанса» с глаголом (координатор 09:45, замечания 29/30)

Governance-ID: TG-3683B367426E
Status: In progress
Owner: сессия «Специалист по переводам»
Related epic/enabler: R07

## Outcome

1. (30) Тост «Ира обгоняет тебя на 30 монет недели» → «…на 30 монет за неделю» (ru, uk «за тиждень»); остальные языки уже говорят «на этой неделе» — без изменений.
2. (29) «Последний шанс»: текст «Энергия вернётся через 9:32» и кнопка «Энергия через 9:32» дублировали друг друга. Кнопка получает глагол действия — «Играть через 9:32» на 9 языках (новый ключ `playIn`); текст про энергию остаётся. Кнопка по-прежнему неактивна до прихода энергии.

## Scope

In scope: `components/spire/moments/position_moment_strings.ts` (overtakeSub ru/uk), `components/spire/spire_game_strings.ts` (новый ключ `playIn`), `components/spire/moments/SpireLastChanceSheet.tsx` (подпись кнопки — ключ `playIn` вместо `energyIn`), тесты, сверяющие эти тексты.

Out of scope: вёрстка и поведение шторки, `SpireClimbDock` (там «Энергия через…» — единственная подпись, дубля нет).

## Architecture

No architecture change: новый языковой ключ в существующей таблице и замена ключа подписи кнопки.

## Security and privacy

Не применимо.

## Technical debt

- Согласование строки с Моментами — постфактум (сообщения другим сессиям временно приостановлены): Accept temporarily, файл шторки не был занят.

## Verification

- `babel.parseSync` изменённых файлов;
- точечный прогон `tests/moments_coin_plural.test.ts` и `tests/spire_position_moments_contract.test.tsx` через светофор;
- `git diff --numstat` — только мои строки.

## Rollback

`git revert <коммит>`.
