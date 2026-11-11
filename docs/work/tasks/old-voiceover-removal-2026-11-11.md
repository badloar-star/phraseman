# Task packet: старая озвучка удалена, фразы и карточки читает голос телефона

Governance-ID: TG-33B8B41E0D6B
Status: In progress
Owner: сессия Claude «удали всю озвучку» (владелец 11.11.2026)
Related epic/enabler: none

## Outcome

Владелец 11.11.2026: «удали всю озвучку из приложения и сервера», уточнения — удаляем заранее
записанные/сгенерированные голосовые дорожки, встроенный голос телефона остаётся; сервер — только
код, без выкладки; занятые другой сессией файлы не трогать. Позже в тот же день: «буду создавать
новую озвучку, новую удалять не надо» → скрипты генерации вернуть, проверку «файл карты удалён» снять.

Успех: приложение не обращается к готовым клипам фраз и карточек (читает голос телефона), сервер
не ставит наборы карточек в очередь платной генерации; инструменты генерации на месте для новой озвучки.

## Scope

In scope:
- `modules/audio/phrase_audio_lookup.ts` — готовых клипов фраз нет (всегда «клипа нет»);
- `app/phrase_audio_url_map.generated.ts` — удалён (карта старых клипов);
- `app/flashcards/card_tts_audio.ts` — ссылка на клип карточки не вычисляется;
- `functions/src/community_packs.ts` — снята постановка набора в очередь озвучки;
- `app/phrase_audio_key.ts` — комментарий;
- тесты: `tests/phrase_audio_lookup.test.ts`, `tests/phrase_audio_prefetch.test.ts`,
  `tests/content_lazy_startup.test.ts`, `tests/card_device_voice_only.test.ts` (вместо
  `tests/card_tts_client_server_parity.test.ts`).

Out of scope (файлы правит другая сессия либо решение владельца):
- `hooks/use-audio.ts`, `hooks/phrase_audio_player.ts`, `functions/src/index.ts`, `package.json`;
- серверный воркер `card_tts_worker` и его экспорт, выкладка на сервер, файлы в хранилище;
- записанный голос онбординга (`components/onboarding_aha/aha_audio.ts`);
- заготовка «голос собеседника» в диалогах (записей в ней нет);
- звук Learning V2 (удаляет другая сессия);
- скрипты генерации озвучки и их тесты — возвращены как были, нужны для новой озвучки.

## Architecture

Граница не меняется: единая точка «есть ли клип» — `getPlayablePhraseAudioUrl` и
`resolveCardTtsTarget`. Обе теперь отвечают «нет», вызывающий код (use-audio) уходит в свой уже
существующий путь системного голоса. Новая озвучка подключается через те же две точки.

## Security and privacy

Передача данных сокращается: текст карточек больше не уходит в OpenAI TTS (после выкладки сервера).
Новых данных, прав и секретов нет. Авторизация не затронута.

## Technical debt

- Contain: пустые заглушки `resolveCardTtsTarget` / `isCardTtsKnownMissing` / `markCardTtsMissing`
  и ветка клипа в `hooks/use-audio.ts`. Выход: `use-audio.ts` освобождён другой сессией либо
  подключена новая озвучка. Владелец: эта сессия.
- Accept temporarily: серверный воркер и его экспорт живы до освобождения `functions/src/index.ts`;
  без постановки в очередь он не запускается сам (остаётся ручной админский перезапуск).

## Verification

`npm run test:one -- tests/phrase_audio_lookup.test.ts tests/phrase_audio_prefetch.test.ts
tests/phrase_audio_ahead_prefetch.test.ts tests/content_lazy_startup.test.ts
tests/phrase_audio_cache_version_contract.test.ts tests/phrase_audio_regen_storage_contract.test.ts
tests/card_device_voice_only.test.ts tests/use_audio_contract.test.ts
tests/use_audio_system_tts_only.test.tsx tests/fc_tts_voices.test.ts` — под слотом светофора.
Полная проверка типов не запускалась (нет памяти на машине).

## Rollback

`git revert` коммита: карта клипов и прежняя логика возвращаются целиком; файлы в хранилище не
удалялись, данные пользователей не затронуты.
