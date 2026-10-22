# «Серия вдвоём 7/30/100» — окно вехи, вычитка 9 языков (Переводчик → 8 · МОМЕНТЫ)

Governance-ID: TG-678F34E723E2
Status: Ready for 8 · МОМЕНТЫ
Источник: 5cbf514bf. Файлы `app/friends_together/pair_copy.ts` и `app/(tabs)/friends.tsx` сейчас с незакоммиченными
правками Моментов — поэтому правки текстом, в файлы не лезу.

## Что в окне

Заголовок `pairMilestoneTitle`, текст `pairMilestoneBody`, кнопки `highFive` / `highFived` / `great`, «Закрыть»
(`FriendPairMilestoneSheet.tsx`), подпись своего имени по умолчанию в `friends.tsx:2823`. На всех 9 языках верно, кроме:

## Правки (id — по решению координатора 22.10 «везде aku»)

1. `friends.tsx:2823` подпись «Я» по умолчанию: id **'Saya' → 'Aku'** — курс и приложение говорят «aku».
2. `pair_copy.ts` id «**Rangkaian** bersama …» (во всех строках «Серии вдвоём», в т. ч. заголовок вехи) → «**Runtunan** bersama …» —
   в приложении «Серия» по-индонезийски «Runtunan» (огонь серии, «Сегодня», визитка).

## Стоит улучшить (по желанию)

- `pairMilestoneBody` es «Llevan {n} días **seguidos** estudiando los dos **cada día**», vi «… **mỗi ngày** suốt {n} ngày **liên tiếp**» —
  «подряд» и «каждый день» повторяют друг друга. Короче: es «Llevan {n} días seguidos estudiando juntos», vi «Cả hai đã học {n} ngày liên tiếp».

## Scope / Security and privacy

Только тексты. Данные не затрагиваются.

## Rollback

Удалить файл.
