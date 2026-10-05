# Task packet: сторож layout_stability — правило «неизвестные монеты не 0» после выноса в mergeBootRunesIntoProgress

Governance-ID: TG-84E011A02C39
Status: In progress (мой 2680e8266 вынес слияние рун в функцию — сторож искал буквальную строку и покраснел)
Owner: сессия 1 · ЯДРО

## Outcome

Сторож проверяет, что неизвестный баланс не превращается в 0 на первом кадре. Формула та же, но теперь в
mergeBootRunesIntoProgress с параметром progress. Обновляем ожидание: функция есть, условие
`bootRunes === null && progress?.stars === undefined` на месте, и она применяется и при публикации, и в патче рун.

## Scope

tests/layout_stability_contract.test.ts и tests/home_counters_first_frame_contract.test.ts — ожидания формулы.

## Architecture

Не меняется.

## Security and privacy

Не затрагивает.

## Technical debt

Урок: перед коммитом искать сторожа по ВСЕМ строкам, которые переносишь (grep тестов по фрагменту кода).

## Verification

test:one файла — 15/15.

## Rollback

git revert коммита.
