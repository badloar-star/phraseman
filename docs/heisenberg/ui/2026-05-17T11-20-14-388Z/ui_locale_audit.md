# Heisenberg UI Locale Audit

Generated: 2026-05-17T11:20:14.387Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 579
- triLang calls: 1511
- Static triLang calls: 1492
- Dynamic triLang calls: 19
- triLang missing locale units: 3120
- triLang calls missing all planned locales: 624
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 624
- dynamic-trilang-copy: 19
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/_admin_settings_testers.tsx: 24 findings, 120 missing locale units
- app/LeagueResultModal.tsx: 24 findings, 120 missing locale units
- app/lesson_menu.tsx: 23 findings, 115 missing locale units
- app/(tabs)/friends.tsx: 20 findings, 100 missing locale units
- app/quizzes.tsx: 20 findings, 100 missing locale units
- app/phrase_analytics_screen.tsx: 20 findings, 95 missing locale units
- app/flashcards_collection.tsx: 18 findings, 90 missing locale units
- app/lesson_complete.tsx: 18 findings, 90 missing locale units
- app/achievements_screen.tsx: 17 findings, 85 missing locale units
- app/flashcards/FlashcardsCategoryHub.tsx: 17 findings, 85 missing locale units
- app/preposition_drill.tsx: 17 findings, 85 missing locale units
- app/problem_coach.tsx: 17 findings, 85 missing locale units
- components/RegistrationPromptModal.tsx: 16 findings, 80 missing locale units
- components/LevelGiftModal.tsx: 15 findings, 75 missing locale units
- app/(tabs)/lessons.tsx: 14 findings, 70 missing locale units
- app/arena_join.tsx: 14 findings, 70 missing locale units
- app/flashcards_market_dev.tsx: 14 findings, 70 missing locale units
- components/ProfileCardUpgradeModal.tsx: 14 findings, 70 missing locale units
- components/ReportErrorButton.tsx: 14 findings, 70 missing locale units
- app/arena_leaderboard.tsx: 13 findings, 65 missing locale units
- components/LevelGiftDualModal.tsx: 16 findings, 60 missing locale units
- app/arena_rating.tsx: 12 findings, 60 missing locale units
- app/lesson_irregular_verbs.tsx: 12 findings, 60 missing locale units
- components/ReportPackModal.tsx: 12 findings, 60 missing locale units
- app/pack_opening.tsx: 11 findings, 55 missing locale units

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
- [warning] trilang-missing-all-planned-locales app/(tabs)/lessons.tsx:438 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Глава ${item.label}`, uk: `Глава ${item.label}`, es: `Capítulo ${item.label}`, }
- [warning] trilang-missing-all-planned-locales app/(tabs)/lessons.tsx:511 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Откроется с Premium', uk: 'Відкриється з Premium', es: 'Se abre con Premium', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/lessons.tsx:756 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `УРОК ${num}`, uk: `УРОК ${num}`, es: `LECCIÓN ${num}`, }
- [warning] trilang-missing-all-planned-locales app/(tabs)/lessons.tsx:809 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '· · ·', uk: '· · ·', es: '· · ·' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/lessons.tsx:812 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Продолжение скоро', uk: 'Продовження незабаром', es: 'Próximamente' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/lessons.tsx:819 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Список уроков', uk: 'Список уроків', es: 'Lista de lecciones', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/lessons.tsx:832 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Недоступно', uk: 'Недоступно', es: 'No disponible' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/lessons.tsx:834 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Premium', uk: 'Premium', es: 'Premium', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/lessons.tsx:840 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Уровень пока закрыт', uk: 'Рівень поки закритий', es: 'Nivel bloqueado', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/lessons.tsx:846 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Урок заблокирован', uk: 'Урок заблоковано', es: 'Lección bloqueada', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/lessons.tsx:873 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Этот урок входит в Premium.', uk: 'Цей урок входить до Premium.', es: 'Esta lección forma parte de Premium.', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/lessons.tsx:884 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Получить Premium', uk: 'Отримати Premium', es: 'Obtener Premium' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/lessons.tsx:898 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Пока нет', uk: 'Поки ні', es: 'Ahora no' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/lessons.tsx:903 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/settings.tsx:92 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] dynamic-trilang-copy app/(tabs)/settings.tsx:544: triLang uses a dynamic copy object; UI locale audit cannot prove planned locales are present. | triLang(lang, FONT_SIZE_LABELS[fontSize])
- [warning] trilang-missing-all-planned-locales app/(tabs)/settings.tsx:719 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Настройки', uk: 'Налаштування', es: 'Ajustes', }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:328 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Итоги недели', uk: 'Підсумки тижня', es: 'Resultados de la semana' }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:331 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Повышен до ${newLeague.nameRU}`, uk: `Підвищено до ${newLeague.nameUK}`, es: `Has ascendido a ${newLeague.nameES}`, }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:337 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Понижен до ${newLeague.nameRU}`, uk: `Понижено до ${newLeague.nameUK}`, es: `Has descendido a ${newLeague.nameES}`, }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:342 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Остаёшься в лиге ${newLeague.nameRU}`, uk: `Залишаєшся в лізі ${newLeague.nameUK}`, es: `Sigues en ${newLeague.nameES}`, }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:351 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '🚀 Вперёд!', uk: '🚀 Уперед!', es: '🚀 ¡Adelante!' }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:353 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Попробую ещё раз', uk: 'Спробую ще раз', es: 'Lo intentaré de nuevo' }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:354 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Продолжить', uk: 'Продовжити', es: 'Continuar' }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:357 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Новая лига — новые вызовы и бонусы!', uk: 'Нова ліга — нові виклики й бонуси!', es: '¡Nueva liga: nuevos retos y bonificaciones!', }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:363 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Не сдавайся — быстро вернёшься выше.', uk: 'Не здавайся — швидко повернешся вище.', es: 'No te rindas: pronto volverás a subir.', }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:368 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Хороший результат, держи темп!', uk: 'Гарний результат, тримай темп!', es: 'Buen resultado, ¡mantén el ritmo!', }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:383 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: row.nameRU, uk: row.nameUK, es: row.nameES }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:508 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar' }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:600 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: prevLeague.nameRU, uk: prevLeague.nameUK, es: prevLeague.nameES }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:609 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: newLeague.nameRU, uk: newLeague.nameUK, es: newLeague.nameES }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:633 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Твоё место', uk: 'Твоє місце', es: 'Tu puesto' }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:668 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Топ ${100 - percentile + 1}% группы`, uk: `Топ ${100 - percentile + 1}% групи`, es: `Top ${100 - percentile + 1} % del grupo`, }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:711 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Группа недели', uk: 'Група тижня', es: 'Grupo de la semana' }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:714 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'чел.', uk: 'осіб', es: 'pers.' }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:739 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'участников', uk: 'учасників', es: 'participantes' }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:775 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: newLeague.tagRU, uk: newLeague.tagUK, es: newLeague.tagES }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:779 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Бонус активирован — новая лига!', uk: 'Бонус активовано — нової ліги!', es: '¡Bonificación activada: nueva liga!', }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:784 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Бонус лиги действует', uk: 'Бонус ліги діє', es: 'La bonificación de la liga está activa', }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:945 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: ' (ты)', uk: ' (ти)', es: ' (tú)' }
- [warning] trilang-missing-all-planned-locales app/LeagueResultModal.tsx:1066 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: ' (ты)', uk: ' (ти)', es: ' (tú)' }
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:110 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'пусто', uk: 'порожньо', es: 'vacío' }
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:247 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '📖 Превью интро уроков', uk: '📖 Попередній перегляд інтро уроків', es: '📖 Vista previa de intros de lección', }
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:252 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Готово ${totalWith}/32 · пусто ${totalEmpty} · флаг «показано»: ${shownFlagsCount}`, uk: `Готово ${totalWith}/32 · порожньо ${totalEmpty} · прапор «показано»: ${shownFlagsCo
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:257 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Сбросить флаги показа всех 32 уроков', uk: 'Скинути прапори показу всіх 32 уроків', es: 'Reiniciar marcas de intro de las 32 lecciones', }
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:262 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Удаляет lesson{id}_intro_shown — интро снова появится при первом реальном входе', uk: "Видаляє lesson{id}_intro_shown — інтро знову з\'явиться під час першого реального вход
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:267 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Как пользоваться', uk: 'Як користуватися', es: 'Cómo usar esto', }
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:272 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '• Тап по плитке урока — откроет тот же экран онбординга, что увидит пользователь.\n' + '• «Начать урок» или ✕ внутри превью просто закроют оверлей. Сам урок не запустится.\n
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:438 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'превью интро уроков', uk: 'прев\'ю інтро уроків', es: 'vista previa de intros de lección', }
- [warning] trilang-missing-all-planned-locales app/_admin_settings_testers.tsx:667 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Admin preview: актуальная глобальная модалка осколков', uk: 'Admin preview: актуальна глобальна модалка осколків', es: 'Admin preview: modal global actual de fragmentos', }
- [warning] trilang-missing-all-planned-locales app/_admin_settings_testers.tsx:1389 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Повтор: 7 тестових карток', ru: 'Повтор: 7 тестовых карточек', es: 'Repaso activo: 7 tarjetas de prueba', }
- [warning] trilang-missing-all-planned-locales app/_admin_settings_testers.tsx:1396 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Сид урок 99: старі тест-записи видаляються, потім екран «Повторення»', ru: 'Сид урок 99: старые тест-записи удаляются, затем экран «Повторение»', es: 'Semilla lección 99: se
- [warning] trilang-missing-all-planned-locales app/_admin_settings_testers.tsx:3069 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Скинути ВСЕ дані', ru: 'Сбросить ВСЕ данные', es: 'Restablecer TODOS los datos', }
- [warning] trilang-missing-all-planned-locales app/_admin_settings_testers.tsx:3074 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Видалити весь прогрес та налаштування', ru: 'Удалить весь прогресс и настройки', es: 'Elimina todo el progreso y la configuración', }
- [warning] trilang-missing-all-planned-locales app/_admin_settings_testers.tsx:3088 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Скинути статистику', ru: 'Сбросить статистику', es: 'Restablecer estadísticas', }
- [warning] trilang-missing-all-planned-locales app/_admin_settings_testers.tsx:3093 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Скинути стрік та інші статистики', ru: 'Сбросить цепочку и другую статистику', es: 'Elimina la racha y el resto de estadísticas guardadas', }
- [warning] trilang-missing-all-planned-locales app/_admin_settings_testers.tsx:3182 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Тестовий preview форс-оновлення. Перевір CTA і стиль модалки.', ru: 'Тестовый preview форс-обновления. Проверь CTA и стиль модалки.', es: 'Vista previa de actualización forz
- [warning] trilang-missing-all-planned-locales app/_admin_settings_testers.tsx:3271 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Розблокувати все?', ru: 'Разблокировать все?', es: '¿Desbloquear todo?' }
- [warning] trilang-missing-all-planned-locales app/_admin_settings_testers.tsx:3272 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Це розблокує всі досягнення та рамки.', ru: 'Это разблокирует все достижения и рамки.', es: 'Desbloqueará todos los logros y marcos.', }
- [warning] trilang-missing-all-planned-locales app/_admin_settings_testers.tsx:3277 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: 'Скасувати', ru: 'Отмена', es: 'Cancelar' }
