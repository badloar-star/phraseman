# ⚠️ ПЕРЕЕХАЛО → `.claude/semaphore/`

Здесь был отдельный светофор на **1 слот**. Параллельно существовал второй,
в `.claude/semaphore/`, на **3 слота**. Сессии читали разные инструкции и
соблюдали разные правила — то есть мешали друг другу вместо координации.

Единый светофор теперь один: **`.claude/semaphore/`**. Читай его README.

Скрипты в этой папке оставлены переходниками и продолжают работать:

| старая команда | что делает сейчас |
|---|---|
| `bash .claude/session-locks/check.sh` | `slot.sh status` |
| `bash .claude/session-locks/acquire.sh jest "что"` | `slot.sh acquire "jest: что"` |
| `bash .claude/session-locks/release.sh` | `slot.sh release` |

Новый код пиши сразу на `.claude/semaphore/slot.sh`.
