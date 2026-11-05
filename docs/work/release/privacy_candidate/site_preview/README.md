# Страницы политики для сборки 150 — ПРЕДПРОСМОТР, НЕ ОПУБЛИКОВАНО (Сайт, 06.11)

Политика у нас только на английском (канон `legal/privacy_policy_en.json` и iOS-версия `legal/privacy_policy_en_ios.json`; в приложении та же копия `app/legal/*`). Других языков политики нет, поэтому страниц две.

| Страница на сайте | Файл предпросмотра | Дифф относительно текущей `knowly-www` |
|---|---|---|
| `/legal/privacy/` (Android/сайт) | `privacy/index.html` | `privacy.diff` |
| `/legal/privacy-ios/` (iOS) | `privacy-ios/index.html` | `privacy-ios.diff` |

Как получены: в изолированной копии (вне репозитория) поверх текущих `legal/*.json` положены кандидаты `privacy_candidate/*.candidate.json` (коммит Входа 3af392b08) и запущен `scripts/sync-legal-html.mjs`. Рабочие `legal/`, `app/legal/`, `knowly-www/`, `admin/` и корневые `privacy.html` / `terms.html` не менялись.

Что в диффе (текущая страница → кандидат): §3 быстрые действия на значке; §4 прогресс по курсам и награда за видео; **§5 метка подписки Plus (месячная) / Ultra (годовая), уровень хранится в публичном профиле**; §6 комментарии видны любому вошедшему, абзац про лайки и добавления; §9 «Phraseman Plus (monthly) and Ultra (yearly) subscriptions» (в iOS-версии формулировка покупок другая — правится только §5); §20 удаление связанных входов и записей Сообщества (редакция Б).

Дата «Last updated» осталась прежней (November 5, 2026): дату выкладки ставит владелец вручную в первом разделе обоих JSON.

## Порядок выкладки (только по сигналу координатора, в начале финальной фазы)

Порядок: **политика → функции → EAS**.

1. Положить кандидаты в канон, поставить дату:
   `cp docs/work/release/privacy_candidate/privacy_policy_en.candidate.json legal/privacy_policy_en.json` и то же для `_ios`.
2. `npm run legal:sync` — обновит `app/legal/*.json`, `privacy.html`, `admin/oauth-privacy.html`, `admin/v2/oauth-privacy.html`, `knowly-www/legal/privacy*`, `data-deletion`. Сверить с предпросмотром: страницы `knowly-www/legal/privacy*/index.html` должны совпасть с файлами здесь (кроме даты).
3. Коммит только этих файлов (safe_commit), затем сверка «прод = HEAD» по хешам `knowly-www` и `admin/v2`, затем `npm run hosting:knowly-www` (и `hosting:admin`, если обновляется `admin/v2/oauth-privacy.html`).
4. Откат: `git revert` коммита выкладки → `npm run legal:sync` → повторный `hosting:*`, либо Firebase Hosting → предыдущая версия.

Текст политики в приложении (`app/legal/*.json`) обновится вместе со следующей сборкой/обновлением; для ревью магазинов важна ссылка на сайт.
