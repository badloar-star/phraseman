# Task packet: окно Plus на повышении уровня — ещё на 10-м и 20-м

Governance-ID: TG-CEB1D8DD5DF9
Status: In progress
Owner: сессия Claude «аудит мотивации к покупке Plus», 2026-11-11
Related epic/enabler: аудит мотивации к покупке Plus (пункт «Уровни кроме 5-го», владелец 11.11: делать)

## Outcome

Бесплатный пользователь видит окно Plus «Новый уровень! Идём дальше?» не один раз за всю жизнь (5-й уровень), а
на 5-м, 10-м и 20-м уровнях. Вид окна не меняется. Успех: в журнале `[PAYWALL-AUTO] level_up upsell shown` на 10-м и 20-м уровне.

## Scope

In scope:
- `app/_layout.tsx` — одно условие в обработчике `home_level_up_celebrated`: список уровней вместо `level !== 5`;
- `app/after_win_upsell_gate.ts` — немой `catch { return false }` получает запись причины в журнал;
- сторож `tests/level_up_upsell_levels_2026_11_11.test.ts`.

Out of scope: само окно покупки, тексты, пауза между показами (36 часов остаётся), правило «не показывать, если
сегодня уже было окно про серию».

## Architecture

No architecture change. Момент показа прежний — после проигранного на Главной праздника уровня; очередь окон,
проверка смены аккаунта и подтверждённый статус подписки не тронуты. Уровни 5, 10, 20 лежат константой рядом с обработчиком.

## Security and privacy

Новых данных нет. Окно покупки и раньше открывалось этим путём.

## Technical debt

- Pay now: немой `catch` в `after_win_upsell_gate.ts` (сбой хранилища молча отменял окно) — добавлена причина в журнал.
- Accept temporarily: на устройстве не проверено (уровень 10 руками быстро не набрать); владелец — эта сессия, проверка по журналу `[PAYWALL-AUTO]` при ближайшей сборке.

## Verification

`npm run test:one -- tests/level_up_upsell_levels_2026_11_11.test.ts tests/after_win_upsell_gate.test.ts
tests/level_up_celebrated_on_home_contract.test.ts` — смотреть текст вывода.

## Rollback

`git revert` коммита: окно снова только на 5-м уровне.
