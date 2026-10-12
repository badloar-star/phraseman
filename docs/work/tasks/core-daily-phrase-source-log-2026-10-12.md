# Task packet: фраза дня es/de/it — откуда взялась фраза: лог источника (кэш дня / пакет .dpk)

Governance-ID: TG-288DDDBFA697
Status: In progress
Owner: сессия «1 · Ядро». Координатор 12.10: «home-004/005/006 — фраза дня видна, decision bundled. НО строк [DAILY-PHRASE-GATE]
asset: read в журнале НЕТ… Откуда тогда пакет: из кэша дня, со старого пути или лог не печатается? Разберись по логам».

## Outcome
- Причина: getTodayTargetRemotePhrase молча возвращал фразу из дневного кэша (AsyncStorage, ключ на цель), если она уже
  взята сегодня — пакет .dpk не читается. es/de снимались в 15:38 (до 4ad0686a0) → сегодняшняя фраза уже в кэше.
- Лог: `[DAILY-PHRASE-GATE] today: source=day_cache` / `source=pack` / `no_phrase` / `day_cache_rejected` — с целью, датой, id.
- Тест дня от этого не страдает: варианты берутся из quiz_ru/quiz_uk самой фразы (лежат и в кэше), пул не нужен.

## Scope
In: app/daily_phrase_system.ts (только лог). Out: поведение.

## Architecture
console.log на каждой ветке функции.

## Security and privacy
В лог — цель, дата, id фразы; персональных данных нет.

## Technical debt
Нет.

## Verification
daily_phrase_bundled_es_de_it, daily_phrase_target_isolation_es_de; babel_check. Сверке: снять it (ни разу не снимался —
кэша дня нет) → должна быть строка asset: read и today: source=pack.

## Rollback
`git revert`.
