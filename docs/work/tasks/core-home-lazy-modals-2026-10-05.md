# Task packet: Главная — ленивые закрытые окна и редкие модули (первый кадр держит JS-поток)

Governance-ID: TG-7D931D984AFE
Status: In progress (выбор координатора 05.10 — вариант (в); Дизайн home.tsx сейчас не трогает)
Owner: сессия 1 · ЯДРО

## Outcome

Пакет 05:26: [JS-STALL] 1,5 с с +4,9 с — вычисление чанка Главной (home_paint.module_eval ~0,85–0,89 с своего
времени). Цель: убрать из синхронной загрузки чанка то, что первому кадру не нужно, НЕ меняя вид первого кадра.

## Scope

app/(tabs)/home.tsx:
- закрытые окна — React.lazy + монтирование только после первого открытия (с защёлкой, чтобы проигрывалась
  анимация закрытия): PremiumCelebrationModal, VipCelebrationModal, SavedCardsFlight, PlayerProfileModal,
  FeatureIntroEntry, SurveySheetModal; модули прогреваются после первого кадра (первое открытие без задержки);
- функции редких модулей из эффектов — динамический import в момент вызова: achievements.loadAchievementStates,
  mistake_hub_advice.prewarmMistakeHubAdvice, lingman_youtube.getLingmanYoutubeSnapshot (типы — import type).
Тесты-сторожа home.tsx — подправить под ленивую форму (смысл тот же).

## Architecture

Ленивые компоненты с прежними именами (JSX и сторожа неизменны); Suspense fallback null; защёлки «уже открывалось».

## Security and privacy

Не затрагивается.

## Technical debt

home_feature_tips (константы в рендере) — не в этом шаге.

## Verification

Сторожа home_* (startup_stability, survey_sheet, vip_celebration, counters_first_frame, perf_freeze, layout_stability),
новый сторож ленивых окон; замер 06:26 (home_paint.module_eval, [JS-STALL]).

## Rollback

git revert коммита.
