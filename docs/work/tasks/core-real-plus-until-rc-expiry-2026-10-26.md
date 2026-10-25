# Ядро · срок настоящего Plus для кольца: из premium_rc_expiry_ms, а не «бессрочно» (бэклог 22.10, L710/L819)

Governance-ID: TG-FCBDCF807E6E
Status: In progress
Owner: 1 · ЯДРО (NIGHT_BACKLOG v2 стр. 92)

## Outcome
У подписчика (store-Plus с `premium_expiry='0'`, срок ведёт вебхук) `realPlusUntilMs` возвращает настоящий срок —
`premium_rc_expiry_ms` плюс тот же запас 72 ч, что у `isStorePremiumActive`, — а не 0 («бессрочно»). Кольцо Plus в
публичном профиле гаснет само, когда подписка кончилась, а не горит вечно до следующего обновления профиля.
Пожизненный и грант без срока — по-прежнему 0.

## Scope
In scope:
- `functions/src/premium_status.ts` — `realPlusUntilMs`;
- тест `functions/src/premium_status_real_plus_until.test.ts`.

Out of scope: выкладка (функции: публичный профиль, синхронизация Plus, профиль в админке) — по «да» владельца; клиент.

## Architecture
Изменений архитектуры нет. Store-ветка: `premium_expiry > 0` → он; иначе `premium_rc_expiry_ms > 0` → он + 72 ч; иначе
0 (пожизненный / ручная выдача). Грант админа отдельно: `premium_expiry` как раньше. VIP без изменений. «Нет Plus» →
null (≠ 0), как требовал Ревизор 21.10.

Governance-ID: TG-DF61B5B49D23
Найдено тестом: у старого админского гранта без vip_* полей `isVipActive` засчитывает его как VIP (ветка legacy), а пустой
`vip_until` давал 0 — «бессрочно» перекрывал настоящий срок гранта. Вынес признак «есть vip_* поля» в `hasVipShape`
(та же логика, что была внутри `isVipActive`), и срок VIP берётся только при наличии этих полей.

## Security and privacy
Данных не добавляет. Публичный профиль показывает тот же признак Plus, только с честным сроком.

## Technical debt
Нет нового. Закрывает пункт бэклога L710/L819.

## Verification
Тест: подписка с rc-сроком → срок + 72 ч; пожизненный → 0; грант без срока → 0; грант со сроком → срок; нет Plus → null;
VIP со сроком; подписка истекла дальше запаса → null. Узкая проверка типов functions.

## Rollback
Откат коммита (сервер не выложен).
