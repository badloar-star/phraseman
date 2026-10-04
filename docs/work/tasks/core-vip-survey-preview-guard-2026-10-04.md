# Task packet: сторож admin_vip_survey_preview под решение владельца вернуть окно отзыва

Governance-ID: TG-EC3BA0E3104A
Status: Done
Owner: 1 · Ядро; поручение координатора 04.10 (моя c56cbd6a2 уронила сторож)

## Outcome
`tests/admin_vip_survey_preview_contract.test.ts` ждал, что в центре уведомлений НЕТ `VipSurveyReviewPromptModal`
(старое состояние после 95eec1717). Владелец решил окно вернуть (c56cbd6a2), сторож устарел. Теперь он проверяет
решение: окно подключено, показ только после опроса (триггеры after_celebration / already_granted) и однократно
(claimVipSurveyReviewPrompt с меткой на опрос).

## Scope
Только этот тест.

## Architecture
Без изменений кода.

## Security and privacy
Не затрагивается.

## Technical debt
Урок: при возврате функциональности прогонять ВСЕ сторожа, где встречается её имя (здесь был второй сторож с
обратным утверждением) — grep по имени перед коммитом.

## Verification
Набор admin_vip_survey_preview_contract зелёный; соседние admin_vip_survey_contract и vip_survey_review_prompt зелёные.

## Rollback
Откат коммита.
