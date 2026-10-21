# Task packet: решения владельца 21.10 — «Найди пары» 4 варианта, эталон Plus B, №35–37 без подарка в приложении, Пик «собери фразу»

Governance-ID: TG-63BCA6B9610F
Status: In progress
Owner: сессия «3 · МАКЕТЫ»
Related epic/enabler: docs/work/OWNER_DECISIONS_2026-10-21.md (№6 Plus B, №23, №35–37, Пик)

## Outcome

(1) «Найди пары»: 4 разных решения для длинных переводов, из-за которых левые и правые плашки разъезжаются по высоте, — на реальных длинных текстах курса, в дизайне 2.0 как на экране. (2) Эталон Plus B для переноса в код и для сверки: 7 мест × обе темы, отдельный файл docs/design/v2-app/plus-ring-etalon.html. (3) №35–37: подарок Plus — только сайт, из макета приложения убрать; остальное как было. (4) Пик «собери фразу»: ячейки по числу слов + кнопка «Проверить».

## Scope

In scope: новые docs/design/v2-app/speed-match-long-pairs.html, plus-ring-etalon.html, peak-phrase-builder.html; правка plus-premium-ideas.html; публикация артефактами.

Out of scope: код приложения и контент курса.

## Architecture

No architecture change: страницы собираются скриптами из эталонов (kit.css/kit.js, learning-v2-icons.html, profile.html, community.html, community-redesign.html, player-card-states.html, spire-tower-render.js). Длинные пары берутся скриптом только для чтения из modules/learning-v2/content/factory_native/generated_release/en/**/learner.json.

## Security and privacy

Учебные тексты и вымышленные имена; данных не добавляем. Показ Plus другим (эталон B) — при реализации проверить политику конфиденциальности.

## Technical debt

- Accept temporarily: выбор варианта «Найди пары» — владелец через координатора.

## Verification

Снимки playwright каждой страницы: ошибок нет, телефоны отрисованы, длинные тексты не обрезаны, плашки выровнены как задумано.

## Rollback

git revert соответствующих коммитов.
