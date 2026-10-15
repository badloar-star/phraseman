# V2 показан в сборке 16.10: что краснеет в release_precheck и как к зелёному

Ядро, 15.10 ~02:15. Только чтение: файлы курса (Codex) не правились, проверочные скрипты запускались в режиме проверки.
Решение владельца 15.10 ~01:40 (чат Ядра) — «Показывать V2, 10+ опубликованных сессий одобрены». Координатор подтвердит его утром.

Выпущено занятий (потолок в бандле): **11** — `en/l01/s01…s11` (`LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 = 11`).

## Итог по гейтам

| Гейт | Итог | Касается выпущенных s01–s11? |
|---|---|---|
| №4 озвучка (`learning_v2_audio_coverage_gate.mjs`) | ✅ **PASS**: все 11 выпущенных собираются из бандла | — |
| №3 паритет (`learning_v2_release_parity_gate.mjs`), часть «состав» | ✅ PASS (186/186/186) | — |
| №3, часть «файлы канон ↔ копия в приложении» | ❌ 154 расхождения (121 CONTENT_MISMATCH, 33 ONLY_CANONICAL) | **0**: все в s12–s45 |
| №3, часть «смысловая сверка исходник ↔ выпуск» | ❌ не запускается: её останавливает общая пауза фабрики (HOLD), 242 замечания по курсу | **43** замечания (ниже) |
| №3, часть «качество: подтверждение озвучки» | ❌ 580 AUDIO_EVIDENCE_UNVERIFIED | **12**: s06 2, s07 2, s08 1, s09 3, s10 2, s11 2 |

Разбивка сделана скриптами `v2_parity_split.mjs` и `v2_quality_split.mjs` в scratchpad Ядра. Они берут функции самого гейта и делят результат по потолку.

### 43 замечания паузы фабрики в выпущенных занятиях

Пауза общая на весь курс. Проверено: даже при проверке только 11 выпущенных занятий она срабатывает по всем 186.

| Занятие | Замечаний |
|---|---|
| s01–s05 | **0** |
| s06 | 10 |
| s07 | 1 |
| s08 | 0 |
| s09 | 23 |
| s10 | 6 |
| s11 | 3 |

| Код | Сколько (ru + uk) |
|---|---|
| `practice_after_independent_boundary` | 18 |
| `invalid_independent_boundary` | 8 |
| `answer_authority_count` | 8 |
| `intro_target_not_practiced` | 5 |
| `duplicate_answer_id` | 4 (все в s09, задание i18) |

Это правила построения занятия (порядок практики, разметка ответов), а не поломка открытия: эти занятия открываются, озвучка собирается (гейт №4 зелёный).

## Пути к зелёному (решает координатор, правки курса — Codex)

1. **Проверять только выпущенное.**
   - Все три части №3 и пауза фабрики сравнивают занятия ≤ потолка (так уже работает гейт №4).
   - Тогда остаются ровно 43 замечания и 12 подтверждений озвучки в s06–s11.
   - Правка — в скриптах гейтов (зона Codex / согласование).
2. **Закрыть остаток в s06–s11 (Codex):**
   - 43 замечания: s09 — основная часть, 23;
   - 12 подтверждений озвучки — прослушать и отметить: файлы есть, нет отметки проверки.
   - Вместе с п.1 это даёт зелёный при показанных 11 занятиях.
3. **Файлы копии s12–s45:** пересобрать копию в приложении из канона (Codex, экспорт `generated_release`). Видимого эффекта нет: эти занятия в бандле не собираются (`material_null`), за потолком. Либо закрыть п.1.
4. **Запасной вариант, если к сборке 16.10 п.2 не успеть:** в s01–s05 **ноль** замечаний и ноль неподтверждённой озвучки — при проверке по выпущенному они зелёные уже сейчас.
   - Но потолок вычисляется сам. Ручную константу возвращать запрещено (CLAUDE.md).
   - Владелец говорил о 10+ сессиях.
   - Вариант только с его «да».

Красное к утру — это расхождение формы (гейт сравнивает весь курс из 186 занятий, а выпущено 11). Плюс 55 конкретных хвостов в s06–s11 (43 + 12). Выпущенные занятия при этом открываются и звучат.

## Что из этого увидит ученик (s06–s11)

Проверено по файлам выпуска `content/learning-v2-course/release/en/l01/sNN/` — это то, что получает приложение.

| Код | Что это | Что видит человек |
|---|---|---|
| `practice_after_independent_boundary` (s06 i13–i16, s09 i15, s10 i13–i15, s11 i17) | Задания на вспоминание стоят ПОСЛЕ «самостоятельной проверки» | Ещё несколько заданий после финальной проверки. Порядок не по методике, но всё открывается и засчитывается. **Формальность методики.** |
| `intro_target_not_practiced` (s06 «I am back.», «I am done.»; s07 «I am glad.»; s09 «You are funny.»; s11 «You are not wrong.») | Фраза есть на странице вступления, но в заданиях этого занятия её нет | Видит фразу во вступлении и не тренирует её здесь. **Пробел содержания, не поломка.** |
| `duplicate_answer_id` / `answer_authority_count` / `invalid_independent_boundary` (s09 i18 s01–s04) | В **исходнике** курса у шагов голосового задания i18 («скажите вслух») по 3 записи ответа вместо одной | В **выпуске** у каждого шага ровно один ответ («You are right.», «I am new.», «I am not tired.», «You are kind.»). Человек ничего не заметит. **Гигиена исходника.** |
| `AUDIO_EVIDENCE_UNVERIFIED` (12) | У записи нет отметки, что её прослушали и одобрили | Звук есть и играет: гейт №4 собирает все 11 занятий из бандла. Риск — неподслушанная запись (произношение или обрыв). **Нужна проверка слухом.** |

Итог: реальной поломки опыта в s06–s11 нет. Есть отклонения от правил методики и 12 записей без отметки прослушивания.

## Текст для Codex (переслать одним сообщением)

> Codex, по решению владельца 15.10 V2 показывается в сборке R1 (выпущено 11 занятий en/l01/s01–s11).
> release_precheck красный из-за паузы фабрики (factory_intro_practice HOLD) и подтверждения озвучки.
> В ВЫПУЩЕННЫХ занятиях нужно закрыть 43 замечания и 12 отметок прослушивания. Ниже полный список, s01–s05 и s08 (кроме озвучки) чистые.
> Невыпущенные s12+ сейчас не трогать: гейт будет проверять только выпущенное (≤ потолка), заплатку готовит Ядро.

### en/l01/s06 — 10
- practice_after_independent_boundary [ru] — en:lesson-01:session-06:i13 (purpose="retrieval_practice")
- practice_after_independent_boundary [ru] — en:lesson-01:session-06:i14 (purpose="retrieval_practice")
- practice_after_independent_boundary [ru] — en:lesson-01:session-06:i15 (purpose="retrieval_practice")
- practice_after_independent_boundary [ru] — en:lesson-01:session-06:i16 (purpose="retrieval_practice")
- practice_after_independent_boundary [uk] — en:lesson-01:session-06:i13 (purpose="retrieval_practice")
- practice_after_independent_boundary [uk] — en:lesson-01:session-06:i14 (purpose="retrieval_practice")
- practice_after_independent_boundary [uk] — en:lesson-01:session-06:i15 (purpose="retrieval_practice")
- practice_after_independent_boundary [uk] — en:lesson-01:session-06:i16 (purpose="retrieval_practice")
- intro_target_not_practiced — (занятие целиком) (page=2 target="I am back.")
- intro_target_not_practiced — (занятие целиком) (page=3 target="I am done.")
### en/l01/s07 — 1
- intro_target_not_practiced — (занятие целиком) (page=1 target="I am glad.")
### en/l01/s09 — 23
- duplicate_answer_id — en:lesson-01:session-09:i18:s01 (count=3)
- duplicate_answer_id — en:lesson-01:session-09:i18:s02 (count=3)
- duplicate_answer_id — en:lesson-01:session-09:i18:s03 (count=3)
- duplicate_answer_id — en:lesson-01:session-09:i18:s04 (count=3)
- practice_after_independent_boundary [ru] — en:lesson-01:session-09:i15 (purpose="retrieval_practice")
- invalid_independent_boundary [ru] — en:lesson-01:session-09:i18:s01 (purpose="independent_check" reason="answer_authority_count")
- answer_authority_count [ru] — en:lesson-01:session-09:i18:s01 (actual=3 expected=1)
- invalid_independent_boundary [ru] — en:lesson-01:session-09:i18:s02 (purpose="independent_check" reason="answer_authority_count")
- answer_authority_count [ru] — en:lesson-01:session-09:i18:s02 (actual=3 expected=1)
- invalid_independent_boundary [ru] — en:lesson-01:session-09:i18:s03 (purpose="independent_check" reason="answer_authority_count")
- answer_authority_count [ru] — en:lesson-01:session-09:i18:s03 (actual=3 expected=1)
- invalid_independent_boundary [ru] — en:lesson-01:session-09:i18:s04 (purpose="independent_check" reason="answer_authority_count")
- answer_authority_count [ru] — en:lesson-01:session-09:i18:s04 (actual=3 expected=1)
- practice_after_independent_boundary [uk] — en:lesson-01:session-09:i15 (purpose="retrieval_practice")
- invalid_independent_boundary [uk] — en:lesson-01:session-09:i18:s01 (purpose="independent_check" reason="answer_authority_count")
- answer_authority_count [uk] — en:lesson-01:session-09:i18:s01 (actual=3 expected=1)
- invalid_independent_boundary [uk] — en:lesson-01:session-09:i18:s02 (purpose="independent_check" reason="answer_authority_count")
- answer_authority_count [uk] — en:lesson-01:session-09:i18:s02 (actual=3 expected=1)
- invalid_independent_boundary [uk] — en:lesson-01:session-09:i18:s03 (purpose="independent_check" reason="answer_authority_count")
- answer_authority_count [uk] — en:lesson-01:session-09:i18:s03 (actual=3 expected=1)
- invalid_independent_boundary [uk] — en:lesson-01:session-09:i18:s04 (purpose="independent_check" reason="answer_authority_count")
- answer_authority_count [uk] — en:lesson-01:session-09:i18:s04 (actual=3 expected=1)
- intro_target_not_practiced — (занятие целиком) (page=3 target="You are funny.")
### en/l01/s10 — 6
- practice_after_independent_boundary [ru] — en:lesson-01:session-10:i13 (purpose="retrieval_practice")
- practice_after_independent_boundary [ru] — en:lesson-01:session-10:i14 (purpose="retrieval_practice")
- practice_after_independent_boundary [ru] — en:lesson-01:session-10:i15 (purpose="retrieval_practice")
- practice_after_independent_boundary [uk] — en:lesson-01:session-10:i13 (purpose="retrieval_practice")
- practice_after_independent_boundary [uk] — en:lesson-01:session-10:i14 (purpose="retrieval_practice")
- practice_after_independent_boundary [uk] — en:lesson-01:session-10:i15 (purpose="retrieval_practice")
### en/l01/s11 — 3
- practice_after_independent_boundary [ru] — en:lesson-01:session-11:i17 (purpose="retrieval_practice")
- practice_after_independent_boundary [uk] — en:lesson-01:session-11:i17 (purpose="retrieval_practice")
- intro_target_not_practiced — (занятие целиком) (page=3 target="You are not wrong.")
### озвучка без отметки проверки — 12
- en:lesson-01:session-06:i16:audio
- en:lesson-01:session-06:i19:audio
- en:lesson-01:session-07:i14:audio
- en:lesson-01:session-07:i16:audio
- en:lesson-01:session-08:i17:s02:audio
- en:lesson-01:session-09:i14:audio
- en:lesson-01:session-09:i18:s02:audio
- en:lesson-01:session-09:i18:s04:audio
- en:lesson-01:session-10:i12:audio
- en:lesson-01:session-10:i18:audio
- en:lesson-01:session-11:i17:audio
- en:lesson-01:session-11:i18:audio

## Путь 1 — заплатка, НЕ применена: `V2_GATE_RELEASED_SCOPE.patch`

Применять только по решению владельца утром, одним заходом:

```
git apply docs/phraseman-2.0/handoff/V2_GATE_RELEASED_SCOPE.patch
```

Затем `safe_commit` (`scripts/` и `tests/` — когда угодно; `content/` — согласовать с Codex). `git apply --check` на дереве 15.10 ~02:40 проходит, включая незакоммиченные правки Codex в `build_release.mjs`.

- `scripts/learning_v2_release_parity_gate.mjs`:
  - потолок бандла читается тем же `readBundleCeiling`, что у плана Б;
  - «файлы канон ↔ копия» и «качество» блокируют только замечания в занятиях ≤ потолка; невыпущенное — строкой-справкой;
  - общий файл (не про занятие) блокирует, как раньше;
  - потолок не прочитан — всё строго, по всему курсу;
  - смысловая сверка зовётся только для выпущенных занятий.
- `content/learning-v2-course/pipeline/build_release.mjs` (зона Codex, ~20 строк):
  - пауза фабрики при `--check-source-release` учитывает замечания только переданных `--session`;
  - сборка канона без scope — как раньше, по всему курсу.
- `tests/learning_v2_release_parity_released_scope.test.mjs` (`node --test`, 3/3 на копии):
  - невыпущенное не влияет;
  - выпущенное с замечанием — красное;
  - общий файл — красное;
  - без потолка — строго.

Ожидаемый итог после применения: «файлы» — зелёные (0 в s01–s11), «качество» — 12 в s06–s11, пауза фабрики — 43 в s06–s11. Зелёный — когда Codex закроет список выше.
