# Проход «текст на акцентной заливке» по стор-сборке

Governance-ID: TG-6FDA7762C721

## Outcome
Во всех экранах стор-сборки текст и значки на заливке акцента темы берут цвет из токена пары (`t.textOnGold` = `accentInk` темы), а не из `t.correctText` (тёмно-зелёный из базовой темы). В светлой теме это убирает «зелёное на чёрном». Сторож не даёт вернуть.

## Scope
52 замены в 19 файлах (ниже), сторож `tests/accent_ink_on_accent_fill_contract.test.mjs` (обходит все 1507 файлов стор-сборки), обновлены хэши pin-тестов `flashcards_speaking_liquid_glass_source_contract` (панель говорения).

## Architecture
`makeLiquidGlassTheme` оставляет `correct`/`correctText` от базовой темы («успех не трогаем»), а `textOnGold` приравнивает к `accentInk`. Поэтому: заливка `t.accent`/`g.cta` → `t.textOnGold` (для заливки `t.textSecond` = `g.cta` — `liquidGlassTokens(...).ctaInk`); заливка `t.correct` (зелёная) → `t.correctText` остаётся. Контраст `accentInk` на `accent` ≥ 3:1 по 23 темам × тёмная/светлая × calm/max проверяет `two_theme_static_colors_contract`.

## Security and privacy
Данные не затрагиваются.

## Technical debt
Правило сторожа эвристическое: ищет `backgroundColor` с `.accent`/`.cta`/`textSecond` в 12 строках выше `.correctText`. Заливки, заданные через переменную в другом месте, оно не увидит — такие случаи ловит только пересъёмка Сверки. «Другие тёмные литералы на акценте» (не `correctText`): проверил 19 затронутых файлов — литералы там только в генераторах `rgb(...)` по расчёту (`lessons.tsx`), скрим `rgba(0,0,0,.58)` и зелёная тень успеха в `DailyPhraseCard.tsx`; тёмных литералов на заливке акцента нет, дополнительных замен не потребовалось.

## Verification
- `npm run typecheck` — 0 ошибок.
- Новый сторож 2/2 зелёный; `two_theme_static_colors_contract` 40 зелёных.
- Тесты-привязки к 19 файлам: `.mjs` и 4 пачки `.test.ts` (247 файлов) зелёные, кроме двух чужих красных (`gustav_french_curriculum_contract`, `learning_v2_remote_audio_pack_contract` — из-за убирания французского в рабочей копии, не из-за цвета).

## Rollback
Откатить коммит.

## Исправлено (заливка → токен пары)

| Файл | Место | Заливка | Токен |
|---|---|---|---|
| `app/(tabs)/lessons.tsx` | трофей и номер текущего узла карты; пилюля 13 pt | `t.accent` | `textOnGold` (завершённые узлы на `t.correct` остались) |
| `app/ai_companion_session.tsx` | кнопка французского окна ×2; стрелка «отправить» | `t.accent` | `textOnGold` |
| `app/ai_dialog_briefing.tsx`, `components/AiDialogBriefingScreen.tsx` | «Начать» | `t.accent` | `textOnGold` |
| `app/ai_dialog_session.tsx` | кнопки «Назад», «Повторить», «Итоги»; голосовое сообщение (значок, дорожка, подпись); микрофон «слушаю» и точки лимита; бейдж PLUS; стрелка отправки | `t.accent` | `textOnGold` |
| `app/flashcards_swipe.tsx` | «Начать» (в блокировке — `textSecond` на `bgSurface2`), «Продолжить», галочка источника | `t.accent` | `textOnGold` |
| `app/flashcards_voice_picker.tsx` | «Прослушать» | `t.accent` | `textOnGold` |
| `app/lesson_complete.tsx` | «Открыть Plus» | `t.textSecond` (= cta) | `ctaInk` |
| `app/referrals.tsx` | «Получить приз», «Пригласить» | `t.accent` | `textOnGold` |
| `components/AiConsentSheetModal.tsx`, `NotificationPermissionModal.tsx` | главная кнопка | `t.accent` | `textOnGold` |
| `components/DailyPhraseCard.tsx` | номер варианта | `t.accent` | `textOnGold` |
| `components/DialogVerdictScreen.tsx`, `DialogsTabContent.tsx` | бейдж PLUS, кнопки | `t.accent` | `textOnGold` |
| `components/FeedbackRatingCard.tsx` | кнопка отправки | `t.accent` | `textOnGold` |
| `components/SpeakingPanel.tsx` | `onAccent` панели | акцент панели | `textOnGold` |
| `components/feedback/ResultsSequence.tsx`, `level-exam/LevelExamResult.tsx`, `roulette_win_modal.tsx` | главные кнопки | `t.accent` | `textOnGold` |
| Каталог наборов (прошлый коммит 698c152fa) | бейдж «Топ», пилюли, «+», «Добавить», «Создать карточку», галочка | `t.accent` | `textOnGold` |

## Проверено и оставлено
| Место | Причина |
|---|---|
| `lessons.tsx` завершённый узел (трофей, галочка) | заливка `t.correct` (зелёная) — тёмный текст нужен |
| `lessons.tsx:4824` | значок переключателя разработчика на `t.correct` |
| `lesson_complete.tsx:252` | кнопка на `t.correct` |
| `streak_stats.tsx:1316` | заливка `scoreAccent` — семантический цвет оценки (`theme-exempt`) |
| `DailyPhraseCard.tsx:819, 986` | значок успеха на `t.correct` |
| `VerbLetterBank.tsx:152` | заливка `t.correct` при готовности |
| `DialogsTabContent.tsx:570`, `DialogScenarioTile.tsx:42`, `referral_access_ended_modal.tsx:56`, `SpeakingPanel.tsx:226` | поле передаётся/описано в типе, цвет там не рисуется |
| `constants/theme.ts`, `cardPackPaywallTheme.ts`, `level_exam_blueprint.ts`, `daily_phrase_quest.ts` | определения темы, комментарий и одноимённые локальные переменные |
