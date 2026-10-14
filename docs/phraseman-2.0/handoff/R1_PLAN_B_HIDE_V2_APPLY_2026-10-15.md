# План Б R1 «скрыть Learning V2» — готовый пакет к решению владельца 15.10 в 12:00

**НЕ ПРИМЕНЁН.** Применять только по слову владельца «скрыть». Подготовлено Ядром 14.10 по заданию координатора.

## Что делает

Две строки, обе обязательны:

1. `eas.json` → `build.production.env`: `"PHRASEMAN_R1_HIDE_V2": "1"`. Precheck и сервер EAS идут через обёртку
   `scripts/learning_v2_plan_b_gates.mjs`, и она объявляет план Б.
2. `app/learning_v2_visibility_switch.ts`: `LEARNING_V2_HIDDEN = true`. Рубильник закрывает каждый вход в V2: вкладку,
   маршруты курса и занятия, внешние ссылки ведут на Главную с меткой [V2-HIDDEN]. Фоновые досылки завершённых занятий
   продолжают работать.

Почему обе. На HEAD потолок выпущенных занятий = 0, и хватило бы одной строки 1. Но Codex держит незакоммиченную правку
`app/learning_v2_bundle_availability_v1.generated.ts` с потолком 8. С ней только переменная окружения даёт ОТКАЗ
(«план Б заявлен, но в бандле выпущено занятий подряд: 8»). Рубильник делает гейты неприменимыми при любом потолке.

## Команда применения (из корня репозитория)

```bash
git apply docs/phraseman-2.0/handoff/R1_PLAN_B_HIDE_V2.apply.patch
```

Затем коммит через `scripts/safe_commit.sh` (файл `app/…` — в окно кода :00–:05 / :30–:35), сообщение со ссылкой на
решение владельца. Откат: `git apply -R docs/phraseman-2.0/handoff/R1_PLAN_B_HIDE_V2.apply.patch`.

## Проверено на копии (14.10, 23:2x)

- `git apply --check` по текущему дереву — чисто, затрагивает только эти 2 файла.
- Копия: обёртка + сгенерированный файл с худшим потолком 8 + рубильник true + eas.json с патчем. Переменная читается так
  же, как в precheck (`eas.build.production.env`).
  `[V2-PLAN-B] вход: PHRASEMAN_R1_HIDE_V2=1 потолок=8 рубильник=true → not_applicable (switch)` → «НЕПРИМЕНИМО», код 0.
- Сторожа рубильника (`tests/learning_v2_visibility_switch_contract.test.ts`, `learning_v2_plan_b_gates.test.mjs`,
  `learning_v2_release_access_contract.test.ts`, `learning_v2_show_only_released_contract.test.mjs`,
  `lessons_entry_opens_legacy_guard.test.ts`) значение не фиксируют — допускают и `true`, и `false`.

## Чего пакет НЕ делает

- Не трогает артефакт Codex (потолок) и файлы курса.
- Остальные пункты release_precheck (визуальная сверка и др.) от плана Б не зависят.
