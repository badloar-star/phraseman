/**
 * Банк игры «Собери диалог» — испанский классический курс, уроки 3–20 (D207). 2 диалога из 4 реплик на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: реплики — фразы урока или собраны из слов этого и прошлых уроков; порядок однозначен:
 * первый вопрос называет, о ком речь, ответ повторяет это слово, а третья реплика «¿Y …?» («А …?»)
 * не может стоять ни первой, ни после чужого ответа.
 * Уроков 1–2 здесь нет намеренно: в них ещё нет вопросов, а из одних утверждений порядок не однозначен.
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { OrderTask } from '../dialogue_core';
import { orderTask } from './make_es_it';

const task = (lesson: number, n: number, lines: readonly string[]): OrderTask => orderTask('es', lesson, n, lines);

export const ORDER_BANK_ES: Readonly<Record<number, readonly OrderTask[]>> = {
  3: [
    task(3, 1, ['¿Está Ana en casa?', 'Ana no está en casa.', '¿Y Luis?', 'Luis está en la cocina.']),
    task(3, 2, ['¿Están las llaves en la mochila?', 'Las llaves no están en la mochila.', '¿Y el pasaporte?', 'El pasaporte está en el bolso.']),
  ],
  4: [
    task(4, 1, ['¿Ana es médica?', 'Ana es enfermera.', '¿Y Luis?', 'Luis es médico.']),
    task(4, 2, ['¿Ellas son estudiantes?', 'Ellas son profesoras.', '¿Y ellos?', 'Ellos son guías.']),
  ],
  5: [
    task(5, 1, ['¿Dónde está el baño?', 'El baño está allí.', '¿Y el ascensor?', 'El ascensor está cerca.']),
    task(5, 2, ['¿Quién es ella?', 'Ella es Ana.', '¿Y él?', 'Él es el guía.']),
  ],
  6: [
    task(6, 1, ['¿Dónde están las maletas?', 'Las maletas están en el coche.', '¿Y los abrigos?', 'Los abrigos están dentro.']),
    task(6, 2, ['¿Dónde está el mapa?', 'El mapa está en la mochila.', '¿Y las fotos?', 'Las fotos están en la mesa.']),
  ],
  7: [
    task(7, 1, ['¿Hay café en la cocina?', 'No hay café.', '¿Y leche?', 'Hay leche en la cocina.']),
    task(7, 2, ['¿Hay una farmacia cerca?', 'Hay dos farmacias cerca.', '¿Y una tienda?', 'En la estación hay una tienda.']),
  ],
  8: [
    task(8, 1, ['¿Dónde está mi pasaporte?', 'Tu pasaporte está en mi bolso.', '¿Y mis llaves?', 'Tus llaves están en la mesa.']),
    task(8, 2, ['¿Dónde está tu hermana?', 'Mi hermana está en clase.', '¿Y tu madre?', 'Mi madre está en la farmacia.']),
  ],
  9: [
    task(9, 1, ['¿Dónde trabaja tu madre?', 'Mi madre trabaja en la farmacia.', '¿Y tu hermana?', 'Mi hermana trabaja en el hotel.']),
    task(9, 2, ['¿Hablas inglés?', 'No hablo inglés.', '¿Y español?', 'Hablo español.']),
  ],
  10: [
    task(10, 1, ['¿Lees el periódico en casa?', 'Leo el periódico en el tren.', '¿Y Luis?', 'Luis lee el libro.']),
    task(10, 2, ['¿Vives cerca de la estación?', 'Vivo cerca de la estación.', '¿Y tus hermanas?', 'Mis hermanas no viven cerca de la estación.']),
  ],
  11: [
    task(11, 1, ['¿Tienes una reserva?', 'No tengo reserva.', '¿Y Luis?', 'Luis tiene una reserva.']),
    task(11, 2, ['¿Tienes las llaves de casa?', 'No tengo las llaves.', '¿Y tu madre?', 'Mi madre tiene las llaves de casa.']),
  ],
  12: [
    task(12, 1, ['¿Son grandes las ventanas?', 'Las ventanas son pequeñas.', '¿Y la casa?', 'La casa es grande.']),
    task(12, 2, ['¿Son grandes los libros?', 'Los libros son pequeños.', '¿Y los coches?', 'Los coches son grandes.']),
  ],
  13: [
    task(13, 1, ['¿Está abierta la tienda?', 'La tienda está cerrada.', '¿Y la farmacia?', 'La farmacia está abierta.']),
    task(13, 2, ['¿Estás cansado?', 'Estoy cansado.', '¿Y tu hermana?', 'Mi hermana está ocupada.']),
  ],
  14: [
    task(14, 1, ['¿Te levantas temprano?', 'Me levanto a las siete.', '¿Y Ana?', 'Ana se levanta temprano.']),
    task(14, 2, ['¿Dónde te duchas?', 'Me ducho en casa.', '¿Y tus hermanos?', 'Mis hermanos se duchan en el hotel.']),
  ],
  15: [
    task(15, 1, ['¿Puedes esperar fuera?', 'Puedo esperar fuera.', '¿Y Luis?', 'Luis puede esperar aquí.']),
    task(15, 2, ['¿Puedes pagar con tarjeta?', 'No puedo pagar con tarjeta.', '¿Y en efectivo?', 'Puedo pagar en efectivo.']),
  ],
  16: [
    task(16, 1, ['¿Vas a llamar al hotel?', 'Voy a llamar a Ana.', '¿Y Luis?', 'Luis va a llamar al hotel.']),
    task(16, 2, ['¿Vas a comer en casa?', 'Voy a comer en casa.', '¿Y tus hermanos?', 'Mis hermanos van a comer en el hotel.']),
  ],
  17: [
    task(17, 1, ['¿Te gusta el hotel?', 'Me gusta el hotel.', '¿Y la playa?', 'No me gusta la playa.']),
    task(17, 2, ['¿Te gustan mis fotos?', 'Me gustan tus fotos.', '¿Y mis ideas?', 'Me gustan tus ideas.']),
  ],
  18: [
    task(18, 1, ['¿Tienes el pasaporte?', 'Lo tengo aquí.', '¿Y las llaves?', 'Las tengo en el bolso.']),
    task(18, 2, ['¿Necesitas la maleta hoy?', 'La necesito hoy.', '¿Y los billetes?', 'Los necesito mañana.']),
  ],
  19: [
    task(19, 1, ['¿Estás trabajando en casa?', 'Estoy trabajando en el hotel.', '¿Y Ana?', 'Ana está trabajando en casa.']),
    task(19, 2, ['¿Estás preparando la cena?', 'Estoy preparando una sopa.', '¿Y Luis?', 'Luis está secando los platos.']),
  ],
  20: [
    task(20, 1, ['¿Has llamado al hotel?', 'Ya he llamado al hotel.', '¿Y a Ana?', 'No he llamado a Ana.']),
    task(20, 2, ['¿Has pagado la factura?', 'Ya he pagado la factura.', '¿Y el pedido?', 'No he recibido el pedido.']),
  ],
};
