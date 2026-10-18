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
