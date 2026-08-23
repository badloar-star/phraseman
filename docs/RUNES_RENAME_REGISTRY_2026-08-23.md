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

---

## Статус выполнения (2026-08-23)

### Сделано

| Файл | Что |
|---|---|
| `constants/runes.ts` | НОВЫЙ: 15 глифов футарка, `RUNE_GLYPH_PRIMARY` = ᚠ, `pickRuneGlyphs` (разные символы), `runeWord`/`runeAmount` на 8 локалей |
| `components/RuneGlyph.tsx` | НОВЫЙ: глиф для статичных счётчиков, цвет из токенов темы |
| `components/LearningV2StarFlight.tsx` → `LearningV2RuneFlight.tsx` | полёт 6 РАЗНЫХ рун вместо 3 одинаковых звёзд |
| `app/(tabs)/lessons.tsx` | чип баланса: глиф вместо `Ionicons star`, a11y со склонением |
| `app/coin_exchange.tsx` | «Биржа»: курс, коридор, оценка, плейсхолдер, тост — расширено с 3 до 8 локалей |
| `app/shards_shop.tsx` | вход на «Биржу» (8 локалей) |
| `tests/runes_currency_copy.test.ts` | НОВЫЙ: 11 тестов — блок Unicode Runic, отсутствие повторов в полёте, славянские склонения, все 8 локалей |

### Доделано в этой же сессии

| Файл | Что |
|---|---|
| `components/ui/V2Fx.tsx` | `StarGlyph` (SVG-звезда) → рунический глиф; тип эффекта несёт свой символ. ОДНА правка покрыла 8 турнирных экранов |
| `app/tournament_round.tsx` | счётчик тура, кнопка «Готово · N рун» — склонение через `runeWord` (старый код на 2–4 давал «2 звёзд») |
| `app/tournament_season.tsx` | a11y строки таблицы сезона |
| `app/tournament_results.tsx` | индикатор рун за сезон |
| `components/arena/ArenaStarFlight.tsx` | каждая из 12 летящих рун несёт СВОЙ глиф |
| `components/arena/ArenaExpansionUI.tsx` | кошелёк Арены |
| `app/season_pass.tsx` + `components/SeasonRewardInfoModal.tsx` | пороги подарков, цена в рунах, обе иконки |
| `app/level_gift_system.ts` | награды спина: `icon: '⭐'` → глиф, склонения на 3 локали |
| `app/stars_view.ts` | «Две цифры про руны» |
| `app/shard_earn_ui.ts` | сундук недельного трека |
| `app/learning-v2/lesson/[id].tsx` | баланс кошелька (НЕ тронуты «звёзды качества» и счётчик сессий) |
| `components/friends_together/FriendLevelUpModal.tsx` | награда уровня дружбы |
| `components/league/LeagueResultHybrid.tsx` | «Руны и уроки сохранены» (8 локалей) |
| `app/feature_intro_registry.ts` | описание Арены: «за победы — руны» (8 локалей) |
| `components/dev/motion_showcase/showcase_copy.ts` | подписи витрины движения |

### Итоговая проверка

- **Сторож локализации: 1422 против 1437 в базе — СТАЛО МЕНЬШЕ** (расширил биржу с 3 до 8 локалей).
- `guard_as_any_ratchet`: 306 против 314 — тоже лучше.
- Тесты: `runes_currency_copy` 11/11, `arena_stars`, `arena_copy_completeness`,
  `season_pass_stars_balance`, `level_gift_locale`, `level_spin_star_grants`,
  `learning_v2_star_source_separation`, `arena_feature_intro_owner` — зелёные.
- Полный `tsc -p tsconfig.json` падает по памяти (heap OOM) — ограничение машины,
  не связано с правками; проверял точечно по файлам.

### Что осознанно осталось звёздами

Оценка занятия 1–3 (карта, финал сессии, SpeakingPanel «из 3 звёзд»), внутренняя
шкала до 36, «звёзды качества» на карте урока, счётчик пройденных сессий,
декор тем и карточек профиля, идиомы про stars, соцпруф пейвола, «созвездие фич».
