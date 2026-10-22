# Task packet: «Диалоги» в стиле «Сцена» — вычитка текстов 8 языков (Переводчик → 2 · ДИЗАЙН)

Governance-ID: TG-452CED13E7A5
Status: In progress
Owner: «10 · ПЕРЕВОДЧИК» (тексты); логика — 2 · ДИЗАЙН

## Outcome

`components/dialogs/scene/dialogs_scene_copy.ts` (закоммичен в 0d8cea3ef, чужих правок нет). ru — из эталона, не трогаю.

### Исправлено в файле (только строки)
- `offlineRest` pl: «Lekcje i **fiszki** działają» — раздел в приложении называется «Karty». → «Lekcje i karty działają».
- `limitVoice` en: «voice {voice} times a day» — обрывок. → «{voice} voice replies a day».
- `offlineSub` / `offlineRest` en: «Your **partner** replies…» — «partner» читается как «партнёр/пара». → «Your conversation partner replies…».

### Для 2 · ДИЗАЙН — нужна правка кода, не строки
1. **`withWho` ru / uk / pl: «с {who}», «з {who}», «z {who}»** — после предлога имя должно стоять в творительном
   падеже («с Анной», «z Anną»), а подставляется именительный: «Общение · с Анна», «Общение · z Anna». Автоматически
   склонять имена нельзя. Варианты: (а) убрать предлог — «Общение · Анна»; (б) хранить у собеседника готовую форму
   «с Анной» в данных. Для en / es / pt-BR / vi / id / tr предлог ничего не ломает («with Anna», «Anna ile»).
2. **`limitVoice` ru / uk: «голосом {voice} раза в день», «{voice} рази на день»** — форма жёстко под 2–4. При 5 и больше —
   «5 раза» / «5 рази» (нужно «5 раз» / «5 разів»), при 1 — «1 раза» (нужно «1 раз»). Нужна функция по числу, как уже
   сделано в `dialogsSceneRemainingLabel` (ru раз/раза/раз, uk раз/рази/разів). pl «razy» верно для 2+, для 1 — «raz».

### Верно без правок
Всё остальное: склонения в `dialogsSceneGoalsLabel` / `GoalsDoneLabel` / `RemainingLabel` (ru, uk, pl), es/pt-BR
«Queda / Quedan», «Resta / Restam», tr «{date} tarihinde», дата через Intl, все кнопки и заголовки состояний.

## Scope

In scope: три строки текста в `dialogs_scene_copy.ts`. Out of scope: логика сборки (пункты 1–2 — у Дизайна), ru.

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты.

## Technical debt

- Пункты 1–2 остаются до правки кода Дизайном.

## Verification

`babel.parseSync`; поиск тестов со старыми строками.

## Rollback

`git revert <коммит>`.
