# Admin Report Preview Autosync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Автоматически публиковать проверенные ответы на пользовательские репорты в безопасном превью админки без отправки пользователям.

**Architecture:** Текущий статический реестр `PREPARED_REPORT_REPLIES` остаётся источником превью. Новый пакет добавляется по уникальному `reportId`; существующий ручной sender не меняется. Публикуется только Firebase Hosting target `admin`.

**Tech Stack:** HTML/JavaScript, Jest contract tests, Firebase Hosting.

---

### Task 1: Зафиксировать контракт текущего пакета

**Files:**
- Modify: `tests/admin_report_reply_preview_contract.test.ts`
- Read: `replies.json`

- [ ] Добавить тест, который требует присутствия всех восьми `reportId` и полного совпадения `title`, `body`, `shards`, `resolution`, `rewardGroup`.
- [ ] Запустить `npx jest tests/admin_report_reply_preview_contract.test.ts --runInBand` и подтвердить ожидаемый FAIL.

### Task 2: Добавить пакет и обновить инструкции

**Files:**
- Modify: `replies.json`
- Modify: `admin/index.html`
- Modify: `AGENTS.md`

- [ ] Добавить `resolution` и `rewardGroup` в восемь строк пакета.
- [ ] Добавить восемь уникальных строк в `PREPARED_REPORT_REPLIES`, не меняя sender.
- [ ] Обновить встроенную LLM-инструкцию и постоянное правило: dry-run → preview sync → проверка → `hosting:admin`; live send только вручную.
- [ ] Повторить Jest и получить PASS.

### Task 3: Проверить и опубликовать

**Files:**
- Verify: `admin/index.html`
- Verify: `replies.json`

- [ ] Выполнить `node scripts/reply_to_reports.mjs replies.json --dry-run`.
- [ ] Выполнить узкие admin-контракты и `git diff --check`.
- [ ] Выполнить `npm run hosting:admin`.
- [ ] Открыть опубликованную админку без кэша и убедиться, что восемь превью присутствуют, не нажимая отправку.
