# «Мои ошибки» · удаление ошибки и «Очистить все» — строки на 9 языках (Переводчик → Learning V2)

Status: Готово к вставке; одна развилка — у координатора
Owner: «10 · ПЕРЕВОДЧИК» (координатор 24.10, слово владельца про удаление ошибок)

Порядок языков: ru, uk, en, es, pt-BR, vi, id, tr, pl. ru/uk — на «ты» (замок `informal_address_ru_uk_guard`); ни одна строка ниже
не обращается на «вы». Глаголы те же, что в уже выпущенном `app/mistake_clear_all_copy.ts` (es «Borrar», en/pt «Remove/Remover»,
tr «Kaldır», pl «Usuń») — одна мысль, одни слова.

## Уже есть в коде — НЕ дублировать, брать оттуда

`app/mistake_clear_all_copy.ts` (`mistakeClearAllCopy(lang)`): `confirm` «Удалить», `cancel` «Отмена», `done` «Ошибки удалены»,
`undo` «Вернуть», `failed`, `undoFailed`, `menu` «Очистить все ошибки», `confirmTitle` «Удалить {N} из разбора?».
`app/mistake_detail.tsx`: `remove` «Удалить из ошибок» (меню карточки), `hideFailed`.

## Новые строки

```ts
// Действие над одной ошибкой в списке (свайп / кнопка строки)
itemDelete: ['Удалить', 'Видалити', 'Remove', 'Borrar', 'Remover', 'Xóa', 'Hapus', 'Kaldır', 'Usuń'],
// Тост после удаления одной ошибки (+ undo из mistake_clear_all_copy)
itemDeleted: ['Ошибка удалена', 'Помилку видалено', 'Mistake removed', 'Error borrado', 'Erro removido', 'Đã xóa lỗi', 'Kesalahan dihapus', 'Hata kaldırıldı', 'Błąd usunięty'],
// Короткая кнопка «Очистить все» (если в макете короткая; иначе — существующий menu «Очистить все ошибки»)
clearAll: ['Очистить все', 'Очистити все', 'Clear all', 'Borrar todo', 'Limpar tudo', 'Xóa tất cả', 'Hapus semua', 'Tümünü temizle', 'Wyczyść wszystko'],
// Подтверждение очистки — заголовок без числа
confirmAllTitle: ['Удалить все ошибки?', 'Видалити всі помилки?', 'Remove all mistakes?', '¿Borrar todos los errores?', 'Remover todos os erros?', 'Xóa tất cả lỗi?', 'Hapus semua kesalahan?', 'Tüm hatalar kaldırılsın mı?', 'Usunąć wszystkie błędy?'],
// Текст подтверждения — СМ. РАЗВИЛКУ
confirmAllBody: ['Их нельзя будет вернуть', 'Їх не можна буде повернути', 'You won’t be able to restore them', 'No podrás recuperarlos', 'Não será possível recuperá-los', 'Bạn sẽ không thể khôi phục chúng', 'Kesalahan ini tidak bisa dikembalikan', 'Bunları geri getiremeyeceksin', 'Nie będzie można ich przywrócić'],
```

## Развилка (координатору)

«Их нельзя будет вернуть» противоречит уже выпущенному поведению: после «Очистить все ошибки» показывается тост «Ошибки удалены ·
Вернуть» (`MISTAKE_CLEAR_ALL_COPY.done/undo`, откат событиями в `mistake_clear_all_flow.ts`). Текст обещает, что вернуть нельзя,
а кнопка через секунду предлагает вернуть — человек перестанет верить подтверждениям.

- **Рекомендую:** откат оставить, `confirmAllBody` не показывать (заголовок «Удалить все ошибки?» самодостаточен).
- Если владелец хочет удаление без отката — строку выше брать как есть и убрать «Вернуть» из тоста очистки.

## Замер

Самая длинная новая строка — vi `confirmAllBody` (≈ 33 знака), в окне подтверждения во всю ширину — одна строка на 360 dp.
`clearAll` tr «Tümünü temizle» (14) — самая длинная кнопка; если место кнопки меньше 14 знаков, дать знать.
