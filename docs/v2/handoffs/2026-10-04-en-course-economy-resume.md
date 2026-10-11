# Learning V2 English — переход в чистый чат, 2026-10-04

> **2026-10-08: ENGLISH AUTHORING HOLD.** Владелец остановил написание и запросил глобальный аудит. Старые записи PASS/next-session ниже являются историей, не разрешением продолжать. Актуальная точка: [2026-10-08-en-global-audit-hold.md](2026-10-08-en-global-audit-hold.md). Аудит охватил 186 занятий и установил чужие тексты ревью при актуальных хэшах, ошибки проекций и локализации. Структурный прототип нового процесса не разрешает выпуск; массовое написание не возобновлять.

Новый локальный чат: `01a1086d-8c7b-79d3-a187-b6adccf10636`, «Learning V2 — чистый старт и экономия». Создан без наследования истории; runtime подтвердил active/inProgress. Его исходный каталог projectless, команды по курсу должны явно использовать `C:/appsprojects/phraseman`.

### Обновление распоряжения владельца, 2026-10-04

После перехода владелец явно поручил продолжать в новом чате до готовности всех 32×56=1792 сессий. S05 — измерительный этап, после её выпуска нужно сразу переходить к S06 и продолжать весь курс; отдельного подтверждения после каждой сессии не требуется. 2026-10-04 обновлена существующая heartbeat-автоматизация `4`: каждые 20 минут координатор проверяет новый английский чат, возобновляет его при незавершённом курсе и простое, не вмешивается в активный turn. Старый английский чат исключён из пробуждений. Все обязательные проверки, экономный контур и прямые команды владельца остановиться сохраняют приоритет. Временные лимиты/внешние ошибки не обходятся повторными слепыми попытками. Автоматизация ACTIVE подтверждена инструментом и сохранённым TOML.

## Решение владельца

После S04 владелец остановил написание курса из-за расхода лимита и попросил аудит, ускорение и целевое сокращение токенов на 80% при сохранении качества. Затем прямо разрешил продолжить в новом чистом чате. Старый чат больше не пишет сессии параллельно. В нём большая цель оставлена paused; новый чат получает продолжение работы, а не прежнюю историю диалога.

Сначала закрепить экономный процесс с сохранением всех требований. Затем провести L4 S05 как измерительный запуск. Экономия 80% — цель, а не установленный результат. Не обещать отсутствие потери качества без проверки.

## Рабочая область и фактическая граница

- Репозиторий: `C:/appsprojects/phraseman`.
- Ветка на момент передачи: `feature/referral-roulette`.
- HEAD: `1584ce40ed34fe34f4ecb525d1afe02173b287b7`.
- Worktree сильно загрязнён ранее существовавшей работой. Сохранить её; не создавать коммит, push или deploy в рамках перехода.
- Последняя сессия: `en/l04/s04`, RU «Почта на аудиопрогулке».
- Источник: `content/learning-v2-course/sessions/en/l04/s04/`.
- Канонический release: `content/learning-v2-course/release/en/l04/s04/`.
- Native: `modules/learning-v2/content/factory_native/generated_release/en/l04/s04/`.
- Последняя локальная сборка содержит 172 сессии: L1–L3 целиком, L4 S01–S04.
- S05 на момент передачи не создана. Следующая точная работа — `en/l04/s05`, по существующей строке плана, без выдумывания темы.
- Макет открыт у владельца: `http://127.0.0.1:4318/index.html?v=20261004-l4-s04-release`.
- Локальный Python HTTP server был поднят на 127.0.0.1:4318. Проверять доступность перед навигацией, не запускать дубликат.
- В старом чате завершилась сборка и HTTP-проверка; визуальная проверка S04 после восстановления сервера не была завершена. Первым коротким действием проверить её в открытом макете.

## Проверенные при передаче идентичности S04

Свежий read `status.json` подтвердил converged=true, needsHumanReview=false, brokenTasks=[] и buildProblems=[]. Семь PASS записаны: learner, reader, pedagogy, progression, nonsense, taste, locale_uk. Квитанции относятся к текущим хэшам, но в новом чате нужно проверить readiness, а не автоматически считать файл статуса достаточным.

SHA-256, повторно вычислены при переходе:

```text
final.ru.md          EF44D1D0F228767A3BB542C4BF1104D0646B82B412F4A4FAB377D48B26D608FE
final.uk.md          08CC2CD3EC7B93336CF3CEDF83975F35556AA795EBE2ED06DA2AC327ADDBD498
practice.atomic.json FBF3218C49D47B58D98DA8047973EA3BB5FE5DB07A24B64B682ED67F137A8A39
preauthoring.json    8A37EDEB522727950437CF908EB5664A8259585C236FA7470F694ABE8072863E
```

S04: три интро и 17 практических заданий RU/UK. Исправлена общая ошибка парсинга: третий intro раньше захватывал практику и показывал 22 варианта. Два парсера теперь прекращают intro на следующем разделе `##`. Регрессия RED 3/3/22 → GREEN 3/3/3:

- `content/learning-v2-course/pipeline/build_release.mjs`
- `scripts/build_learning_v2_factory_native_manifest.mjs`
- `content/learning-v2-course/pipeline/build_release_intro_boundary.test.mjs`
- `tests/learning_v2_factory_native_intro_boundary.test.mjs`

Последний завершённый контур: 36/36 Node tests PASS; single-phrase, curriculum, lexical progression/density/assignments PASS; manifest FRESH; ingress PASS; четыре canonical/native файла S04 побайтно идентичны. Тяжёлый Jest `learning_v2_factory_native_projection_v1.test.ts` не выдал вывода за 120 секунд и был остановлен: его PASS не заявлен. Проверки на физическом устройстве этим не доказаны.

## Источники метода

Авторитет — текущие инструкции владельца, применимый `AGENTS.md`, папка «Кодекс» на рабочем столе, текущие документы фабрики и решения владельца. Не использовать «Густава» или иной чужой метод. Точные 33 прочитанных источника и их хэши перечислены в `s04/preauthoring.json` → `documentHashes`; локальные сокращённые имена DesktopCodex нужно разрешить в реальные пути.

Ключевые текущие источники:

- `AGENTS.md`
- `content/learning-v2-course/ГЛАВНОЕ_ТРЕБОВАНИЕ.md`
- `content/learning-v2-course/КОНСТИТУЦИЯ.md`
- `content/learning-v2-course/МЕТОД_РАБОТЫ.md`
- `content/learning-v2-course/СВОД_ГРАММАТИКИ_КЕМБРИДЖ.md`
- `content/learning-v2-course/curriculum/en/ПЛАН_КУРСА.md`
- `content/learning-v2-course/pipeline/prompts/`
- `docs/v2/СТАРТ В2.md`, `БИБЛИЯ_ТЕКСТОВ_LEARNING_V2.ru.md`, `LESSON_DESIGN_RULES.ru.md`, `КАК_ВЫПУСКАТЬ_СЕССИЮ_ЧЕКЛИСТ.ru.md`
- `content/learning-v2-course/judgements/owner/`, особенно ясное начало, progression/exact audio meaning и одна фраза на interaction.

`docs/v2/HANDOVER.md` содержит большую историческую запись (~1.75 MB), включая отменённые и другие языковые ветки. Не принимать старые исторические утверждения за текущую готовность; сопоставлять с этой датированной передачей и файлами. Эта передача не заменяет действующие нормативные требования.

## Качество, которое нужно сохранить

Перед каждой новой сессией независимый preauthoring guardian проверяет актуальные инструкции и направляет автора. Нельзя заменять требование перечитывания инструкций одним старым воспоминанием после сжатия контекста.

- Ясное человеческое начало и единая понятная ситуация; интро готовит именно текущую практику, без повторяемого шаблонного телефона или декоративного сюжета.
- Новое слово/смысл строго по строке плана; проверить весь предшествующий learner-facing диапазон на прежнее введение, новые ситуации и разрешённый retrieval.
- Word-first, затем фразы, постепенное снятие опор, независимый финал.
- Ровно одна оцениваемая целевая фраза/audio-target на interaction. Нельзя объединять две-три фразы. Speed Match — только в разрешённом отдельном формате.
- Слуховые варианты показывают точные локализованные значения, соответствующие аудио, без добавленного «рядом», если в аудио его нет.
- Дистракторы проверяют заявленный навык и дают один корректный ответ; не вставлять в варианты списки переводов или объяснения.
- Уместный юмор и естественный RU/UK текст; отдельный taste/humor вердикт обязателен.
- IDs, English targets, аудио и ответные ключи RU/UK согласованы.
- Все обязательные судьи дают свежие verdicts для текущих хэшей; автор не утверждает собственную работу. Никакого обхода качества или устаревших PASS.
- После каждого допуска синхронно обновить canonical release, native и макет; оставить макет открытым, назвать уроки содержательно.

## Экономный контур: предложение для закрепления и измерения

1. Не наследовать историю старого чата агентами: использовать `fork_turns="none"` и ограниченный пакет ответственности.
2. Координатор сохраняет компактный индекс действующих требований и хэши источников. Guardian сохраняет полноту проверки, но выдаёт короткий пакет автора, а не копию всей истории.
3. Один автор на Terra/medium; механика выполняется скриптами без LLM. Не заявлять выбор модели без подтверждённого runtime-параметра.
4. Сначала детерминированные сессионные gates; судьи запускаются только после их PASS.
5. При разрешённом действующим контрактом объединении — три независимых Terra/medium проверки: learner+reader; pedagogy+progression; nonsense+taste+UK. Сохранить все семь отдельных, hash-bound verdicts. Если контракт требует иного, не обходить его ради экономии.
6. Пакеты судей включают финальный learner text, необходимую семантическую проекцию atomic и относящиеся к роли требования. Не выдавать одному судье произвольный сокращённый материал, из которого невозможно проверить его обязательства.
7. Собрать замечания в один ремонтный проход; обновлять проверки после изменения хэшей. Повторный пакет может включать diff, но итоговый PASS относится ко всей текущей версии.
8. Не повторять неизменённые широкие инфраструктурные тесты на каждом контентном шаге; обязательные checks не пропускать. Полный регрессионный контур нужен при правке фабрики или по действующему release contract.
9. Sol — только для обоснованного критического риска/конфликта, а не обычной координации. Один writer, ограниченная параллельность read-only.
10. Большие логи, хэши, промежуточные JSON остаются в файлах. В чат — краткий результат и путь к доказательствам.
11. Замерять расход и время до/после S05, включая guardian, автора, всех судей, repair и сборку. Не выводить расход одной сессии из процента общего недельного лимита аккаунта.

Предыдущий аудит увидел 17% общего недельного расхода и 49 685 007 накопленных tokensUsed у всей многонедельной цели. Это не доказательство расхода S04. Оценки tokens по размеру UTF-8-файлов были приближёнными; бюджет 350–500k и 20–30 минут был предложением без измерительной валидации. Для сравнения нужен сопоставимый завершённый запуск, а не обещанная цифра.

## Следующий шаг

Коротко проверить S04/readiness/макет, закрепить регламент без снижения обязательных гейтов, снять baseline и провести только S05 как первый измерительный запуск нового процесса. Если quality gates закрыты, выпускать её и обновлять макет; не останавливаться на промежуточном PASS. Отчёт владельцу: качество, найденные дефекты, расходы с объяснением доступности метрик, время и рекомендация модели. Дальнейший большой курс остаётся миссией 32×56.

API firewall обязателен: никаких проектных ключей для генерации/судей/анализа; аудио через OpenAI допускается только по отдельному явному запросу с защитным флагом. Переход не разрешает новые TTS-затраты, production deploy, Firestore writes, удаление чужих файлов или изменения других языков.

## Компактная точка продолжения — 2026-10-04, S06

- Последняя выпущенная сессия: `en/l04/s06`; следующая фактическая незакрытая: `en/l04/s07` (перед автором нужен свежий guardian по актуальной строке плана).
- S06 readiness: `{"ready":true,"issues":[]}`. Финальный snapshot: RU `22DD2917E6FAF4454BC6EEB709EA70D909BAAC44343802DA75EFA8BEE4B0B8DB`, UK `3B07015D87141166B2D71F6D6F1CA83A63E97805A8CE41357FFC16C7DFF2DD64`, atomic `9250AE63B9FBFF07F7C025009F58A949F33B6628A05BC79829A96E9D496817FF`.
- Evidence: `s06/preauthoring.json`, семь `s06/final.judge_*.json` плюс `s06/locales.judge.json`, `s06/status.json`, `release/en/l04/s06/`; release построен без проблем (3 intro, 12 tasks, RU+UK). Native manifest: `scripts/build_learning_v2_factory_native_manifest.mjs --check` → `FRESH`; mockup пересобран: 174 сессии, single-phrase PASS.
- Обязательные findings S06: initial clinic была вынесена из здания; task-10 tile расходилась с atomic (`bakery` вместо `supermarket`); reader wording предполагал прежнее знакомство; intro3/i04 имели exact target repeat. Все исправлены до финального snapshot и прошли новый guardian + семь hash-bound PASS verdicts. Не переносить старые receipts на новые хэши.
- Визуальный файл обновлён: `content/learning-v2-course/mockup/index.html`; встроенный browser заблокировал прямой `file://` просмотр, поэтому визуальное подтверждение через UI не получено. Не обходить этот browser policy. Старый localhost-кэш не считать доказательством.
- Расход: достоверной метрики токенов/стоимости по отдельным агентам и retry нет; не выводить её из общего account usage. S06 был первым полным замером процесса, но для baseline/final нужны инструментированные per-run counters.

## Компактная точка продолжения — S07

- Последняя выпущенная: `en/l04/s07`; следующая: `en/l04/s08` (сначала fresh guardian).
- S07 `sessionReadiness`: `{"ready":true,"issues":[]}`. Release: 3 intro / 12 tasks RU+UK, без build problems. Native manifest: `FRESH`; mockup: 175 сессий, single-phrase PASS.
- Final hashes: RU `2BA12EEA6345D6E8054A543F895CBDC32D558A88DFB0E6B00253E5605A089B2C`; UK `39CEFA6CA074A44D56D5699D458E6CFECC3E81E7012F53881ADE485CC0D3A7C4`; atomic `A22FE7A661E756273E0F4FB27F74A260B46D70B3B426792C2AF1C3B03DC3AFE5`.
- Findings repaired before final seven hash-bound PASS: prohibited learner-facing «без подсказки» in task 12 and exact intro2/i04 target repeat. Never reuse S07 prior receipts/status after source changes.

## Компактная точка продолжения — S08

- Последняя выпущенная: `en/l04/s08`; следующая: `en/l04/s09` (fresh guardian обязателен перед authoring).
- S08 `sessionReadiness`: `{"ready":true,"issues":[]}`; release: 3 intro / 12 tasks RU+UK, без build problems; native manifest `FRESH`; mockup: 176 сессий, single-phrase PASS.
- Финальный snapshot: RU `A926F3FA231F200F71B3F07C6563662A14E358C3E007A91E224BC0E4ED163917`; UK `778ED5FD673F8BA13BCC2C3EE56CDE314DD4E6F2AD4F45C525DE8497EA30C803`; atomic `3BA32B98A75559024971772FC69ECFF718255EEB30476FB6BEB036C98AC4544A`.
- Исправленные findings: singular/plural cue/feedback conflicts i04/i09; русский assembly heading в UK locale; exact intro3/i12 target repeat. Финальные семь receipts PASS только на финальном snapshot.

## Компактная точка продолжения — S09

- Последняя выпущенная: `en/l04/s09`; следующая: `en/l04/s10` (перед authoring обязателен fresh guardian).
- S09 `sessionReadiness`: `{"ready":true,"issues":[]}`. Канонический release без `--out`: 3 intro / 12 tasks RU+UK, без build problems. Mockup: 177 сессий, single-phrase PASS; native manifest `FRESH`.
- Финальный snapshot: RU `BAA46BDACEDFEA262453A6C781B1840D2872BBF44F02E0141D95B069900D327D`; UK `BCA8F560A4F522B1788B7AAECCCBF966B6B7B15CD3A7D877DD0F0560F9E65E96`; atomic `A07B9778D6A600592514C0486CF8E55A6D04472194B683D5134D6273F0E91827`.
- Fresh guardian: `preauthoring.json` bound to final sources; семь независимых PASS receipts включают learner, reader, pedagogy, progression, nonsense, taste и canonical locale receipt. `status.json` converged=true.
- Исправленные findings: недостаточное фактическое lexical coverage в Markdown/atomic; stale hash-bound receipts после авторского изменения; native inventory initially failed, потому что mockup оставался на 176 сессиях. Регенерация mockup из canonical release восстановила parity (177), после чего native build/check прошли. Не считать auxiliary `final.judge_locales_uk.json` заменой canonical `locales.judge.json`.

## Компактная точка продолжения — S14, 2026-10-08

- Последняя выпущенная: `en/l04/s14`; следующая фактическая незакрытая: `en/l04/s15` (перед автором нужен свежий guardian по актуальной строке плана).
- S14 `sessionReadiness(['uk'])`: `{"ready":true,"issues":[]}`. Canonical release построен успешно: RU/UK по 3 intro и 12 tasks, `release/en/l04/s14/` обновлён.
- Финальный snapshot: RU `e234d40354d319b9e740c6f3e3aadada2373d51ef4aeb081e349e10981ae1c19`; UK `2fdfbc1e586e6c73d61c66fba954d06f3bb96793b5a408cbbb8304b976671b46`; atomic `524ae07d28d7f0a91fd6d768c5759014940ee17b3fba5e279a1f67d3e9358787`; preauthoring `dc2683489686b2ba47cd4be46007758e1efd59a44f13cfc253cd38bce6bf5dad`.
- Свежие guardian/spec/quality PASS: exact curriculum row 14, `laundrette`, 12/12 RU+UK, один `speed_match` i03, word-first/choreography/parity/feedback/audio gates без findings, intro lengths RU `256/307/264`, UK `270/317/240`, S01–S13 readiness PASS, prior lexical conflicts `0`. Семь hash-bound judge receipts и `status.json` обновлены, `converged=true`.
- Исправленные findings: intro2 была короче нормы; i04 дословно повторял intro2 target; progression gate жёстко считал финалом только i17 и различал `nearby`/`near the` как разные операции. Исправлены контент, atomic parity и task-count-aware gate; focused progression `18/18`, combined deterministic suite `99/99`, audit regressions `41/41`, direct S14 progression `PASS`.
- Известные внешние блокеры: `build_mockup.mjs` всё ещё останавливается на старом `en/l01/s04/i14` с отсутствующим `referenceAudio.transcript`; native manifest `--check` останавливается на старом `l01/s45` (intro choices differ). Поэтому mockup/native `FRESH` для S14 не заявляются; старый localhost/browser не считать доказательством.
- Не запускались фактическое акустическое прослушивание и device/browser QA; API keys, TTS, deploy и push не использовались.

## Компактная точка продолжения — S15, 2026-10-08

- Последняя выпущенная: `en/l04/s15`; следующая фактическая незакрытая: `en/l04/s16` (перед автором нужен свежий guardian по актуальной строке плана).
- S15 `sessionReadiness(['uk'])`: `{"ready":true,"issues":[]}`. Canonical release построен: RU/UK по 3 intro и 12 tasks, `release/en/l04/s15/` обновлён.
- Финальный snapshot: RU `d3ab58774e4774da320402475b2322a5b9ca3f0df2311e16aa57cd4df47d3320`; UK `7096dc1c1b25064c219d86b938255c88865b03cb1980dd144073e483cbade6c7`; atomic `4ef34bdda3c59880e0d53f1b333b7ebe94ddbd390aae50a557095c134b1d0ff9`; preauthoring `4144f7b694438a4d536af3ca37b4241cd5b729bd5d2d5de43555567981de1b23`.
- Свежие guardian/spec/quality PASS: exact строка плана с literal backticks, new word только `gym`, 28 prior hashes и 34 document hashes, 12/12 RU+UK, один `speed_match` i03, word-first i01→i02→i03, singular/plural extraction и independent i12 без findings; intro lengths RU `283/272/217`, UK `281/273/272`.
- После S15 был исправлен only content/atomic drift: i07 переформулирован в естественное `There is a taxi near the gym.`; atomic regenerated and all receipts rebound to current hashes. Direct progression gate `--from 15` PASS; facts RU/UK 12 tasks/12 modes/0 unknown; pre-judge PASS.
- Известные внешние блокеры прежние: mockup останавливается на старом `en/l01/s04/i14` (`referenceAudio.transcript` missing), native manifest — на `l01/s45` intro choice mismatch. `FRESH` для mockup/native после S15 не заявляется.

## Компактная точка продолжения — S16, 2026-10-08

- Последняя выпущенная: `en/l04/s16`; следующая фактическая незакрытая: `en/l04/s17` (перед authoring нужен свежий guardian по строке плана 17).
- S16 `sessionReadiness(['uk'])`: `{"ready":true,"issues":[]}`. Canonical release построен: RU/UK по 3 intro и 12 tasks, `release/en/l04/s16/` обновлён.
- Финальный snapshot: RU `7d72eb2158838ad3d232e0847bc6ee7fd0a388bc5c4d4692f272cd7a314ff080`; UK `fa6bac9f0161cd5a0c8357507aaec95a76d4eea504c76ccdb93648717bffc905`; atomic `bff43a6f2841fa7bb1351d717a22f16987d5cc0d67a821385562aba12944de1a`; preauthoring `1e61bca4b07b11e4f9240268e3168eef0c4d39add482c89f7676cb8f32fa2901`.
- Свежий guardian/spec/quality контур PASS: точная строка плана 16, `swimming pool`, 12/12 RU+UK, один `speed_match`, отдельные вопрос/ответ i11/i12, explicit polarity финала, no-repeat regression; deterministic suite `119/119`, direct progression `findings=0`, pre-judge PASS.
- Официальный `build_mockup.mjs` по-прежнему останавливается на старом `en/l01/s04/i14` (`referenceAudio.transcript` missing). Чтобы макет не отставал, в `content/learning-v2-course/mockup/index.html` вручную добавлены canonical release L04 S12–S16; локальный просмотр открыт и визуально показывает 184 сессии, включая S16. Это не заявляется как полный mockup-builder PASS.
- Native manifest `--check` по-прежнему имеет старый внешний blocker `l01/s45` (intro choices differ). Акустическое прослушивание, device QA, API/TTS, deploy и push не выполнялись.

## Компактная точка продолжения — S17, 2026-10-08

- Последняя выпущенная: `en/l04/s17`; следующая фактическая незакрытая: `en/l04/s18` (перед authoring нужен свежий guardian по строке плана 18).
- S17 `sessionReadiness(['uk'])`: `{"ready":true,"issues":[]}`. Canonical release построен успешно: RU/UK по 3 intro и 12 tasks, `release/en/l04/s17/` обновлён.
- Финальный snapshot: RU `4d0e95c074d2fe84481b49a89face8cef21e129be20375423015455751baa372`; UK `415c291202ef5fd08df0cde269047a822d77ab5cd5ec2389f0910216760a4a63`; atomic `b3d9af1391da1cbd09a42b170d9d5a693a5c9a161a2e1229d1d27c8d6ac90546`; preauthoring `fb19c4883d799f206a8753b1c5e6267c83f6212e2b7de112a3ae072d131547ee`.
- Свежий guardian/spec/quality контур PASS: строка плана 17 скорректирована на новое `container` с Cambridge-backed `some`, `berry` разрешён как retrieval; prior readiness `16/16`, prior hashes `32/32`, документные проверки `34/34`, strict pre-judge RU/UK `12/12`, Markdown↔atomic parity/choreography/feedback/singlePhrase без findings; все семь hash-bound judge receipts и `status.json` `PASS`, `converged=true`.
- Детерминированные gates: progression quality `PASS`, facts RU/UK `12 tasks / 12 modes / 0 unknown` (предупреждение только о независимой старой `de`-изоляции), release build без проблем. Mockup-builder всё ещё останавливается на старом `en/l01/s04/i14` (`referenceAudio.transcript` missing); поэтому canonical L04 S17 добавлен существующим безопасным append-скриптом в `content/learning-v2-course/mockup/index.html`. Открытая вкладка принудительно обновлена и показывает `185 сессий`, включая S17.
- Native manifest `--check` по-прежнему имеет старый внешний blocker `l01/s45` (intro choices differ). Акустическое прослушивание, device QA, API/TTS, deploy и push не выполнялись.
