# Heisenberg UI Locale Audit

Generated: 2026-05-17T10:27:23.153Z
Activation ready: no
Planned locales: pt-BR, vi, id, tr, pl

## Summary
- Files scanned: 579
- triLang calls: 1509
- Static triLang calls: 1488
- Dynamic triLang calls: 21
- triLang missing locale units: 6660
- triLang calls missing all planned locales: 1332
- Bundle missing locale units: 10

## Finding Codes
- trilang-missing-all-planned-locales: 1332
- dynamic-trilang-copy: 21
- lang-context-bundle-missing-planned-locale: 5
- i18n-t-bundle-missing-planned-locales: 1

## Top Files
- app/streak_stats.tsx: 150 findings, 750 missing locale units
- app/flashcards_swipe.tsx: 68 findings, 340 missing locale units
- app/arena_results.tsx: 46 findings, 230 missing locale units
- app/(tabs)/home.tsx: 44 findings, 220 missing locale units
- components/PlayerProfileModal.tsx: 42 findings, 210 missing locale units
- components/ActivityHeatmap365.tsx: 40 findings, 200 missing locale units
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

## First Findings
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:421 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Подарить', uk: 'Подарувати', es: 'Regalar' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:450 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:535 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'дней подряд', uk: 'днів поспіль', es: 'días seguidos' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:555 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Добавить в друзья', uk: 'Додати в друзі', es: 'Agregar amigo' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:596 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Мой код', uk: 'Мій код', es: 'Mi código' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:627 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Скопировано!', uk: 'Скопійовано!', es: '¡Copiado!' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:628 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Копировать', uk: 'Копіювати', es: 'Copiar' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:642 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Поделиться', uk: 'Поділитись', es: 'Compartir' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:650 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Не удалось получить код. Проверьте сеть и попробуйте снова.', uk: 'Не вдалося отримати код. Перевірте мережу й спробуйте ще.', es: 'No se pudo obtener el código. Comprueba l
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:668 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:692 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'только что', uk: 'щойно', es: 'ahora mismo' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:693 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `${min} мин назад`, uk: `${min} хв тому`, es: `hace ${min} min` }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:694 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `${hrs} ч назад`, uk: `${hrs} год тому`, es: `hace ${hrs} h` }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:695 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `${days} дн назад`, uk: `${days} дн тому`, es: `hace ${days} días` }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:709 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:780 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:972 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1073 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru, uk, es }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1547 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: gift.labelRu, uk: gift.labelUk, es: gift.labelEs }
- [warning] trilang-missing-all-planned-locales app/(tabs)/friends.tsx:1550 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: gift.descRu, uk: gift.descUk, es: gift.descEs }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:220 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Лига недели', uk: 'Ліга тижня', es: 'Liga semanal' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:252 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Привет,', uk: 'Привіт,', es: 'Hola,' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:813 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Лига недели', uk: 'Ліга тижня', es: 'Liga semanal' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:950 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Недостаточно осколков', uk: 'Недостатньо осколків', es: `No tienes suficientes ${BRAND_SHARDS_ES}`, }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:955 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Заморозка стоит ${FREEZE_COST_SHARDS} 💎. У тебя ${shardsBalance} 💎.`, uk: `Заморозка коштує ${FREEZE_COST_SHARDS} 💎. У тебе ${shardsBalance} 💎.`, es: `Congelar la racha 
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1019 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Бонус за вход!', uk: 'Бонус за вхід!', es: '¡Bono por entrar!', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1024 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru:' День 7 🔥', uk:' День 7 🔥', es:' · Día 7 🔥' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1026 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `день ${loginBonus.cycle}`, uk: `день ${loginBonus.cycle}`, es: `Día ${loginBonus.cycle}`, }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1041 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'С возвращением!', uk: 'З поверненням!', es: '¡Qué bien verte de nuevo!', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1048 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Весь день — +100% XP за каждый правильный ответ', uk: 'Весь день — +100% XP за кожну правильну відповідь', es: 'Todo el día: +100 % de XP por cada acierto', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1064 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Почини цепочку!', uk: 'Полагодь стрік!', es: '¡Recupera tu racha!', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1071 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Пройди 1 урок сегодня, чтобы сохранить цепочку · ${repairProgress}/1`, uk: `Пройди 1 урок сьогодні, щоб зберегти стрік · ${repairProgress}/1`, es: `Hoy completa 1 lección pa
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1119 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '32 урока', uk: '32 уроки', es: '32 lecciones' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1120 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '3 уровня', uk: '3 рівні', es: '3 niveles de dificultad' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1121 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Свои фразы', uk: 'Свої фрази', es: 'Tus tarjetas' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1135 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Задания дня', uk: 'Завдання дня', es: 'Tareas del día' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1142 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Лига недели', uk: 'Ліга тижня', es: 'Liga de la semana' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1235 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'через', uk: 'через', es: 'en' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1316 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Статус игрока', uk: 'Статус гравця', es: 'Estado del jugador' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1319 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Ур.', uk: 'Рів.', es: 'Nv.' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1414 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Обошёл ${homeXpPercentile}% по XP`, uk: `Обійшов ${homeXpPercentile}% за XP`, es: `Ahead of ${homeXpPercentile}% in XP`, }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1480 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Уровень', uk: 'Рівень', es: 'Nivel' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1501 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Ур.', uk: 'Рів.', es: 'Nv.' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1550 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Обошёл ${homeXpPercentile}% по XP`, uk: `Обійшов ${homeXpPercentile}% за XP`, es: `Ahead of ${homeXpPercentile}% in XP`, }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1622 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Цепочка ${streak} дней под угрозой`, uk: `Ланцюжок ${streak} днів під загрозою`, es: `Llevas ${streak} días de racha: no la pierdas hoy`, }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1630 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Доступно только для Premium', uk: 'Доступно лише для Premium', es: 'Solo disponible con Premium', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1636 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Заморозить бесплатно — бонус Premium', uk: 'Заморозити безкоштовно — бонус Premium', es: 'Primera congelación gratis con Premium', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1641 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Заморозить за ${FREEZE_COST_SHARDS} 💎`, uk: `Заморозити за ${FREEZE_COST_SHARDS} 💎`, es: `Congela tu racha por ${FREEZE_COST_SHARDS} 💎`, }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1654 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Бесплатно', uk: 'Безкоштовно', es: 'Gratis' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1696 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Урок', uk: 'Урок', es: 'Lección' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1730 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Урок', uk: 'Урок', es: 'Lección' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1880 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Моя практика', uk: 'Моя практика', es: 'Mi práctica' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1883 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: '🧠 Моя практика', uk: '🧠 Моя практика', es: '🧠 Mi práctica' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1887 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `${dueCount} ждут сегодня`, uk: `${dueCount} чекають сьогодні`, es: `${dueCount} esperan hoy` }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1888 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Ошибки под контролем', uk: 'Помилки під контролем', es: 'Errores bajo control' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1893 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `${dueCount} ждут сегодня`, uk: `${dueCount} чекають сьогодні`, es: `${dueCount} esperan hoy` }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:1894 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Повторение ошибок', uk: 'Повторення помилок', es: 'Repaso de errores' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:2083 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Бонус лиги', uk: 'Бонус ліги', es: 'Bono de liga' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:2098 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Бонус лиги', uk: 'Бонус ліги', es: 'Bono de liga' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:2127 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Главный экран', uk: 'Головний екран', es: 'Pantalla de inicio', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:2219 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Энергия безлимитная', uk: 'Енергія безлімітна', es: 'Energía ilimitada', }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:2231 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `1 энергия каждые ${energyRecoveryMinutes} мин`, uk: `1 енергія кожні ${energyRecoveryMinutes} хв`, es: `+1 punto de energía cada ${energyRecoveryMinutes} min`, }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:2241 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: 'Через', uk: 'Через', es: 'En' }
- [warning] trilang-missing-all-planned-locales app/(tabs)/home.tsx:2250 missing: pt-BR, vi, id, tr, pl: Static triLang copy has ru/uk/es, but planned interface locales are not present yet. | { ru: `Следующий слот энергии на уровне ${getNextEnergyUnlockLevel(level)}`, uk: `Наступний слот енергії на рівні ${getNextEnergyUnlockLevel(level)}`, es: `Al alcanzar el nivel ${g
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
