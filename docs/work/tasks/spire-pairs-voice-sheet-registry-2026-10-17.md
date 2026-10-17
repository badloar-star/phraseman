# Task packet: эталон поля пар Пика, шкала времени Пика в макете, строки реестра для поля пар и шторки голоса

Governance-ID: TG-60522CAC68EC
Status: In progress
Owner: 3 · МАКЕТЫ (координатор 17.10, параллельно ожиданию окна коммита)
Related epic/enabler: 8ab7d49e0 (SpirePairsBoard), cf8df70c3 (шкала времени Пика), 1c2823b95 (шторка голоса), макет voice-limit-session-start.html

## Outcome

1) В макете Пика есть эталон поля пар по коду SpirePairsBoard: две колонки, плитка от 48 dp, зазор 8, 6 пар ≈ 330 dp, состояния: выбрано, верная пара гаснет, неверная — wrong 12 %.
2) Если в макете Пика есть таймер/кольцо с цифрами — пример под новую шкалу (лига 1, этаж 1: ~20 с на выбор).
3) В реестре visual_parity есть строки «поле пар Пика» и «шторка голоса» (1c2823b95 ↔ voice-limit-session-start.html#sheet), чтобы Сверке было с чем сверять.

## Scope

В объёме: docs/design/v2-app/spire.html (или файл Пика по реестру), источник матрицы реестра (STATE_CHECKLIST) и docs/phraseman-2.0/registries/visual_parity.json (через штатную пересборку или ручную строку с mockup_pinned).
Вне объёма: код приложения.

## Architecture

Строки реестра строятся из матрицы состояний (scripts/visual_parity_build.mjs); новая строка добавляется туда, где её не сотрёт пересборка. Гейт tests/visual_parity_gate.test.mjs должен остаться 35/35.

## Security and privacy

Не затрагивает: макеты и реестр сверки.

## Technical debt

- Pay now: эталон поля пар появляется вместе с кодом.

## Verification

- Кадр playwright нового блока Пика; размеры по коду (48/8/≈330).
- Гейт visual_parity 35/35 через slot.sh run.

## Rollback

git revert коммита макета и реестра.
