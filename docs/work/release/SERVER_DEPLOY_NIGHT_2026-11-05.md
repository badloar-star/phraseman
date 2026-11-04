# Деплой сервера, ночь 04→05.11.2026 (окно 01:50–02:00)

Governance-ID: TG-26E4F043EEFD

Автор: «1 · ЯДРО». Деплой выполняется ТОЛЬКО после зелёных сторожей Ревизора и слова координатора. Прод этим документом не тронут.

## Что выкладываем (адресно, по именам)

| Цель | Зачем |
|---|---|
| `functions:default:progressSubmitEvent` | прогресс классических курсов es/de/it (+ блок `lesson1_pass_live`) |
| `functions:default:spireFinalizeCron` | вершинники Пика (D190, `SPIRE_TOP_STEPS=135`), бонус энергии ±1, идемпотентно |
| `functions:default:spireJoinRoom` | `energyBonus` в трёх ответах входа в комнату Пика |
| `firestore:rules` | правила ключей прогресса es/de/it, ladder server-day keys |

Боевые конфиги Пика (`config/spire_v1.rankBy`→`coins`, `coins.promotionBonus` 100→1000) этим деплоем НЕ переключаются: связанная четвёрка включается отдельно по слову координатора (`scripts/spire_release_switch.mjs`).

## Сухой прогон (сделан 04.11 ~23:30, HEAD=20854ddd0) — PASS

Команда:

```bash
bash scripts/deploy_from_clean_head.sh --only "functions:default:progressSubmitEvent,functions:default:spireFinalizeCron,functions:default:spireJoinRoom,firestore:rules"
```

- Сборка functions и паритет рантайма — OK; `firebase deploy --dry-run` — OK.
- LIVE-VS-HEAD: на бою 417 функций, в HEAD 411; 20 функций на бою без экспорта в HEAD (в т.ч. `adminGrantVoiceMinutes`, `aiDialogBuyExtraReplies`, `aiDialogSyncPurchase`) — адресный деплой их НЕ удаляет («все имена пакета есть в HEAD»).
- В выкладку попадает только закоммиченное (выгрузка из HEAD, 35 грязных путей рабочего дерева не входят).
- Логи: `C:/Temp/claude/deploy_dry_full.log`, `C:/Temp/claude/deploy_clean_20854ddd0.dryrun.log`.
- Чужое WIP в `firestore.rules` (рабочее дерево, +21/−3: `periodType`/`schemaVersion`/`impressionId` журнала paywall, `profileCardShowcase`) в деплой НЕ попадёт, пока не закоммичено. Если оно должно выйти ночью — автор коммитит до 01:50, и перед боевым запуском сухой прогон повторяется.

## Порядок боевого запуска

1. Ревизор подтвердил зелёные сторожа и `tsc` на чистой копии HEAD.
2. Повторить сухой прогон на актуальном HEAD (команда выше): ждём `PASS сухой прогон`.
3. Зафиксировать «до»: хэш HEAD (`git rev-parse HEAD`) и, при желании, `firebase functions:list` (версии/время развёртывания четырёх целей).
4. Боевой запуск (только по слову координатора):

```bash
bash scripts/deploy_from_clean_head.sh --only "functions:default:progressSubmitEvent,functions:default:spireFinalizeCron,functions:default:spireJoinRoom,firestore:rules" --execute
```

5. Проверка после: `firebase functions:list` (четыре цели обновились), клиентский вызов `spireJoinRoom` возвращает `energyBonus`, запись нового ключа `lesson_progress_v2::es::*` проходит, а `lesson_progress_v2::fr::*` по-прежнему закрыта клиенту.

## План отката

Откат = повторная адресная выкладка тех же четырёх целей из ПРЕДЫДУЩЕГО коммита (того, который был на бою до деплоя). Скрипт сам выгружает ревизию в чистую папку, текущее дерево не трогаем.

1. Найти предыдущий боевой коммит `PREV`: запись шага 3 «до» (HEAD перед деплоем) либо последний коммит, с которого выкладывались функции (`git log --oneline -- functions/src/progress_events.ts functions/src/spire_finalize_cron.ts functions/src/spire_groups.ts firestore.rules`).
2. Скрипт берёт ревизию ТОЛЬКО из `HEAD` своего репозитория (аргумента «ревизия» у него нет), а общий HEAD менять нельзя. Поэтому откат — из отдельной копии `PREV` (не worktree, не ветка):

```bash
RB=/c/Temp/claude/rb_prev; rm -rf $RB; mkdir -p $RB
git -c core.autocrlf=false archive PREV | tar -x -C $RB
cd $RB && git init -q && git add -A >/dev/null && git -c user.name=rb -c user.email=rb@local commit -qm "rollback base PREV"
cmd //c "mklink /J $(cygpath -w $RB/node_modules) $(cygpath -w /c/appsprojects/phraseman/node_modules)"
cmd //c "mklink /J $(cygpath -w $RB/functions/node_modules) $(cygpath -w /c/appsprojects/phraseman/functions/node_modules)"
bash scripts/deploy_from_clean_head.sh --only "functions:default:progressSubmitEvent,functions:default:spireFinalizeCron,functions:default:spireJoinRoom,firestore:rules"            # сухой прогон
bash scripts/deploy_from_clean_head.sh --only "functions:default:progressSubmitEvent,functions:default:spireFinalizeCron,functions:default:spireJoinRoom,firestore:rules" --execute  # выкладка
```

Альтернатива без копии: `git revert` коммитов-виновников в общем дереве и обычный `deploy_from_clean_head.sh --execute` (новый HEAD = версия без них). Копию не проверял на этой машине — перед ночью один раз прогнать сухой вариант.
3. Правила отдельно (быстрее всего): Firebase Console → Firestore → Rules → «История» → предыдущий релиз → опубликовать; либо `firebase deploy --only firestore:rules` из выгрузки `PREV`.
4. Функцию можно «откатить» точечно, выложив одну цель из `PREV` (`--only functions:default:spireJoinRoom`), не трогая остальные.
5. Клиентский откат не нужен: старые сборки не знают про `energyBonus`/ключи es/de/it, ответы сервера обратно совместимы (поле добавлено, не изменено).

## Что НЕ делать

- Не выкладывать `functions:default` целиком и не вызывать `firebase deploy` напрямую из общего грязного дерева.
- Не поднимать `version.json` на сервере до выхода сборки в стор.
- Не включать App Check (запломбировано владельцем, 2026-08-17).
