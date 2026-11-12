/**
 * Банк игры «На слух» — испанский классический курс, уроки 1–12 (D207). 6 заданий на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: произносится фраза урока; верный вариант дословно равен ей; два неверных отличаются
 * ровно одним словом и остаются правильными фразами из знакомых слов — это проверка слуха, а не грамматики.
 * Пояснение — перевод прозвучавшей фразы.
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { QuizRound } from '../quiz_core';
import { listenRound } from './make_es_it';

const round = (lesson: number, n: number, text: string, wrong: readonly string[], at: number, note: string): QuizRound =>
  listenRound('es', lesson, n, text, wrong, at, note);

export const LISTEN_BANK_ES: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    round(1, 1, 'Estoy en casa', ['Estás en casa', 'Estoy en clase'], 0, 'Я дома'),
    round(1, 2, 'Ella está cerca', ['Él está cerca', 'Ella está lejos'], 1, 'Она рядом'),
    round(1, 3, 'Las llaves están aquí', ['Las llaves están allí', 'Las llaves están dentro'], 2, 'Ключи здесь'),
    round(1, 4, 'El coche está fuera', ['El coche está cerca', 'El móvil está fuera'], 0, 'Машина снаружи'),
    round(1, 5, 'Estamos en la estación', ['Estamos en la cocina', 'Estáis en la estación'], 1, 'Мы на станции'),
    round(1, 6, 'Luis está lejos', ['Luis está dentro', 'Ana está lejos'], 2, 'Луис далеко'),
  ],
  2: [
    round(2, 1, 'No estoy en casa', ['No estás en casa', 'No estoy en clase'], 1, 'Я не дома'),
    round(2, 2, 'Ana no está aquí', ['Ana no está allí', 'Luis no está aquí'], 0, 'Аны здесь нет'),
    round(2, 3, 'La tienda no está cerca', ['La tienda no está lejos', 'La estación no está cerca'], 2, 'Магазин не рядом'),
    round(2, 4, 'El móvil no está en el bolso', ['El móvil no está en el bolsillo', 'El móvil no está en el coche'], 0, 'Телефон не в сумке'),
    round(2, 5, 'No estamos en la oficina', ['No estamos en la cocina', 'No estáis en la oficina'], 1, 'Мы не в офисе'),
    round(2, 6, 'Las llaves no están en la mesa', ['Las llaves no están en la mochila', 'Las llaves no están en la tienda'], 2, 'Ключи не на столе'),
  ],
  3: [
    round(3, 1, '¿Estás en casa?', ['¿Estáis en casa?', '¿Estás en clase?'], 0, 'Ты дома?'),
    round(3, 2, '¿Está Ana en casa?', ['¿Está Luis en casa?', '¿Está Ana en clase?'], 2, 'Ана дома?'),
    round(3, 3, '¿La parada está cerca?', ['¿La parada está lejos?', '¿La salida está cerca?'], 1, 'Остановка рядом?'),
    round(3, 4, '¿Está el pasaporte en el bolso?', ['¿Está el pasaporte en el bolsillo?', '¿Está el billete en el bolso?'], 0, 'Паспорт в сумке?'),
    round(3, 5, '¿Estamos en la estación?', ['¿Estamos en la parada?', '¿Estás en la estación?'], 2, 'Мы на станции?'),
    round(3, 6, '¿El hotel está aquí?', ['¿El hotel está allí?', '¿El hotel está cerca?'], 1, 'Отель здесь?'),
  ],
  4: [
    round(4, 1, 'Soy médico', ['Soy médica', 'Eres médico'], 1, 'Я врач'),
    round(4, 2, 'Ana es profesora', ['Ana es enfermera', 'Ana es médica'], 0, 'Ана — преподавательница'),
    round(4, 3, 'Somos estudiantes', ['Son estudiantes', 'Sois estudiantes'], 2, 'Мы студенты'),
    round(4, 4, 'Ellos son profesores', ['Ellos son médicos', 'Ellos son estudiantes'], 0, 'Они преподаватели'),
    round(4, 5, 'Luis es enfermero', ['Luis es médico', 'Luis es profesor'], 1, 'Луис — медбрат'),
    round(4, 6, 'Soy la guía', ['Soy el guía', 'Eres la guía'], 2, 'Я и есть гид'),
  ],
  5: [
    round(5, 1, '¿Dónde está el baño?', ['¿Dónde está el banco?', '¿Dónde está el ascensor?'], 0, 'Где туалет?'),
    round(5, 2, '¿Quién está en la puerta?', ['¿Quién está en la cocina?', '¿Quién está en la oficina?'], 2, 'Кто у двери?'),
    round(5, 3, '¿Quién es él?', ['¿Quién es ella?', '¿Quién es usted?'], 1, 'Кто он?'),
    round(5, 4, '¿Dónde estamos?', ['¿Dónde estáis?', '¿Dónde estás?'], 0, 'Где мы?'),
    round(5, 5, '¿Cuánto cuesta el billete?', ['¿Cuánto cuesta el libro?', '¿Cuánto cuesta el móvil?'], 2, 'Сколько стоит билет?'),
    round(5, 6, '¿Dónde está la enfermera?', ['¿Dónde está la profesora?', '¿Dónde está la recepción?'], 1, 'Где медсестра?'),
  ],
  6: [
    round(6, 1, 'El pasaporte está aquí', ['El pasaporte está allí', 'El billete está aquí'], 1, 'Паспорт здесь'),
    round(6, 2, 'La maleta está fuera', ['La maleta está dentro', 'La maleta está cerca'], 0, 'Чемодан снаружи'),
    round(6, 3, 'El mapa está en la mesa', ['El mapa está en la maleta', 'El mapa está en la mochila'], 2, 'Карта на столе'),
    round(6, 4, 'Los estudiantes están en la estación', ['Las estudiantes están en la estación', 'Los estudiantes están en la oficina'], 0, 'Студенты на станции'),
    round(6, 5, 'Las botellas están allí', ['Las maletas están allí', 'Las botellas están aquí'], 1, 'Бутылки вон там'),
    round(6, 6, 'El abrigo está en la mesa', ['El abrigo está en la maleta', 'El mapa está en la mesa'], 2, 'Пальто на столе'),
  ],
  7: [
    round(7, 1, 'Hay un libro aquí', ['Hay un mapa aquí', 'Hay un móvil aquí'], 0, 'Здесь есть книга'),
    round(7, 2, 'Hay dos llaves en la mesa', ['Hay dos llaves en la mochila', 'Hay dos libros en la mesa'], 1, 'На столе два ключа'),
    round(7, 3, 'No hay agua', ['No hay azúcar', 'No hay café'], 2, 'Воды нет'),
    round(7, 4, 'Hay leche en la cocina', ['Hay café en la cocina', 'Hay gente en la cocina'], 0, 'На кухне есть молоко'),
    round(7, 5, '¿Hay una tienda cerca?', ['¿Hay una salida cerca?', '¿Hay una farmacia cerca?'], 1, 'Поблизости есть магазин?'),
    round(7, 6, 'Hay gente dentro', ['Hay gente fuera', 'Hay agua dentro'], 2, 'Внутри есть люди'),
  ],
  8: [
    round(8, 1, 'Mi libro está aquí', ['Tu libro está aquí', 'Su libro está aquí'], 1, 'Моя книга здесь'),
    round(8, 2, 'Mis llaves están aquí', ['Tus llaves están aquí', 'Mis llaves están allí'], 0, 'Мои ключи здесь'),
    round(8, 3, 'Tu reloj está en el bolso', ['Tu reloj está en el bolsillo', 'Su reloj está en el bolso'], 2, 'Твои часы в сумке'),
    round(8, 4, 'Mi hermana está en casa', ['Mi hermano está en casa', 'Tu hermana está en casa'], 0, 'Моя сестра дома'),
    round(8, 5, 'Su madre está en la tienda', ['Su madre está en la farmacia', 'Tu madre está en la tienda'], 1, 'Его мама в магазине'),
    round(8, 6, '¿Dónde está mi pasaporte?', ['¿Dónde está tu pasaporte?', '¿Dónde está mi cargador?'], 2, 'Где мой паспорт?'),
  ],
  9: [
    round(9, 1, 'Trabajo en casa', ['Trabajas en casa', 'Estudio en casa'], 0, 'Я работаю дома'),
    round(9, 2, 'Hablas español', ['Hablo español', 'Hablas inglés'], 1, 'Ты говоришь по-испански'),
    round(9, 3, 'Mi hermano estudia español', ['Mi hermana estudia español', 'Mi hermano habla español'], 2, 'Мой брат учит испанский'),
    round(9, 4, 'Buscamos la salida', ['Buscamos la parada', 'Buscáis la salida'], 0, 'Мы ищем выход'),
    round(9, 5, 'Trabajamos aquí', ['Trabajáis aquí', 'Estudiamos aquí'], 1, 'Мы работаем здесь'),
    round(9, 6, 'Ana busca su pasaporte', ['Ana busca su billete', 'Luis busca su pasaporte'], 2, 'Ана ищет свой паспорт'),
  ],
  10: [
    round(10, 1, 'Vivo aquí', ['Vives aquí', 'Vivimos aquí'], 0, 'Я живу здесь'),
    round(10, 2, 'Luis bebe café', ['Luis bebe agua', 'Ana bebe café'], 1, 'Луис пьёт кофе'),
    round(10, 3, 'Leo el mensaje', ['Leo el libro', 'Leemos el mensaje'], 2, 'Я читаю сообщение'),
    round(10, 4, 'Abrimos la puerta', ['Abrimos la ventana', 'Abren la puerta'], 0, 'Мы открываем дверь'),
    round(10, 5, 'Ana come en casa', ['Ana come en clase', 'Luis come en casa'], 1, 'Ана ест дома'),
    round(10, 6, 'Escribes una carta', ['Escribís una carta', 'Escribe una carta'], 2, 'Ты пишешь письмо'),
  ],
  11: [
    round(11, 1, 'Tengo una pregunta', ['Tienes una pregunta', 'Tengo una reserva'], 0, 'У меня есть вопрос'),
    round(11, 2, 'No tengo tiempo', ['No tengo cambio', 'No tienes tiempo'], 1, 'У меня нет времени'),
    round(11, 3, 'Tenemos dos billetes', ['Tenemos dos pasaportes', 'Tenéis dos billetes'], 2, 'У нас есть два билета'),
    round(11, 4, 'Ana tiene una cita', ['Luis tiene una cita', 'Ana tiene una pregunta'], 0, 'У Аны назначена встреча'),
    round(11, 5, 'Tengo las llaves de casa', ['Tienes las llaves de casa', 'Tenemos las llaves de casa'], 1, 'У меня ключи от дома'),
    round(11, 6, 'No tengo las llaves', ['No tengo las fotos', 'No tienes las llaves'], 2, 'У меня нет ключей'),
  ],
  12: [
    round(12, 1, 'El libro es nuevo', ['El bolso es nuevo', 'El libro es grande'], 0, 'Книга новая'),
    round(12, 2, 'Las maletas son pequeñas', ['Las mochilas son pequeñas', 'Las maletas son grandes'], 1, 'Чемоданы маленькие'),
    round(12, 3, 'Mi coche es rojo', ['Mi coche es negro', 'Tu coche es rojo'], 2, 'Моя машина красная'),
    round(12, 4, 'La casa es grande', ['La cocina es grande', 'La casa es nueva'], 0, 'Дом большой'),
    round(12, 5, 'Busco un libro nuevo', ['Busco un libro rojo', 'Tengo un libro nuevo'], 1, 'Я ищу новую книгу'),
    round(12, 6, 'Tengo una mesa blanca', ['Tengo una mesa negra', 'Tengo una mesa grande'], 2, 'У меня белый стол'),
  ],
};
