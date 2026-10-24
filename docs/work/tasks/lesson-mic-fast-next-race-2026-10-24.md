# Жалоба №6 «подвисает, теряет связь с микрофоном»: гонка записи при быстром «Дальше»

Governance-ID: TG-1B8BC9B0B14A

## Outcome
Координатор 24.10 передал 4 · ТЕМЫ жалобу №6 Learning V2. Трасса [LESSON-MIC] на пути голосового задания уже стоит (23.10), живых записей с ней ещё нет. По коду найдена гонка на пути PCM (Android): после отпускания кнопки stopPcm отцепляет запись и ждёт recording.stop() и распознавание файла; если человек за это время нажал «Дальше», следующее задание сразу вызывает startPcm — новая запись не поднимается, пока прежняя держит микрофон (fail:pcm_recorder_not_active → человек видит ошибку). Фикс: startPcm дожидается освобождения прежней записи (потолок 1,5 с), журнал пишет, сколько ждали и чем кончилось.

## Scope
In scope: `hooks/use_learning_v2_local_hold_to_talk_v1.ts` (только голосовая часть: ссылка на незавершённую остановку и ожидание в startPcm), помощник `modules/learning-v2/runtime/await_previous_capture_release_v1.ts`, тест `tests/learning_v2_mic_previous_release_v1.test.ts`.
Out of scope: экраны занятий, «Мои ошибки», путь системного распознавателя (его ветки оставлены на живые логи [LESSON-MIC]).

## Architecture
`pcmStopInFlightRef` хранит промис остановки прежней записи (recording.stop()). startPcm перед startHoldRecording ждёт `awaitPreviousCaptureReleaseV1(promise, 1500)` — гонка «освобождение / потолок»; после ожидания заново проверяет поколение и удержание кнопки. Журнал [LESSON-MIC] pcm:waited_previous_release { waitedMs, outcome }.

## Security and privacy
Данных не касается.

## Technical debt
Путь системного распознавателя (перезапуск каждые 140 мс при ошибке) — без изменений до живых логов.

## Verification
Тест помощника: ждёт освобождения; не ждёт дольше потолка; без прежней записи — сразу. Соседние тесты голосового пути.

## Rollback
Убрать ожидание в startPcm и помощник.
