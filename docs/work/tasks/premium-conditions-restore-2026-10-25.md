# Вернуть условия открытия 6 премиум-тем как в пакете Codex (Оливковая — через Plus)

Governance-ID: TG-C523348350BC

## Outcome
Слово владельца 25.10 (дословно через координатора): «все темы не бесплатные, те что с условиями — те с условиями. Те что вчера Кодекс добавил, там у каждой есть условия, и они должны быть». Ночное «Оливковая скрыта, платный путь убран» (a50cfbf18) отменено. Вернуть условия ровно как в пакете Codex; Оливковая снова видна в выборе с замком и условием «Покупка Phraseman Plus». Контраст не откатывать.

## Scope
In scope: `functions/src/premium_themes.ts` (+ тест), `components/ThemeContext.tsx` (подписка premium_activated → claim plus_purchase), `app/settings_themes.tsx` (снять скрытие), `app/premium_theme_copy.ts` (условие и шутка Оливковой), сторож условий `tests/premium_theme_conditions_match_codex_package.test.ts`, строка в `docs/work/OWNER_LOCKS.md` + реестр замков.
Out of scope: снимок docs/work/codex_premium_themes_snapshot_*, токены/контраст, выкладка функций (только по кнопке владельца).

## Architecture
Сервер: plus_purchase выполнено при проверенной покупке (hasVerifiedPlusPurchase), прогресс 1/1. Клиент: как в снимке — после premium_activated claim + 2 повтора (8 с, 24 с). Сторож сравнивает каталог и тексты условий со снимком `_new`.

## Security and privacy
Выдача прав по-прежнему только на сервере по проверенной покупке; клиент только просит пересчёт.

## Technical debt
Переименование условия Титана «Пик» (Ревизор 25.10) сохраняется — условие то же, меняется только имя раздела.

## Verification
functions premium_themes тест, сторож условий, settings_themes/ThemeContext сторожа, babel parse.

## Rollback
Откатить коммит.
