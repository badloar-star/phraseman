# Шпиль — контракт данных (PM-271, черновик на согласование)

Статус: черновик. Требует «да» владельца по пунктам §6 (гейт OWNER_DECISION_RECORDED).
Правило: **переиспользуем механику лиги, новых коллекций — минимум.**

## 1. Что берём из лиги как есть

| Нужно Шпилю | Уже есть | Файл |
|---|---|---|
| Комната на 30 | `league_groups/{groupId}`, members-карта | `functions/src/league_groups.ts` |
| Приём своих очков | callable `leagueUpdateMyMember` (сервер пишет в группу) | там же, :746 |
| Боты | «жители» `res_*`, детерминированные слоты, формула очков от времени недели | `functions/src/league_residents.ts` |
| Итог недели | `leagueFinalizeCron` → `users/{uid}/league_week_results/{weekId}` | `league_finalize_cron.ts` + зеркало `app/league_engine.ts` |
| Очки недели в профиле | `progress.week_points_v2 = {weekKey, points}` | `functions/src/progress_events.ts` |
| Рефреш чужих цифр раз в 6 ч | клиентский кэш клуба | сторож `guard_league_refresh_ttl` |

## 2. Что меняется

1. **Очки = пройденные ступени.** `member.points` = `stepsCleared`. Добавляется
   `member.reachedAtMs` для ничьих (раньше добрался — выше), затем `member.totalMs`.
2. **Язык в комнате.** `league_groups/{groupId}.lang` ∈ {en, es, de, fr}; подбор комнаты
   по `(weekId, leagueId, lang, cohortDay)`. `leaderboard/{uid}` хранит группу на каждый
   язык: `groups.{lang} = {groupId, groupWeekId}` (старые поля `groupId/groupWeekId` =
   английский, для обратной совместимости).
3. **Когорта по дню входа (T24).** `cohortDay` = день недели первого входа (0–6).
   Новая комната не смешивает понедельничных с поздними.
4. **Жители вне зон (T25).** В `computeGroupResults` и в `calculateResult` клиента
   жители входят в список и в отображение, но **не в `total` для зон** и не в ранги
   живых. Зона = 15% от живых. Правка зеркальная, в одном коммите, сторож
   `guard_league_demotion` дополнить кейсом «комната из 5 живых + 25 жителей».
5. **Формула жителя** — ступени вместо опыта: `residentWeeklySteps(index, weekStart, now)`,
   средний темп ниже зоны повышения по построению (T25).
6. **Крон жителей** (`leagueResidentsTickCron`, каждый час) — предлагается **убрать**:
   формула детерминирована, клиент считает жителей сам, а итоговый крон — той же функцией.
   Экономия ~168 запусков в неделю плюс запись в каждую группу каждый час.
7. **Бусты, сундуки, короны лиги** — удалить (T36): `leagueSyncMyBoost`,
   `leagueActivateGroupBoost`, `league_chest_*`, `league_crowns`.

## 3. Новые данные

| Где | Что | Кто пишет |
|---|---|---|
| AsyncStorage `spire_week_v1:{uid}:{lang}` | `{weekKey, tier, floor, stepInFloor, stepsCleared, reachedAtMs, totalMs, packHash, pending[]}` | клиент, мгновенно |
| `users/{uid}` progress `spire_week_v1` | JSON `{weekKey, lang, steps, reachedAtMs, totalMs, packHash}` по языку | сервер через callable |
| Storage `spire_packs/{lang}/{tier}/{weekId}.json` | пакет недели (§4) | крон сборки, раз в неделю |
| `config/spire_v1` | таймер, монеты, высота, боты, правдоподобие | админка |

## 4. Пакет недели

```
{ schema: 'spire-pack-v1', weekId, lang, tier, packHash,
  timer: { baseMsByKind, perFloorDecay: 0.04, floorMin: 0.65 },
  floors: [ { floor, guardian: bool, voiceRequired: bool,
              steps: [ { step, sets: [ { tasks: [publicTask×10], answerFingerprints } ×3 ] } ] } ] }
```
- 3 набора на ступень: первая попытка + 2 повтора без повторения заданий; дальше по кругу.
- `publicTask` и `answerFingerprints` — формат плана Арены (`arena_duel_v3.ts`), ответы
  отдельным полем.
- Размер: ~135 ступеней × 3 × 10 ≈ 4000 заданий ≈ 1,5–2 МБ JSON → gzip ~300 КБ.
  Скачивается раз в неделю при заходе в Шпиль (не на старте приложения).

## 5. Поток и стоимость

| Действие | Сеть | Firestore |
|---|---|---|
| Открыть Шпиль | пакет из кэша; раз в неделю — скачивание | группа: чтение раз в 6 ч (как сейчас) |
| Сыграть ступень | 0 | 0 |
| Ступень пройдена | callable `spireReportSteps` (**пачкой**: при выходе с экрана/в фон или раз в 5 мин) | 1 запись в группу + 1 в progress |
| Нет сети | очередь `pending[]` | досылка пачкой |
| Итог недели | существующий крон | как сейчас |

Проверка правдоподобия в callable: `packHash` совпадает с текущим; ≥ `minStepMs` на
ступень; ≤ `maxStepsPerHour`; ступени монотонно растут. Отказ — логом с причиной,
клиенту честный ответ, локальный прогресс не стирается.

## 6. «Да» владельца (принято 2026-09-24, D56)

1. **Убрать часовой крон жителей** (жители считаются формулой) — экономия денег. ✅
2. **Отчёт ступеней пачкой** (при уходе с экрана / раз в 5 мин), а не после каждой ступени:
   другие увидят твой подъём с задержкой до 5 минут, но это всё равно быстрее рефреша
   в 6 ч. ✅
3. **Удалить бусты/сундуки/короны лиги** вместе с их функциями (T36). ✅

Гейт `OWNER_DECISION_RECORDED` для PM-271 закрыт этой записью и D56 в `PROGRESS.md`.

## 7. Правила Firestore

- `league_groups` — как сейчас (пишет только сервер).
- `users/{uid}` поле `spire_week_v1` — в allow-list сервера, клиент напрямую не пишет.
- `config/spire_v1` — читать всем вошедшим, писать только `admin: true`.
- Storage `spire_packs/**` — читать вошедшим, писать только сервер.
