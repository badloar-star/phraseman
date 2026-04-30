// Localized labels and static UI metadata for flashcards screen.
import { CardItem, Category, CategoryId } from './types';

export const STR = {
  ru: {
    title: 'Карточки',
    hubTitle: 'Осколки',
    empty: 'Нет карточек', emptySub: 'Добавьте карточки или выберите другую категорию',
    done: 'Все карточки просмотрены!', doneSub: 'Отличная работа', restart: 'Начать заново',
    cardOf: (a: number, b: number) => `${a} / ${b}`,
    tapFlip: 'Нажми чтобы перевернуть', delete: 'Удалить',
    deleteConfirm: 'Удалить карточку?', deleteConfirmSub: 'Она будет удалена.',
    cancel: 'Отмена', back: 'Назад',
    editFront: 'Английская сторона', editBack: 'Перевод', next: 'Далее →',
    save: 'Сохранить', editCard: 'Редактировать карточку', newCard: 'Новая карточка',
    systemCannotDelete: 'Системные карточки нельзя удалять',
    enterEN: 'Введи английский текст...', enterRU: 'Введи перевод...',
    editDescription: 'Описание', enterDescription: 'Краткая заметка, контекст или подсказка (необязательно)...',
    noDelete: 'Это системная карточка',
    source: { lesson: 'Урок', word: 'Слово', verb: 'Глагол', dialog: 'Диалог' },
  },
  uk: {
    title: 'Картки',
    hubTitle: 'Уламки',
    empty: 'Немає карток', emptySub: 'Додай картки або вибери іншу категорію',
    done: 'Всі картки переглянуто!', doneSub: 'Чудова робота', restart: 'Почати знову',
    cardOf: (a: number, b: number) => `${a} / ${b}`,
    tapFlip: 'Натисни щоб перевернути', delete: 'Видалити',
    deleteConfirm: 'Видалити картку?', deleteConfirmSub: 'Вона буде видалена.',
    cancel: 'Скасувати', back: 'Назад',
    editFront: 'Англійська сторона', editBack: 'Переклад', next: 'Далі →',
    save: 'Зберегти', editCard: 'Редагувати картку', newCard: 'Нова картка',
    systemCannotDelete: 'Системні картки не можна видаляти',
    enterEN: 'Введи англійський текст...', enterRU: 'Введи переклад...',
    editDescription: 'Опис', enterDescription: 'Коротка нотатка, контекст або підказка (за бажанням)...',
    noDelete: 'Це системна картка',
    source: { lesson: 'Урок', word: 'Слово', verb: 'Дієслово', dialog: 'Діалог' },
  },
  es: {
    title: 'Tarjetas',
    hubTitle: 'Fragmentos',
    empty: 'No hay tarjetas',
    emptySub: 'Añade tarjetas o elige otra categoría',
    done: '¡Has visto todas las tarjetas!',
    doneSub: 'Buen trabajo',
    restart: 'Empezar de nuevo',
    cardOf: (a: number, b: number) => `${a} / ${b}`,
    tapFlip: 'Toca para voltear',
    delete: 'Eliminar',
    deleteConfirm: '¿Eliminar la tarjeta?',
    deleteConfirmSub: 'Se eliminará.',
    cancel: 'Cancelar',
    back: 'Atrás',
    editFront: 'Lado en inglés',
    editBack: 'Traducción',
    next: 'Siguiente →',
    save: 'Guardar',
    editCard: 'Editar tarjeta',
    newCard: 'Tarjeta nueva',
    systemCannotDelete: 'Las tarjetas del sistema no se pueden eliminar',
    enterEN: 'Escribe el texto en inglés...',
    enterRU: 'Escribe la traducción...',
    editDescription: 'Descripción',
    enterDescription: 'Nota breve, contexto o pista (opcional)...',
    noDelete: 'Es una tarjeta del sistema',
    source: { lesson: 'Lección', word: 'Palabra', verb: 'Verbo', dialog: 'Diálogo' },
  },
};

export const CATEGORIES: Category[] = [
  { id: 'saved',      icon: 'bookmark-outline',             labelRU: 'Сохр.',     labelUK: 'Збер.',     labelES: 'Guard.',    fullLabelRU: 'Сохранённые',  fullLabelUK: 'Збережені',   fullLabelES: 'Guardadas' },
  { id: 'emotions',   icon: 'heart-outline',               labelRU: 'Эмоции',    labelUK: 'Емоції',    labelES: 'Emoc.',     fullLabelRU: 'Эмоции',       fullLabelUK: 'Емоції',      fullLabelES: 'Emociones' },
  { id: 'fillers',    icon: 'chatbubble-ellipses-outline',  labelRU: 'Филлеры',   labelUK: 'Філери',    labelES: 'Mulet.',    fullLabelRU: 'Филлеры',      fullLabelUK: 'Філери',      fullLabelES: 'Muletillas' },
  { id: 'reactions',  icon: 'flash-outline',                labelRU: 'Реакции',   labelUK: 'Реакції',   labelES: 'Reacc.',    fullLabelRU: 'Реакции',      fullLabelUK: 'Реакції',     fullLabelES: 'Reacciones' },
  { id: 'traps',      icon: 'alert-circle-outline',         labelRU: 'Ловушки',   labelUK: 'Пастки',    labelES: 'Trampas',   fullLabelRU: 'Ловушки',      fullLabelUK: 'Пастки',      fullLabelES: 'Trampas' },
  { id: 'phrasal',    icon: 'git-branch-outline',           labelRU: 'Глаголы',   labelUK: 'Дієслова',  labelES: 'Verbos',    fullLabelRU: 'Фразовые глаголы', fullLabelUK: 'Дієслова', fullLabelES: 'Verbos frasales' },
  { id: 'situations',  icon: 'map-outline',                  labelRU: 'Ситуации',  labelUK: 'Ситуації',  labelES: 'Situac.',   fullLabelRU: 'Ситуации',     fullLabelUK: 'Ситуації',    fullLabelES: 'Situaciones' },
  { id: 'connectors',  icon: 'git-network-outline',          labelRU: 'Связки',    labelUK: 'Зв\'язки',  labelES: 'Conect.',   fullLabelRU: 'Связки',       fullLabelUK: 'Зв\'язки',    fullLabelES: 'Conectores' },
  {
    id: 'custom',
    icon: 'add-circle-outline',
    labelRU: 'Создать',
    labelUK: 'Створити',
    labelES: 'Crear',
    fullLabelRU: 'Создать мои карточки',
    fullLabelUK: 'Створити свої картки',
    fullLabelES: 'Crear mis tarjetas',
  },
];

/** Плитки на экране-хабе карточек: только сохранённые и свои; системные темы — только в данных/фильтрах. */
export const FLASHCARDS_HUB_CATEGORY_ORDER: CategoryId[] = ['saved', 'custom'];

export function categoriesForFlashcardsHub(): Category[] {
  return FLASHCARDS_HUB_CATEGORY_ORDER.map((id) => CATEGORIES.find((c) => c.id === id)).filter(
    (c): c is Category => c != null,
  );
}

export const SOURCE_COLORS: Record<string, string> = {
  lesson: '#4A90D9', word: '#7B68EE', verb: '#E87D3E', dialog: '#50BFA0',
};

export function getCardTint(card: CardItem): string | null {
  if (!card.source) return null;
  if (card.source === 'lesson' && card.sourceId) {
    const n = parseInt(card.sourceId, 10);
    if (n <= 8) return '#4CAF72';
    if (n <= 18) return '#40B4E8';
    if (n <= 28) return '#D4A017';
    return '#DC6428';
  }
  return SOURCE_COLORS[card.source] ?? null;
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }
