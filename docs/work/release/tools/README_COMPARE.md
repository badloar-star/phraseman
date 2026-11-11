# Покадровое сравнение «кадр приложения ↔ эталон» (3 · МАКЕТЫ)

1. Сверка/Сайт кладут кадры в `docs/work/release/frames_2026-11-05/` с именем `<id>__<тема>-<оформление>.png`
   (id из `tools/frames_manifest.json`: peak-b, peak-all, peak-step, tour-p1/p2/p3, energy-promo-long, energy-promo-short, energy-week-card, energy-noenergy, community-notice, pack-row, catalog, home, welcome-b, paywall-c, stats, courses; примеры: `peak-b__graphite-dark.png`, `tour-p3__ink-light.png`).
2. Запуск: `node docs/work/release/tools/compare_frames.cjs` (или с путём к другой папке кадров).
3. Результат в `frames_2026-11-05/compare/`: по каждому кадру картинка (кадр | эталон | тепловая карта различий), `REPORT.md` с чек-листом элементов и авто-оценкой, `report.json`.
4. Авто-оценка грубая (сетка 12×26): ✅ ≤12% клеток различаются · 🟡 ≤30% · 🔴 больше · ⬜ нет эталона. Решение — глазами по чек-листу; затем обновить `FINAL_SIGNOFF_TABLE_2026-11-05.md`.
5. Эталоны, которых ещё нет (`paywall-c`, `stats`, `courses`): добавить путь в `frames_manifest.json` → `ref`.
6. Эталонные PNG из макетов (тур, плашка) пересобираются `node docs/work/release/tools/make_refs.cjs` → `docs/work/golden/refs/`.
