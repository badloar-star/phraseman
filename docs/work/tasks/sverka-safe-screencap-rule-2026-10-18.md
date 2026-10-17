# Task packet: безопасные снимки эмулятора (правило координатора после OOM)

Governance-ID: TG-1F8591C0C6C0
Status: In progress
Owner: 6 · СВЕРКА
Related epic/enabler: none

## Outcome

Все прогонщики Сверки снимают экран строго по одному, с `timeout 20`, проверкой `pidof screencap` и kill+паузой 5 с при зависании; правило передано всем, кто берёт замок. (Ниже — общий пакет задачи.)


После холодного перезапуска эмулятора перегнать недействительные кадры окон (r6, s32/s33/s17, «Из видео» pt-BR, [BACK-BTN], [INTRO-BLUR], m08, подложка Пика), раз в час проверять MemAvailable эмулятора и дописать таблицу `docs/phraseman-2.0/evidence/modals_1018/README.md`.

## Scope

In scope: скрипты вне репозитория (`C:/Temp/claude/sv`), кадры и README в evidence.
Out of scope: правки кода приложения; пересоздание или стирание эмулятора; покупки, пароли.

## Architecture

No architecture change.

## Security and privacy

Эмулятор тестовый; покупки не нажимаются, пароли не вводятся, аккаунт №1 не используется.

## Technical debt

Accept temporarily: часть окон помечена «не вызвано» до решения, как их вызывать без dev-ссылки (владелец — Сверка, срок — утренний отчёт).

## Verification

Каждый кадр смотрю глазами; ANR/DEV-STATE-заглушки отсекаются сканерами (`anr_scan.py`, `empty_scan.py`); память — `memlog.txt`.

## Rollback

`git revert` коммитов evidence; код не затронут.
