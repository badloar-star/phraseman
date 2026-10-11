# accent → accentText для текста и значков на плашках (светлая тема + Максимум)

Governance-ID: TG-6991E6901A3E
Status: в работе
Owner: сессия «4 · ТЕМЫ 2.0» (решение координатора, пункт (1) аудита контраста)

## Outcome
Текст, значки и тонкие линии цветом `accent` (в светлых градиентных темах — пастельная заливка, контраст 1,3–1,8) заменены на `accentText`. Заливки не трогаются.

## Scope
DialogHowToSaySheet, DialogHelperRow, ExplainButton, UndoSnackbar, MistakePracticeLoopNode, SpeakingPanel, pack_opening (текст вторичной кнопки). Файлы learning-v2/* — чужие, не трогаю. Параметрические компоненты (stats/*, RankChangeBanner, MedalToast, FeedbackPlashka, LearningSemanticBlock) цвет получают от вызывающего и семантические — без правок.

## Architecture
Только подмена токена цвета на готовый `accentText` темы; новых токенов нет.

## Security and privacy
Не применимо.

## Technical debt
Сторож: в этих файлах нет `accent` как цвета текста/значка.

## Verification
Точечные тесты темы и сторож; в тёмной теме сравнение accent/accentText по токенам.

## Rollback
git revert коммита.
