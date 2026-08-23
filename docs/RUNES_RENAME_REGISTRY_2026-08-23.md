# Реестр переименования «звёзды → руны» (2026-08-23)

Решение владельца 22.08: зарабатываемая валюта (турниры + Арена + Learning V2 + друзья —
ОДНА валюта, отдельная от жемчужин) переименовывается в **руны** с руническим глифом.
Утверждённый макет: `docs/v2/mockups/26-checkpoint-and-runes.html`.

## Границы (подтверждено владельцем 23.08)

| Смысл | Решение |
|---|---|
| **Валюта** (баланс, начисление, обмен, пороги наград) | → **руна/руны/рун** + глиф ᚠ |
| **Оценка занятия 1–3** под узлом карты и в финале сессии | остаётся **звездой** ⭐ |
| **Внутренняя шкала сессии до 36** («Собрано N из 36 звёзд») | остаётся **звёздами** |
| **Декор** (звёздное небо тем, аватары, идиомы про stars, соцпруф пейвола) | не трогать |
| **Жемчужины** | отдельная валюта, не трогать |
| **Серверные контракты, поля `stars` в Firestore, лестница 45/50/55/60/65** | не трогать — переименование чисто клиентское |

Охват валюты: Learning V2 + обмен + магазин + чип баланса, Арена, Турниры, «Вместе»/друзья.
Путаницу «звёзды рядом с рунами» на финале сессии владелец решил не пояснять подписями.

## A. МЕНЯТЬ — валюта (пользовательские строки)

| Файл | Строки | Что |
|---|---|---|
| `app/coin_exchange.tsx` | 145, 215, 225, 340, 345 | «Биржа»: «1 жемчужина = N звёзд», «Коридор курса», «Вы получите ≈ N звёзд», плейсхолдер |
| `app/shards_shop.tsx` | 1886 | «Биржа: обмен жемчуга на звёзды» (8 локалей) |
| `app/(tabs)/lessons.tsx` | 3257 | иконка чипа баланса `Ionicons star` → глиф руны |
| `app/learning-v2/lesson/[id].tsx` | 975, 976, 984, 1017, 1048, 1074, 1203 | подтверждённый баланс, «звёзд качества», иконки баланса |
| `app/season_pass.tsx` | 480, 653 | «Откроется при N звёздах», цена подарка |
| `components/SeasonRewardInfoModal.tsx` | 141, 275 | «Нужно накопить N звёзд» (8 локалей) |
| `app/level_gift_system.ts` | 769, 770 | «+N звёзд», «N звёзд в единый баланс» (все локали) |
| `app/tournament_round.tsx` | 1411, 1473, 1485 | «Общий счёт турнира: N звёзд», «Готово, засчитать N звёзд» |
| `app/tournament_results.tsx` | 622 | a11y «Звёзд за сезон: N» (8 локалей) |
| `app/tournament_season.tsx` | 276 | a11y строки таблицы «N звёзд» |
| `app/(tabs)/tournaments.tsx` | 932 (шапка) | счётчик сезона — иконка |
| `app/stars_view.ts` | 95, 96 | «Две цифры про звёзды» + пояснение |
| `app/shard_earn_ui.ts` | 211 | «звёзды превратились в осколки» |
| `components/arena/ArenaExpansionUI.tsx` | 78 | иконка кошелька Арены |
| `components/dev/motion_showcase/showcase_copy.ts` | 82–86, 401 | подписи витрины движения |
| `components/league/LeagueResultHybrid.tsx` | 507 | «Звёзды и уроки сохранены» (валюта) |

**Компоненты полёта (иконка + разные глифы):**
- `components/LearningV2StarFlight.tsx` → `LearningV2RuneFlight.tsx` (строка 79)
- `components/arena/ArenaStarFlight.tsx` → полёт в кошелёк Арены
- `components/tournament/TournamentFx.tsx` — звезда турнира (строки 66, 246)

## B. НЕ ТРОГАТЬ — оценка занятия 1–3

| Файл | Строки |
|---|---|
| `app/(tabs)/lessons.tsx` | 1351 («из 3 звёзд»), 1423 (`star`/`star-outline` под узлом) |
| `components/LearningV2SessionFinale.tsx` | 71, весь файл — финал сессии |
| `app/learning_v2_session_star_results_store.ts` | весь файл — витрина 0–3 |
| `app/lesson_star_score.ts`, `app/lesson_complete.tsx` | «звёздная» оценка урока |
| `components/StarDisplayShared.tsx`, `components/feedback/ResultsSequence.tsx` | блок из 3 звёздочек |
| `components/SpeakingPanel.tsx` | 2200 («N из 3 звёзд») |

## C. НЕ ТРОГАТЬ — внутренняя шкала сессии до 36

| Файл | Строки |
|---|---|
| `app/learning_v2_session_copy.ts` | 143 (skipHint), 159, 162 (`starsProgress`), 167 (`filled`), 302 (`ruStar`), 307 (`ruTier`) — все 8 локалей |
| `app/learning_v2_session_intro_check.tsx` | 37, 181 («до 9 звёзд»), 241, 256 |
| `app/learning-v2/session/[id].tsx` | 1219, 1556, 1660–1784 — шкала и звёзды задания |

## D. НЕ ТРОГАТЬ — декор и посторонние смыслы

- `constants/cinemaThemes.ts`, `components/ScreenGradient.tsx`, `components/ProfileCardMotionFx.tsx` — звёздное небо тем
- `constants/avatars.ts`, `constants/custom_avatars.ts` — названия аватаров
- `app/idioms_data.ts`, `app/collectibles/catalog_data.ts`, `app/lesson_words.tsx` — учебный контент про stars
- `components/paywall/paywallShared.tsx` (315) — соцпруф пейвола (рейтинг сторов)
- `components/premium_celebration/PremiumCelebrationHybrid.tsx` — «созвездие фич»
- `app/league_engine.ts` (156), `app/ai_dialog_briefing_copy.ts` — метафоры в текстах
- `app/flashcards/*` — раздел карточек, где звёзд намеренно нет
- `app/profile_card_system.ts` — визуальные эффекты карточек

## E. Комментарии в коде

Комментарии `// зачем:` и шапки файлов, описывающие валюту, обновляются точечно там, где
иначе текст станет ложью. Массово переписывать историю решений не нужно.

## F. Глифы

15 рун старшего футарка (из макета): ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ ᚷ ᚹ ᛃ ᛊ ᛏ ᛒ ᛗ ᛚ ᛜ
- статичные счётчики — всегда **ᚠ** (решение владельца 23.08);
- анимация начисления — 5–8 РАЗНЫХ случайных глифов (прямое требование владельца);
- цвет — из токенов темы, золотой не хардкодить.
