# Heisenberg UI Locale Audit

Generated: 2026-05-17T10:45:12.174Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 579
- triLang calls: 1511
- Static triLang calls: 1490
- Dynamic triLang calls: 21
- triLang missing locale units: 4730
- triLang calls missing all planned locales: 946
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 946
- dynamic-trilang-copy: 21
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/arena_room.tsx: 39 findings, 195 missing locale units
- app/level_exam.tsx: 39 findings, 190 missing locale units
- app/club_screen.tsx: 38 findings, 190 missing locale units
- app/arena_lobby.tsx: 37 findings, 185 missing locale units
- app/trainer.tsx: 34 findings, 165 missing locale units
- app/review.tsx: 30 findings, 150 missing locale units
- app/trainer_smart_session.tsx: 28 findings, 140 missing locale units
- app/(tabs)/quizzes.tsx: 27 findings, 135 missing locale units
- components/LeagueChatPanel.tsx: 26 findings, 130 missing locale units
- app/progress_map.tsx: 25 findings, 125 missing locale units
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
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:372 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: c.labelRU, uk: c.labelUK, es: c.labelES }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:373 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: c.tagRU, uk: c.tagUK, es: c.tagES }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:440 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Лимит', uk: 'Ліміт', es: 'Límite' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:492 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Начать квиз', uk: 'Почати квіз', es: 'Empezar cuestionario' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:519 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Бесплатные квизы сегодня: ${freeQuizState.left}/${freeQuizState.limit}`, uk: `Безкоштовні квізи сьогодні: ${freeQuizState.left}/${freeQuizState.limit}`, es: `Cuestionarios g
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:557 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: cfg.labelRU, uk: cfg.labelUK, es: cfg.labelES }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:833 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Вопросы временно недоступны', uk: 'Питання тимчасово недоступні', es: 'No hay preguntas disponibles por ahora.', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:851 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Что-то пошло не так', uk: 'Щось пішло не так', es: 'Algo salió mal', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1032 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: rankInfo.labelRU, uk: rankInfo.labelUK, es: rankInfo.labelES }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1047 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'опыта', uk: 'досвіду', es: 'XP' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1060 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Уровень ${lv}`, uk: `Рівень ${lv}`, es: `Nivel ${lv}` }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1086 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `🔄 Исправить ошибки (${wrongPhrases.length})`, uk: `🔄 Виправити помилки (${wrongPhrases.length})`, es: `🔄 Repasar errores (${wrongPhrases.length})`, }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1151 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Поделиться', uk: 'Поділитися', es: 'Compartir' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1166 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '🏠 На главную', uk: '🏠 На головну', es: '🏠 Volver al inicio', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1295 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { uk: current.uk, ru: current.ru, es: current.es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1312 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'ПРАВИЛЬНО:', uk: 'ПРАВИЛЬНО:', es: 'CORRECTO:' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1326 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'ВАШ ВАРИАНТ:', uk: 'ВАШ ВАРІАНТ:', es: 'TU RESPUESTA:' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1371 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'РАЗБОР', uk: 'ПОЯСНЕННЯ', es: 'EXPLICACIÓN' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1399 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Далее', uk: 'Далі', es: 'Siguiente' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1432 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Проверить', uk: 'Перевірити', es: 'Comprobar' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1460 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '💡 Сложно набирать вручную? Можно выключить ввод с клавиатуры.', uk: '💡 Складно набирати вручну? Можна вимкнути ввід з клавіатури.', es: '💡 ¿Te cuesta escribir con el tecl
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1478 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Выключить', uk: 'Вимкнути', es: 'Desactivar' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1491 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Больше не показывать', uk: 'Більше не показувати', es: 'No volver a mostrar', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1518 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Время вышло!', uk: 'Час вийшов!', es: '¡Se acabó el tiempo!' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1521 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Очень жаль 😔 Попробуй ещё раз!', uk: 'Дуже шкода 😔 Спробуй ще раз!', es: '¡Qué pena! 😔 ¡Inténtalo otra vez!', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1529 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Подсказка: попробуй выбрать уровень полегче или выключи ручной ввод в настройках.', uk: 'Підказка: спробуй вибрати рівень легше або вимкни ручне введення в налаштуваннях.', 
- [warning] trilang-missing-all-planned-locales app/(tabs)/quizzes.tsx:1541 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Понятно', uk: 'Зрозуміло', es: 'Entendido' }
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
