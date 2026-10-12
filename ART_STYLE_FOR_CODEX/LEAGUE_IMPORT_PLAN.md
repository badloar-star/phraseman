# План приёмки значка лиги «Глина» (подготовка, НЕ запускать до выбора владельца)

Состояние на 12.10. Варианты: `ART_STYLE_FOR_CODEX/trials/S2_clay/{dark,light}/league_option_NN_<имя>.webp` (+ `.accent.webp`), страница выбора — `league_options.html` (сервер 8796).
Сухой прогон сторожа по всем 40 парам: прозрачность и слой accent — все ок; 21 основа больше 400 КБ (до 807 КБ), все сжимаются штатным пересжатием.

## Что важно знать до команды
1. `scripts/import_art_style.mjs` берёт ТОЛЬКО имена из реестра `THEMED_ART_NAMES`. Имя `league_option_NN_*` в реестре нет → importer его **пропустит** («имя нет в реестре»). Кроме того, у importer'а нет опции «только это»: он берёт все файлы стиля, кроме перечисленных в `--skip`.
2. В реестре лиг — шесть имён: `league_bronze, league_silver, league_gold, league_ruby, league_emerald, league_diamond` (Очередь 2 заказа `S2_CLAY_FULL_SET_ORDER.md`: одна форма — жетон-медаль, меняется только вставка в центре).
3. **Ни один экран сегодня не использует `league_*`**: Лиги удалены в 2.0 (D54/D78), `grep` по `app/components/modules` — потребителей нет. В реестре у них запасная картинка `assets/images/levels/{bronza,serebro,zoloto,rubin,izumrud,almaz}.webp` (комментарий «lessons.tsx — медали ступеней»), но вызова `resolveThemedArt('league_…')` в коде нет. Значит приёмка **ничего видимого не заменит**, пока экран не подключён. Куда значок встанет — решение владельца/координатора (кандидаты: ранги Шпиля/башни, профиль, достижения).

## Рекомендованный порядок
1. Владелец выбирает номер NN (например, `07_ribbon`).
2. Значок — одна форма на 6 ступеней: Codex делает по выбранной форме шесть файлов `league_<ступень>` (+ `.accent`, тёмный и светлый), как в Очереди 2.
3. Приёмка шести файлов — одной командой (ниже). Для ОДНОГО выбранного варианта без остальных пяти — временная подмена (раздел «Только один вариант»).

## Команда приёмки шести ступеней (когда Codex положит их в trials/S2_clay)
Сначала сухой прогон, остальные предметы стиля исключаем через `--skip` (кроме league_*):
```bash
node scripts/import_art_style.mjs S2_clay --dry-run --skip spire_tile,lessons,dialogs,cards,continue,today,phrase_of_day,mistakes_entry,cards_from_video,cards_empty_saved
```
(список `--skip` дополнять тем, что уже принято или не одобрено; `--dry-run` печатает «ДОБАВИТ/ЗАМЕНИТ имя: исходник → итог КБ (webp q…)» и отказы сторожа).
Если сухой прогон чист — тот же вызов без `--dry-run`. Importer сам: сжимает до ≤ 400 КБ (webp q85 и ниже, `alphaQuality 100`), проверяет `[THEMED-ART-GUARD]` (настоящая альфа в углах), копирует в `assets/images/v2art/{dark,light}/`, сохраняет заменяемое в `ART_STYLE_FOR_CODEX/_backup/S2_clay-<время>/` и запускает `scripts/gen_themed_art_assets.mjs` (обновляет `components/theme/themed_art_assets.generated.ts`).

## Только один вариант (проверка формы до заказа шести)
Importer не знает `league_option_*`, поэтому выбранный вариант копируется под имя ступени во ВРЕМЕННУЮ папку стиля и принимается как отдельный «стиль»:
```bash
mkdir -p ART_STYLE_FOR_CODEX/trials/S2_league_pick/dark ART_STYLE_FOR_CODEX/trials/S2_league_pick/light
for m in dark light; do
  cp ART_STYLE_FOR_CODEX/trials/S2_clay/$m/league_option_NN_<имя>.webp        ART_STYLE_FOR_CODEX/trials/S2_league_pick/$m/league_bronze.webp
  cp ART_STYLE_FOR_CODEX/trials/S2_clay/$m/league_option_NN_<имя>.accent.webp ART_STYLE_FOR_CODEX/trials/S2_league_pick/$m/league_bronze.accent.webp
done
node scripts/import_art_style.mjs S2_league_pick --dry-run
```
(`NN` и `<имя>` подставить; `league_bronze` — любая из шести ступеней как заглушка формы.) Ожидаемо: 4 файла «ДОБАВИТ» в `assets/images/v2art/{dark,light}/league_bronze[.accent].webp`, у крупных вариантов — пересжатие с q85. Реальный запуск — без `--dry-run`; временную папку `S2_league_pick` после этого удалить.

## Куда ляжет и что заменит
| Что | Куда | Заменит |
|---|---|---|
| основа и слой accent, тёмное/светлое | `assets/images/v2art/{dark,light}/league_<ступень>.webp` и `.accent.webp` | в реестре источник `league_<ступень>` перейдёт с запасной `assets/images/levels/<имя>.webp` на новый файл (порядок выбора файла в реестре: новый нужной яркости → другой яркости → запасной) |
| `components/theme/themed_art_assets.generated.ts` | строки слотов `league_*` | пересобирается `gen_themed_art_assets.mjs` |
| экраны | **нет потребителей** | видимых изменений до подключения экрана нет |

## Перед настоящим запуском
- Слот светофора (`GO`) и свободная память ≥ 3 ГБ; `sharp` обрабатывает 6–8 файлов по ≤ 800 КБ.
- Прогнать точечно после записи: `tests/themed_art.test.ts`, `tests/themed_art_guard.test.ts`, `tests/home_art_accent_layers.test.ts`, `tests/import_art_style.test.ts` (проверка, что реестр и сторожа остались зелёными).
- Не импортировать `spire_tile` (узкий шпиль Codex от 16:34), пока владелец не выберет форму.
