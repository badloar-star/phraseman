---
phase: 05-explain-like-im-five
plan: 04
type: execute
wave: 3
depends_on: [02, 03]
files_modified:
  - components/ExplainSheet.tsx
  - components/ExplainButton.tsx
  - app/explain_phrase_request.ts
  - components/DailyPhraseCard.tsx
  - tests/explain_sheet.test.tsx
autonomous: false
requirements: [EXPLAIN-UI]

must_haves:
  truths:
    - "ExplainSheet is a bottom-sheet that slides up from the bottom using the project's existing animation stack (react-native-reanimated translateY spring + backdrop fade) — matches how other modals/sheets in the app present"
    - "Sheet content: title '👶 Простыми словами', the phrase itself, the explanation body in content-rules voice, and a footer report affordance. IMPORTANT: ReportErrorButton CANNOT be reused as-is — it hardcodes submitErrorReport() (the error_reports CF), not submitExplainReport (explain_reports, server-derived hash). Either add a `reportType`/`onReport` prop to ReportErrorButton, or make a thin ExplainReportButton that reuses its visual (variant icon-flag) but calls submitExplainReport with phraseEn (server re-hashes — client never sends a hash). Verify the real ReportErrorButton.tsx API during execution before wiring."
    - "v1 is NON-streaming: while generating (cache MISS) the sheet shows a skeleton-loader ('👶 готовлю объяснение…') then renders the full text on arrival; on cache HIT the full text appears immediately. (Word-by-word streaming is increment 06 / fast-follow — NOT this phase. httpsCallable cannot stream and no CF streams yet. Do NOT fake token-by-token typing.)"
    - "ExplainButton is a small reusable trigger that, when isExplainEnabled() is false, renders nothing (feature fully hidden); when true, opens ExplainSheet for the given {phraseEn, phraseMeaning, lang} (prop named phraseMeaning, not phraseRu — the value is the surface's native-language gloss, e.g. phrase.meaning)"
    - "Analytics: ExplainButton/ExplainSheet emit trackEvent for explain_button_shown, explain_sheet_opened, explain_sheet_closed (+ fromCache flag) via the project's analytics.ts; register the new events in the AnalyticsEvent union. Without these, the README's 'cohort rollout' and any adoption/cache-hit health check are unmeasurable. Mirror how ai_dialog instruments its events."
    - "The button is wired into at least one real phrase surface (DailyPhraseCard.tsx) behind the flag; additional injection points (lesson card, quiz result, trainer) are listed and wired where a phrase is clearly available"
    - "On CF error / budget-exhausted / rejected, the sheet shows the fallback explanation gracefully (the phrase's native-language meaning + пример), never a raw error stack. NOTE: on DailyPhraseCard the meaning field is phrase.meaning / phraseCopy.meaning, NOT a literal 'phraseRu' — map the surface's actual field to the client's fallback input"
    - "No client-side validation of explanation quality — the UI only renders whatever the CF returns; quality decisions stay server-side"
  artifacts:
    - path: "components/ExplainSheet.tsx"
      provides: "Bottom-sheet UI: slide-up, skeleton-loader → full-text-on-arrival (v1 non-streaming), instant on cache-hit, report footer, fallback handling"
      exports: ["ExplainSheet"]
    - path: "components/ExplainButton.tsx"
      provides: "Flag-gated reusable trigger that opens ExplainSheet for a phrase"
      exports: ["ExplainButton"]
    - path: "app/explain_phrase_request.ts"
      provides: "Client hook: call explainPhrase, expose {loading, text, status, fromCache, error} for the sheet (v1 non-streaming; full text on resolve)"
      exports: ["useExplainRequest"]
    - path: "tests/explain_sheet.test.tsx"
      provides: "Tests: hidden when flag off, renders body, shows fallback on error, report button present"
  key_links:
    - from: "components/ExplainButton.tsx"
      to: "app/explain_phrase_flags.ts:isExplainEnabled"
      via: "early return null when disabled"
      pattern: "isExplainEnabled"
    - from: "components/ExplainSheet.tsx"
      to: "app/explain_phrase_client.ts:callExplainPhrase"
      via: "useExplainRequest → callExplainPhrase on open"
      pattern: "callExplainPhrase|useExplainRequest"
    - from: "components/ExplainSheet.tsx"
      to: "ReportErrorButton (variant icon-flag)"
      via: "footer report → submitExplainReport sends phraseEn (server re-hashes); client does NOT compute the hash"
      pattern: "ReportErrorButton"
    - from: "components/DailyPhraseCard.tsx"
      to: "components/ExplainButton.tsx"
      via: "render <ExplainButton phraseEn phraseMeaning lang /> on the card (phraseMeaning = phrase.meaning)"
      pattern: "ExplainButton"
---

<objective>
Сделать UI: bottom-sheet, выезжающий снизу вверх, со скелетон-лоадером на время генерации
и показом полного текста по приходу (v1 БЕЗ word-by-word стриминга — см. ниже), кнопку-триггер
за флагом, и вшить её в реальные экраны с фразами.

Purpose: довести фичу до того, что видит юзер — красивая шторка с простым объяснением и
кнопкой «сообщить о плохом объяснении», полностью скрытая, пока флаг OFF.
</objective>

<context>
ВНИМАНИЕ — этот план `autonomous: false`: точки внедрения кнопки нужно найти в живом коде,
не угадывать. ОБЯЗАТЕЛЬНЫЙ первый шаг исполнителя:

1. Найти эталон bottom-sheet/модалки в проекте (grep: BottomSheet, @gorhom/bottom-sheet,
   translateY + spring, существующие *Modal.tsx/*Sheet) и переиспользовать его, НЕ городить свой.
   Проверить package.json: какие анимационные либы реально стоят (reanimated/gesture-handler/gorhom).
2. Найти РЕАЛЬНЫЕ места, где фраза кликабельна/показана:
   - components/DailyPhraseCard.tsx (точно есть — обязательная точка).
   - экран урока (app/(tabs)/lessons.tsx или вложенные lesson-экраны).
   - результат квиза (app/(tabs)/quizzes.tsx — где показывается разобранная фраза).
   - тренер (trainer-экраны).
   Вшить ExplainButton там, где phraseEn/phraseRu доступны прямо в пропсах/состоянии.
   Если на каком-то экране фразы нет под рукой — НЕ тащить её костылём, пропустить и
   зафиксировать в отчёте.

СТРИМИНГ — v1 НЕ делает его. Причина (проверено plan-checker'ом): `httpsCallable` не умеет
стримить, и НИ ОДНА существующая CF не стримит — транспорта для клонирования нет. v1:
скелетон-лоадер «👶 готовлю объяснение…» → полный текст по resolve промиса. Это законченный,
отгружаемый UX. Word-by-word — отдельный инкремент 06 (fast-follow, НЕ этот план): SSE
`onRequest` + клиент-ридер. НЕ фейкать посимвольную печать в v1. См. CONTEXT «Streaming: explicit status».

Поле fallback на DailyPhraseCard: это `phrase.meaning` / `phraseCopy.meaning`, а НЕ буквальный
`phraseRu`. Маппить реальное поле поверхности в fallback-вход клиента. Аналогично на других
поверхностях — найти, где лежит родной перевод фразы, не выдумывать имя поля.

Контракт репорта: кнопка-репорт шлёт `phraseEn` (сервер сам хэширует), клиент НЕ вычисляет
phraseHash — иначе политика нормализации задублируется и разъедется с планом 01.

Контент-голос шторки — строго по content rules: «как для детей», один бытовой пример,
тёплый тон Фила. Текст приходит с сервера; UI его не сочиняет и не правит.

Reanimated/JSX-правило из памяти проекта: НЕ sed-ить пропы в многострочный JSX вручную —
редактировать точечно.
</context>

<acceptance>
- Приложение запускается в эмуляторе (СВОЙ AVD + СВОЙ Metro-порт по правилу изоляции
  phraseman — НЕ трогать общий 8081/чужие эмуляторы).
- Флаг OFF → кнопки нигде нет (фича скрыта). Флаг ON → кнопка на DailyPhraseCard.
- Тап → шторка выезжает снизу → показывает объяснение (или скелетон → текст).
- Второй юзер (или повторный тап после первой генерации) → мгновенный текст из кэша.
- Кнопка «🚩 Непонятно объяснили» на дне шторки → вызывает submitExplainReport.
- Ошибка/budget/reject → fallback-текст, без краша и без сырого стека.
- tests/explain_sheet.test.tsx зелёный.
</acceptance>

<verification>
1. preview/эмулятор: тап на DailyPhraseCard → шторка → текст. Скриншот «до/после».
2. Проверить кэш-хит: закрыть и снова открыть ту же фразу → мгновенно, без лоадера.
3. Проверить fallback: временно выставить флаг бюджета в 0 (или мок) → шторка показывает
   запасное объяснение, не падает.
4. Проверить флаг OFF: пересобрать без EXPO_PUBLIC_EXPLAIN_ENABLED → кнопки нет ни на одном экране.
5. Отчёт исполнителя ДОЛЖЕН перечислить, на какие экраны кнопка реально вшита и какие
   пропущены (и почему).
</verification>
