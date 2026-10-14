# Task packet: MomentCoin под шкалу шрифтов D145 (координатор 14.10, красный typography_store_surface_ratchet)

Governance-ID: TG-27A94B0AE53D
Governance-ID: TG-AA717F3C411D
Status: In progress — правка к окну 23:30
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Сторож `tests/typography_store_surface_ratchet.test.mjs` (шкала владельца D145: 16/21 и 13/17, «шрифты 16/13 главнее макета»):
- межстрочный < 1,25× у текста до 18 pt — жёсткий ноль: `zz` 18/22, `emo` 18/20;
- размеры 14/15/17/18 вне шкалы — храповик, у нового файла база 0: `sayText` 15, `sayTextBig` 17, `zz` 18, `emo` 18.

Правка (вид облачка почти не меняется):
- `sayText` 15/20 → 16/21;
- `sayTextBig` 17/22 → 16/21 (крупное облачко отличается полями 12/16 против 10/14, как в образце `.say.big`);
- `zz` 18/22 → 20/25;
- `emo` 18/20 → 20/25 (значки эмоций на 2 pt крупнее, межстрочный в норме);
- `emoBang` 26/28 без изменений (крупнее 18, правило межстрочного не действует, размер ≥19 — заголовочный, вне храповика).

## Scope

In scope: стили в `components/moments/MomentCoin.tsx`.
Out of scope: логика и анимации.

## Architecture

Только числа в StyleSheet.

## Security and privacy

Не касается.

## Technical debt

- Расхождение с образцом engagement-moments на 1–2 pt — по решению владельца D145 шкала главнее макета.

## Verification

- `typography_store_surface_ratchet` зелёный.
- `moment_coin_contract` 22/22 (рендер-конфиг).

## Rollback

`git revert`.
