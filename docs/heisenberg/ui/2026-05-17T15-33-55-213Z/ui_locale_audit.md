# Heisenberg UI Locale Audit

Generated: 2026-05-17T15:33:55.213Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 580
- triLang calls: 1510
- Static triLang calls: 1502
- Dynamic triLang calls: 8
- triLang missing locale units: 655
- triLang calls missing all planned locales: 131
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 131
- dynamic-trilang-copy: 8
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/(tabs)/friends.tsx: 20 findings, 100 missing locale units
- app/preposition_drill.tsx: 17 findings, 85 missing locale units
- app/problem_coach.tsx: 17 findings, 85 missing locale units
- app/premium_modal.tsx: 7 findings, 35 missing locale units
- app/components/RankChangeModal.tsx: 4 findings, 20 missing locale units
- app/lesson_intro_screens.tsx: 4 findings, 20 missing locale units
- components/GlobalBroadcastModal.tsx: 4 findings, 20 missing locale units
- app/friends_screen.tsx: 3 findings, 15 missing locale units
- app/hint.tsx: 3 findings, 15 missing locale units
- components/AchievementToast.tsx: 3 findings, 15 missing locale units
- components/CoachToast.tsx: 3 findings, 15 missing locale units
- components/SaveProgressBanner.tsx: 3 findings, 15 missing locale units
- components/ShardsEarnedModal.tsx: 3 findings, 15 missing locale units
- app/(tabs)/settings.tsx: 3 findings, 10 missing locale units
- app/level_gift_system.ts: 3 findings, 10 missing locale units
- app/arena_game.tsx: 2 findings, 10 missing locale units
- app/avatar_select.tsx: 2 findings, 10 missing locale units
- app/beta_testers.tsx: 2 findings, 10 missing locale units
- app/diagnostic_test.tsx: 2 findings, 10 missing locale units
- app/flashcards.tsx: 2 findings, 10 missing locale units
- app/settings_themes.tsx: 2 findings, 10 missing locale units
- app/streak_stats.tsx: 2 findings, 10 missing locale units
- app/web_screen.tsx: 2 findings, 10 missing locale units
- components/ActiveBoostBar.tsx: 2 findings, 10 missing locale units
- components/ReleaseWaveBonusModal.tsx: 2 findings, 10 missing locale units

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
- [warning] trilang-missing-all-planned-locales app/_pos_analytics_audit.tsx:124 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'POS token audit', uk: 'POS token audit', es: 'Auditoría POS', }
- [warning] trilang-missing-all-planned-locales app/arena_game.tsx:303 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Игрок', uk: 'Гравець', es: 'Jugador' }
- [warning] trilang-missing-all-planned-locales app/arena_game.tsx:843 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Сообщить о проблеме в вопросе арены', uk: 'Повідомити про проблему в питанні арени', es: 'Informar de un problema en la pregunta', }
- [warning] trilang-missing-all-planned-locales app/avatar_select.tsx:359 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: aura.nameRu, uk: aura.nameUk, es: aura.nameEs }
- [warning] trilang-missing-all-planned-locales app/avatar_select.tsx:1024 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Открыть ауру «${auraName(pendingAuraPurchase)}» за осколки?`, uk: `Відкрити ауру «${auraName(pendingAuraPurchase)}» за осколки?`, es: `¿Desbloquear el aura «${auraName(pendi
- [warning] trilang-missing-all-planned-locales app/beta_testers.tsx:53 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Бета-тестеры', uk: 'Бета-тестери', es: 'Beta testers', }
- [warning] trilang-missing-all-planned-locales app/beta_testers.tsx:105 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Версия ${versionLabel}`, uk: `Версія ${versionLabel}`, es: `Versión ${versionLabel}`, }
- [warning] trilang-missing-all-planned-locales app/community_pack_create.tsx:110 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
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
- [warning] trilang-missing-all-planned-locales app/lesson_help.tsx:19384 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: theory.titleUK, ru: theory.titleRU, es: theoryTitleEs }
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
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:835 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'После активации Premium ты сразу получишь больше пользы из каждой сессии.', uk: 'Після активації Premium ти відразу отримаєш більше користі з кожної сесії.', es: 'Tras activ
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:918 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:2766 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Экран Premium', uk: 'Екран Premium', es: 'Pantalla Premium', }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:250 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'У цьому уроці немає прийменників', ru: 'В этом уроке нет предлогов', es: 'En esta lección no hay preposiciones.', }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:264 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Тренажер прийменників', ru: 'Тренажер предлогов', es: 'Práctica de preposiciones', }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:269 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: `Урок ${lessonId}: прийменники цього уроку`, ru: `Урок ${lessonId}: предлоги этого урока`, es: `Lección ${lessonId}: preposiciones de esta lección`, }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:406 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Завдання', ru: 'Задание', es: 'Ejercicio' }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:448 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Правильно', ru: 'Верно', es: 'Correcto' }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:449 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Неправильно', ru: 'Неверно', es: 'Incorrecto' }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:452 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: item.explainUK, ru: item.explainRU, es: item.explainES ?? item.explainRU, }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:463 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Далі', ru: 'Дальше', es: 'Siguiente' }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:474 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: `Урок ${lessonId}, нові прийменники: ${prepositionsLabel}`, ru: `Урок ${lessonId}, новые предлоги: ${prepositionsLabel}`, es: `Lección ${lessonId}, nuevas preposiciones: ${pr
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:479 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: `Завдання: ${item.sentenceTemplate}`, ru: `Задание: ${item.sentenceTemplate}`, es: `Ejercicio: ${item.sentenceTemplate}`, }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:484 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: `Варіанти: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | ')}`, ru: `Варианты: ${item.options.map(o => (o === item.correct ? `[✓${o}]` : o)).join(' | 
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:501 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Прийменники відпрацьовано!', ru: 'Предлоги отработаны!', es: '¡Preposiciones repasadas!', }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:508 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Точність: ', ru: 'Точность: ', es: 'Precisión: ' }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:511 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: `Помилок: ${wrongIds.length}`, ru: `Ошибок: ${wrongIds.length}`, es: `Errores: ${wrongIds.length}`, }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:523 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: '← До уроку', ru: '← К уроку', es: '← Volver a la lección' }
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:534 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Ще раз', ru: 'Снова', es: 'Otra vez' }
