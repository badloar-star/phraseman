# Заготовка: сверка-гейт «приложение = макет» по варианту «А+Б» (патч `r1_parity_gate_AB.patch`)

Статус: **заготовка, НЕ наложена.** Накладывать только после «да» владельца по `R1_PARITY_GATE_OPTIONS.md`
(dd0928aee, п. 5.1). Подготовил: 5 · АВТОРИЗАЦИЯ, 12.10.2026, по поручению координатора.

## Что меняется (3 файла)

- `scripts/visual_parity_gate.mjs`
  - флаг `--defer-triage` и опция `deferTriage` в `evaluateRegistry`;
  - строка, у которой корзина (`triage.final_bucket`, иначе `triage.bucket`) — `b_reshoot` / `c_owner_decides` /
    `d_mockup_stale`, либо `triage.theme_tone === true`, — **не нарушение**: её нарушения уходят в `result.deferred`
    (число строк, разбивка по корзинам, сами нарушения);
  - вывод громкий: `ОТЛОЖЕНО по варианту «А+Б» (решение владельца): строк N, их нарушений M · b_reshoot=…` и строка
    «это НЕ сверено … после выхода R1 вернуть строгий прогон»; при зелёном гейте — «OK: нарушений нет; отложено N»;
  - **без флага поведение прежнее** (строгое): обход возможен только явно, а не молча.
- `scripts/release_precheck.mjs` — гейт сверки запускается с `--release=r1 --defer-triage` (новое поле `args` у
  записи гейта; запускатель передаёт его в `spawnSync`).
- `tests/visual_parity_gate.test.mjs` — два теста: (1) на синтетическом реестре — строго без флага, с флагом остаётся
  только `a_code_defect`, разбивка по 4 причинам, строки без `release` не считаются; (2) precheck передаёт флаги, CLI на
  настоящем реестре печатает счётчик.

`removed_by_owner` и `no_release_surface` обрабатываются как раньше (не откладываются — у них свои проверки).
Строки `a_code_defect`, `a2_layout_candidate` и строки без корзины остаются нарушениями.

## Сколько нарушений останется (12.10, HEAD 4f5b5ef0c; рабочая копия реестра на момент счёта совпадала с HEAD)

Подсчитано самим гейтом из патча, на настоящем репозитории (git-история кода и склейки), `--release=r1`:

| Прогон | Строк r1 | Нарушений | Отложено |
|---|---|---|---|
| строгий (как сейчас в precheck с `--release=r1`) | 531 | **507** | — |
| с патчем «А+Б» | 531 | **251** | 256 строк: b_reshoot 215 · d_mockup_stale 19 · c_owner_decides 16 · theme_tone 6 |

Из чего 251 (по строкам, у каждой по одному нарушению):
- по статусу: pending **205** · протухшая склейка у match **20** · diff без корзины/с `a2_layout_candidate` **18** · blocked **8**;
- по покрытию: ссылки нет (`link_missing`) 111 · только руками сеть/ИИ (`manual_conditional`) 42 · нужен
  dev-переключатель (`core_switch`) 34 · снять сейчас (`ready`) 28 · без покрытия 22 · пишет в прод 6 · подготовка вне
  приложения 5 · состояния нет в коде 3;
- по разделам: cards 52 · cards-v2 29 · cards-section 24 · cards-gap 22 · **auth-gap 18** · community 17 · onboarding 16 ·
  dialogs 15 · energy-modes 15 · settings-gap 13 · dialogs-gap 10 · paywalls 6 · profile 5 · прочие 9.
- Если вдобавок сузить r1 по «А» из документа вариантов (убрать `settings-gap`/`cards-gap`/`dialogs-gap`/`spire-gap`) —
  уйдёт ещё **48**, останется **≈ 203**. Этот патч r1 НЕ сужает — сужение делается полем `release` в реестре (зона Макетов/Сверки).

Важно: 256 отложенных строк — это **не сверено**. Больше всего — `b_reshoot` (215): отличие разобрано, но кадра после
исправления нет. Вариант «А+Б» разрешает выпуск без этих кадров; это решение владельца, а не проверка.

## Проверено

- `git apply --check` на текущем дереве — ОК; вместе с `r1_cut_learning_v2.patch` и `r1_cut_learning_v2_background.patch`
  накладывается в обоих порядках (оба трогают `release_precheck.mjs` и `visual_parity_gate.test.mjs`, ханки не пересекаются).
- node-тесты на выгрузке HEAD + три патча + `docs/phraseman-2.0`: 51/1 — упал только `parity_shot` (в выгрузке нет пакета
  playwright; с патчами не связано).

## Наложение (после «да» владельца)

```bash
git apply docs/phraseman-2.0/handoff/r1_parity_gate_AB.patch
node --test tests/visual_parity_gate.test.mjs tests/store_release_gate_levers.test.mjs
node scripts/visual_parity_gate.mjs --release=r1 --defer-triage --max-lines=0
```

## Откат

`git apply -R docs/phraseman-2.0/handoff/r1_parity_gate_AB.patch`. После выхода R1 убрать `args` у гейта в precheck —
и гейт снова строгий по всем строкам.
