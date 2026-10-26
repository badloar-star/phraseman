# Task packet: банки экзамена v2 подключаются без правки общих файлов (реестр на сессию)

Governance-ID: TG-FF552BC6821D
Status: In progress
Owner: Learning V2 session (главный по экзамену); слово владельца 26.10 «банки для всех уроков и всех глав — в 2.0.3», координатор

## Outcome

Семь сессий пишут банки параллельно и подключают их каждая в своём файле: modules/learning-v2/exam/banks/registry_lNN_lMM.ts.
Общий индекс banks/index.ts собирает все реестры; BANKS в app/learning_v2_chapter_exam_v2.ts строится из индекса. Сторожа проверяют
ВСЕ файлы банков в папке (без «банков три»): правила банка, слова только из эпизодов до экзамена, каждый файл подключён, ключ главы уникален.

## Scope

Новые: banks/index.ts, banks/registry_{l01_l03,l04_l07,l08_l11,l12_l15,l16_l19,l20_l23,l24_l26,l27_l30}.ts. Правка:
app/learning_v2_chapter_exam_v2.ts (BANKS из индекса), tests/learning_v2_chapter_exam_v2_banks_rules.test.ts (все файлы, реестры).
owner_locks_exam_episode_words уже обходит все файлы папки.

## Architecture

Ключ «урок:глава» — из полей банка. Дубликат ключа — сторож краснеет; в приложении берётся первый, предупреждение в журнал [CHAPTER-EXAM-V2].
Статические import (Metro/Hermes), без require.context.

## Security and privacy

Нет данных.

## Technical debt

Вычитка владельцем — по docs/work/exam-banks/lNN.md, в сборку банки входят сразу (слово владельца).

## Verification

banks_rules, owner_locks_exam_episode_words, learning_v2_chapter_exam_v2_app, credit_parity, dev-превью; проверка типов.

## Rollback

Revert коммита (BANKS вернётся к списку из трёх глав).
