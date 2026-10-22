# Task packet: полоса «Нет сети · список сохранён в ЧЧ:ММ» — вычитка 9 языков (Переводчик → 8 · МОМЕНТЫ)

Governance-ID: TG-678F34E723E2
Status: Ready for 8 · МОМЕНТЫ (черновик ещё не закоммичен — сверю ещё раз после коммита)
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Читал черновик `pairOfflineStrip` в `app/friends_together/pair_copy.ts` (рабочая копия Моментов, файл не трогал).

Верно: ru, uk («о 18:40»), en («at 18:40»), es («a la 1:05» / «a las 18:40» — единственное число учтено), pt-BR
(«à 1:05» / «às 18:40»), vi («lúc 18:40»), pl («o 18:40»), tr («liste 18:40 itibarıyla kayıtlı» — естественно, без
проблем с гармонией суффиксов). Вариант без времени («не сегодня / неизвестно») на всех языках верен.

Стоит поправить:
1. **Старая строка `offlineSaved` (строка 58) расходится с новой полосой** — если она ещё где-то показывается,
   человек увидит два разных перевода одного смысла. Сейчас вызовов `offlineSaved` в коде нет → предлагаю удалить её,
   а не держать вторую версию: en «saved list» / «list saved», pt-BR «Sem conexão» / «Sem internet»,
   vi «Ngoại tuyến» / «Mất mạng», id «Offline» / «Tidak ada jaringan», tr «Çevrimdışı · kayıtlı liste» /
   «Bağlantı yok · liste kayıtlı», pl «Offline» / «Brak sieci».
2. **id** время по-индонезийски пишут через точку: «pukul 18.40». Двоеточие тоже понятно (так делают многие
   приложения) — на усмотрение; если по всему приложению id-время с двоеточием, оставить.
3. **vi** без времени «danh sách đã lưu», со временем «danh sách lưu lúc» — допустимо, но единообразнее
   «danh sách đã lưu lúc 18:40».

## Scope

In scope: тексты полосы. Out of scope: логика NetInfo, время синхронизации.

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты.

## Technical debt

- Не проверено носителями.

## Verification

Прочитан черновик; поиск вызовов `offlineSaved` — нет.

## Rollback

Удалить файл.
