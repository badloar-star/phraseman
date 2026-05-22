# Heisenberg UI Locale Audit

Generated: 2026-05-19T15:43:44.364Z
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
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24617 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Если бы я тогда больше учился, я бы сейчас был экспертом`, uk: `Якби я тоді більше вчився, я б зараз був експертом`, es: `Si hubiera estudiado más entonces, ahora sería expe
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24649 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Мне нужно освежить свои знания английского`, uk: `Мені потрібно освіжити свої знання англійської`, es: `Necesito repasar mi inglés`, explanationsES: [ `Correcto. Brush up on
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24681 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Что мне нужно, так это хороший отдых`, uk: `Що мені потрібно, так це гарний відпочинок`, es: `Lo que necesito es un buen descanso`, explanationsES: [ `Tedious significa abur
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24713 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Мне нужно подстричься (чтобы кто-то это сделал)`, uk: `Мені потрібно підстригтися (щоб хтось це зробив)`, es: `Necesito que me corten el pelo`, explanationsES: [ `I need to 
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24745 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Хватит ходить вокруг да около`, uk: `Досить ходити навколо`, es: `Deja de andarte con rodeos`, explanationsES: [ `Stop walking around and about describe caminar, no evitar e
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24777 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Важно, чтобы он присутствовал на встрече`, uk: `Важливо, щоб він був присутнім на зустрічі`, es: `Es importante que él esté presente en la reunión`, explanationsES: [ `Corre
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24809 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Он и не подозревал, что его ждет сюрприз`, uk: `Він і не підозрював, що на нього чекає сюрприз`, es: `Él ni sospechaba que le esperaba una sorpresa`, explanationsES: [ `Litt
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24841 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Ты попал в самую точку (сказал совершенно верно)`, uk: `Ти влучив у саму точку (сказав абсолютно правильно)`, es: `Diste justo en el clavo`, explanationsES: [ `Correcto. Hit
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24873 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Я уговорил его починить мой компьютер`, uk: `Я вмовив його полагодити мій комп\'ютер`, es: `Conseguí que él arreglara mi ordenador`, explanationsES: [ `Correcto. Got him to 
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24905 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Нет худа без добра (скрытое благословение)`, uk: `Немає лиха без добра (приховане благословення)`, es: `No hay mal que por bien no venga`, explanationsES: [ `Correcto. A ble
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24937 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Он, как утверждают, совершил это преступление`, uk: `Він, як стверджують, скоїв цей злочин`, es: `Presuntamente, él cometió este delito`, explanationsES: [ `Correcto. Allege
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:24969 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Не успел я выйти, как пошел дождь`, uk: `Не встиг я вийти, як пішов дощ`, es: `Apenas había salido cuando empezó a llover`, explanationsES: [ `No sooner I had left pierde la
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25001 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Ты не туда обратился (ищешь не там/ошибаешься адресом)`, uk: `Ти не туди звернувся (шукаєш не там/помиляєшся адресою)`, es: `Estás buscando en el lugar equivocado`, explanat
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25033 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Я предлагаю ей пойти туда завтра`, uk: `Я пропоную їй піти туди завтра`, es: `Sugiero que ella vaya allí mañana`, explanationsES: [ `After suggest in this formal pattern, th
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25065 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Я редко видел такую изысканную красоту`, uk: `Я рідко бачив таку вишукану красу`, es: `Rara vez he visto una belleza tan exquisita`, explanationsES: [ `Las palabras son corr
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25097 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Мы отправились в путь на рассвете`, uk: `Ми вирушили в дорогу на світанку`, es: `Partimos al amanecer`, explanationsES: [ `Correcto. Set off at dawn es natural para empezar 
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25129 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Мені неприємно (я обурююсь), коли мені кажуть, що робити`, uk: `Я обурений (мені неприємно), коли мені кажуть, що робити`, es: `Me molesta que me digan qué hacer`, explanati
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25161 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Если бы я был умнее (вообще), я бы не купил ту машину (в прошлом)`, uk: `Якби я був розумнішим (взагалі), я б не купив ту машину (в минулому)`, es: `Si fuera más listo, no h
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25193 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Он, как утверждают, украл эти документы`, uk: `Він, як стверджують, украв ці документи`, es: `Presuntamente, él robó estos documentos`, explanationsES: [ `Correcto. Allegedl
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25225 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Я настаиваю на том, чтобы он присутствовал на встрече`, uk: `Я наполягаю на тому, щоб він був присутнім на зустрічі`, es: `Insisto en que él esté presente en la reunión`, ex
- [warning] locale-object-missing-all-planned-locales app/quiz_data.ts:25257 missing: pt-BR, vi, id, tr, pl: Object literal has ru/uk/es locale keys, but planned interface locales are not present yet. | { ru: `Мне нужно освежить свои знания английского перед поездкой`, uk: `Мені потрібно освіжити свої знання англійської перед поїздкою`, es: `Necesito repasar mi inglés antes del vi
