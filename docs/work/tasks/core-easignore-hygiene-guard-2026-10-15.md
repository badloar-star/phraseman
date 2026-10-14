# Task packet: сторож android_bundle_hygiene под новую форму исключения content/ в .easignore

Governance-ID: TG-5D27497EC3DA
Status: In progress
Owner: Ядро (сессия 1)
Related epic/enabler: 2a033ab6e (.easignore: content/ исключён уровнями, кроме learning-v2-course/activation/), координатор 15.10

## Outcome

`tests/android_bundle_hygiene_contract.test.ts` краснеет после 2a033ab6e. Сторож ждёт строку `/content/`, а в `.easignore` теперь
стоит `/content/*` плюс исключения для `learning-v2-course/activation/`. Сторож обновляется под новую форму, смысл сохраняется.

После правки он проверяет три вещи:
- `content/` по-прежнему уходит из архива EAS целиком;
- единственное, что возвращается, — `content/learning-v2-course/activation/`;
- никаких других `!/content/...` нет.

## Scope

In scope: `tests/android_bundle_hygiene_contract.test.ts`, один тест «keeps non-runtime build inputs out of the EAS upload archive».

Out of scope:
- сам `.easignore` (форма верная);
- шлюз `scripts/easignore_runtime_imports_gate.mjs`.

## Architecture

Нет изменений архитектуры: только проверка текста конфигурации.
- Сторож требует строки `/content/*`, `!/content/learning-v2-course/`, `/content/learning-v2-course/*` и `!/content/learning-v2-course/activation/`.
- Сторож запрещает голую `content/` (без корня), как и раньше.
- Любое другое `!`-исключение под `/content/` запрещено.

## Security and privacy

Сторож держит черновики курса, сценарии и контент-трубы вне архива сборки, где их могли бы получить посторонние. Персональных данных здесь нет; правка смысл защиты не ослабляет.

## Technical debt

Pay now: сторож отстал от формы `.easignore` на 2a033ab6e — исправляется сейчас.

## Verification

- Прогон `tests/android_bundle_hygiene_contract.test.ts` зелёный.
- Ручная проверка, что лишнее исключение `!/content/x/` уронило бы сторож: логика `filter` в тесте.

## Rollback

Вернуть прежний список шаблонов в тесте. Тогда тест снова будет красным при текущем `.easignore`.
