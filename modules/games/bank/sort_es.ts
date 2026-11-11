/**
 * Банк игры «Сортировка» — испанский классический курс, уроки 1–8 (D207). Одна колода из 8 карт на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: противопоставление корзин реально есть в уроке; каждая карта подходит ровно к одной
 * корзине; текст карты — только слова этого и прошлых уроков. Пропуск в карте пишется `___`
 * (уроки 3, 6, 7, 8): корзины названы самими словами, игрок выбирает, чем заполнить пропуск.
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { SortBin, SortDeck } from '../sort_core';
import { sortDeck, type SortCard } from './make_es_it';

const deck = (lesson: number, left: SortBin, right: SortBin, cards: readonly SortCard[]): SortDeck => sortDeck('es', lesson, left, right, cards);

export const SORT_BANK_ES: Readonly<Record<number, SortDeck>> = {
  1: deck(1, { title: 'Один', example: 'él, ella, el libro' }, { title: 'Несколько', example: 'ellos, ellas, los libros' }, [
    ['El móvil está aquí', 'left', 'el móvil — телефон один, поэтому está'],
    ['Las llaves están aquí', 'right', 'las llaves — ключей несколько, поэтому están'],
    ['Ella está cerca', 'left', 'ella — она одна'],
    ['Ellos están dentro', 'right', 'ellos — их несколько'],
    ['El coche está fuera', 'left', 'el coche — машина одна'],
    ['Los coches están fuera', 'right', 'los coches — машин несколько'],
    ['La llave está dentro', 'left', 'la llave — ключ один'],
    ['Los libros están allí', 'right', 'los libros — книг несколько'],
  ]),
  2: deck(2, { title: 'Да, так', example: 'Ana está…' }, { title: 'Нет, не так', example: 'Ana no está…' }, [
    ['Ana no está aquí', 'right', 'no перед está — её здесь нет'],
    ['Luis está en clase', 'left', 'без no — он на занятии'],
    ['El coche no está lejos', 'right', 'no перед está — машина недалеко'],
    ['Estamos en la oficina', 'left', 'без no — мы в офисе'],
    ['No estamos en casa', 'right', 'no перед estamos — нас дома нет'],
    ['El móvil está en el bolso', 'left', 'без no — телефон в сумке'],
    ['La tienda no está cerca', 'right', 'no перед está — магазин не рядом'],
    ['Las llaves están en la mochila', 'left', 'без no — ключи в рюкзаке'],
  ]),
  3: deck(3, { title: 'Está', example: 'про одного: Ana, el libro' }, { title: 'Están', example: 'про нескольких: las llaves' }, [
    ['¿___ Ana en casa?', 'left', 'Ана одна — значит está'],
    ['¿___ las llaves en casa?', 'right', 'ключей несколько — значит están'],
    ['¿___ el libro en la mesa?', 'left', 'книга одна — значит está'],
    ['¿___ los libros en la mesa?', 'right', 'книг несколько — значит están'],
    ['¿___ el pasaporte en el bolso?', 'left', 'паспорт один — значит está'],
    ['¿___ los billetes en el bolso?', 'right', 'билетов несколько — значит están'],
    ['¿___ Luis en la salida?', 'left', 'Луис один — значит está'],
    ['¿___ Ana y Luis en el hotel?', 'right', 'их двое — значит están'],
  ]),
  4: deck(4, { title: 'Про мужчину', example: 'médico, profesor' }, { title: 'Про женщину', example: 'médica, profesora' }, [
    ['Soy médico', 'left', 'médico — так говорит о себе мужчина'],
    ['Soy médica', 'right', 'médica — так говорит о себе женщина'],
    ['Luis es profesor', 'left', 'profesor — он'],
    ['Ana es profesora', 'right', 'profesora — она'],
    ['Soy enfermero', 'left', 'enfermero — медбрат'],
    ['Soy enfermera', 'right', 'enfermera — медсестра'],
    ['Él es el guía', 'left', 'el guía — гид-мужчина'],
    ['Ella es la guía', 'right', 'la guía — гид-женщина'],
  ]),
  5: deck(5, { title: 'Где?', example: '¿Dónde…?' }, { title: 'Кто?', example: '¿Quién…?  ¿Quiénes…?' }, [
    ['¿Dónde está el aeropuerto?', 'left', 'dónde — спрашивают про место'],
    ['¿Quién está en la puerta?', 'right', 'quién — спрашивают про человека'],
    ['¿Dónde están las llaves?', 'left', 'dónde — спрашивают про место'],
    ['¿Quién es el guía?', 'right', 'quién — спрашивают про человека'],
    ['¿Dónde está la recepción?', 'left', 'dónde — спрашивают про место'],
    ['¿Quiénes son ellos?', 'right', 'quiénes — спрашивают про нескольких людей'],
    ['¿Dónde estamos?', 'left', 'dónde — спрашивают про место'],
    ['¿Quién eres?', 'right', 'quién — спрашивают про человека'],
  ]),
  6: deck(6, { title: 'El', example: 'el tren, el mapa' }, { title: 'La', example: 'la maleta, la foto' }, [
    ['___ mapa está en la mesa', 'left', 'говорят el mapa, хотя слово кончается на -a'],
    ['___ foto está en la mesa', 'right', 'говорят la foto, хотя слово кончается на -o'],
    ['___ tren está cerca', 'left', 'tren — «он»'],
    ['___ maleta está aquí', 'right', 'maleta — «она»'],
    ['___ abrigo está en la mesa', 'left', 'abrigo — «он»'],
    ['___ botella está allí', 'right', 'botella — «она»'],
    ['___ pasaporte está en la maleta', 'left', 'pasaporte — «он»'],
    ['___ farmacia está cerca', 'right', 'farmacia — «она»'],
  ]),
  7: deck(7, { title: 'un', example: 'un libro, un mapa' }, { title: 'una', example: 'una llave, una foto' }, [
    ['Hay ___ libro aquí', 'left', 'libro — «он», поэтому un'],
    ['Hay ___ llave aquí', 'right', 'llave — «она», поэтому una'],
    ['Hay ___ mapa en la mochila', 'left', 'mapa — «он», поэтому un'],
    ['Hay ___ foto en el bolso', 'right', 'foto — «она», поэтому una'],
    ['Hay ___ billete en el bolsillo', 'left', 'billete — «он», поэтому un'],
    ['¿Hay ___ tienda cerca?', 'right', 'tienda — «она», поэтому una'],
    ['En el bolso hay ___ pasaporte', 'left', 'pasaporte — «он», поэтому un'],
    ['En el coche hay ___ maleta', 'right', 'maleta — «она», поэтому una'],
  ]),
  8: deck(8, { title: 'Mi', example: 'про одно: mi libro' }, { title: 'Mis', example: 'про несколько: mis libros' }, [
    ['___ libro está aquí', 'left', 'книга одна — значит mi'],
    ['___ llaves están aquí', 'right', 'ключей несколько — значит mis'],
    ['___ mochila está en casa', 'left', 'рюкзак один — значит mi'],
    ['___ fotos están en el móvil', 'right', 'фотографий несколько — значит mis'],
    ['___ pasaporte está en casa', 'left', 'паспорт один — значит mi'],
    ['___ billetes están en el bolso', 'right', 'билетов несколько — значит mis'],
    ['___ hermana está en casa', 'left', 'сестра одна — значит mi'],
    ['___ hermanos están aquí', 'right', 'братьев несколько — значит mis'],
  ]),
};
