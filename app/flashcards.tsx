/**
 * Cards 2.1 §5.1 — вход в раздел «Карточки».
 *
 * Переход с главного экрана сразу открывает СОХРАНЁННЫЕ КАРТОЧКИ (поиск и фильтр
 * сверху), без промежуточного экрана-хаба. Каталог наборов сообщества переехал на
 * отдельный роут `/flashcards_packs` — правая позиция нижнего таббара (§5.2/§5.3).
 *
 * Экран целиком переиспользует коллекцию (`flashcards_collection.tsx`) в режиме
 * `sectionRoot`: те же поиск/фильтр/«Колода»/удаление с undo/свободный лимит,
 * плюс закреплённый снизу таббар раздела. Диплинки на коллекцию
 * (`/flashcards_collection?cat=saved`, `?pack=<id>`) продолжают работать как раньше.
 */
import React from 'react';
import FlashcardsCollectionScreen from './flashcards_collection';

export default function FlashcardsSectionScreen() {
  return <FlashcardsCollectionScreen sectionRoot />;
}
