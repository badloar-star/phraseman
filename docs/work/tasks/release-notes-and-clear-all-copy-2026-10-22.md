# Task packet: «Что нового» — два новых пункта; вычитка «Очистить все ошибки» (Переводчик)

Governance-ID: TG-EA6249B51F30
Status: Done (b218afa31 — «Что нового»; вычитка текстов — следующий коммит)
Owner: «10 · ПЕРЕВОДЧИК» (поручение координатора 22.10)

## Outcome

1. `docs/work/release_notes_next_2026-10-22.md`: на 9 языках добавлены пункты «в „Моих ошибках“ можно разом очистить
   накопившееся» (4642d1761, dd4ebb8a8) и «язык интерфейса выбирается прямо на приветствии» (правка 19.10, со слов
   координатора). Каждый язык ≤ 500 знаков, длины пересчитаны скриптом.
2. `app/mistake_clear_all_copy.ts`, вычитка отдельным коммитом:
   - tr: «{N} tekrardan kaldırılsın mı?» — «tekrardan» в разговорной речи значит «ещё раз», и фраза читается как
     «снова убрать?». → «{N} listeden kaldırılsın mı?»;
   - es: в одном окне было три глагола (borrar / quitar / eliminar). Сведено к одному: «¿Borrar {N} del repaso?»,
     «Borrar», «Errores borrados», «No se pudieron borrar…».
   - Верно без правок: ru, uk, en, pt-BR, vi, id, pl (формы pl «błąd / błędy / błędów» в винительном верны).

## Scope

In scope: тексты в двух файлах. Out of scope: логика очистки, утверждённые тексты 2.0, публикация.

## Architecture

No architecture change.

## Security and privacy

Не применимо: только тексты.

## Technical debt

- Не проверено носителями.

## Verification

`babel.parseSync` файла текстов; поиск тестов со старыми строками; длины «Что нового» скриптом.

## Rollback

`git revert <коммит>`.
