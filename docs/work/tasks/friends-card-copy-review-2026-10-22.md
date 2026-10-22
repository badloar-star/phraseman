# Task packet: «Друзья» — визитка и финал занятия, вычитка 9 языков (Переводчик → 8 · МОМЕНТЫ)

Governance-ID: TG-D9A34059F163
Status: In progress
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

`app/friends_together/pair_copy.ts` (64a30403a, 8e79881ea; чужих незакоммиченных правок нет):
- `pairCardStatLabels.streak` tr: «12 **gün seri**» — неграмотно. → «**günlük seri**» («12 günlük seri»).
- `pairDoneFriendPending` («{Имя}: сегодня ещё без занятия»): в en / es / pt-BR / id / tr потеряно «сегодня» —
  «Anna hasn’t studied yet» читается как «вообще ещё не занималась». → en «{name} hasn’t studied today yet»,
  es «{name} aún no ha estudiado hoy», pt-BR «{name} ainda não estudou hoje», id «{name} belum belajar hari ini»,
  tr «{name} bugün henüz çalışmadı». ru/uk/vi/pl уже с «сегодня».

Уже сделано раньше (13ea0162f): `pairQueuedToast` en «nudge them», `pairDoneFriendAlsoToday` tr «o da çalıştı».
В 8e79881ea (`FinishFriendPairs.tsx`) своих строк нет — берёт тексты из `pair_copy.ts`.
Остальное верно: «дней серии / этаж Пика / дней вдвоём» на всех языках, склонение ru/uk/pl, «Peak floor», «piętro Szczytu».

## Scope

In scope: строки текста в `pair_copy.ts`. Out of scope: логика, ru.

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync`; поиск тестов со старыми строками.

## Rollback

`git revert <коммит>`.
