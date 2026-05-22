# Heisenberg UI Locale Audit

Generated: 2026-05-19T15:38:47.144Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 615
- triLang calls: 1548
- Static triLang calls: 1548
- Dynamic triLang calls: 0
- Legacy/local ru/uk/es helper calls: 0
- Locale object findings: 22
- triLang missing locale units: 0
- triLang calls missing all planned locales: 0
- Helper missing locale units: 0
- Locale object missing locale units: 110
- Locale objects missing all planned locales: 22
- Bundle missing locale units: 0

## Finding Codes
- locale-object-missing-all-planned-locales: 22

## Top Files
- app/quiz_data.ts: 22 findings, 110 missing locale units

## First Findings
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24585 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Если ты будешь халтурить (срезать углы), качество пострадает`, uk: `Якщо ти будеш халтурити (зрізати кути), якість постраждає`, es: `Si haces las cosas a medias, la calidad 
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24622 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Если бы я тогда больше учился, я бы сейчас был экспертом`, uk: `Якби я тоді більше вчився, я б зараз був експертом`, es: `Si hubiera estudiado más entonces, ahora sería expe
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24659 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Мне нужно освежить свои знания английского`, uk: `Мені потрібно освіжити свої знання англійської`, es: `Necesito repasar mi inglés`, sourceLocales: { es: { prompt: `Necesito
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24696 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Что мне нужно, так это хороший отдых`, uk: `Що мені потрібно, так це гарний відпочинок`, es: `Lo que necesito es un buen descanso`, sourceLocales: { es: { prompt: `Lo que ne
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24733 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Мне нужно подстричься (чтобы кто-то это сделал)`, uk: `Мені потрібно підстригтися (щоб хтось це зробив)`, es: `Necesito que me corten el pelo`, sourceLocales: { es: { prompt
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24770 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Хватит ходить вокруг да около`, uk: `Досить ходити навколо`, es: `Deja de andarte con rodeos`, sourceLocales: { es: { prompt: `Deja de andarte con rodeos`, explanations: [ `
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24807 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Важно, чтобы он присутствовал на встрече`, uk: `Важливо, щоб він був присутнім на зустрічі`, es: `Es importante que él esté presente en la reunión`, sourceLocales: { es: { p
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24844 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Он и не подозревал, что его ждет сюрприз`, uk: `Він і не підозрював, що на нього чекає сюрприз`, es: `Él ni sospechaba que le esperaba una sorpresa`, sourceLocales: { es: { 
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24881 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Ты попал в самую точку (сказал совершенно верно)`, uk: `Ти влучив у саму точку (сказав абсолютно правильно)`, es: `Diste justo en el clavo`, sourceLocales: { es: { prompt: `
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24918 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Я уговорил его починить мой компьютер`, uk: `Я вмовив його полагодити мій комп\'ютер`, es: `Conseguí que él arreglara mi ordenador`, sourceLocales: { es: { prompt: `Conseguí
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24955 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Нет худа без добра (скрытое благословение)`, uk: `Немає лиха без добра (приховане благословення)`, es: `No hay mal que por bien no venga`, sourceLocales: { es: { prompt: `No
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24992 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Он, как утверждают, совершил это преступление`, uk: `Він, як стверджують, скоїв цей злочин`, es: `Presuntamente, él cometió este delito`, sourceLocales: { es: { prompt: `Pre
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25029 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Не успел я выйти, как пошел дождь`, uk: `Не встиг я вийти, як пішов дощ`, es: `Apenas había salido cuando empezó a llover`, sourceLocales: { es: { prompt: `Apenas había sali
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25066 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Ты не туда обратился (ищешь не там/ошибаешься адресом)`, uk: `Ти не туди звернувся (шукаєш не там/помиляєшся адресою)`, es: `Estás buscando en el lugar equivocado`, sourceLo
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25103 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Я предлагаю ей пойти туда завтра`, uk: `Я пропоную їй піти туди завтра`, es: `Sugiero que ella vaya allí mañana`, sourceLocales: { es: { prompt: `Sugiero que ella vaya allí 
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25140 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Я редко видел такую изысканную красоту`, uk: `Я рідко бачив таку вишукану красу`, es: `Rara vez he visto una belleza tan exquisita`, sourceLocales: { es: { prompt: `Rara vez
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25177 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Мы отправились в путь на рассвете`, uk: `Ми вирушили в дорогу на світанку`, es: `Partimos al amanecer`, sourceLocales: { es: { prompt: `Partimos al amanecer`, explanations: 
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25214 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Мені неприємно (я обурююсь), коли мені кажуть, що робити`, uk: `Я обурений (мені неприємно), коли мені кажуть, що робити`, es: `Me molesta que me digan qué hacer`, sourceLoc
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25251 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Если бы я был умнее (вообще), я бы не купил ту машину (в прошлом)`, uk: `Якби я був розумнішим (взагалі), я б не купив ту машину (в минулому)`, es: `Si fuera más listo, no h
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25288 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Он, как утверждают, украл эти документы`, uk: `Він, як стверджують, украв ці документи`, es: `Presuntamente, él robó estos documentos`, sourceLocales: { es: { prompt: `Presu
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25325 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Я настаиваю на том, чтобы он присутствовал на встрече`, uk: `Я наполягаю на тому, щоб він був присутнім на зустрічі`, es: `Insisto en que él esté presente en la reunión`, so
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25362 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Мне нужно освежить свои знания английского перед поездкой`, uk: `Мені потрібно освіжити свої знання англійської перед поїздкою`, es: `Necesito repasar mi inglés antes del vi
