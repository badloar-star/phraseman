# Heisenberg UI Locale Audit

Generated: 2026-05-17T15:04:15.329Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 580
- triLang calls: 1509
- Static triLang calls: 1495
- Dynamic triLang calls: 14
- triLang missing locale units: 1400
- triLang calls missing all planned locales: 280
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 280
- dynamic-trilang-copy: 14
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/(tabs)/friends.tsx: 20 findings, 100 missing locale units
- app/preposition_drill.tsx: 17 findings, 85 missing locale units
- app/problem_coach.tsx: 17 findings, 85 missing locale units
- app/flashcards_market_dev.tsx: 14 findings, 70 missing locale units
- app/lesson_irregular_verbs.tsx: 12 findings, 60 missing locale units
- app/pack_opening.tsx: 11 findings, 55 missing locale units
- app/diagnostic_test.tsx: 14 findings, 40 missing locale units
- app/_admin_intro_preview.tsx: 8 findings, 40 missing locale units
- app/trainer_session_report.tsx: 8 findings, 40 missing locale units
- components/GlobalBroadcastModal.tsx: 8 findings, 40 missing locale units
- app/lesson_help.tsx: 7 findings, 35 missing locale units
- app/premium_modal.tsx: 7 findings, 35 missing locale units
- app/quizzes/result_view.tsx: 7 findings, 35 missing locale units
- app/trainer_phrases_session.tsx: 7 findings, 35 missing locale units
- components/RankChangeBanner.tsx: 7 findings, 35 missing locale units
- components/RankChangeTestModal.tsx: 7 findings, 35 missing locale units
- components/CoachToast.tsx: 6 findings, 30 missing locale units
- components/MasteryReplayModal.tsx: 6 findings, 30 missing locale units
- app/community_packs/UgcPackEditorCardPreview.tsx: 5 findings, 25 missing locale units
- app/settings_notifications.tsx: 5 findings, 25 missing locale units
- components/ArenaFriendInviteHost.tsx: 5 findings, 25 missing locale units
- components/CertificateNameModal.tsx: 5 findings, 25 missing locale units
- app/components/RankChangeModal.tsx: 4 findings, 20 missing locale units
- app/lesson_intro_screens.tsx: 4 findings, 20 missing locale units
- app/trainer_words_session.tsx: 4 findings, 20 missing locale units

## First Findings
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:422 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Подарить', uk: 'Подарувати', es: 'Regalar' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:451 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:536 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'дней подряд', uk: 'днів поспіль', es: 'días seguidos' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:556 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Добавить в друзья', uk: 'Додати в друзі', es: 'Agregar amigo' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:597 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Мой код', uk: 'Мій код', es: 'Mi código' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:628 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Скопировано!', uk: 'Скопійовано!', es: '¡Copiado!' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:629 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Копировать', uk: 'Копіювати', es: 'Copiar' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:643 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Поделиться', uk: 'Поділитись', es: 'Compartir' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:651 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Не удалось получить код. Проверьте сеть и попробуйте снова.', uk: 'Не вдалося отримати код. Перевірте мережу й спробуйте ще.', es: 'No se pudo obtener el código. Comprueba l
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:669 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:693 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'только что', uk: 'щойно', es: 'ahora mismo' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:694 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `${min} мин назад`, uk: `${min} хв тому`, es: `hace ${min} min` }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:695 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `${hrs} ч назад`, uk: `${hrs} год тому`, es: `hace ${hrs} h` }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:696 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `${days} дн назад`, uk: `${days} дн тому`, es: `hace ${days} días` }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:710 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:781 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:973 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1074 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1554 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: gift.labelRu, uk: gift.labelUk, es: gift.labelEs }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1557 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: gift.descRu, uk: gift.descUk, es: gift.descEs }
- [warning] trilang-missing-all-planned-locales app/(tabs)/settings.tsx:92 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] dynamic-trilang-copy app/(tabs)/settings.tsx:545: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, FONT_SIZE_LABELS[fontSize])
- [warning] trilang-missing-all-planned-locales app/(tabs)/settings.tsx:720 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Настройки', uk: 'Налаштування', es: 'Ajustes', }
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:110 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'пусто', uk: 'порожньо', es: 'vacío' }
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:247 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '📖 Превью интро уроков', uk: '📖 Попередній перегляд інтро уроків', es: '📖 Vista previa de intros de lección', }
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:252 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Готово ${totalWith}/32 · пусто ${totalEmpty} · флаг «показано»: ${shownFlagsCount}`, uk: `Готово ${totalWith}/32 · порожньо ${totalEmpty} · прапор «показано»: ${shownFlagsCo
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:257 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Сбросить флаги показа всех 32 уроков', uk: 'Скинути прапори показу всіх 32 уроків', es: 'Reiniciar marcas de intro de las 32 lecciones', }
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:262 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Удаляет lesson{id}_intro_shown — интро снова появится при первом реальном входе', uk: "Видаляє lesson{id}_intro_shown — інтро знову з\'явиться під час першого реального вход
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:267 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Как пользоваться', uk: 'Як користуватися', es: 'Cómo usar esto', }
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:272 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '• Тап по плитке урока — откроет тот же экран онбординга, что увидит пользователь.\n' + '• «Начать урок» или ✕ внутри превью просто закроют оверлей. Сам урок не запустится.\n
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:438 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'превью интро уроков', uk: 'прев\'ю інтро уроків', es: 'vista previa de intros de lección', }
- [warning] trilang-missing-all-planned-locales app/_pos_analytics_audit.tsx:124 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'POS token audit', uk: 'POS token audit', es: 'Auditoría POS', }
- [warning] trilang-missing-all-planned-locales app/arena_game.tsx:303 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Игрок', uk: 'Гравець', es: 'Jugador' }
- [warning] trilang-missing-all-planned-locales app/arena_game.tsx:843 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Сообщить о проблеме в вопросе арены', uk: 'Повідомити про проблему в питанні арени', es: 'Informar de un problema en la pregunta', }
- [warning] trilang-missing-all-planned-locales app/avatar_select.tsx:359 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: aura.nameRu, uk: aura.nameUk, es: aura.nameEs }
- [warning] trilang-missing-all-planned-locales app/avatar_select.tsx:1024 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Открыть ауру «${auraName(pendingAuraPurchase)}» за осколки?`, uk: `Відкрити ауру «${auraName(pendingAuraPurchase)}» за осколки?`, es: `¿Desbloquear el aura «${auraName(pendi
- [warning] trilang-missing-all-planned-locales app/beta_testers.tsx:53 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Бета-тестеры', uk: 'Бета-тестери', es: 'Beta testers', }
- [warning] trilang-missing-all-planned-locales app/beta_testers.tsx:105 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Версия ${versionLabel}`, uk: `Версія ${versionLabel}`, es: `Versión ${versionLabel}`, }
- [warning] trilang-missing-all-planned-locales app/community_pack_create.tsx:110 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/community_packs/UgcPackEditorCardPreview.tsx:280 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Опис', ru: 'Описание', es: 'Descripción', }
- [warning] trilang-missing-all-planned-locales app/community_packs/UgcPackEditorCardPreview.tsx:308 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'ОПИСАННЯ', ru: 'ОПИСАНИЕ', es: 'DESCRIPCIÓN' }
- [warning] trilang-missing-all-planned-locales app/community_packs/UgcPackEditorCardPreview.tsx:318 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Редагується…', ru: 'Редактируется…', es: 'En edición…' }
- [warning] trilang-missing-all-planned-locales app/community_packs/UgcPackEditorCardPreview.tsx:333 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Редагувати', ru: 'Редактировать', es: 'Editar' }
- [warning] trilang-missing-all-planned-locales app/community_packs/UgcPackEditorCardPreview.tsx:347 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Видалити', ru: 'Удалить', es: 'Eliminar' }
- [warning] dynamic-trilang-copy app/community_packs/ugcCardThemePresets.ts:33: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, UGC_CARD_THEME_LABELS[id])
- [warning] trilang-missing-all-planned-locales app/components/RankChangeModal.tsx:223 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: TIER_LABELS_RU[tier] ?? tier, uk: TIER_LABELS_UK[tier] ?? tier, es: TIER_LABELS_ES[tier] ?? tier, }
- [warning] trilang-missing-all-planned-locales app/components/RankChangeModal.tsx:471 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: promoted ? '🚀 Підвищення рангу!' : '⬇️ Зниження рангу', ru: promoted ? '🚀 Повышение ранга!' : '⬇️ Понижение ранга', es: promoted ? '🚀 ¡Subes de rango!' : '⬇️ Bajada de ran
- [warning] trilang-missing-all-planned-locales app/components/RankChangeModal.tsx:492 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: promoted ? 'Ти впорався — новий ранг заслужений!' : 'Не здавайся, повернеш позицію!', ru: promoted ? 'Ты справился — новый ранг заслужен!' : 'Не сдавайся, вернёшь позицию!', 
- [warning] trilang-missing-all-planned-locales app/components/RankChangeModal.tsx:519 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: promoted ? 'Чудово! 🎉' : 'Зрозуміло 💪', ru: promoted ? 'Отлично! 🎉' : 'Понял 💪', es: promoted ? '¡Genial! 🎉' : 'Entendido 💪', }
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:794 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Дата', uk: 'Дата', es: 'Fecha' }
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:858 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'уроков', uk: 'уроків', es: 'lecciones' }
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:890 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '1 ⚡ за старт диагностики', uk: '1 ⚡ за початок діагностики', es: '1 ⚡ al empezar el test de nivel', }
- [warning] dynamic-trilang-copy app/diagnostic_test.tsx:1045: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, DIAGNOSTIC_SKILL_A11Y.build)
- [warning] dynamic-trilang-copy app/diagnostic_test.tsx:1047: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, DIAGNOSTIC_BUILD_HEADER)
- [warning] dynamic-trilang-copy app/diagnostic_test.tsx:1054: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, DIAGNOSTIC_SKILL_A11Y.choice4)
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1056 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '🔤 Выбери верный вариант', uk: '🔤 Обери правильний варіант', es: '🔤 Elige la opción correcta' }
- [warning] dynamic-trilang-copy app/diagnostic_test.tsx:1063: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, DIAGNOSTIC_SKILL_A11Y.match)
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1065 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '🔗 Сопоставь слово и значение', uk: '🔗 Зістав слово й значення', es: '🔗 Relaciona palabra y significado' }
- [warning] dynamic-trilang-copy app/diagnostic_test.tsx:1072: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, DIAGNOSTIC_SKILL_A11Y.type)
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1074 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '⌨️ Введи пропущенное слово', uk: '⌨️ Введи пропущене слово', es: '⌨️ Escribe la palabra que falta' }
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1079 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] dynamic-trilang-copy app/diagnostic_test.tsx:1228: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, DIAGNOSTIC_BUILD_HEADER)
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1228 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] trilang-missing-all-planned-locales app/exam.tsx:363 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/flashcards.tsx:42 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Тренировка карточек', uk: 'Тренування карток', es: 'Práctica de tarjetas', }
- [warning] trilang-missing-all-planned-locales app/flashcards.tsx:47 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Верно/Неверно: подходит ли перевод', uk: 'Вірно/Невірно: чи підходить переклад', es: 'Correcto/Incorrecto: ¿coincide?', }
- [warning] trilang-missing-all-planned-locales app/flashcards/FlashcardsFilterDropdown.tsx:60 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Все', uk: 'Всі', es: 'Todas' }
- [warning] trilang-missing-all-planned-locales app/flashcards_market_dev.tsx:72 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Маркет карточек (DEV)', uk: 'Маркет карток (DEV)', es: 'Mercado de tarjetas (DEV)', }
- [warning] trilang-missing-all-planned-locales app/flashcards_market_dev.tsx:77 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Read-only прототип: смотрим UX и каталог, без покупок.', uk: 'Read-only прототип: дивимось UX і каталог, без покупок.', es: 'Prototipo de solo lectura: probamos el UX y el c
- [warning] trilang-missing-all-planned-locales app/flashcards_market_dev.tsx:87 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Купить (DEV)', uk: 'Купити (DEV)', es: 'Comprar (DEV)' }
- [warning] trilang-missing-all-planned-locales app/flashcards_market_dev.tsx:88 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Уже куплено', uk: 'Вже придбано', es: 'Ya lo tienes' }
- [warning] trilang-missing-all-planned-locales app/flashcards_market_dev.tsx:176 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Этап 1: каталог. Этап 2: покупка за осколки и ownership.', uk: 'Етап 1: каталог. Етап 2: купівля за осколки та ownership.', es: 'Fase 1: catálogo. Fase 2: pagos con fragment
- [warning] trilang-missing-all-planned-locales app/flashcards_market_dev.tsx:188 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Топ', uk: 'Топ', es: 'Top' }
- [warning] trilang-missing-all-planned-locales app/flashcards_market_dev.tsx:189 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'карточек', uk: 'карток', es: 'tarjetas' }
- [warning] trilang-missing-all-planned-locales app/flashcards_market_dev.tsx:198 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Мои наборы (DEV)', uk: 'Мої набори (DEV)', es: 'Mis packs (DEV)' }
- [warning] trilang-missing-all-planned-locales app/flashcards_market_dev.tsx:212 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Открыть в карточках (DEV)', uk: 'Відкрити в картках (DEV)', es: 'Abrir en tarjetas (DEV)', }
- [warning] trilang-missing-all-planned-locales app/flashcards_market_dev.tsx:263 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'карточек', uk: 'карток', es: 'tarjetas' }
- [warning] trilang-missing-all-planned-locales app/flashcards_market_dev.tsx:266 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'продаж', uk: 'продажів', es: 'ventas' }
- [warning] trilang-missing-all-planned-locales app/flashcards_market_dev.tsx:273 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Официальный пак', uk: 'Офіційний пак', es: 'Pack oficial' }
- [warning] trilang-missing-all-planned-locales app/flashcards_market_dev.tsx:274 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Автор', uk: 'Автор', es: 'Autor' }
