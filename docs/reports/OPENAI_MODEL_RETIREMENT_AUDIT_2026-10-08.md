# PhraseMan: аудит прекращения доступа к моделям OpenAI

Дата: 2026-10-08. Ветка: `feature/referral-roulette`. Исходный commit: `79c3f6984528beb2368cf64304b2067f3685cff6`.

## Вывод и границы проверки

Официальный срок отключения `gpt-4.1-nano` (включая `gpt-4.1-nano-2025-04-14`) и `gpt-image-1` — **23 октября 2026**. В этой ветке устранены активные значения по умолчанию, прямые вызовы и выбор этих моделей в живой админке. Старые настройки нормализуются при чтении; это не требует предварительной записи в production Firestore.

Это аудит исходного кода и локальной совместимости, **не подтверждение безопасности текущего production**. Firebase/GCP-сессия и доступ к runtime-конфигурации в среде отсутствуют. Не читались production Firestore, Secret Manager, Cloud Run revisions, фактические usage/error logs и письмо Gmail `1a119a886611fd83`. Срок независимо проверен в официальной документации. Никаких production-развёртываний, реальных генераций, отправки писем/Telegram или изменений production-данных не выполнялось.

Проверены серверный код `functions/src`, отдельные codebases `functions-max`, `functions-content`, `functions-admin`, `functions-english-test`, скрипты/инструменты, клиентские места вызовов, живая админка `admin/v2/legacy.html`, конфигурации и тесты. Исторические документы, артефакты и billing evidence не являются исполняемыми вызовами.

## Инвентаризация и исправления

| Область | Затронутые точки | Исправление / результат |
|---|---|---|
| Общая конфигурация | `admin_runtime_config/openai_jobs`; `openAiJobsConfig`, `resolveJobConfig`; 13 ключей weekly, stats, explain, dialog, choice, compass, digest, support, content_factory, video_phrases, image_assets, tournament, jarvis | Nano удалена из текстового allowlist; старый alias/snapshot читается как `gpt-4o-mini`. Значения dialog/compass/jarvis по умолчанию заменены. Капы, kill-switch, weekly rollout и fail-closed поведение сохранены. Старый image override приводит к Flare. |
| Dialogues / Theo | `admin_runtime_config/openai_dialog_model`, `OPENAI_DIALOG_MODEL`, `openAiDialogModelConfig`; `premiumDialogSend`, `premiumDialogStream`, `premiumDialogReview`, `tutorTextTurn`, `explainMistake`, post-call review в `max_voice_finalize.ts` | Общий resolver мигрирует Firestore/env, включая `OPENAI_MISTAKE_EXPLAIN_MODEL` через его существующий вызов. Административная запись nano отклоняется. Уже существующий default `gpt-4o-mini` сохранён. JSON game envelope доступен на поддерживаемых моделях. Кэш модели остаётся 5 минут. |
| Перевод в диалогах | `premiumDialogTranslate` в `premium_dialog.ts` | Прямой nano-вызов заменён на `gpt-4o-mini`; схема запроса не меняется. |
| Поддержка | `supportInboxOnNewMail` / triage, автоматические ответы, `adminSupportGenerateReply`, Telegram reply job и существующий генератор черновиков в `support_inbox.ts` | Прямой nano triage и nano fallback заменены. Общий support resolver защищает остальные вызовы. Пересчёт расходов council использует выбранную модель. Owner approval, SMTP gates, бюджетные лимиты и детерминированная эскалация не изменены. |
| Jarvis | `jarvisDailyDepartmentsCron` → `buildNarrativeMap` / narrative generator | Модель из job config мигрируется. Оценка и фактический пересчёт расходов используют цену выбранной модели, а не фиксированную цену nano. Неизвестная цена отклоняется; narrative остаётся необязательным. |
| Asset Studio | `adminRunAssetJob`, `buildOpenAiImageRequest`, `generateImage`; `image_assets` | Устранён скрытый хардкод: генерация теперь использует `cfg.model`. Default Flare; разрешён Sunburst. `/v1/images/generations`, размер, качество, PNG и декодирование `b64_json` сохранены; legacy `response_format` не добавляется. |
| Остальные job consumers | weekly_review, stats_insights, explain_phrase, mistake_hub_advice, explain_choice, admin_daily_digest, admin_director_digest, video_phrases, content_factory_worker, content_stage_worker, learning_v2_course_shard_background, admin_content_factory_read, admin_tournament_tasks/full, tournament semantic provider | Их сохранённые nano overrides защищены общей нормализацией. Поддерживаемые defaults/overrides `gpt-4.1-mini`, `gpt-4.1`, `gpt-4o-mini` сохранены. Primary/adversarial judges остаются различными. |
| Compass | Ключ `compass` в job config | Удалён nano default. Текущий runtime consumer `resolveJobConfig(..., 'compass')` не найден; наличие ключа само по себе не доказывает развёрнутую функцию. |
| Живая админка | `admin/v2/legacy.html`: Dialog selectors, `CP_AI_JOB_MODELS`, fallback | Nano больше нельзя выбрать; текстовый fallback — `gpt-4o-mini`. Историческая таблица тарифов сохранена. Frozen admin поверхности не редактировались. |
| Offline image generators | `generate-clean-onboarding-dalle-assets.mjs`, `gustav_generate_fr_collectible_dalle_images.mjs`, `generate-level-spin-theme-reward.mjs`, `generate_youtube_pack_dalle.py` | Модель и соответствующие manifests заменены на Flare. Сохранены PNG, размеры, качество, прозрачность там, где она запрошена, и существующие ограничения запуска. Генераторы не запускались. |

Оставшиеся nano literals в `openai_model_policy.ts` — намеренная миграция старых настроек; в `openai_budget_dashboard.ts` и HTML price table — исторические тарифы; в `tournament_semantic_receipt_store.ts` — валидация неизменяемых старых receipts. Их удаление повредило бы историю. Это не разрешение делать новые запросы nano. Существующие турнирные jobs с закреплённой старой review identity могут потребовать нового job: автоматическое переписывание immutable evidence не выполняется, identity mismatch остаётся защитой.

## Выбор альтернатив и стоимость

USD за 1 млн токенов, без Batch/кэша; проверено по официальным страницам моделей на дату аудита.

| Модель | Input / output | Назначение и совместимость |
|---|---:|---|
| Прежняя `gpt-4.1-nano` | 0.10 / 0.40 | Отключается 23 октября; используется только для сравнения/истории. |
| **`gpt-4o-mini`** | **0.15 / 0.60** | Выбран для бывших nano-вызовов: уже используется в PhraseMan; Chat Completions и Responses, JSON/structured outputs, streaming, существующие `max_tokens` и `temperature`. Контекст 128K, output до 16K: не равен прежнему контексту nano около 1M. Для длинных внешних override-сценариев отдельно проверить суммарный размер сообщений. |
| `gpt-5.6-luna` | 0.20 / 1.20 | Официально рекомендуемый преемник nano, контекст около 1.05M. Возможный второй этап для качества/длинных контекстов. Reasoning по умолчанию medium; переход требует проверки reasoning effort, параметров лимита вывода, latency и всех JSON/streaming путей. Не выбран для срочной минимальной миграции. |
| `gpt-4.1-mini` | 0.40 / 1.60 | Сохранён для более сложных генераторов, digest и primary review. |
| `gpt-4.1` | 2.00 / 8.00 | Сохранён для более сильного/adversarial review; повышенный бюджет. |
| **`gpt-image-2.5-flare`** | text input 5; image input 8; image output 30 | Выбран для обычных изображений и быстрых генераторов. |
| `gpt-image-2.5-sunburst` | text input 5; image input 8; image output 30 | Разрешённая альтернатива для более требовательного качества/редактирования. |

Nano → 4o-mini означает примерно **+50%** на тот же объём некэшированных input/output tokens. Например, 600 input + 200 output: $0.00014 → $0.00021. Это не гарантия итогового месячного расхода: объём вывода, cache, retries и распределение моделей могут измениться. Jarvis сохраняет оценку 600/200 для предварительного бюджетного допуска; это не строгий верхний предел размера реального промпта.

Цена изображения зависит от размера, качества, фактических токенов и числа генераций: одинаковые ставки новых image моделей не гарантируют одинаковую цену за картинку или стоимость прежнего `gpt-image-1`. Asset Studio имеет лимит числа изображений, но не точный USD cap/usage billing; перед выпуском измерить стоимость в разрешённом staging. Базовые API-форматы совместимы, визуальное качество/стиль и latency реальным вызовом не проверены.

## Проверки

Проверки выполнены на Node.js **22.23.3**. Тесты работают с моками провайдеров и хранилищ.

| Проверка | Результат |
|---|---|
| Финальный runtime regression: 19 suites (настройки, JSON/game, streaming language guard, review, tutor, support, Jarvis, images, video, tournament semantic, billing) | **274 теста прошли, 18 suites прошли**. Один suite не запустился из-за отсутствующего generated tournament corpus; общий exit 1, не полностью зелёный прогон. TS-Jest использовал isolated transpilation; production types отдельно проверены сборкой. |
| Проверки с обычным TS-Jest type checking: 7 suites | **111 тестов прошли, 6 suites прошли**; тот же отсутствующий tournament corpus блокирует седьмой suite. |
| Дополнительный финальный support smoke с моками: выбранная модель, budget exhausted, OpenAI error, missing key | **4 теста прошли**, остальные 53 намеренно не выбраны в этом повторе. Полный support suite из 57 тестов прошёл в предыдущих прогонах. |
| Главный пакет: support-context → clean → TypeScript → copy assets | **Прошёл** после загрузки нужных multilingual manifest JSON из репозитория. |
| `functions_runtime_parity_gate.mjs` на итоговой сборке | **Прошёл**. Первоначально завершающий шаг `npm run build` остановился из-за отсутствующей root dependency `typescript`; после подключения установленной зависимости этот шаг запущен отдельно успешно. Не выдаём первоначальный exit 1 за успешный единый запуск команды. |
| `tsc -p functions-content/tsconfig.json`, `functions-max`, `functions-admin` | **Прошли**; admin повторно собран после финальной правки расчёта расходов поддержки. |
| Живая admin single-surface contract + общие runtime cost source contracts | **11 тестов прошли, 2 существующих теста упали**: отсутствует `app/weekly_review_client.ts` в исходном commit; строковое ожидание импорта timeout устарело относительно неизменённого клиента. |
| Отдельный существующий `admin_tournament_tasks.test.ts` в широком typed прогоне | Не компилируется: fixtures не содержат обязательный `studyTarget`. Этот файл не менялся. |
| JS syntax check трёх image generators, Python AST parse, `git diff --check` | **Прошли**. |

Отсутствующий `functions/src/generated/tournament_content.json` не является tracked-файлом исходного commit. Нужен настоящий предусмотренный проектом corpus для bundle suite; искусственный fixture ради зелёного теста не добавлялся. Историческая nano receipt validation имеет отдельную прошедшую регрессию. Изменённые модели не вызываются тестами через реальный API. Повторные диагностические прогоны, ставшие избыточными после получения результатов, остановлены и не считаются успешными проверками.

Ограничения выше зафиксированы отдельно: **полная тестовая матрица ветки не зелёная**, несмотря на прошедшие регрессии миграции и компиляцию. Правило `AGENTS.md` запрещает агенту платные text/image вызовы OpenAI через ключ проекта; поэтому реальные smoke tests не выполнялись.

## Обязательная проверка перед production

1. Через авторизованную Firebase/GCP-сессию **read-only** снять `admin_runtime_config/openai_jobs`, `openai_dialog_model`, `openai_dialog_quota`; проверить model/primaryModel/adversarialModel, enabled/caps/rollout. Не включать выключенные jobs при миграции.
2. Проверить env всех реально развёрнутых revisions: `OPENAI_DIALOG_MODEL`, `OPENAI_MISTAKE_EXPLAIN_MODEL`; убедиться, что все codebases с общим resolver собраны и будут обновлены. Проверить соответствие развёрнутого commit этой ветке и отсутствие независимых/старых сервисов с nano/image-1.
3. Проверить OpenAI project access к обеим выбранным моделям, rate limits и image organization verification. Секретные ключи не выводить в отчёт/логи.
4. В разрешённом staging проверить обычные/игровые Dialogues (JSON envelope), streaming/cancellation, translation, review/explain, support spam/nonspam и approval gates, Jarvis budget/fallback, Asset Studio low/high, оба размера и PNG/base64, прозрачность reward generator. Оценить язык, качество, latency, cache, реальные tokens/USD; не отправлять клиентские письма.
5. Проверить незавершённые tournament/content jobs с закреплённой старой model identity. Для несовместимых jobs создать новый запуск по обычной процедуре; не переписывать receipts.
6. Устранить блокеры сборки/регрессий из раздела проверок. Production deployment выполнять только после этих проверок и штатного согласования выпуска. До 23 октября обеспечить обновление фактически вызываемых revisions; одних изменений в Git недостаточно.
7. После выпуска проверить отсутствие запросов nano/image-1 и ошибок model_not_found/404, JSON parse/stream/image decode failures, support retry backlog и динамику budget. Для rollback использовать исправленную предыдущую функциональность с поддерживаемыми моделями; откат на исходный nano/image-1 после даты отключения непригоден.

## Другие предстоящие отключения

Это отдельные сроки и API-контракты, не исправленные вслепую в данном патче:

- 6 января 2027: `tts-1`, `tts-1-hd` и отдельные deprecated snapshots `gpt-4o-mini-tts`. Прямой `tts-1-hd` найден в `scripts/generate_audio.mjs`, `scripts/regen_phrase_audio.mjs`, `scripts/hook_audio_check.cjs`. Alias `gpt-4o-mini-tts` нельзя приравнивать ко всем устаревающим snapshots.
- 20 января 2027: legacy Realtime. Активные defaults MAX уже `gpt-realtime-2.1`/mini; проверить production overrides отдельно.
- 26 февраля 2027: `whisper-1`, `gpt-4o-transcribe`, `gpt-4o-mini-transcribe`; active allowlist/default в `max_voice_config.ts`, offline `tools/generate_chains_unique_explanations.py`. Переход требует отдельной проверки нового API и формата транскрипции.
- `gpt-image-1.5`/`gpt-image-1-mini`: срок 1 декабря 2026; активных вызовов в проверенных исходниках не найдено.

## Официальные источники

- https://developers.openai.com/api/docs/deprecations
- https://developers.openai.com/api/docs/models/gpt-4o-mini
- https://developers.openai.com/api/docs/models/gpt-5.6-luna
- https://developers.openai.com/api/docs/models/gpt-4.1-mini
- https://developers.openai.com/api/docs/models/gpt-4.1
- https://developers.openai.com/api/docs/models/gpt-image-2.5-flare
- https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst
- https://developers.openai.com/api/docs/api-reference/images

## Находки и предложения

Критический риск — production ещё не проверен и не обновлён. Следующий необходимый шаг — авторизованная read-only проверка runtime и разрешённый staging прогон. Срочная миграция сохраняет текущие endpoint/response contracts; отдельный переход на Luna имеет смысл после сравнительных измерений качества и бюджета. Для image assets стоит отдельно добавить фактическое usage/USD accounting, не смешивая эту задачу с изменением модели.
