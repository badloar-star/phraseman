// gen_gate_state_matrix — матрица «экран × состояние × ранг × язык» для RELEASE_GATE_100 (Ревизор 05.11, требование владельца: КАЖДЫЙ экран/раздел/состояние/начисление с доказательством).
// Источник строк: docs/work/release/MOCKUP_TRANSFER_MATRIX_2026-11-05.json (реестр visual_parity). Запуск: node scripts/gen_gate_state_matrix.cjs → docs/work/release/GATE_STATE_MATRIX_2026-11-05.md
const fs = require('fs');
const path = require('path');
const src = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'docs/work/release/MOCKUP_TRANSFER_MATRIX_2026-11-05.json'), 'utf8'));
const RANK_DEP = [
  [/^(home|today-scene|home-scene|lessons-classic-tab)/, '0,1,2,3'], [/^(dialogs|dialogs-gap|dialogs-hub)/, '0,1+'], [/^video/, '0,1+'], [/^(spire|spire-gap)/, '1,2+'],
  [/^(cards|cards-v2|cards-gap|cards-section)/, '0,2,3+'], [/^(coins|results)/, '0,1+'], [/^(paywall|paywalls|onboarding-paywall)/, 'free,Plus'],
];
const rankOf = (id) => (RANK_DEP.find(([re]) => re.test(id)) || [null, 'любой'])[1];
const mark = { match: '🟢 макет=приложение', diff: '🟡 расхождения', pending: '⬜ нет кадра', removed_by_owner: '— снято владельцем', blocked: '⛔ блок', no_release_surface: '— нет в релизе', no_mockup: '— нет макета' };
const rows = src.rows;
const counts = rows.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {});
const inScope = rows.filter((r) => !['removed_by_owner', 'no_release_surface', 'no_mockup'].includes(r.status));
let md = `# Матрица ворот: экран × состояние × ранг × язык — ${new Date().toISOString().slice(0, 10)}\n\nГенерируется: \`node scripts/gen_gate_state_matrix.cjs\` из реестра макетов (${rows.length} строк; в объёме выпуска ${inScope.length}). Ведёт Ревизор. Строка принимается (✅ Ревизора) ТОЛЬКО с доказательством: кадр с устройства/эмулятора рядом с макетом (путь) или тест; слова «готово» недостаточно.\n\n`;
md += `## Измерения\n- **Ранг:** 0 (Стажёр) · 1 · 2 · 3 · 4+; плюс «Plus / free». Колонка «Ранги» — на каких рангах состояние выглядит по-разному и обязано быть снято отдельно.\n- **Язык интерфейса (9):** ru, uk, en, es, pt-BR, vi, id, tr, pl — кадры минимум ru + uk + en (самые длинные строки: pl/vi/id/tr — проверка переноса по тесту \`jsx_raw_text\`/\`typography\`); остальные — по сторожам локалей.\n- **Курс (5):** en, es, fr, de, it — для экранов урока/теории/словаря/результата отдельный кадр на курс.\n- **Тема:** светлая и тёмная (кадры парой).\n\n## Сводка по реестру\n| Статус | Строк |\n|---|---|\n${Object.entries(counts).map(([k, v]) => `| ${mark[k] || k} | ${v} |`).join('\n')}\n\n**Условие ворот:** все строки объёма выпуска — 🟢 + ✅ Ревизора. Сейчас 🟢: ${counts.match || 0} из ${inScope.length}.\n\n`;
md += `## Строки (экран · состояние)\n| id | Экран | Состояние | Ранги | Реестр | Доказательство | ✅ Ревизор |\n|---|---|---|---|---|---|---|\n`;
for (const r of inScope) {
  const ev = r.evidence ? String(r.evidence).replace(/\|/g, '/').slice(0, 60) : '—';
  md += `| ${r.id} | ${String(r.screen).replace(/\|/g, '/')} | ${String(r.state).replace(/\|/g, '/').slice(0, 70)} | ${rankOf(r.id)} | ${mark[r.status] || r.status} | ${ev} | ⬜ |\n`;
}
md += `\n## Начисления и награды (E2E: клиент + сервер + повтор)\n| Начисление | Где | Правило | Тест | Устройство |\n|---|---|---|---|---|\n`;
const A = [
  ['Монеты за ответы', 'Урок · Словарь · Глаголы', '1-е прохождение +3, 2-е +2, 3-е и далее +1; один элемент платит один раз; идемпотентность по requestId', 'practice_rune_321_contract', '⬜'],
  ['Монеты за практику/ошибки/карточки/речь', 'flashcards_*, mistake_practice, speaking_practice', 'ставки только 3/1 по правилам активности; сервер принимает ограниченную сумму', 'rune_balance_snapshot_preservation_contract', '⬜'],
  ['Монеты Пика', 'Пик (этажи, неделя)', 'числа Пика — монеты; повышение раз в неделю; награда повышения', 'owner_locks_peak_coins_only, spire_*', '⬜'],
  ['Звёзды/уровень/ранг монеты', 'Профиль, Главная', 'ранг покупается: N×1000; ранг 0 — старт', 'coin_rank_*', '⬜'],
  ['Энергия', 'все тренировки', 'запас 5, +1 за 30 минут; без месячного лимита', 'owner_locks_energy_30min_no_month_cap, energy_state_v2', '⬜'],
  ['Серия/стрик и заморозка', 'Главная, итог дня', 'стрик не пропадает без причины; заморозка списывается один раз', 'streak_*', '⬜'],
  ['Достижения', 'Достижения, Пик', 'каждое выдаётся один раз; счётчики не откатываются', 'achievement_*', '⬜'],
  ['Рефералы и лесенка', 'Друзья', 'награды за 1-го/3-го друга; без строк-описаний на экране', 'owner_locks_friends_no_reward_rows, referral_*', '⬜'],
  ['Конкурс/голосование', 'Сообщество', 'один голос; uid не раскрывается (ограничение правил)', 'pm230_firestore_rules_least_privilege', '⬜'],
  ['Покупки Plus', 'Пейвол', 'годовая заменяет месячную на Android; Plus не теряется при обновлении', 'paywall_*', '⬜'],
];
A.forEach((a) => { md += `| ${a.join(' | ')} |\n`; });
md += `\n## Правило финала\nПока хоть одна строка объёма — не 🟢 с ✅ Ревизора, сборка не уходит. Недельный лимит: на 90% — финальная фаза (только проверки и лёгкие правки), к 95% обе сборки (iOS+Android) готовы и проверены без багов; поэтому порядок прохода — в \`RELEASE_GATE_100.md\`, раздел «Выпуск за один проход».\n`;
fs.writeFileSync(path.join(__dirname, '..', 'docs/work/release/GATE_STATE_MATRIX_2026-11-05.md'), md);
console.log('rows', inScope.length, counts);
