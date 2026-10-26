# Task packet: ночные красные зоны Входа и Аккаунта (NIGHT_BACKLOG v2, 031d232b7) — перезакрепить по смыслу

Governance-ID: TG-F2D8EC48F1F5
Status: В работе
Owner: «5 · ВХОД»

## Outcome

Координатор 26.10: из «19 красных — только тесты» взять наборы зоны Входа/Аккаунта и перезакрепить по смыслу. Код верен.

Разбор по строкам бэклога:
- `accounts_v2_client_wiring_v2` (5 · Вход) — тест ищет `: { stableId, ...proof });`; после 74649503b (вариант Б, deleteNow)
  запрос собирается в `base` и уходит `fn(deleteNow ? { ...base, deleteNow: true as const } : base)`. Поле accountsV2Deletion
  прежнее и только при ключе V2 → перезакрепить на новую форму + проверить, что без «сейчас» уходит ровно `base`.
- `dialogue_v2_plus_tools` (2 · Дизайн / 5 · Вход) — два разных падения:
  - моё (faf515267): `source: 'dialogue_v2_freeform'` теперь передаётся через `dialogLimitPaywallParams('dialogue_v2_freeform')`
    (тот же context 'dialog_limit' и source + сводка первого разговора) → перезакрепить;
  - чужое: `t.plus.bg` — незакоммиченная правка Дизайна в `DialogueV2PlusTools.tsx` (значок → общий PlusMark). На HEAD зелёное.
    Не трогаю: перезакрепление — коммитом Дизайна вместе с правкой.
- храповик «Тень» (`shadow_style_no_container_borders`, AccountRestoreSummaryDialog) — уже зелёный (плашка PlateFill +
  plateBoxShadow ночью), правка не нужна.

## Scope

Только `tests/accounts_v2_client_wiring_v2.test.ts` и `tests/dialogue_v2_plus_tools.test.ts` (по одному ожиданию).

## Architecture

Нет изменений.

## Security and privacy

Не затрагивает данные: проверки формы запроса удаления и маршрута пейвола.

## Technical debt

Проверки по подстроке исходника ломаются при любой перекладке кода; лучше — поведенческие тесты запроса (мок callable).
Не в этой задаче.

## Verification

`npm run test:one` по двум наборам через слот: мои ожидания зелёные; в dialogue_v2_plus_tools остаётся только чужое `t.plus.bg`
при незакоммиченной правке Дизайна (на HEAD — зелёное).

## Rollback

Откат коммита вернёт красные наборы; код не меняется.
