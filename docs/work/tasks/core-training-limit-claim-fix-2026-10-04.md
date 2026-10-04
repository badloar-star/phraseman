# Task packet: месячный лимит тренировок — Блиц, «Вспомни», «Устно» не списывали лимит со 2-го раунда (claim старта)

Governance-ID: TG-1FF7529D95FC
Status: Done — одобрено координатором 04.10 («возврат задуманного поведения лимита, не смена правил»)
Owner: Ядро

## Outcome
Подтверждено на эмуляторе (логи [BLITZ-LIMIT], 649b06e2d) и тестом (2056b226b): Блиц, «Вспомни» и «Устно» не делали `claimFlashcardTrainingPendingGrantStart` (только свайп делал). Без claim переходы фаз отвечают `claim_required`, запись выдачи навсегда в фазе prepared и не очищается, а следующий раунд на той же колоде (отпечаток = режим+язык+колода) получает её же с квитанцией первого раунда → списание лимита — повтор, остаток не меняется. Теперь все три режима делают claim старта сразу после reconcile, как свайп; переходы и очистка работают; каждый исход очистки пишется в лог.

## Scope
- app/flashcard_training_pending_grant.ts — помощник `claimFlashcardTrainingRoundStart` (claim + лог [BLITZ-LIMIT] claim / stale_prepared, ошибка `pending_grant_claim_<status>`); `logFlashcardTrainingRoundClear` — лог исхода «играбельно + очистка»; немой catch в abandon пишет причину.
- app/flashcards_blitz_session.tsx, app/flashcards_recall_session.tsx, app/flashcards_speaking_session.tsx — вызов помощника после reconcile; лог очистки на каждой ветке (в Блице — и причина, если блок очистки не выполнился).
- tests/flashcard_training_round_claim.test.ts — 2 раунда подряд на одной колоде → used +2; выход до первой карточки → энергия возвращена ровно один раз; двойное списание одной квитанцией → +1.

## Architecture
Ошибка claim → `pending_grant_claim_*` → существующий fail-open (решение владельца 14.09: слой гранта не закрывает вход). Записи, застрявшие в prepared у живых пользователей, сами отомрут по TTL 24 ч; при обнаружении — лог `stale_prepared` (без миграции).

## Security and privacy
Данных нет; логи — коды, обрезанные квитанции.

## Technical debt
Застрявшие записи дадут каждому пользователю не более одного «бесплатного» раунда на колоду (их квитанция уже посчитана) — затем очистятся.

## Verification
Новый тест + тесты pending grant, лимита, Блица, «Вспомни», «Устно»; проверка типов.

## Rollback
Откат коммита.
