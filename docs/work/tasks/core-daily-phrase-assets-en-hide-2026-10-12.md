# Task packet: фраза дня es/de/it — пакеты из JS-бандла в файлы-ресурсы; на английском интерфейсе без русских объяснений

Governance-ID: TG-2E954A607BBC
Status: In progress
Owner: сессия «1 · Ядро». Координатор 12.10 после bf776a432: (1) «+2,1 МБ JSON в JS-бандле… замерь дельту; если больше ~1 МБ —
оставь только нужные поля или вынеси пакеты в assets-файлы (expo-asset / FileSystem)»; (2) решение владельца «английские
объяснения МОЖНО ПОЗЖЕ»: при uiLang=en у es/de/it показываем фразу, ru-объяснение скрываем, лог reason=no_en_explanation.

## Outcome
- Замер (hermesc -O, тот же компилятор, что сборка): es 801 КБ, de 687 КБ, it 782 КБ байт-кода = +2,27 МБ (gzip ≈ 0,64 МБ).
  Все поля используются (объяснения — карточка, quiz_ru/quiz_uk — задание дня; quiz ≈ 60 % объёма), урезать нечего →
  пакеты переезжают в файлы-ресурсы `assets/daily_phrase_packs/<цель>.dpk` (JSON-текст), JS-бандл их не содержит.
- Чтение: expo-asset (downloadAsync под сроком) + expo-file-system `File.text()` + JSON.parse, кэш в памяти процесса; каждый шаг
  и каждый отказ — `[DAILY-PHRASE-GATE]`.
- Английский интерфейс при цели es/de/it: карточка и шторка показывают фразу и озвучку; дословный перевод, значение, пример,
  задание дня и сохранение в карточки скрыты (в них русский текст); лог `[DAILY-PHRASE-GATE] reason=no_en_explanation`.

## Scope
In: metro.config.js (assetExts += 'dpk'), assets/daily_phrase_packs/*.dpk (перенос), app/daily_phrase_bundled_packs.ts,
app/daily_phrase_pack_assets.ts (новый), app/multilingual_daily_phrase_remote_runtime.ts (async), components/DailyPhraseCard.tsx,
scripts/build_daily_phrase_bundled_packs.mjs (путь вывода), тесты. Out: английский источник (вопрос владельцу, «можно позже»).

## Architecture
Реестр ресурсов `require('../assets/daily_phrase_packs/es.dpk')` даёт только номер ресурса; байты читаются с диска при первом
обращении к фразе дня этой цели. Загрузчик возвращает Promise; вызывающий путь уже асинхронный.

## Security and privacy
Только учебный контент; персональных данных нет. Политику не затрагивает.

## Technical debt
Ресурсы должны попасть в стор-сборку: проверить в манифесте expo-updates (память project_store_build_stale_updates_manifest).

## Verification
Тест daily_phrase_bundled_es_de_it (чтение ресурса подменено чтением файла с диска), изоляция es/de, сторож готовности языков,
babel_check. Сверка — Главная на es/de/it после перезапуска сборщика.

## Rollback
`git revert` коммита (пакеты вернутся в constants/*.json).
