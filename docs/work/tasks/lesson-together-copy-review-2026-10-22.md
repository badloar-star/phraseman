# Task packet: «Урок вместе» и полоса «Нет сети» — вычитка 9 языков (Переводчик → 8 · МОМЕНТЫ)

Governance-ID: TG-DFCDE338E3FD
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

### «Урок вместе» — `app/friends_together/lesson_together_copy.ts` (276eef4d9), исправлено

Главное: «занятие» в vi и tr было переведено словом «урок» (vi «bài», tr «ders»), а рядом «Урок N» — тоже «Bài» / «ders».
Человек путал бы урок и занятие. В приложении занятие — vi «**Buổi**», tr «**Oturum**» (`app/(tabs)/lessons.tsx`).
- vi: «Rủ bạn học **buổi** này», «mỗi **buổi**» (×2), «học **buổi** này», строка «Bài N · **Buổi** M» (было «Phần»);
  пустой выбор «Thêm bạn để học cùng nhau.»; тост «**Mình** sẽ báo khi **bạn bè** học xong» (было «các bạn» = «вы все»).
- tr: «Bu **oturuma** bir arkadaşını çağır», «**Oturuma** çağır», «**Oturum** başına en fazla…» (×2),
  «Bu **oturuma** bugün zaten üç kişiyi çağırdın». Подписи «N. ders açık / kilitli» — про урок, верно.
- es: приложение говорит на «tú» латиноамериканского вида («Ya completaste»), а здесь было испанское «vosotros»
  и испанское прошедшее: «haced» → «**hagan**», «Añade un amigo» → «Añade **a** un amigo»,
  «Ahora no ha funcionado» → «**No funcionó esta vez**».

Верно без правок: ru, uk, en, pt-BR, id, pl (pl «je» согласовано с «zajęcia»; «Zaproś 1 osobę» — без рода).

### Полоса «Нет сети» — `pairOfflineStrip` (5f9a37825)

Текст совпадает с черновиком, который я вычитал в eeb659cce: переводы верны, «a la 1 / à 1» учтены. Остаётся:
- старая строка `offlineSaved` (pair_copy.ts:58) не вызывается нигде и переведена иначе на 6 языках — удалить
  (решение Моментов, файл их);
- по желанию: id «pukul 18.40» через точку, vi «danh sách đã lưu lúc».

## Scope

In scope: строки в `lesson_together_copy.ts`. Out of scope: логика, ru, `pair_copy.ts` (только замечания).

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync`; поиск тестов со старыми строками — нет.

## Rollback

`git revert <коммит>`.

## Дополнение: награда «вместе» раз в день на пару (координатор, 22.10)

Награда теперь не чаще раза в день с каждым другом, а шторка обещала её без ограничений. В конец текста шторки
`lessonInviteSheetBody` добавлено короткое уточнение на 9 языках: ru «С каждым другом — раз в день.», uk «З кожним
другом — раз на день.», en «Once a day with each friend.», es «Una vez al día con cada amigo.», pt-BR «Uma vez por dia
com cada amigo.», vi «Mỗi ngày một lần với mỗi người bạn.», id «Sekali sehari dengan tiap teman.», tr «Her arkadaşla
günde bir kez.», pl «Raz dziennie z każdym znajomym.» Governance-ID: TG-DFCDE338E3FD.
