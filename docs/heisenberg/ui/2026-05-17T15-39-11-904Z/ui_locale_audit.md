# Heisenberg UI Locale Audit

Generated: 2026-05-17T15:39:11.903Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 580
- triLang calls: 1509
- Static triLang calls: 1501
- Dynamic triLang calls: 8
- triLang missing locale units: 530
- triLang calls missing all planned locales: 106
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 106
- dynamic-trilang-copy: 8
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/(tabs)/friends.tsx: 20 findings, 100 missing locale units
- app/preposition_drill.tsx: 17 findings, 85 missing locale units
- app/problem_coach.tsx: 17 findings, 85 missing locale units
- components/GlobalBroadcastModal.tsx: 4 findings, 20 missing locale units
- app/friends_screen.tsx: 3 findings, 15 missing locale units
- components/CoachToast.tsx: 3 findings, 15 missing locale units
- app/(tabs)/settings.tsx: 3 findings, 10 missing locale units
- app/level_gift_system.ts: 3 findings, 10 missing locale units
- app/arena_game.tsx: 2 findings, 10 missing locale units
- app/avatar_select.tsx: 2 findings, 10 missing locale units
- app/beta_testers.tsx: 2 findings, 10 missing locale units
- app/diagnostic_test.tsx: 2 findings, 10 missing locale units
- app/settings_themes.tsx: 2 findings, 10 missing locale units
- app/streak_stats.tsx: 2 findings, 10 missing locale units
- app/web_screen.tsx: 2 findings, 10 missing locale units
- components/AchievementToast.tsx: 2 findings, 10 missing locale units
- components/ActiveBoostBar.tsx: 2 findings, 10 missing locale units
- components/ReleaseWaveBonusModal.tsx: 2 findings, 10 missing locale units
- components/LangContext.tsx: 5 findings, 5 missing locale units
- components/ReleaseNotesModal.tsx: 5 findings, 5 missing locale units
- components/StatsPremiumBlur.tsx: 2 findings, 5 missing locale units
- app/_pos_analytics_audit.tsx: 1 findings, 5 missing locale units
- app/community_pack_create.tsx: 1 findings, 5 missing locale units
- app/exam.tsx: 1 findings, 5 missing locale units
- app/flashcards/FlashcardsFilterDropdown.tsx: 1 findings, 5 missing locale units

## First Findings
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:423 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Подарить', uk: 'Подарувати', es: 'Regalar' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:452 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:537 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'дней подряд', uk: 'днів поспіль', es: 'días seguidos' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:557 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Добавить в друзья', uk: 'Додати в друзі', es: 'Agregar amigo' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:598 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Мой код', uk: 'Мій код', es: 'Mi código' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:629 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Скопировано!', uk: 'Скопійовано!', es: '¡Copiado!' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:630 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Копировать', uk: 'Копіювати', es: 'Copiar' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:644 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Поделиться', uk: 'Поділитись', es: 'Compartir' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:652 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Не удалось получить код. Проверьте сеть и попробуйте снова.', uk: 'Не вдалося отримати код. Перевірте мережу й спробуйте ще.', es: 'No se pudo obtener el código. Comprueba l
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:670 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:694 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'только что', uk: 'щойно', es: 'ahora mismo' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:695 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `${min} мин назад`, uk: `${min} хв тому`, es: `hace ${min} min` }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:696 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `${hrs} ч назад`, uk: `${hrs} год тому`, es: `hace ${hrs} h` }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:697 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `${days} дн назад`, uk: `${days} дн тому`, es: `hace ${days} días` }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:711 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:797 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:990 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1091 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1571 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: gift.labelRu, uk: gift.labelUk, es: gift.labelEs }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1574 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: gift.descRu, uk: gift.descUk, es: gift.descEs }
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
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1141 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] trilang-missing-all-planned-locales app/diagnostic_test.tsx:1290 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: q.hintRU, uk: q.hintUK, es: q.hintES }
- [warning] trilang-missing-all-planned-locales app/exam.tsx:363 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/flashcards/FlashcardsFilterDropdown.tsx:60 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Все', uk: 'Всі', es: 'Todas' }
- [warning] trilang-missing-all-planned-locales app/friends_screen.tsx:123 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/friends_screen.tsx:385 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: gift.labelRu, uk: gift.labelUk, es: gift.labelEs }
- [warning] trilang-missing-all-planned-locales app/friends_screen.tsx:388 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: gift.descRu, uk: gift.descUk, es: gift.descEs }
- [warning] trilang-missing-all-planned-locales app/hint.tsx:1155 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: hint.titleRU, uk: hint.titleUK, es: hint.titleES }
- [warning] trilang-missing-all-planned-locales app/lesson1.tsx:705 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Урок', ru: 'Урок', es: 'Lección' }
- [warning] trilang-missing-all-planned-locales app/lesson_help.tsx:19384 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: theory.titleUK, ru: theory.titleRU, es: theoryTitleEs }
- [warning] trilang-missing-all-planned-locales app/level_gift_system.ts:67 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: g.titleRU, uk: g.titleUK, es: g.titleES ?? g.titleRU }
- [warning] trilang-missing-all-planned-locales app/level_gift_system.ts:71 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: g.descRU, uk: g.descUK, es: g.descES ?? g.descRU }
- [warning] dynamic-trilang-copy app/level_gift_system.ts:86: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, GIFT_RARITY_UI_LABEL[r])
- [warning] trilang-missing-all-planned-locales app/premium_modal.tsx:943 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
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
- [warning] trilang-missing-all-planned-locales app/preposition_drill.tsx:544 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Виправити помилки', ru: 'Исправить ошибки', es: 'Corregir errores' }
- [warning] trilang-missing-all-planned-locales app/privacy_screen.tsx:47 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Открыть политику на сайте Knowly', uk: 'Відкрити політику на сайті Knowly', es: 'Abrir la política en knowlyapps.com', }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:228 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Личный разбор', uk: 'Особистий розбір', es: 'Diagnostico personal' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:239 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Что именно тренируем', uk: 'Що саме тренуємо', es: 'Qué entrenamos' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:248 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Модель в голове', uk: 'Модель у голові', es: 'Modelo mental' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:258 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Короткая опора', uk: 'Коротка опора', es: 'Guia rapida' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:278 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Начать мини-проверку', uk: 'Почати міні-перевірку', es: 'Empezar mini prueba' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:299 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'КОРОТКАЯ ПРАКТИКА', uk: 'КОРОТКА ПРАКТИКА', es: 'MICRO PRACTICA' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:310 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Мысль', uk: 'Думка', es: 'Idea' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:375 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Да, именно так', uk: 'Так, саме так', es: 'Sí, exacto' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:376 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Почему этот вариант сбивает', uk: 'Чому цей варіант збиває', es: 'Por qué esta opción confunde' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:396 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Готово', uk: 'Готово', es: 'Listo' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:398 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Дальше', uk: 'Далі', es: 'Continuar' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:399 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Попробовать проще', uk: 'Спробувати простіше', es: 'Intentarlo más simple' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:420 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Паттерн начал собираться', uk: 'Патерн почав складатися', es: 'El patrón empieza a fijarse' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:421 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Мини-практика завершена', uk: 'Міні-практику завершено', es: 'Mini practica terminada' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:425 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'РЕЗУЛЬТАТ', uk: 'РЕЗУЛЬТАТ', es: 'RESULTADO' }
- [warning] trilang-missing-all-planned-locales app/problem_coach.tsx:428 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `${state.correctCount} верно · серия ${state.correctStreak}`, uk: `${state.correctCount} правильно · серія ${state.correctStreak}`, es: `${state.correctCount} correctas · rac
