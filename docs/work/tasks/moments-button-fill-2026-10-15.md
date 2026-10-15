# Плашки-кнопки окон моментов: заливка buttonFill вместо opaqueControl (15.10)

Governance-ID: TG-2534C3000423

## Outcome
Вторичная плашка-кнопка окон моментов («Пропустить» в окне повышения) видна на шторке в тёмных темах: заливка `buttonFill` (≥ 1,6 : 1 к поверхностям) вместо `opaqueControl` (1,00–1,28 : 1). Правило владельца 13.10 «никакие кнопки не сливаются».

## Scope
Новый файл `components/spire/useSpireButtonFill.ts` и `components/spire/moments/MomentPromotion.tsx` (кнопка «Пропустить»). Файлы `useSpirePalette.ts` и `tests/buttons_never_merge_audit.test.ts` сейчас правит соседняя сессия (Темы: два уровня порога, `cta = ctaFill`) — в них не лезу; строка аудита «окна моментов: плашка (buttonFill)» уже у них. Остальные вторичные кнопки моментов — `V2Button variant="secondary"` (= buttonFill). Плашки-не-кнопки (метка этажа, штамп, дорожка) остаются на `control`.

## Architecture
Форма та же, меняется токен. Отдельный хук `useSpireButtonFill` читает `buttonFill` из токенов стекла активной темы (как `useSpireBgBottom`), чтобы не конфликтовать с правкой палитры соседней сессией.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Когда соседняя сессия закоммитит палитру, `buttonFill` можно перенести в `SpirePalette` и убрать отдельный хук.

## Verification
`tests/buttons_never_merge_audit.test.ts` (после коммита Тем), контрактные тесты моментов Пика.

## Rollback
Откат коммита.
