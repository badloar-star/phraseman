# Хаб Диалогов v4: какой токен куда

Источник: `dialogsHubTokens(g)` в `components/dialogs/scene/dialogs_hub_tokens.ts` + `dialogsWorldArt` + токены сцены `dialogs_scene_tokens.ts`; сторож `tests/dialogs_hub_tokens.test.ts` (23 темы × 2 оформления × 3 уровня).

| Элемент макета (v4) | Токен |
|---|---|
| Сцена сверху (.dv-hero, текст на ней) | `dialogsSceneColors(dialogsSceneTokensForTheme(id, appearance))` — top/bottom/glow, текст на сцене по-прежнему из сцены |
| Круг назад на сцене (.dv-back.on-scene) | `sceneTop={dialogsSceneColors(...).top}` у `ScreenBackButton` (7d5dceb94) |
| Плитки «Свободный разговор» и др. (.dv-t) | `tile.bg`, подпись `tile.label`, значок `tile.icon`, счётчик `tile.count` |
| «Plus» на плитке (.dv-plus) | `plus.bg`, `plus.ink` |
| Плитка мира с дорожкой (.dv-t.wt .trk) | плитка `tile.*`; дорожка `worldTile.track` (поверх `tile.bg`), заливка `worldTile.fill` |
| Карточка мира (градиент) | `dialogsWorldArt(hexHue(g.accent), мир, appearance)` — from/to/glow |
| Переключатель вместо чипов (.dv-sw) | `pill.track`, неактивный `pill.idleInk`, выбранный `pill.selectedBg` + `pill.selectedInk` |
| Рельс под переключателем (.dv-trk) | `rail.track`, метка `rail.marker` |
| Шапка экрана темы / «Все диалоги» (.dv-hd) | `head.kicker`, `head.title`, `head.count`, `head.countOf` |
| Строка диалога (.dv-row) | фон `row.fill`; плашка значка `row.iconBg`, значок `row.icon`; название `row.title`, подпись `row.sub`; чип ранга `row.levelBg`/`row.levelInk`; состояния `row.stateIdle` (замок/стрелка), `row.stateDone` (✓) |
| Строка закрыта (.dv-row.locked) | `row.lockedFill`, `row.lockedTitle`, `row.lockedSub`, `row.lockedIcon`, `row.lockedState`, чип `row.lockedLevelBg`/`row.lockedLevelInk` |
| Монета ранга | ассет без перекраски (металл рангов — замок владельца 22.10) |
| Заметка / плашка призыва (.dv-note) | `note.fill`, `note.title`, `note.body`, `note.icon`, призыв `note.iconCta` |
| Затухание низа списка (.dv-fade) | `fade` (= фон темы) |

Прежние поля (`card.*`, `tile.*`, `plus.*`, `pill.*`) не менялись — их читают DialogsHubThemes, DialogsHubWorldSwitch, DialogueV2ThemeScreen, DialogueV2PlusTools.

Замеры: текст ≥ 4,5 и значки/формы ≥ 3 проходят во всех 276 комбинациях (23 × 2 × … ×3 уровня); заливка дорожки к пустой дорожке ≥ 3. Пустая часть дорожки — «hair» макета (текст темы 7 %): к плитке 1,14, к фону 1,12 минимум — тонкая, как в макете; тоньше нельзя (сторож ≥ 1,10).
