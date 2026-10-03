# Task packet: PM-252 — черновик правки Privacy Policy §19 (автоудаление журналов через 90 дней)

Governance-ID: TG-09F368DFE173
Status: Draft — НЕ применено. Применить вместе с бэкфиллом (scripts/pm252_log_ttl_backfill.py --apply) только после «да» владельца (координатор, 03.10)
Owner: Ядро

## Outcome
Политика (§19 Retention) описывает хранение по критериям и говорит: «We do not promise automatic deletion after a fixed inactivity period unless such a deletion job is implemented and active». Механизм теперь есть и активен (TTL-политики Firestore по `expireAt`, functions/src/log_ttl.ts, 90 дней) — честно назвать срок для журналов ошибок и активности приложения.

## Правка (готовый текст)
Файлы: `legal/privacy_policy_en.json` и `legal/privacy_policy_en_ios.json`, раздел с `heading` «19. Retention», поле `body`.
Вставить НОВЫЙ пункт списка сразу ПОСЛЕ строки
`- Backups and logs may persist until overwritten or deleted under normal retention cycles`
(в обоих файлах она есть; en — позиция ~1410, en_ios — ~1663):

```
- In-app error and app activity logs (the limited app health records described in section 10) are deleted automatically 90 days after they are created
```

Остальной текст §19 не трогать (фраза «We do not promise automatic deletion after a fixed inactivity period…» остаётся верной: речь о неактивных аккаунтах, а не о журналах).

После правки JSON: `npm run legal:sync` — обновит app/legal/*.json, privacy.html (корень), admin/oauth-privacy.html, knowly-www/legal/privacy/index.html. Публикация хостингов (admin, knowly-www) — выкладка координатора/владельца.

## Scope
legal/privacy_policy_en.json, legal/privacy_policy_en_ios.json (+ сгенерированные legal:sync). Код не меняется.

## Architecture
Текст политики приводится к фактическому механизму (TTL 90 дней по expireAt).

## Security and privacy
Сокращение срока хранения диагностики; новых данных не собирается. Порядок: сначала бэкфилл + правка политики одним релизом решения владельца.

## Technical debt
Принято: черновик не применён, пока нет решения владельца; до тех пор старые журналы (до 01.10) хранятся бессрочно, как и описано критериями §19.

## Verification
После применения: `npm run legal:sync`, сторожа legal_copies_sync_contract / legal hash; поиск фразы в privacy.html и knowly-www/legal/privacy/index.html.

## Rollback
Удалить пункт и повторить legal:sync.
