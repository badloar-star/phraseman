# Heisenberg UI Locale Audit

Generated: 2026-05-17T15:12:15.526Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 580
- triLang calls: 1505
- Static triLang calls: 1497
- Dynamic triLang calls: 8
- triLang missing locale units: 1185
- triLang calls missing all planned locales: 237
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 237
- dynamic-trilang-copy: 8
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/(tabs)/friends.tsx: 20 findings, 100 missing locale units
- app/preposition_drill.tsx: 17 findings, 85 missing locale units
- app/problem_coach.tsx: 17 findings, 85 missing locale units
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
- components/DailyPhraseCard.tsx: 4 findings, 20 missing locale units
- components/NotificationPermissionModal.tsx: 4 findings, 20 missing locale units
- components/PremiumCelebrationModal.tsx: 4 findings, 20 missing locale units
- components/QuizTimeoutModal.tsx: 4 findings, 20 missing locale units

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
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1141 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1290 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] trilang-missing-all-planned-locales app/exam.tsx:363 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/flashcards.tsx:42 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Тренировка карточек', uk: 'Тренування карток', es: 'Práctica de tarjetas', }
- [warning] trilang-missing-all-planned-locales app/flashcards.tsx:47 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Верно/Неверно: подходит ли перевод', uk: 'Вірно/Невірно: чи підходить переклад', es: 'Correcto/Incorrecto: ¿coincide?', }
- [warning] trilang-missing-all-planned-locales app/flashcards/FlashcardsFilterDropdown.tsx:60 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Все', uk: 'Всі', es: 'Todas' }
- [warning] trilang-missing-all-planned-locales app/friends_screen.tsx:123 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/friends_screen.tsx:385 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: gift.labelRu, uk: gift.labelUk, es: gift.labelEs }
- [warning] trilang-missing-all-planned-locales app/friends_screen.tsx:388 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: gift.descRu, uk: gift.descUk, es: gift.descEs }
- [warning] trilang-missing-all-planned-locales app/hint.tsx:1145 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `${T.ru.lessonN(lessonId)} · Шпаргалка`, uk: `${T.uk.lessonN(lessonId)} · Швидка довідка`, es: `${T.es.lessonN(lessonId)} · Guía rápida`, }
- [warning] trilang-missing-all-planned-locales app/hint.tsx:1150 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: hint.titleRU, uk: hint.titleUK, es: hint.titleES }
- [warning] trilang-missing-all-planned-locales app/hint.tsx:1175 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar' }
- [warning] trilang-missing-all-planned-locales app/lesson1.tsx:705 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Урок', ru: 'Урок', es: 'Lección' }
- [warning] trilang-missing-all-planned-locales app/lesson_help.tsx:19371 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: `Урок ${lessonId} — Теорія`, ru: `Урок ${lessonId} — Теория`, es: `Lección ${lessonId} — Teoría`, }
- [warning] trilang-missing-all-planned-locales app/lesson_help.tsx:19379 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: theory.titleUK, ru: theory.titleRU, es: theoryTitleEs }
- [warning] trilang-missing-all-planned-locales app/lesson_help.tsx:19380 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: `Урок ${lessonId}`, ru: `Урок ${lessonId}`, es: `Lección ${lessonId}`, }
- [warning] trilang-missing-all-planned-locales app/lesson_help.tsx:19387 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Коротко: правило + приклади + 25 XP', ru: 'Коротко: правило + примеры + 25 XP', es: 'Resumen: regla + ejemplos + 25 XP', }
- [warning] trilang-missing-all-planned-locales app/lesson_help.tsx:19415 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: `Теорія для уроку ${lessonId} незабаром з\'явиться. Продовжуй практикуватись!`, ru: `Теория для урока ${lessonId} скоро появится. Продолжай практиковаться!`, es: `La teoría d
- [warning] trilang-missing-all-planned-locales app/lesson_help.tsx:19450 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: `XP отримано (+${earnedXP})`, ru: `XP получено (+${earnedXP})`, es: `Has obtenido +${earnedXP} XP`, }
- [warning] trilang-missing-all-planned-locales app/lesson_help.tsx:19455 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: `Отримати ${previewXP} XP`, ru: `Получить ${previewXP} XP`, es: `Reclamar ${previewXP} XP`, }
- [warning] trilang-missing-all-planned-locales app/lesson_intro_screens.tsx:885 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Урок', uk: 'Урок', es: 'Lección' }
- [warning] trilang-missing-all-planned-locales app/lesson_intro_screens.tsx:889 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Начать урок', uk: 'Почати урок', es: 'Empezar la lección' }
- [warning] trilang-missing-all-planned-locales app/lesson_intro_screens.tsx:890 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Коснитесь, чтобы увидеть дальше', uk: 'Торкніться, щоб побачити далі', es: 'Toca para continuar', }
- [warning] trilang-missing-all-planned-locales app/lesson_intro_screens.tsx:928 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Назад', uk: 'Назад', es: 'Volver' }
- [warning] trilang-missing-all-planned-locales app/level_gift_system.ts:67 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: g.titleRU, uk: g.titleUK, es: g.titleES ?? g.titleRU }
- [warning] trilang-missing-all-planned-locales app/level_gift_system.ts:71 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: g.descRU, uk: g.descUK, es: g.descES ?? g.descRU }
- [warning] dynamic-trilang-copy app/level_gift_system.ts:86: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, GIFT_RARITY_UI_LABEL[r])
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:808 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Сейчас у тебя серия ${streakDays} дн. Premium даёт заморозку и спокойнее ритм без пауз.`, uk: `Зараз у тебе серія ${streakDays} дн. Premium дає заморозку і спокійніший ритм 
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:815 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Уроков пройдено: ${lessonsDone}. Premium откроет текущий уровень целиком, а следующий — после экзамена.`, uk: `Уроків пройдено: ${lessonsDone}. Premium відкриє поточний ріве
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:822 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Уроков пройдено: ${lessonsDone}. Premium снимает замки с уроков текущего уровня.`, uk: `Уроків пройдено: ${lessonsDone}. Premium знімає замки з уроків поточного рівня.`, es:
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:829 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `У тебя уже ${savedCards} карточек. Premium снимает лимит полностью.`, uk: `У тебе вже ${savedCards} карток. Premium знімає ліміт повністю.`, es: `Ya tienes ${savedCards} tar
