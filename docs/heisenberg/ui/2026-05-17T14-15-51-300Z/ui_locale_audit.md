# Heisenberg UI Locale Audit

Generated: 2026-05-17T14:15:51.299Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 579
- triLang calls: 1511
- Static triLang calls: 1492
- Dynamic triLang calls: 19
- triLang missing locale units: 2880
- triLang calls missing all planned locales: 576
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 576
- dynamic-trilang-copy: 19
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
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
- components/ExamResultPreviewAdminModal.tsx: 11 findings, 55 missing locale units
- components/LeagueChestOpenModal.tsx: 10 findings, 50 missing locale units

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
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:110 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'пусто', uk: 'порожньо', es: 'vacío' }
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:247 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '📖 Превью интро уроков', uk: '📖 Попередній перегляд інтро уроків', es: '📖 Vista previa de intros de lección', }
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:252 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Готово ${totalWith}/32 · пусто ${totalEmpty} · флаг «показано»: ${shownFlagsCount}`, uk: `Готово ${totalWith}/32 · порожньо ${totalEmpty} · прапор «показано»: ${shownFlagsCo
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:257 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Сбросить флаги показа всех 32 уроков', uk: 'Скинути прапори показу всіх 32 уроків', es: 'Reiniciar marcas de intro de las 32 lecciones', }
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:262 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Удаляет lesson{id}_intro_shown — интро снова появится при первом реальном входе', uk: "Видаляє lesson{id}_intro_shown — інтро знову з\'явиться під час першого реального вход
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:267 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Как пользоваться', uk: 'Як користуватися', es: 'Cómo usar esto', }
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:272 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '• Тап по плитке урока — откроет тот же экран онбординга, что увидит пользователь.\n' + '• «Начать урок» или ✕ внутри превью просто закроют оверлей. Сам урок не запустится.\n
- [warning] trilang-missing-all-planned-locales app/_admin_intro_preview.tsx:438 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'превью интро уроков', uk: 'прев\'ю інтро уроків', es: 'vista previa de intros de lección', }
- [warning] trilang-missing-all-planned-locales app/_pos_analytics_audit.tsx:124 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'POS token audit', uk: 'POS token audit', es: 'Auditoría POS', }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:895 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Премиум', uk: 'Преміум', es: 'Premium' }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1094 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Секретное достижение', uk: 'Секретне досягнення', es: 'Logro secreto', }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1103 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Разблокируй, чтобы узнать', uk: 'Розблокуй, щоб дізнатись', es: 'Desbloquéalo para descubrirlo', }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1121 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Нужен Premium: уровни Medium и Hard в квизах открываются по подписке.', uk: 'Потрібен Premium: рівні Medium і Hard у квізах відкриваються за підпискою.', es: 'Requiere Premi
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1140 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Оформить Premium', uk: 'Оформити Premium', es: 'Conseguir Premium' }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1150 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Получено', uk: 'Отримано', es: 'Obtenido' }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1167 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Осколок', uk: 'Осколок', es: 'Fragmento' }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1169 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '+1 осколок знаний', uk: '+1 осколок знань', es: '+1 fragmento de conocimiento' }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1196 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Получить', uk: 'Забрати', es: 'Reclamar' }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1201 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Осколок получен', uk: 'Осколок отримано', es: 'Fragmento reclamado' }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1216 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'ещё', uk: 'ще', es: 'faltan' }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1237 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Поделиться', uk: 'Поділитися', es: 'Compartir' }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1249 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Закрыть', uk: 'Закрити', es: 'Cerrar' }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1412 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: CAT_LABEL_RU[cat], uk: CAT_LABEL_UK[cat], es: CAT_LABEL_ES[cat] }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1456 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Достижения', uk: 'Досягнення', es: 'Logros' }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1517 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Пока нет полученных наград', uk: 'Поки немає отриманих нагород', es: 'Aún no tienes recompensas' }
- [warning] trilang-missing-all-planned-locales app/achievements_screen.tsx:1526 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Достижения', uk: 'Досягнення', es: 'Logros', }
- [warning] trilang-missing-all-planned-locales app/arena_game.tsx:303 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Игрок', uk: 'Гравець', es: 'Jugador' }
- [warning] trilang-missing-all-planned-locales app/arena_game.tsx:843 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Сообщить о проблеме в вопросе арены', uk: 'Повідомити про проблему в питанні арени', es: 'Informar de un problema en la pregunta', }
- [warning] trilang-missing-all-planned-locales app/arena_join.tsx:21 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Игрок', uk: 'Гравець', es: 'Jugador' }
- [warning] trilang-missing-all-planned-locales app/arena_join.tsx:95 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Назад', uk: 'Назад', es: 'Volver' }
- [warning] trilang-missing-all-planned-locales app/arena_join.tsx:107 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Арена', uk: 'Арена', es: 'Arena' }
- [warning] trilang-missing-all-planned-locales app/arena_join.tsx:116 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Арена с ${hostName}`, uk: `Арена з ${hostName}`, es: `Duelo con ${hostName}`, }
- [warning] trilang-missing-all-planned-locales app/arena_join.tsx:123 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Тебя вызвали на арену по английскому!', uk: 'Тебе викликали на арену з англійської!', es: 'Te han invitado a un duelo de inglés en la Arena.', }
- [warning] trilang-missing-all-planned-locales app/arena_join.tsx:131 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Принять вызов', uk: 'Прийняти виклик', es: 'Aceptar el reto', }
- [warning] trilang-missing-all-planned-locales app/arena_join.tsx:140 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Отказаться', uk: 'Відмовитися', es: 'Rechazar' }
- [warning] trilang-missing-all-planned-locales app/arena_join.tsx:150 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Арена с ${hostName}`, uk: `Арена з ${hostName}`, es: `Duelo con ${hostName}` }
- [warning] trilang-missing-all-planned-locales app/arena_join.tsx:159 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Комната не найдена', uk: 'Кімнату не знайдено', es: 'No se encontró la sala', }
- [warning] trilang-missing-all-planned-locales app/arena_join.tsx:167 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar' }
- [warning] trilang-missing-all-planned-locales app/arena_join.tsx:172 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'На главную', uk: 'На головну', es: 'Volver al inicio' }
- [warning] trilang-missing-all-planned-locales app/arena_join.tsx:182 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Комната устарела', uk: 'Кімната застаріла', es: 'La sala ha caducado', }
- [warning] trilang-missing-all-planned-locales app/arena_join.tsx:189 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Попроси друга создать новую', uk: 'Попроси друга створити нову', es: 'Pídele a tu amigo que cree otra sala.', }
- [warning] trilang-missing-all-planned-locales app/arena_join.tsx:197 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'На главную', uk: 'На головну', es: 'Volver al inicio' }
- [warning] trilang-missing-all-planned-locales app/arena_leaderboard.tsx:210 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `${h}ч ${m}м`, uk: `${h} год ${m} хв`, es: `${h} h ${m} min`, }
