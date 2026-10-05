# Task packet: 51б — старые проверки Главной (огонёк, шар MAX, поповер энергии): только тесты

Governance-ID: TG-B1EB6C254B72
Status: In progress (координатор: «51б: обновить или удалить ТОЛЬКО тесты, код Главной не трогать»)
Owner: сессия 1 · ЯДРО

## Outcome

Три сторожа Главной красные с 30.09 и раньше. Главная изменилась по решениям владельца, а сторожа охраняют снятое:
1. home_v2_header_theme_tint: огонёк серии получил контурный вариант «сегодня ещё не занимался»
   (`name={streakToday === 'pending' ? 'flame-outline' : 'flame'}`). Суть сторожа — цвет из палитры темы,
   а не оранжевый #FF8A3D — сохраняется: регулярка принимает оба имени иконки, цвет строго homeV2Palette.iconTint.
2. home_dialogues_quick_tile: читал app/max_home_orb_assets.ts — раздел MAX удалён целиком (владелец 04.10,
   «вычистить весь MAX»). Проверка шара MAX удалена. Проверка трёх плиток (урок → диалоги → карточки, «Диалоги»
   ведёт в /ai_dialog_home) оставлена, срез — до конца массива quickItems. Добавлено: Главная не тянет MAX.
3. energy_info_popover: на Главной 2.0 поповера энергии нет, хост один — EnergyBar. Проверки Главной заменены на
   одну: Главная не рендерит EnergyInfoPopover. Все проверки EnergyBar и самого поповера — без изменений.

## Scope

tests/home_v2_header_theme_tint_source_contract.test.mjs, tests/home_dialogues_quick_tile_contract.test.mjs,
tests/energy_info_popover_liquid_glass_source_contract.test.mjs. Код Главной не трогается.

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

Нет нового. Проверки снятого (шар MAX, поповер на Главной) удалены, чтобы красный цвет снова означал поломку.

## Verification

node --test трёх сторожей — зелёные; max_removed_contract не сканирует tests/.

## Rollback

git revert коммита.
