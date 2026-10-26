# Task packet: сторож слов экзамена v2 — сокращения с not и притяжательное ’s; ленивая загрузка банков

Governance-ID: TG-632D9289365C
Status: In progress
Owner: Learning V2 session; координатор 26.10 (сигналы Переводчика, Макетов, Ревизора)

## Outcome

1. Сторож слов (owner_locks_exam_episode_words) перестаёт ложно блокировать: запасной ответ с сокращением (doesn't, needn't, mustn't),
   если в эпизодах было само сокращение ИЛИ все слова его полной формы; притяжательное ’s (Tom’s), если в эпизодах было само слово
   с ’s ИЛИ основа (Tom) и хоть одно притяжательное ’s. Сторож не ослаблен: слова, которых в эпизодах нет, по-прежнему красные.
   Движок ответов понимает needn't / mustn't / shouldn't / couldn't как полные формы.
2. Ленивая загрузка: экран экзамена не вычисляет все банки курса при первом открытии — банк главы берётся по ключу урок:глава.

## Scope

modules/learning-v2/exam/chapter_exam_v2_vocabulary.ts, modules/learning-v2/exam/chapter_exam_v2.ts (CONTRACTIONS),
tests/owner_locks_exam_episode_words_2026_10_25.test.ts (случай на каждое), затем banks/index.ts + app/learning_v2_chapter_exam_v2.ts.

## Architecture

Проверка запасного ответа идёт по точным словам (englishWordsV1), слово знакомо, если оно есть в словаре, либо (сокращение) знакомы все
слова раскрытия, либо (’s) знакома основа и в эпизодах было притяжательное ’s. Эталон — точная форма, как раньше (сокращение в эталоне
только если оно было в эпизодах).

## Security and privacy

Нет данных.

## Technical debt

Ленивая загрузка ограничена статическими import (Metro): реестр урока — функция, банки урока вычисляются при первом обращении к уроку.

## Verification

owner_locks_exam_episode_words, banks_rules, chapter_exam_v2 (движок), app-тест экзамена; проверка типов.

## Rollback

Revert коммитов.
