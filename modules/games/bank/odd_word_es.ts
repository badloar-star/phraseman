/**
 * Банк игры «Лишнее слово» — испанский классический курс, уроки 1–8 (D207). 8 заданий на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: без лишнего слова остаётся фраза урока (или фраза из слов этого и прошлых уроков);
 * с лишним словом фраза неверна; убрав любое ДРУГОЕ слово, верную фразу не получить.
 * Особенность испанского: подлежащее часто опускают, поэтому «Estoy [está] aquí» — негодное задание
 * (без estoy остаётся верное «Está aquí»). Здесь подлежащее всегда названо, и это не имя:
 * «Ana estoy en casa» читалось бы как обращение «Ана, я дома».
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { OddWordTask } from '../odd_word_core';
import { oddTask } from './make_es_it';

const task = (lesson: number, n: number, marked: string, translation: string, whyText: string): OddWordTask =>
  oddTask('es', lesson, n, marked, translation, whyText);

export const ODD_WORD_BANK_ES: Readonly<Record<number, readonly OddWordTask[]>> = {
  1: [
    task(1, 1, 'Ella [estoy] está en casa', 'Она дома', 'Про неё говорят está. Estoy — только про себя.'),
    task(1, 2, 'Él está [están] aquí', 'Он здесь', 'Он один — значит está, а не están.'),
    task(1, 3, 'Ellos [está] están allí', 'Они вон там', 'Их несколько — значит están.'),
    task(1, 4, 'Los [el] libros están allí', 'Книги вон там', 'Книг несколько — значит los, а не el.'),
    task(1, 5, 'El coche está [en] fuera', 'Машина снаружи', 'Fuera обходится без en.'),
    task(1, 6, 'El [la] móvil está aquí', 'Телефон здесь', 'Móvil — «он», поэтому el.'),
    task(1, 7, 'Luis está en [el] la cocina', 'Луис на кухне', 'Cocina — «она», поэтому la.'),
    task(1, 8, 'La estación está [en] cerca', 'Вокзал рядом', 'Cerca обходится без en.'),
  ],
  2: [
    task(2, 1, 'Ella no [están] está en la farmacia', 'Она не в аптеке', 'Она одна — значит está.'),
    task(2, 2, 'Él no [estoy] está en la oficina', 'Он не в офисе', 'Про него говорят está. Estoy — только про себя.'),
    task(2, 3, 'Ellos no [está] están en casa', 'Они не дома', 'Их несколько — значит están.'),
    task(2, 4, 'La estación no está [en] lejos', 'Станция недалеко', 'Lejos обходится без en.'),
    task(2, 5, 'Las llaves no están [en] aquí', 'Ключей здесь нет', 'Aquí обходится без en.'),
    task(2, 6, 'El [la] bolso no está en el coche', 'Сумка не в машине', 'Bolso — «он», поэтому el.'),
    task(2, 7, 'La llave no está en [la] el bolsillo', 'Ключ не в кармане', 'Bolsillo — «он», поэтому el.'),
    task(2, 8, 'Los [el] libros no están en la oficina', 'Книги не в офисе', 'Книг несколько — значит los.'),
  ],
  3: [
    task(3, 1, '¿Está [están] el libro en la mesa?', 'Книга на столе?', 'Книга одна — значит está.'),
    task(3, 2, '¿Están [está] las llaves en casa?', 'Ключи дома?', 'Ключей несколько — значит están.'),
    task(3, 3, '¿Está el [la] móvil en el bolso?', 'Телефон в сумке?', 'Móvil — «он», поэтому el.'),
    task(3, 4, '¿La parada está [en] cerca?', 'Остановка рядом?', 'Cerca обходится без en.'),
    task(3, 5, '¿El hotel está [en] aquí?', 'Отель здесь?', 'Aquí обходится без en.'),
    task(3, 6, '¿Están los [el] billetes en el bolso?', 'Билеты в сумке?', 'Билетов несколько — значит los.'),
    task(3, 7, '¿Está Luis [en] dentro?', 'Луис внутри?', 'Dentro обходится без en.'),
    task(3, 8, '¿Está el pasaporte en [el] la mochila?', 'Паспорт в рюкзаке?', 'Mochila — «она», поэтому la.'),
  ],
  4: [
    task(4, 1, 'Soy [estoy] médico', 'Я врач', 'Кто ты по профессии — это soy. Estoy — про место.'),
    task(4, 2, 'Ana es [está] profesora', 'Ана — преподавательница', 'Про профессию говорят es. Está — про место.'),
    task(4, 3, 'Él [son] es estudiante', 'Он студент', 'Он один — значит es.'),
    task(4, 4, 'Ellas [es] son médicas', 'Они — врачи', 'Их несколько — значит son.'),
    task(4, 5, 'Ana es [el] la profesora', 'Ана и есть преподавательница', 'Profesora — «она», поэтому la.'),
    task(4, 6, 'Somos [el] los guías', 'Мы и есть гиды', 'Гидов несколько — значит los.'),
    task(4, 7, 'Ana y Luis [es] son estudiantes', 'Ана и Луис — студенты', 'Их двое — значит son.'),
    task(4, 8, 'Usted [eres] es médica', 'Вы врач', 'С usted говорят es. Eres — это про «ты».'),
  ],
  5: [
    task(5, 1, '¿Dónde [están] está el aeropuerto?', 'Где аэропорт?', 'Аэропорт один — значит está.'),
    task(5, 2, '¿Dónde [está] están los pasaportes?', 'Где паспорта?', 'Паспортов несколько — значит están.'),
    task(5, 3, '¿Quién [quiénes] es la enfermera?', 'Кто медсестра?', 'Медсестра одна — значит quién.'),
    task(5, 4, '¿Quiénes [es] son ellas?', 'Кто они?', 'Их несколько — значит son.'),
    task(5, 5, '¿Quién es [está] el médico?', 'Кто врач?', '«Кто он такой» — это es. Está — про место.'),
    task(5, 6, '¿Qué libros [está] están en casa?', 'Какие книги дома?', 'Книг несколько — значит están.'),
    task(5, 7, '¿Cuánto cuesta [la] el billete?', 'Сколько стоит билет?', 'Billete — «он», поэтому el.'),
    task(5, 8, '¿Quién está en [la] el ascensor?', 'Кто в лифте?', 'Ascensor — «он», поэтому el.'),
  ],
  6: [
    task(6, 1, 'El [la] mapa está en la mesa', 'Карта на столе', 'Говорят el mapa, хотя слово кончается на -a.'),
    task(6, 2, 'La [el] foto está en el bolsillo', 'Фотография в кармане', 'Говорят la foto, хотя слово кончается на -o.'),
    task(6, 3, 'Los [el] abrigos están dentro', 'Пальто внутри', 'Их несколько — значит los.'),
    task(6, 4, 'Las maletas [está] están fuera', 'Чемоданы снаружи', 'Чемоданов несколько — значит están.'),
    task(6, 5, 'Las fotos están en [la] las mochilas', 'Фотографии в рюкзаках', 'Рюкзаков несколько — значит las.'),
    task(6, 6, 'Los billetes están en [el] los bolsos', 'Билеты в сумках', 'Сумок несколько — значит los.'),
    task(6, 7, 'El tren [están] está en la estación', 'Поезд на станции', 'Поезд один — значит está.'),
    task(6, 8, 'Las tiendas están [en] cerca', 'Магазины рядом', 'Cerca обходится без en.'),
  ],
  7: [
    task(7, 1, 'Hay una [un] llave en el bolso', 'В сумке есть ключ', 'Llave — «она», поэтому una.'),
    task(7, 2, 'Hay un [una] mapa en la mochila', 'В рюкзаке есть карта', 'Mapa — «он», поэтому un.'),
    task(7, 3, 'Hay dos [un] billetes en el bolsillo', 'В кармане два билета', 'Билетов два — un тут не нужен.'),
    task(7, 4, 'Hay dos [una] salidas en la estación', 'На вокзале два выхода', 'Выходов два — una тут не нужна.'),
    task(7, 5, 'Hay [un] gente dentro', 'Внутри есть люди', 'Gente не считают штуками — un не нужен.'),
    task(7, 6, 'No [está] hay azúcar en la oficina', 'В офисе нет сахара', '«Нет чего-то» — это no hay, без está.'),
    task(7, 7, 'En el coche hay una [un] maleta', 'В машине есть чемодан', 'Maleta — «она», поэтому una.'),
    task(7, 8, 'Hay gente [en] fuera', 'Снаружи есть люди', 'Fuera обходится без en.'),
  ],
  8: [
    task(8, 1, 'Mi [mis] libro está aquí', 'Моя книга здесь', 'Книга одна — значит mi.'),
    task(8, 2, 'Mis [mi] llaves están aquí', 'Мои ключи здесь', 'Ключей несколько — значит mis.'),
    task(8, 3, 'Tus [tu] maletas están en el coche', 'Твои чемоданы в машине', 'Чемоданов несколько — значит tus.'),
    task(8, 4, 'Su [sus] pasaporte está en el bolso', 'Его паспорт в сумке', 'Паспорт один — значит su.'),
    task(8, 5, 'Mi gente [están] está aquí', 'Мои люди здесь', 'С gente говорят está, хотя людей много.'),
    task(8, 6, 'Mi madre es [está] profesora', 'Моя мама — учительница', 'Про профессию говорят es. Está — про место.'),
    task(8, 7, 'Mis hermanos [está] están aquí', 'Мои братья здесь', 'Братьев несколько — значит están.'),
    task(8, 8, '¿Dónde [está] están mis llaves?', 'Где мои ключи?', 'Ключей несколько — значит están.'),
  ],
};
