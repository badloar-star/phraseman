# Learning V2: восстановление ленивой загрузки тяжёлых данных

Governance-ID: TG-17398EADEECF
Дата: 2026-09-20

## Outcome

Открытие раздела «Уроки» и запуск занятия Learning V2 перестают упираться в
синхронный разбор 2,2 МБ генерированных данных. Владелец жалуется: «сессия
запустилась но очень долго», «постоянно что-то препятствует нажатию на кнопку».

## Что показали логи (факты, не догадки)

Из журнала бандлера (запуск 19:29–19:31):

- `[TAP-LAT] → lessons_list` · **ОТ ОТПУСКАНИЯ ДО КАДРА 3615.5мс**,
  из них «JS после коммита занят: 1 отрезк. >50мс (**2612мс**)».
- `[TAP-LAT] → learning-v2/session/[id]` · **2404.8мс**, JS занят **1645мс**.
- `[PERF-STEPS] home:loadData: total=9616ms`, отдельные отрезки JS занят **9234мс**
  и **9142мс** — вот почему «не нажимается кнопка»: тред занят, тапы не доходят.
- При этом `[LEARNING-V2-PERF] lesson-01:session:01 tap→material=0ms
  tap→audio=0ms tap→modal=125ms materialPrewarmed=true audioPrewarmed=true` —
  подготовка САМОЙ сессии мгновенная. Тормозит не логика сессии, а парсинг модулей.

## Корень

Коммит `7783ebf5e` (сегодня) перевёл тяжёлые модули на ленивый `import()`.
В рабочем дереве эта правка **откачена** (staged): вернулись статические импорты
`learning_v2_course_released_session_client_v3` и `learning_v2_lesson_audio_pack_v1`,
удалён лёгкий срез `learning_v2_published_audio_sessions_v1.generated.ts` и удалён
сторож из `tests/learning_v2_continuous_map_perf_contract.test.ts`.

Замеренные цепочки и веса:

- `lessons.tsx` → `learning_v2_course_released_session_client_v3`
  → `modules/.../factory_native/factory_native_course_v1`
  → `factory_native_manifest_v1.generated.ts` — **1172 КБ**;
- `lessons.tsx` → `learning_v2_lesson_audio_pack_v1`
  → `learning_v2_factory_lesson_audio_index_v1.generated.ts` — **504 КБ**;
- тот же путь → `learning_v2_factory_production_audio_v1`
  → `learning_v2_factory_production_audio_entries_v1.generated.ts` — **556 КБ**.

Итого **2232 КБ** разбираются при КАЖДОМ открытии вкладки, хотя нужны только
при запуске занятия.

## Scope

- `app/(tabs)/lessons.tsx` — вернуть ленивый `import()` с кэшем промиса.
- `app/learning_v2_published_audio_sessions_v1.generated.ts` — вернуть лёгкий срез
  (~1 КБ) для проверки «есть ли у занятия озвучка».
- `tests/learning_v2_continuous_map_perf_contract.test.ts` — вернуть сторож.

Вне scope: медленный старт приложения (19–46 с) и `home:loadData` — отдельная
причина, отмечена владельцу.

## Architecture

Промис модуля кэшируется в модульной переменной: разбор происходит ОДИН раз, при
первом запуске занятия, а не при каждом входе в раздел. Улучшение против прежней
версии: тайминг трассировки берётся из уже загруженного модуля синхронно (handle
физически не может существовать до загрузки модуля), поэтому лишняя обёртка
вокруг `markLearningV2PreparedLaunchTrace` не нужна — код проще прежнего.

Проверка «опубликована ли озвучка» не должна тянуть 504 КБ хэшей ради списка
номеров занятий, поэтому список живёт в отдельном срезе на 1 КБ.

## Security and privacy

Изменений в сборе/хранении/передаче данных нет. Это перенос момента разбора
локальных модулей, не затрагивает Firestore, сеть и персональные данные.
Privacy policy правок не требует.

## Technical debt

Срез `learning_v2_published_audio_sessions_v1.generated.ts` дублирует список из
большого индекса и обязан обновляться генератором вместе с ним. Долг закрыт
сторожем: расхождение списка ловится проверкой.

## Verification

- точечный прогон сторожа карты Learning V2
- точечная проверка типов по затронутым файлам
- сверка списка озвученных занятий среза с полным индексом

## Rollback

`git checkout -- app/(tabs)/lessons.tsx` плюс удаление среза и сторожа возвращает
статические импорты. Цена отката — возврат 2,2 МБ на открытие раздела.
