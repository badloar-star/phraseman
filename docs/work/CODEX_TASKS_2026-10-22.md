# Задания для Codex — 22.10

Каждое задание можно скопировать и отдать Codex целиком.

## 1. ✅ СДЕЛАНО САМИ (0116b37c9) — не отдавать. Пересобрать каталог factory_native

> Codex, после коммита afc35c653 пересобери factory_native полностью, без `--extend` и без `--session`:
> `node scripts/build_learning_v2_factory_native_manifest.mjs` (с тем же потолком, что в последнем выпуске).
> Режим `--extend` сохраняет старые строки в старой записи, и ошибка TS2590 останется.
> После пересборки в `modules/learning-v2/content/factory_native/factory_native_catalog_v1.generated.ts` и `factory_native_manifest_v1.generated.ts` у каждой строки должно стоять `Object.freeze<LearningV2FactoryNative…RowV1>({`, а у массива — `Object.freeze<…RowV1[]>([`.
> Проверка: `npm run typecheck` — в этих файлах нет TS2590.
> Закоммить оба файла вместе со своими l22 s53–s54.

## 2. Перерисовать 2 цветных слоя картинок

> Codex, два тёмных цветных слоя не проходят проверку совпадения с основной картинкой (порог 12 %):
> - `assets/images/v2art/dark/spire_rank_6.accent.webp` — 13,4 %;
> - `assets/images/v2art/dark/mistakes_entry.accent.webp` — 12,2 %.
> Перерисуй их так, чтобы цветной слой точно ложился на основную картинку (те же контуры, тот же размер 1024×1024). Имена не меняй. После замены скажи — уберём их из временного списка исключений (ACCENT_MISALIGNED_DEBT).

## 3. Только если владелец выберет вариант (а) в вопросе 28: поля для «Скажи так»

> Codex, для вступления к занятию «Скажи так» (макет introNew) в каждое занятие курса нужны три структурных поля на всех 9 языках интерфейса:
> - `situation` — короткая ситуация (1 предложение);
> - `wordParts` — разбор фразы по словам: массив `{ word, gloss }` (например `I · я`, `am · связка`, `here · здесь`);
> - `whyLine` — одна строка «почему так».
> Ничего не выдумывать сверх содержания занятия; формат согласовать с контрактом интро Learning V2.

## 4. По желанию: тёмный цветной слой для «Фразы дня»

> Codex, у `assets/images/v2art/dark/phrase_of_day.webp` нет цветного слоя `phrase_of_day.accent.webp` (у светлой версии он есть). Сейчас в тёмной теме картинка рисуется без тёплого акцента. Если нужен — дорисуй `dark/phrase_of_day.accent.webp` точно по контуру тёмной основы, 1024×1024.

## 5. ⏩ ДЕЛАЕМ САМИ (Codex без токенов, владелец 22.10) — 5 · ВХОД после связки B. После «только TTS»: убрать конвейер записанного звука из выпуска

> Codex, владелец 22.10 решил: в приложении только голос телефона (TTS), записанных mp3 в занятиях нет. Learning V2 переводит клиент и плеер на "device_system_tts_only". Потом app/learning_v2_factory_single_voice_v1.generated.ts, app/learning_v2_factory_lesson_audio_index_v1.generated.ts, production_audio_entries и published_audio_sessions удаляются из приложения.
> Сними у себя генераторы и гейты, которые их пишут или проверяют: build_learning_v2_factory_single_voice_module.mjs, build_learning_v2_factory_lesson_audio_index.mjs, build_learning_v2_factory_audio_module.mjs, reencode_bundle_audio_64k, check_learning_v2_storage_audio_inventory, learning_v2_ceiling_committed_gate и связанные. Иначе конвейер выпуска вернёт файлы обратно. План выкладки записей в Storage (HANDOVER 18.10) отменён.
