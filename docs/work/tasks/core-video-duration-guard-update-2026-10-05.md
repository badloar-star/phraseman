# Task packet: сторож video_tab_liquid_glass — длительность только из каталога

Governance-ID: TG-EAF725199F29
Status: In progress (Дизайн/координатор 05.10: сторож покраснел после 84418b35d — «no invented duration»)
Owner: сессия 1 · ЯДРО

## Outcome

Сторож запрещал любое упоминание длительности в карточке ролика, потому что в снимке каталога её не было. Теперь
длительность честно приходит из каталога (durationSec, 84418b35d). Новый смысл сторожа: длительность показывается
ТОЛЬКО из video.durationSec через formatVideoDuration и только когда она есть; никаких выдуманных/зашитых значений.

## Scope

tests/video_tab_liquid_glass_source_contract.test.mjs — одна проверка.

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

Нет: я не прогнал этот сторож перед коммитом 84418b35d — впредь гоняю все сторожа, которые читают изменённый файл.

## Verification

node --test этого файла — зелёный.

## Rollback

git revert коммита.
