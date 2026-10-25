# Task packet: короткое «Что нового» = список исправлений с прошлой версии — es, pt-BR, vi, id, tr, pl (Переводчик, замена f37ebcfc8)

Governance-ID: TG-85DE992C5E6E
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Владелец через координатора заменил короткое «Что нового» (f37ebcfc8, новинки) на список исправлений с прошлой версии. Исходники
ru/en от координатора, uk у него. Перевод на es, pt-BR, vi, id, tr, pl — в тот же файл
`docs/work/release/WHATS_NEW_2026-10-25_short.md` (заменяет прежнее содержимое, свой файл). Названия как в приложении: Пик
(Pico/Đỉnh/Puncak/Zirve/Szczyt), «Мои ошибки» (Mis errores/Meus erros/Lỗi của tôi/Kesalahanku/Hatalarım/Moje błędy), кнопка «Дальше»
(Siguiente/Próximo/Tiếp/Lanjut/İleri/Dalej — `flashcards_swipe.tsx` nextLabel). На «ты», каждый ≤ 300 знаков (скрипт).

## Scope

In scope: один файл стора. Out of scope: ru/en/uk.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- Надпись «Урок не готов» дословно в коде не найдена — переведена по смыслу исходника; если на экране другая формулировка,
  поправить кавычки во всех языках разом.

## Verification

Скрипт длины (символы Unicode с заголовком, маркерами и переводами строк).

## Rollback

`git revert <коммит>`.
