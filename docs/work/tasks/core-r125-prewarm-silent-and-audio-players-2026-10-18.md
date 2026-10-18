# Task packet: прогрев звука уроков без тихих записей + журнал плееров [AUDIO-PLAYERS]

Governance-ID: TG-F31A658212D9
Governance-ID: TG-8F1EB7F80B7E
Status: In progress
Owner: ЯДРО (сессия 129f91a4), по задаче координатора 18.10
Related epic/enabler: R125 (тишина озвучки), Ревизор 3.42 (ea8b3d23b)

## Outcome

1. Прогрев звука урока (L1 S1 и любой другой) не бросает ошибку из-за тихой записи: индекс прогрева не содержит
   хешей из `app/learning_v2_factory_silent_audio_v1.json`, а неизвестный хеш при прогреве пропускается с логом
   `[V2-PREWARM]`, а не роняет весь пак. Мера: сторож «индекс прогрева ⊂ набор сборки без тихих» зелёный.
2. Затем (вторая часть): dev-журнал `[AUDIO-PLAYERS] create/release live=N` для диагноза роста нативной памяти.

## Scope

In scope: `scripts/build_learning_v2_factory_lesson_audio_index.mjs` (исключение тихих),
`app/learning_v2_factory_lesson_audio_index_v1.generated.ts` (перегенерация),
`app/learning_v2_factory_production_audio_v1.ts` (проверка «есть ли слышимая запись по хешу»),
`app/learning_v2_lesson_audio_pack_v1.ts` (терпимый прогрев + лог), новый сторож в `tests/`.
Вторая часть — места создания/освобождения плееров звука урока (только лог, только dev).

Out of scope: правка самих утечек до таблицы Сверки; перекодирование 64k; выпуск L04.

## Architecture

Без смены границ. Инвариант: индекс прогрева ⊂ хеши набора сборки (bootstrap) и ∩ тихие = ∅.
`learningV2FactoryRemoteAudioFilesForContentHashesV1` по-прежнему бросает на неизвестный хеш (на это опирается
`tests/content_lazy_startup.test.ts`); прогрев фильтрует хеши заранее и пишет, что выкинул.

## Security and privacy

Не касается: нет пользовательских данных, сети, авторизации. Логи без uid/имён.

## Technical debt

Contain: сторож-тест держит инвариант индекса; выход — когда индекс прогрева строится прямо из набора сборки.

## Verification

`npm run test:one -- tests/learning_v2_prewarm_index_audible_subset.test.ts` + соседние
(`content_lazy_startup`, `learning_v2_remote_audio_pack_contract`, `learning_v2_silent_audio_excluded`);
генератор индекса с `--check`.

## Rollback

`git revert` коммита; данные пользователя не затрагиваются.

## Дополнение: пересчёт размера звука 64k после переноса L04 (и прогноз на L05 s01–16)

Governance-ID: TG-DC1476DC3A5B

Outcome: цифра звука при 64 кбит/с и итогового AAB против лимита Play 200 МБ на HEAD после e6ba14612 и прогноз на HEAD
после L05 s01–16; аудит тишины на новом наборе. Scope: только чтение и временные скрипты в scratchpad, репо не меняется.
Architecture: без изменений. Security/privacy: не касается. Technical debt: нет. Verification: замер перекодированием на
копии (или коэффициент репетиции 9b783c3f7) + аудит тишины. Rollback: нечего откатывать.

## Дополнение: запасной вариант 96 кбит/с (listen20 96k, прогноз размера, параметр скрипта)

Governance-ID: TG-7201DBE312C5

Outcome: координатор 18.10 — при 128k AAB ≈203 МБ (> лимита Play 200), поэтому нужен честный запасной вариант на случай «слышу
разницу» с 64k. Те же 20 фраз listen20 в 96k (моно 24 кГц, тот же кодер libmp3lame) рядом с 128/64, объективная таблица с
колонкой 96k, коэффициент 96k на выборке реального набора, прогноз звука и AAB. Scope: docs/design/v2-app/listen20/ (20 новых
mp3 + OBJECTIVE.md), scripts/learning_v2_reencode_bundle_audio_64k.mjs — параметр `--kbps` (по умолчанию 64, поведение без
параметра не меняется). Architecture: без изменений. Security/privacy: не касается. Technical debt: имя скрипта остаётся «64k»
ради совместимости с утренним планом — Contain: параметр печатается в первой строке лога. Verification: --dry на копии с
--kbps 96, сравнение размеров выборки. Rollback: git revert; звук в репо не перекодируется до «ок» владельца.

## Дополнение: одобрение звука на цели переноса L04 s17–56 / L05 s01–16 (и второй заход после L05 s17–32)

Governance-ID: TG-A1A6505C8267

Outcome: ворота паритета V2 на HEAD не красные из-за 460 AUDIO_EVIDENCE_UNVERIFIED (новые цели переноса). Координатор 18.10:
ДА по прецеденту 212b509b9 и слову владельца 15.10 «звук есть и собирается, нет только квитанции — не блок». Строго: цель
одобряется, только если её звук (по той же логике выбора голоса, что в приложении: назначенный голос задания → 4 голоса →
записанный голос) лежит в наборе сборки и хеша нет в app/learning_v2_factory_silent_audio_v1.json. Scope: только
scripts/learning_v2_owner_approved_audio_evidence.v1.json; данные читаются из HEAD (не из рабочей копии — там незакоммиченная
работа V2, en/l08/s50 не трогаю). Architecture/Security: без изменений. Technical debt: квитанции проверки звука по-прежнему
не пишутся — Accept temporarily (решение владельца 15.10, removeWhen в самом файле). Verification: ворота паритета —
AUDIO_EVIDENCE_UNVERIFIED только у целей, отклонённых скриптом с причиной. Rollback: git revert.
