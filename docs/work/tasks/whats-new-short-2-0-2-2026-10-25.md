# Task packet: короткое «Что нового» 2.0.2 для сторов — es, pt-BR, vi, id, tr, pl (Переводчик, просьба владельца через координатора)

Governance-ID: TG-8F8911198B0B
Status: Done
Owner: «10 · ПЕРЕВОДЧИК»

## Outcome

Владелец попросил короткие тексты «Что нового» (2.0.2, всё включено: сцены, экзамен, тест уровня). Координатор прислал утверждённые
ru и en (~250 знаков), uk у него. Перевод на es, pt-BR, vi, id, tr, pl в `docs/work/release/WHATS_NEW_2026-10-25_short.md`
(только этот файл, свой коммит). Названия разделов — как в приложении (сверены ранее для длинного «Что нового»: Inicio/Início/
Trang chủ/Beranda/Ana sayfa/Start, Palabras/Palavras/Từ vựng/Kata/Kelimeler/Słowa, Diálogos/Hội thoại/Dialog/Diyaloglar/Dialogi,
Pico/Đỉnh/Puncak/Zirve/Szczyt, Mis errores/Meus erros/Lỗi của tôi/Kesalahanku/Hatalarım/Moje błędy, «Найди ошибку» = promptOdd).
Обращение на «ты», каждый ≤ 300 знаков (скрипт), без «Вместе»/друзей.

## Scope

In scope: один новый файл. Out of scope: ru/en/uk (у координатора), длинные варианты.

## Architecture

No architecture change.

## Security and privacy

Не применимо.

## Technical debt

- uk у координатора, в файл не вносится — при сборке листинга взять из его сообщения.

## Verification

Скрипт длины (символы Unicode, с заголовком, маркерами и переводами строк).

## Rollback

`git revert <коммит>`.
