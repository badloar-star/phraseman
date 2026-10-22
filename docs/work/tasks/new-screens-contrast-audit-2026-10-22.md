# Новые экраны и плашки 22.10: контраст по всем темам, сторож литералов на их файлах

Governance-ID: TG-6A7D2E91C0B3

## Outcome
Координатор: сегодняшние новые экраны («Моя неделя», лента «Итоги недели», «Фраза дня вдвоём», док «Ты на вершине недели», экран темы Диалогов, «Слова» с переключателем, окно согласия перед «Свободным разговором») проверить на цвета и контраст во всех 23 темах × 2 оформления и ввести их файлы под сторож цветовых литералов; литералы заменить токенами, хозяевам — точечные правки.
Результат разбора: цветовых литералов в этих файлах нет (0 из 0), цвета везде идут из токенов темы; контраст проверяется новым сторожем `tests/new_screens_theme_contrast.test.ts`, файлы добавлены в зону храповика.

## Scope
In scope: сторож контраста пар, которые рисуют эти экраны; расширение зоны `tests/v2_screens_color_literals_ratchet.test.mjs` на файлы вне зоны (`app/friends_week_mine.tsx`, `app/friends_together`, `app/dialogue_v2_theme.tsx`, `app/learning_v2_lesson_words.tsx`, `components/AiDialogConsentModal.tsx`).
Out of scope: правки чужих файлов — найденное уходит хозяевам.

## Architecture
Экраны берут цвета из `liquidGlassTokens` (`glass.*`) или `useSpirePalette` (производная тех же токенов). Сторож перебирает 23 темы × 2 оформления × 3 уровня и проверяет пары: text/secondary на opaqueCard и opaqueControl, accentTextSafe на opaqueCard, good на goodSoft («готово» в ленте недели), selected-плашка со сведением на карточку, ctaFillInk на ctaFill, buttonInkDisabled на buttonFillDisabled (док «на вершине»). Храповик: новые файлы в зоне стартуют с нуля.

## Security and privacy
Данных не касается.

## Technical debt
«Слова» с переключателем (2 · ДИЗАЙН) и окно согласия (5 · ВХОД) ещё не закоммичены — их файлы поставлены в зону сейчас (счёт 0), цвета перепроверить после коммитов.

## Verification
`npm run test:one -- tests/new_screens_theme_contrast.test.ts`; `node --test tests/v2_screens_color_literals_ratchet.test.mjs`.

## Rollback
Убрать сторож и добавленные пути зоны.
