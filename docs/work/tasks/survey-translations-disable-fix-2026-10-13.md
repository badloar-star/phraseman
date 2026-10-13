# Task packet: опросы осколков — запись переводов на 8 языков, выключение 058/072/100 (Лига/Арена), опечатка 069

Governance-ID: TG-1EC4E1FD1A57
Status: In progress
Owner: Ядро (сессия 1)
Related: координатор 13.10 (Q18 «ок» на запись переводов; владелец 10:45 — выключить 058/072/100, исправить 069)

## Outcome

- В shard_surveys/survey_preset_NNN вписаны переводы uk, en, es, pt-BR, vi, id, tr, pl из
  docs/phraseman-2.0/shard_survey_translations_draft.json (scripts/apply_shard_survey_translations.mjs --write);
  повторный сухой прогон — «к записи 0».
- Опросы 058, 072, 100 (упоминают удалённые Лигу и Арену) выключены: enabled=false И rotation.enabled=false.
  Почему два флага: в режиме ротации сервер (functions/src/shard_survey.ts, getActiveShardSurvey) не смотрит enabled —
  опрос дня берётся по rotation; с rotation.enabled=false parseRotation даёт null, сервер уходит в обычный подбор, где
  выключенный опрос отсеян where('enabled','==',true). Ничего не удаляется, прежние значения печатаются в журнал.
- Опечатка 069, вариант 3: ru «Часто останавливает в подходящий момент» → «… в неподходящий момент»; черновик
  es/pt-BR/vi/id/tr/pl повторял опечатку («в нужный момент») — исправлен до записи, в документе 069 вариант 3
  выставляется явно на всех 9 языках.

## Scope

In scope: черновик переводов (6 строк 069), новый скрипт scripts/shard_surveys_disable_and_fix_2026-10-13.mjs, записи в
Firestore shard_surveys (только поля перевода, enabled, rotation.enabled, label варианта 3 у 069, updatedAtMs/updatedBy).
Out of scope: код функций, деплой, удаление документов и ответов, порядок ротации (SHARD_SURVEY_ROTATION_SURVEY_IDS).

## Architecture

No architecture change. Ротация 63 дня не меняется: в дни 058/072/100 сервер падает в обычный подбор.

## Security and privacy

Вход — ADC владельца (gcloud), файл ключа не читается. Пользовательские данные не читаются и не пишутся.

## Technical debt

- Убрать 058/072/100 из SHARD_SURVEY_ROTATION_SURVEY_IDS при следующей правке функций (тогда версия ротации меняется —
  отдельное решение).

## Verification

Сухой прогон обоих скриптов до и после записи; после записи — «к записи 0», выборочное чтение 058/069.

## Rollback

Скрипт печатает прежние enabled/rotation.enabled/label; вернуть — тем же скриптом с --restore (enabled=true,
rotation.enabled=true, ru-текст прежний). Переводы — merge-поля, ru не тронут.
