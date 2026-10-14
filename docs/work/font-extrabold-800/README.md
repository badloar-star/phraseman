# Inter ExtraBold (800) — подготовка к утреннему решению владельца

Готово всё, кроме самого файла. Решение — за владельцем: вариант A меняет вид 246 мест (≈ 12 % текста), которые сейчас рисуются как 700.

## Факты (из самих файлов и конфигурации)

Зарегистрировано в `app.json` (expo-font): 400 Regular, 600 SemiBold, 700 Bold, 900 Black. Все четыре — Inter **Version 4.001;git-66647c0bb**, по ≈ 343 КБ.

| Файл | family (ID 1) | subfamily (ID 2) | typographic family (ID 16) | usWeightClass |
|---|---|---|---|---|
| Inter-Regular | Inter | Regular | — | 400 |
| Inter-SemiBold | **Inter SemiBold** | Regular | Inter / SemiBold | 600 |
| Inter-Bold | Inter | Bold | — | 700 |
| Inter-Black | **Inter Black** | Regular | Inter / Black | 900 |

Заказанные веса по коду (2074 объявления): 400 — 122, 500 — 39, 600 — 293, 700 — 1202, **800 — 246**, 900 — 170 (`node scripts/font_weight_usage.mjs`).

## Источник файла и лицензия

- Нужен **тот же релиз Inter 4.001 (v4.1)**, чтобы метрики и кириллица совпали с остальными четырьмя: GitHub `rsms/inter`, релиз `v4.1`, архив `Inter-4.1.zip` → `extras/ttf/Inter-ExtraBold.ttf` (статический TTF). Ожидаемые поля: `Version 4.001;git-66647c0bb`, PostScript `Inter-ExtraBold`, usWeightClass 800 — `apply.py` всё это проверит и откажется применять иначе.
- Запасной источник: npm `@expo-google-fonts/inter` (`Inter_800ExtraBold.ttf`, Google Fonts) — версия может отличаться (4.000), тогда `apply.py` остановится на проверке версии; решать — брать ли с отличием.
- Лицензия: **SIL Open Font License 1.1** (как у остальных; текст уже лежит в `assets/fonts/OFL-Inter.txt`), встраивание в приложение разрешено, отдельно продавать шрифт нельзя.
- Скачивание файла — только по слову владельца (правило безопасности); сам файл в сборку сейчас не добавлялся.

## Как применить за 10 минут

1. Положить `Inter-ExtraBold.ttf` в `assets/fonts/`.
2. `python docs/work/font-extrabold-800/apply.py` — проверит файл, поправит `app.json` (android 800 + ios), `app/typography_dev_fonts.ts`, `app/font_weights.ts` (800 в карте), два сторожа контракта шрифта. Сначала можно `--check` (ничего не пишет; места правки найдены).
3. Тесты: `tests/font_weights_contract.test.ts`, `tests/app_font_family_contract.test.ts`, `tests/font_extrabold_800_ready.test.ts` (сейчас зелёный как «файла нет», с файлом проверит всё), `node tests/android_font_family_contract_probe.mjs`.
4. Нативная часть меняется (expo-font plugin → `xml_inter.xml` получит вес 800): нужна пересборка (план: нативная сборка 16.10). Размер: +≈ 343 КБ в файле, ≈ +150–190 КБ в APK/AAB со сжатием.
5. Кадр-доказательство «Фраза дня» до/после — Сверка.

## iOS: как рисуется 800 при тех же четырёх файлах (разбор без устройства — НЕ проверено)

В iOS шрифты подключены списком файлов; семейство ищется по имени «Inter». Важно устройство имён: у Regular и Bold family = «Inter», а у SemiBold и Black family = «Inter SemiBold» / «Inter Black» (имя «Inter» только в typographic family, ID 16). Два возможных исхода, какой — покажет только кадр на iPhone:

1. iOS группирует по typographic family (ID 16): в «Inter» четыре начертания, подбор по весу: 800 ≈ Heavy (0,56) ближе к Black (0,62), чем к Bold (0,40) → **рисуется 900**; 500 ближе к SemiBold (0,30), чем к Regular → **600**. Тогда iOS и Android расходятся в обе стороны: Android 800→700 (тоньше), iOS 800→900 (жирнее).
2. iOS группирует по family (ID 1): в «Inter» только Regular и Bold → **600 и 900 не находятся** и рисуются ближайшим из двух (Bold), то есть 600→700, 900→700, 800→700.

В обоих исходах Android и iOS сейчас рисуют разные веса. Проверка: кадр экрана с полосой весов 400–900 на iPhone (TestFlight) — готовлю при слове; добавление файла 800 выравнивает 800 на Android с макетом, iOS при исходе 2 требует отдельного решения (имя семейства по PostScript-имени).
