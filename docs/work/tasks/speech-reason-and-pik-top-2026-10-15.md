# «Не услышали слово» только при reason === 'missing_words'; Пик в верхнем положении (R11, 15.10)

Governance-ID: TG-302CAFC61981
Governance-ID: TG-AA1ECCA13A7D

## Outcome
«Сайт» (R11, 2d63aff8c) отдаёт из панели речи `strictWordsOk` и `reason` из того же расчёта, что решил вердикт. Хосты показывают блок «Не услышали слово «X»» только при `reason === 'missing_words'`: при `control_disagrees` и `below_threshold` все слова сказаны и «не услышали X» было бы неправдой. Плюс починка двух красных наборов тестов V2-плеера после 9ef805ab1 и разбор верха башни Пика (вопрос координатору).

## Scope
`app/learning_v2_direct_session_player_v1.tsx`, `app/lesson1.tsx`, `app/flashcards_speaking_session.tsx`, `tests/learning_v2_speaking_engine_parity_contract.test.ts`, сторожа `speech_fail_*`.

## Architecture
Хост принимает `reason` из `onScore` и строит блок только по нему; слова — `missingWords` из результата панели. Прежний вид («Ты сказал(а)», звёзды) остаётся для остальных причин.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Сторож-регэксп в `learning_v2_speaking_engine_parity_contract` делаем гибким к новым полям `onScore`.

## Verification
Тесты `speech_fail_*`, `learning_v2_speaking_engine_parity_contract`, `learning_v2_scripted_repeat_player_lifecycle`.

## Rollback
Откат коммита.
