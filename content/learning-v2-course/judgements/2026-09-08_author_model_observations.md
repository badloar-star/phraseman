# Наблюдения за моделями: английский Learning V2

Это журнал фактической работы, а не доказательство абсолютного превосходства модели или минимальной цены. Точные токены/стоимость отдельных вызовов здесь не измерены; размер файла их не заменяет.

## Текущая схема

- Автор RU: встроенный агент Astra, medium. Root сохраняет источник и вносит конкретные правки; агент не пишет в общее дерево.
- Отдельный свежий судья вкуса/юмора: Sol, high. Каждый новый мастер получает отдельного судью; цитаты и hash проверяет код.
- Ученик без ключей, педагог, читатель: Terra, medium. Ответы ученика root сопоставляет с реальными ключами, а не доверяет слову PASS.
- Проверка языковых фактов и native UK: Sol, medium. Проверка текста не подтверждает реальную запись или интерфейс.
- Автор UK: Terra, medium; обязательная независимая native-проверка. Обнаруженный перенос русских букв в украинские звуковые сравнения исправлен в источниках и промпте локализации.
- Подсчёты, hash, сборка и сравнение проекций: прямые локальные скрипты без LLM. Никаких проектных API-ключей для reasoning/generation/review.

## Последовательные наблюдения за RU автором Astra

| Сессия | Исправления после первого предложения | Проверенный результат |
|---|---|---|
| L3 S2 | Root сменил повтор соседней голосовой фразы на вопрос; после этого независимые проверки приняли мастер | RU и UK в локальном макете |
| L3 S3 | Root уточнил ситуацию вопроса о текущем месте табурета вместо предложения свободного угла | Пять RU PASS; native UK после собственных исправлений; локальный макет |
| L3 S4 | Root сделал показ двери бытовым; судья фактов поймал неточное указание места звука в willow/window, исправлено и перепроверено | Пять RU PASS; native UK после исправления согласования; локальный макет |

Во всех трёх RU предложениях автор точно указал длины трёх объяснений; root сверил их скриптом. Это полезный сигнал соблюдения формата, но не доказательство отсутствия смысловых ошибок. S4 прямо показывает необходимость независимого судьи фактов.

Эти три задачи различались по типу и словам. Сравнивать их с более ранним Sol-автором как слепой парный тест нельзя. Пока Astra остаётся рабочим выбором автора благодаря наблюдаемому качеству и небольшим точечным правкам, а не заявлению «самый дешёвый». Для честного пересмотра цены нужны реальные доступные данные расхода и одинаковые задания.

## Предварительное планирование

Terra и Sol medium составляли отдельные предложения планов; Sol high независимо проверял границы, точные источники возвратов, однозначные варианты и поддерживаемые механики. Даже принятый план не является готовой сессией. Исправления существующих форм, ошибочно объявленных новыми, и спорных нормативных дистракторов сохраняются в actual receipts, а не скрываются за общим PASS.


### L3 S5 — observed revision cost
- Astra medium original RU: accurate original intro counts256/261/271; one root context correction in task14 before initial review. Fresh Sol-high taste returned REVISE for repetitive explanation rhythm and unused repair premise. Author rewrote intro2 as a complete paragraph; root removed unused premise. Taste then PASS with concrete wall/article and floor/mopping examples.
- Final RU body counts256/282/271. Root initially left old author selfcheck counts after integrating new body; pedagogy copied stale counts once. Root corrected only metadata, reviewer then counted actual bodies. This was integration/verification overhead, not an author baseline count failure. Future edits must update derived selfcheck numbers before final hash/review dispatch.
- Five RU actual reviews PASS current SHA00ce11134678220139e756f1c13dd6d08690b67b87089a633c121cb832f6e371. Terra-medium UK proposal counted248/300/263 correctly by direct script; independent native review pending.
- No exact token/cost measurement or controlled cheapest-model claim.

- S5 final native review PASS, canonical local preview main117 verified. Complete taste response schema was recovered after builder correctly refused missing fields; no content or gate relaxation.

## 2026-09-12 — S9 actual routing and S10 cost discipline

S9 used Astra-medium for its bounded editor, Sol-high for taste, truth and
native UK review, and Sol-medium for reader, pedagogy, blind learner and UK
authoring. These are actual model assignments, not a controlled cost test.
There is no measured evidence that increasing the three cheaper review roles
from Terra to Sol was economical. S10 restores Terra-medium for those roles
and UK authoring; Sol-medium remains the ordinary factual/native reviewer,
with escalation tied to a concrete unresolved finding. Taste stays Sol-high.

S9 required two bounded editorial passes. Truth caught mandatory softness in
armchair and overgeneral article wording; reader caught an unclear heading;
taste guided simpler intro3 copy. UK author reintroduced the softness claim,
which root removed before native review. The native review also corrected
складний→складаний and unnatural wording; it retracted an archived sentence
count rule after current-authority clarification. This is observed repair
overhead, not proof of any model's minimum cost or universal superiority.

Authors now write only their assigned draft/localization file and explicitly
return solewriter ownership. Root materializes final sources and actual review
receipts, and verifies hashes/answers. This avoids returning and copying the
same full Markdown through conversation. No simultaneous source writers.

### S10 Terra UK author: handoff integrity finding (2026-09-12)

The author reported SHA e0e54b... that was not command output. Fresh root/native reviewer hashing found da325405d2565077fe92e22d94c1a1ccfaa6b2005563f4498466db06341d3476. Asked read-only, the author explicitly admitted the reported hash was erroneous/uncomputed: actual pre-final-edit command gave712ba8..., then a metadata wording edit was made without rehashing. Native review continues on independently measured currentbytes. No falsehash was accepted as a reviewed artifact. Model-cost implications remain observational: always compute final fingerprints deterministically after handback; never copy an author's claimed hash into release evidence without verification. Full native quality verdict still pending at this entry.

### S11–S13 observed authoring/review overhead (2026-09-12)

Astra-medium RU writer: S11 and S12 passed the five independent roles on initial source. S13 needed one bounded two-intro rewrite after a fresh Sol-high taste judge found scene detail inside explanatory bodies. Subsequent actual reader/learner/pedagogy/truth/taste checks passed. Terra-medium reader/learner/pedagogy remain sufficient on these observations; root still mechanically compares blind answers and counts.

Terra-medium UK author: S11 needed four native wording fixes; S12 needed five groups (documentation jargon in learnerfeedback, station-tuning wording, punctuation, waiting-time phrasing, metadata); S13 initial native review needed concrete reckless onset feedback plus punctuation, then two UK intro bodies followed the RU rewrite. Sol-medium native review remains necessary. This is repair-overhead evidence, not a controlled comparison or proof of minimum token cost; actual per-model token costs were not measured. Keep bounded packets, one source writer, and direct root hash measurement. Fresh-context taste agents /root/s12_taste and /root/s13_taste used Sol-high and exact current-source quotation checks.

## 2026-09-12 — S14 and S15 observations

S14 Astra medium RU required one factual clarification and two scene-prompt repairs. The independent Sol truth role caught the universal word-count error; fresh Sol high taste caught artificial motivations. S15 Astra medium RU passed all five independent roles on its first draft. Terra medium S14 UK required four native fix groups, all confirmed resolved by Sol medium. These are observed editorial outcomes, not controlled token-cost measurements; they do not establish a cheapest model. Keep separate factual and taste reviews, and retain exact initial/delta receipts rather than replacing history with a final score.

S16 UK Sol medium author trial: five independently confirmed repair groups, then native delta PASS. Different checkpoint task and fresh author context make comparison with Terra S15's six groups uncontrolled. No demonstrated cost advantage; no token-price measurement available. Retain independent native review and ordinary Terra author routing until a comparable trial supports a change.

S17: Astra medium RU initial passed reader/blind/pedagogy/truth; fresh Sol-high taste caught unnatural coin payment scene and dry intro2. Bounded Astra editor solved these but introduced two Russian instruction wording issues; root exact fixes passed independent deltas. Terra medium UK had no learner-facing findings from full Sol-medium native review, only two internal self-check headings corrected. Model comparisons remain observational, not controlled minimum-token-cost evidence. A fresh Terra reader independently retold3pages and solved17tasks after editing; root compared against compiledkeys. Keep separate semantic and taste reviewers.

## 2026-09-12 — L3 S18 observation
Astra medium RU draft required a bounded three-line scene/intro edit, then one punctuation repair. Terra medium UK required three native repair groups (four occurrences): scene count, container definition, internal wording. Actual independent current reviews PASS. Author/model tasks differ; no controlled token-cost or quality ranking follows. Keep Astra RU, Terra reader/blind/pedagogy/UK, Sol medium truth/native, fresh Sol high taste. No project API used.

## 2026-09-12 — L3 S19 observation
Astra medium RU required exactly two instruction repairs: combined listening prompt leak and artificial final request; intros and all English answers unchanged. Terra medium UK required one missing positive phonetic target cue plus one internal wording repair. Terra blind reviewer twice misstated report details (boxes-rule wording, number of card/listen pairs); actual clarification corrected both, answer keys and qualitative PASS unchanged. Preserve independent pedagogy/truth/native review; receipt assertions alone are insufficient. No controlled token-cost ranking measured.

## 2026-09-12 L3S20 observation

Astra medium RU author: initial four content reviews PASS; fresh Sol high taste initially BLOCK then literal recheck REVISE (unstated courier belief was a reviewer overreach). Bounded clean edit improved four instructions/intro2; one further factual plural-referent repair confirmed by pedagogy and truth. Final five actual independent PASS, taste equal/voice4 with two on-topic quotes. Terra medium UK: initial draft required two positive phonetic-cue repairs and one internal native wording repair; independent Sol medium full+delta PASS. Updated prevention prompts to avoid interpreting the Cyrillic-r identity ban as a ban on naming English r. Root also corrected receipt field shape before admission; deterministic gate caught it. Independent Terra JS helper reviewer corrected its own false relative-path finding after checking the factory base. No controlled token-cost or price ranking was measured. Current routing retained on observed scope performance, not a claim of proven cheapest models.

### 2026-09-12 S21 admitted133
Astra medium clean RU draft plus one bounded four-line edit; Terra reader/blind/pedagogy PASS; Sol medium truth and UK-native full+delta PASS; fresh Sol high taste final equal/voice4 with actual natural humour quote. Initial taste incorrectly challenged required precise definitions and pillow head/bed sense, then retracted; optional scene register was simplified in same edit. Truth corrected an inaccurate conditional-feedback assumption after actual compiled/runtime boundary evidence. UK Terra missed natural phrase все решта and repeated Повернене glass despite current guidance; native caught both, exact fixes passed. Cheap JS reviewer initially miscounted physical lines due verifier escaping, retracted after char-code check. No measured controlled token-cost ranking; retain routing as observed scope choice, not claim cheapest. Main/native verified133. No API/audio/browser spend or review claimed.

## 2026-09-12 — S22/S23 and S24 RU observations

S22 Astra medium RU needed one clean intro rewrite after confirmed taste findings; actual pedagogy initially overgeneralized one local plural explanation and retracted on full-paragraph reread. S22 Terra UK made late filler edits after announcing handback; native Sol medium caught unnecessary padding plus two wording/sense issues. Ownership and raw210–320 length rules reiterated, exact repair independently verified.

S23 Astra medium RU needed five intro-related lines revised to remove artificial size framing; every practice item and the natural soon humour stayed. All current independent roles passed. Terra UK required13occurrence repairs in11groups: contextual utensil terminology, two internal calques and a dropped question mark. Native Sol initially used an unjustified blanket Russianism claim; dictionary evidence and second literal review corrected the rationale to contextual sense. Cheap Terra JS reviewer caught stale prior-source evidence mistakenly retained at the current pedagogy receipt top level. Actual independent pedagogy recheck supplied current evidence; review history remained untouched.

S24 Astra medium RU passed all five independent roles on its first draft. Terra reader-only comprehension and blind20step walkthrough passed, with exactkeyverification; fresh Sol high taste equal/voice4. Ukrainian native review is still pending at this observation. These are observed editing overheads, not a controlled price/token benchmark. No per-model token costs were measured; no cheapest-model claim. Current routing stays Astra medium RU, Terra medium reader/blind/pedagogy/UK, Sol medium truth/native, fresh Sol high taste. Pure checks use local scripts without model/API spend.

S24 completed136: Terra UK required one confirmed prompt naturalness repair; Sol native full+exactdelta PASS. English master remained the first Astra draft with all five actualPASS. No controlled token-cost measurement; observations do not establish a cheapestmodel.
