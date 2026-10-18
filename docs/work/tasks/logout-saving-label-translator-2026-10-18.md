# Task packet: «Сохраняем прогресс…» — вычитка Переводчика (id)

Governance-ID: TG-DCC9C027D893
Status: В работе (Переводчик 18.10 ~01:52 по поручению координатора)
Owner: 5 · АВТОРИЗАЦИЯ

## Outcome

Надпись на кнопке выхода совпадает с вычиткой Переводчика на всех 9 языках.

## Scope

app/account_details.tsx, logoutSavingLabel: id 'Menyimpan progres…' → 'Menyimpan progresmu…'. Остальные 8 языков уже
совпадают с вычиткой. Текст ошибки «Не удалось сохранить, попробуй ещё раз» не ставлю — он нужен только в вариантах
Б/В поведения выхода без сети, решение координатора ещё не пришло; строки Переводчика сохранены здесь:
ru 'Не удалось сохранить, попробуй ещё раз', uk 'Не вдалося зберегти, спробуй ще раз', en 'Couldn’t save — try again',
es 'No se pudo guardar, inténtalo de nuevo', pt-BR 'Não deu para salvar, tente de novo', vi 'Chưa lưu được, thử lại nhé',
id 'Belum tersimpan, coba lagi', tr 'Kaydedilemedi, tekrar dene', pl 'Nie udało się zapisać, spróbuj ponownie'.

## Architecture

Одна строка в существующем вызове L(...).

## Security and privacy

Без изменений.

## Technical debt

Нет новых: длина tr «İlerlemen kaydediliyor…» (24 знака) помещается — заголовок строки переносится, а не ужимается.

## Verification

tests/profile_liquid_glass_source_contract.test.mjs (тексты на 9 локалях), babel-разбор файла.

## Rollback

Обратный собственный патч.
