/**
 * Банк игры «Память» — испанский классический курс, уроки 1–20 (D207). 2 раунда на урок, в каждом 4 пары.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: слева слово или выражение урока, справа его перевод; спрашивается одна пара,
 * неверные варианты — переводы двух других пар того же набора (так проверяется память, а не догадка).
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { QuizRound } from '../quiz_core';
import { memoryRound, type MemoryPair } from './make_es_it';

const round = (lesson: number, n: number, pairs: readonly MemoryPair[], askIndex: number, wrongPairs: readonly [number, number], at: number): QuizRound =>
  memoryRound('es', lesson, n, pairs, askIndex, wrongPairs, at);

export const MEMORY_BANK_ES: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    round(1, 1, [['aquí', 'здесь'], ['allí', 'вон там'], ['cerca', 'рядом'], ['lejos', 'далеко']], 2, [3, 0], 1),
    round(1, 2, [['la llave', 'ключ'], ['el móvil', 'телефон'], ['la mochila', 'рюкзак'], ['el coche', 'машина']], 1, [0, 2], 0),
  ],
  2: [
    round(2, 1, [['el bolso', 'сумка'], ['el bolsillo', 'карман'], ['la tienda', 'магазин'], ['la oficina', 'офис']], 1, [0, 2], 2),
    round(2, 2, [['la farmacia', 'аптека'], ['en clase', 'на занятии'], ['en casa', 'дома'], ['en el coche', 'в машине']], 0, [3, 1], 1),
  ],
  3: [
    round(3, 1, [['la parada', 'остановка'], ['la salida', 'выход'], ['el hotel', 'отель'], ['el pasaporte', 'паспорт']], 1, [0, 2], 0),
    round(3, 2, [['el billete', 'билет'], ['la estación', 'станция'], ['la mochila', 'рюкзак'], ['el bolsillo', 'карман']], 0, [3, 2], 2),
  ],
  4: [
    round(4, 1, [['médico', 'врач'], ['profesor', 'преподаватель'], ['estudiante', 'студент'], ['guía', 'гид']], 3, [1, 2], 1),
    round(4, 2, [['enfermera', 'медсестра'], ['profesora', 'преподавательница'], ['enfermero', 'медбрат'], ['estudiantes', 'студенты']], 2, [0, 3], 0),
  ],
  5: [
    round(5, 1, [['¿Dónde?', 'Где?'], ['¿Quién?', 'Кто?'], ['¿Qué?', 'Что?'], ['¿Cuánto cuesta?', 'Сколько стоит?']], 1, [0, 2], 2),
    round(5, 2, [['el aeropuerto', 'аэропорт'], ['el baño', 'туалет'], ['el ascensor', 'лифт'], ['el banco', 'банк']], 2, [1, 3], 1),
  ],
  6: [
    round(6, 1, [['la maleta', 'чемодан'], ['el abrigo', 'пальто'], ['la botella', 'бутылка'], ['el mapa', 'карта']], 1, [0, 3], 0),
    round(6, 2, [['el tren', 'поезд'], ['la foto', 'фотография'], ['las tiendas', 'магазины'], ['los bolsos', 'сумки']], 3, [2, 0], 2),
  ],
  7: [
    round(7, 1, [['agua', 'вода'], ['leche', 'молоко'], ['café', 'кофе'], ['azúcar', 'сахар']], 3, [1, 0], 1),
    round(7, 2, [['hay', 'есть'], ['no hay', 'нет'], ['gente', 'люди'], ['hoy', 'сегодня']], 2, [3, 0], 0),
  ],
  8: [
    round(8, 1, [['mi hermana', 'моя сестра'], ['mi hermano', 'мой брат'], ['mi madre', 'моя мама'], ['mi gente', 'мои люди']], 2, [0, 3], 2),
    round(8, 2, [['el cargador', 'зарядка'], ['el reloj', 'часы'], ['la bicicleta', 'велосипед'], ['las hermanas', 'сёстры']], 0, [1, 2], 1),
  ],
  9: [
    round(9, 1, [['trabajo', 'я работаю'], ['estudio', 'я учусь'], ['hablo', 'я говорю'], ['busco', 'я ищу']], 1, [0, 3], 2),
    round(9, 2, [['español', 'испанский'], ['inglés', 'английский'], ['hoy', 'сегодня'], ['la salida', 'выход']], 1, [0, 2], 0),
  ],
  10: [
    round(10, 1, [['vivo', 'я живу'], ['como', 'я ем'], ['bebo', 'я пью'], ['leo', 'я читаю']], 2, [1, 3], 1),
    round(10, 2, [['la carta', 'письмо'], ['el mensaje', 'сообщение'], ['el periódico', 'газета'], ['la ventana', 'окно']], 2, [0, 1], 0),
  ],
  11: [
    round(11, 1, [['una pregunta', 'вопрос'], ['una cita', 'встреча'], ['una reserva', 'бронь'], ['una idea', 'идея']], 0, [1, 3], 2),
    round(11, 2, [['tiempo', 'время'], ['cambio', 'мелочь'], ['un minuto', 'минутка'], ['tu número', 'твой номер']], 1, [0, 2], 1),
  ],
  12: [
    round(12, 1, [['nueva', 'новая'], ['grande', 'большой'], ['pequeñas', 'маленькие'], ['roja', 'красная']], 1, [0, 3], 0),
    round(12, 2, [['negro', 'чёрный'], ['blanco', 'белый'], ['rojo', 'красный'], ['la camiseta', 'футболка']], 0, [1, 2], 2),
  ],
  13: [
    round(13, 1, [['cansado', 'уставший'], ['ocupado', 'занятой'], ['abierta', 'открытая'], ['cerrada', 'закрытая']], 0, [1, 2], 1),
    round(13, 2, [['libre', 'свободный'], ['contento', 'довольный'], ['frío', 'холодный'], ['limpia', 'чистая']], 2, [0, 3], 0),
  ],
  14: [
    round(14, 1, [['temprano', 'рано'], ['por la mañana', 'по утрам'], ['a las siete', 'в семь'], ['la cara', 'лицо']], 1, [0, 2], 2),
    round(14, 2, [['las manos', 'руки'], ['el viaje', 'поездка'], ['me ducho', 'я принимаю душ'], ['me siento', 'я сажусь']], 3, [1, 2], 0),
  ],
  15: [
    round(15, 1, [['entrar', 'войти'], ['esperar', 'подождать'], ['pagar', 'заплатить'], ['abrir', 'открыть']], 0, [2, 3], 2),
    round(15, 2, [['ahora', 'сейчас'], ['en efectivo', 'наличными'], ['con tarjeta', 'картой'], ['por favor', 'пожалуйста']], 1, [0, 3], 1),
  ],
  16: [
    round(16, 1, [['el pan', 'хлеб'], ['el arroz', 'рис'], ['las verduras', 'овощи'], ['la cena', 'ужин']], 2, [0, 1], 0),
    round(16, 2, [['más tarde', 'позже'], ['mañana', 'завтра'], ['porque', 'потому что'], ['el supermercado', 'супермаркет']], 0, [2, 3], 1),
  ],
  17: [
    round(17, 1, [['me gusta', 'мне нравится'], ['la música', 'музыка'], ['la playa', 'пляж'], ['la película', 'фильм']], 2, [0, 1], 0),
    round(17, 2, [['los zapatos', 'туфли'], ['la canción', 'песня'], ['pasear', 'гулять'], ['hablar', 'говорить']], 0, [2, 3], 1),
  ],
  18: [
    round(18, 1, [['necesito', 'мне нужно'], ['devuelvo', 'я возвращаю'], ['recojo', 'я забираю'], ['guardo', 'я кладу']], 1, [0, 3], 2),
    round(18, 2, [['dejo', 'я оставляю'], ['llevo', 'я несу'], ['escucho', 'я слушаю'], ['a mano', 'вручную']], 3, [1, 2], 0),
  ],
  19: [
    round(19, 1, [['una cebolla', 'луковица'], ['la sopa', 'суп'], ['los platos', 'тарелки'], ['el regalo', 'подарок']], 0, [2, 3], 1),
    round(19, 2, [['su reloj', 'его часы'], ['el plato', 'тарелка'], ['la puerta', 'дверь'], ['la bolsa', 'сумка']], 1, [0, 2], 2),
  ],
  20: [
    round(20, 1, [['ya', 'уже'], ['la semana', 'неделя'], ['el paquete', 'посылка'], ['la factura', 'счёт']], 0, [1, 3], 1),
    round(20, 2, [['el correo', 'электронное письмо'], ['los huevos', 'яйца'], ['el pedido', 'заказ'], ['esta mañana', 'сегодня утром']], 2, [0, 1], 0),
  ],
};
