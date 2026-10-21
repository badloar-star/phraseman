# Task packet: битая озвучка 67 клипов, словарь транскрипций, испанская сборка урока 3

Governance-ID: TG-FB892978A744
Status: In progress
Owner: сессия «10 · ПЕРЕВОДЧИК»
Related epic/enabler: R07

## Outcome

1. Озвучка: 67 клипов в Storage — пустышки 0,48 с (распознавание речи не слышит ни слова).
   Перегенерированы локально тем же голосом/моделью/темпом/громкостью, что корпус
   (`scripts/revoice_all_phrases_echo.mjs`), каждый проверен распознаванием речи.
   Загрузка в Storage и смена метки `v` в карте — за владельцем (токен загрузки мне не выдан).
2. Словарь `app/transcription.ts`: проверенные IPA для слов фраз дня и уроков, у которых
   транскрипции не было; стиль записи как в остальном словаре.
3. `app/lesson_data_1_8_phrases_es.gen.ts`, `lesson3_phrase_34`: слова испанской сборки
   «Usa / Internet / .» остались от старой фразы «Usa Internet.» — заменены на
   «Ella / usa / aplicaciones / .» под нынешнюю фразу «Ella usa aplicaciones.».

## Scope

In scope: словарь `DICT` и `TRANSCRIPTION_ENGINE_VERSION`; поле `words` одной фразы в .gen.

Out of scope: логика движка транскрипции; загрузка mp3 в Storage; карта
`app/phrase_audio_url_map.generated.ts` (метку `v` менять только ПОСЛЕ загрузки, иначе
телефоны закэшируют пустышку под новой меткой на год).

## Architecture

No architecture change: данные словаря и контента.

## Security and privacy

Не применимо. Секреты не читались и не выводились; токен загрузки не получал.

## Technical debt

- Пока владелец не загрузит файлы, 67 клипов остаются немыми.
- Слова вне словаря по-прежнему строятся правилами по буквам.

## Verification

- Озвучка: длительность > 0,5 с и распознанный текст совпадает с фразой.
- Тесты: `tests/transcription_*`, `tests/lesson_gen_canon_contract.test.ts`,
  `tests/lesson_phrase_3_17.test.ts`, `tests/reported_user_data_integrity_contract.test.ts`.

## Rollback

`git revert <коммит>`.
