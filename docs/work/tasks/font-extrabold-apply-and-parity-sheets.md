# Task packet: применение Inter ExtraBold в окно 02:30 и разбор листов приёмки моментов серии

Governance-ID: TG-93E863CE2497
Status: In progress
Owner: сессия «4 · ТЕМЫ 2.0»
Related epic/enabler: пакеты TG-CF07106589B0 (шрифт) и TG-60983217A76D (звук V2); листы приёмки Макетов `docs/phraseman-2.0/evidence/parity_moments_v1/CHECKLIST_*.md`

## Outcome

В окно 02:30–02:35 (после повтора прогона №7 Сверкой с 02:40 это окно согласовано координатором): файл `Inter-ExtraBold.ttf` v4.1 лежит в `assets/fonts`, `apply.py` внёс вес 800 в `app.json`, `typography_dev_fonts.ts`, карту весов и два сторожа; тесты шрифта зелёные; один коммит. Листы приёмки по моментам серии разобраны: ложные срабатывания сканера названы, реальные расхождения исправляются кодом.

## Scope

In scope: `assets/fonts/Inter-ExtraBold.ttf`, `app.json`, `app/typography_dev_fonts.ts`, `app/font_weights.ts`, `tests/android_font_family_contract_probe.mjs`, `tests/app_font_family_contract.test.ts`; скрипты вне репозитория в `C:/Temp/claude/work`.

Out of scope: чужие файлы; остальные начертания шрифта.

## Architecture

No architecture change: пятый статический вес той же семьи по плану `docs/work/font-extrabold-800/`.

## Security and privacy

Файл с официальной страницы выпуска, лицензия SIL OFL 1.1 (текст уже в `assets/fonts/OFL-Inter.txt`); данных пользователей нет.

## Technical debt

Pay now: расхождение «800 рисуется как 700» закрывается. Нативная часть меняется — войдёт в сборку 16.10.

## Verification

`tests/font_extrabold_800_ready.test.ts`, `tests/font_weights_contract.test.ts`, `tests/app_font_family_contract.test.ts`, `node tests/android_font_family_contract_probe.mjs` — по слоту, строго «N passed».

## Rollback

Удалить `assets/fonts/Inter-ExtraBold.ttf`, git revert коммита применения.
