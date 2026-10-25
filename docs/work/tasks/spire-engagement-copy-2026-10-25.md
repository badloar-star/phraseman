# Пик 2.0.3 · золотое задание, сердечко за серию, призрак друга — строки ×9 (Переводчик → 8 · МОМЕНТЫ, 2 · ДИЗАЙН)

Governance-ID: TG-D06C6A97690F
Status: Готово к вставке; ключи — предложение, согласовать с авторами кода
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Источник: ТЗ `docs/work/tasks/spire-engagement-2026-10-25.md` и макет `docs/design/v2-app/spire-step-live.html`. Строки для
`components/spire/spire_game_strings.ts` (кортеж Nine: ru, uk, en, es, pt-BR, vi, id, tr, pl). Подстановки: `{name}` — имя друга
как есть, `{time}` — «2:10», `{delta}` — «0:14», `{n}` — шаг серии 0–5.

**Правило имён и рода.** В макете стоят «Обогнал Аню» и «Быстрее Ани». Там имя склоняется, а «Обогнал» угадывает пол ученика —
оба запрещены правилом текстов проекта (имя не склоняем, пол не угадываем). Строки перестроены так, что имя везде в именительном
падеже и глагол не зависит от рода. Смысл макета сохранён: «Аня позади», «На 0:14 быстрее, чем Аня». В турецком имя не получает
падежного окончания (в tr имена тоже склоняются — «Ani'yi»), поэтому имя стоит перед двоеточием или в нейтральной позиции.

## Строки

```ts
// ── золотое задание ×2 (ТЗ §3) ──
goldenLabel: ['Золотое', 'Золоте', 'Golden', 'Dorada', 'Dourada', 'Vàng', 'Emas', 'Altın', 'Złote'],
// плашка «×2» — символ, одинаков во всех языках, перевода не требует
goldenA11y: ['Золотое задание: монеты ×2', 'Золоте завдання: монети ×2', 'Golden task: coins ×2', 'Tarea dorada: monedas ×2', 'Tarefa dourada: moedas ×2', 'Bài vàng: xu ×2', 'Tugas emas: koin ×2', 'Altın görev: jeton ×2', 'Złote zadanie: monety ×2'],
// ── сердечко за серию (ТЗ §2) ──
heartStreakHint: ['Серия {n} из 5 — сердце вернётся', 'Серія {n} з 5 — серце повернеться', 'Streak {n} of 5 — a heart comes back', 'Racha {n} de 5: recuperas un corazón', 'Sequência {n} de 5: um coração volta', 'Chuỗi {n}/5 — sẽ hồi một tim', 'Rentetan {n} dari 5 — satu hati kembali', 'Seri {n}/5 — bir kalp geri gelir', 'Seria {n} z 5 — serce wróci'],
heartStreakResult: ['+1 сердце за серию', '+1 серце за серію', '+1 heart for the streak', '+1 corazón por la racha', '+1 coração pela sequência', '+1 tim nhờ chuỗi đúng', '+1 hati untuk rentetan', 'Seri için +1 kalp', '+1 serce za serię'],
// ── призрак друга (ТЗ §4) ──
ghostAvg: ['{name} в среднем за {time}', '{name} в середньому за {time}', '{name} averages {time}', '{name}: media de {time}', '{name}: média de {time}', '{name} trung bình {time}', '{name} rata-rata {time}', '{name}: ortalama {time}', '{name}: średnio {time}'],
ghostPassed: ['{name} позади', '{name} позаду', '{name} is behind you', '{name} queda atrás', '{name} ficou para trás', 'Đã vượt {name}', '{name} sudah tersalip', '{name}: geride kaldı', '{name} w tyle'],
ghostFaster: ['На {delta} быстрее, чем {name}', 'На {delta} швидше, ніж {name}', '{delta} faster than {name}', '{delta} más rápido que {name}', '{delta} mais rápido que {name}', 'Nhanh hơn {name} {delta}', '{delta} lebih cepat dari {name}', '{name}: {delta} daha hızlısın', '{delta} szybciej niż {name}'],
```

Галочка «✓» в макете — значок компонента (SV.check), в строку не входит.

## Scope

In scope: тексты и предлагаемые ключи. Out of scope: код (Моменты — сердце, Дизайн — призрак, золото — по ТЗ).

## Architecture

No architecture change.

## Security and privacy

Имя друга уже показывается в комнате Пика; новых данных строки не требуют.

## Technical debt

- `components/RankChangeBanner.tsx:257` — давняя строка `Обогнал ${name}`: угадывает род и ставит имя в именительный падеж
  после «обогнал» («Обогнал Аня»). Не в этой задаче; предложение: «{name} позади» — как `ghostPassed`.
- Если Моменты/Дизайн уже назвали ключи иначе — переложу под их имена.

## Verification

Замер на 360 dp — после вставки в экран (строки короткие, самая длинная — es `heartStreakHint`, ≈ 37 знаков).

## Rollback

Не применимо (текст для вставки).
