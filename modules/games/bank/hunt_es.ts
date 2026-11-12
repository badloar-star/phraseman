/**
 * Банк игры «Охота на ошибку» — испанский классический курс, уроки 1–20 (D207). 2 мини-диалога на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: три реплики из фраз урока (или из слов этого и прошлых уроков); ровно одно слово
 * неверное — `{неверно>верно}`; в другой реплике одно слово-обманка — `*слово`: оно нажимается, но верное.
 * Ошибка всегда видна внутри своей реплики (подлежащее названо, и это не имя).
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { HuntTask } from '../dialogue_core';
import { huntTask } from './make_es_it';

const task = (lesson: number, n: number, lines: readonly string[], why: string): HuntTask => huntTask('es', lesson, n, lines, why);

export const HUNT_BANK_ES: Readonly<Record<number, readonly HuntTask[]>> = {
  1: [
    task(1, 1, ['*Estoy en la estación.', 'Ellos {está>están} allí.', 'El coche está fuera.'], 'Их несколько — значит están.'),
    task(1, 2, ['Las llaves *están en la mesa.', 'El móvil está en {la>el} coche.', 'Estamos en casa.'], 'Coche — «он», поэтому el coche.'),
  ],
  2: [
    task(2, 1, ['No estoy en casa.', 'Ella no {están>está} en la farmacia.', 'Luis no *está en clase.'], 'Она одна — значит está.'),
    task(2, 2, ['Las llaves no *están en la mesa.', 'El móvil no está en {la>el} bolsillo.', 'No estamos lejos.'], 'Bolsillo — «он», поэтому el bolsillo.'),
  ],
  3: [
    task(3, 1, ['¿Está *la llave en casa?', 'La llave no está en casa.', '¿Está el móvil en {la>el} bolso?'], 'Bolso — «он», поэтому el bolso.'),
    task(3, 2, ['¿Están las llaves en la mochila?', 'Las llaves no *están en la mochila.', '¿Los pasaportes {está>están} en el coche?'], 'Паспортов несколько — значит están.'),
  ],
  4: [
    task(4, 1, ['Ella *es Ana.', 'Ana es profesora.', 'Ellas {es>son} médicas.'], 'Их несколько — значит son.'),
    task(4, 2, ['Él es Luis.', 'Él {está>es} médico.', 'Ana es *enfermera.'], 'Про профессию говорят es. Está — про место.'),
  ],
  5: [
    task(5, 1, ['¿Dónde *está el baño?', 'El baño está allí.', '¿Dónde {está>están} los pasaportes?'], 'Паспортов несколько — значит están.'),
    task(5, 2, ['¿Quién es ella?', 'Ella es *la profesora.', '¿Dónde {es>está} la profesora?'], 'Про место спрашивают с está.'),
  ],
  6: [
    task(6, 1, ['¿Dónde están las maletas?', 'Las maletas {está>están} en el coche.', 'El mapa *está en la mochila.'], 'Чемоданов несколько — значит están.'),
    task(6, 2, ['*La foto está en la mesa.', '{La>El} mapa está en el bolsillo.', 'Los billetes están en los bolsos.'], 'Говорят el mapa, хотя слово кончается на -a.'),
  ],
  7: [
    task(7, 1, ['¿Hay *una tienda cerca?', 'En la estación hay {un>una} tienda.', 'No hay trenes hoy.'], 'Tienda — «она», поэтому una.'),
    task(7, 2, ['¿Hay café en la cocina?', 'En casa no *hay café.', 'No {está>hay} azúcar en la oficina.'], '«Нет чего-то» — это no hay.'),
  ],
  8: [
    task(8, 1, ['¿Dónde están *mis llaves?', 'Tus llaves están en la mesa.', '{Mis>Mi} pasaporte está en casa.'], 'Паспорт один — значит mi.'),
    task(8, 2, ['¿Está *tu hermana en casa?', 'Mi hermana {están>está} en clase.', 'Mi hermano está en casa.'], 'Сестра одна — значит está.'),
  ],
  9: [
    task(9, 1, ['¿Trabajas hoy?', 'Hoy no *trabajo.', 'Mi madre {trabajo>trabaja} hoy.'], 'Про маму говорят trabaja. Trabajo — про себя.'),
    task(9, 2, ['¿Hablas inglés?', 'No *hablo inglés.', 'Mis hermanos {habla>hablan} inglés.'], 'Братьев несколько — значит hablan.'),
  ],
  10: [
    task(10, 1, ['¿Lees el libro?', 'No *leo el libro.', 'Mis hermanos {lee>leen} el libro.'], 'Братьев несколько — значит leen.'),
    task(10, 2, ['*Bebo café con leche.', 'Ella no {bebo>bebe} café.', '¿Bebes agua?'], 'Про неё говорят bebe. Bebo — про себя.'),
  ],
  11: [
    task(11, 1, ['¿Tienes un minuto?', 'No *tengo tiempo.', 'Mi hermana {tengo>tiene} una cita.'], 'Про сестру говорят tiene. Tengo — про себя.'),
    task(11, 2, ['¿Tenemos una reserva?', 'Tenemos {un>una} reserva.', 'Ana *tiene mi número.'], 'Reserva — «она», поэтому una.'),
  ],
  12: [
    task(12, 1, ['¿Son grandes las mesas?', 'Las mesas son {pequeños>pequeñas}.', 'La cocina *es grande.'], 'Mesa — «она», поэтому pequeñas.'),
    task(12, 2, ['*Busco una mochila roja.', 'Mi mochila es {rojo>roja}.', '¿Es nueva?'], 'Mochila — «она», поэтому roja.'),
  ],
  13: [
    task(13, 1, ['¿Está abierta la tienda?', 'La tienda está {cerrados>cerrada}.', 'La farmacia *está abierta.'], 'Магазин один, а tienda — «она», поэтому cerrada.'),
    task(13, 2, ['¿Estáis listos?', 'Mis hermanos {está>están} listos.', '*Estoy listo.'], 'Братьев несколько — значит están.'),
  ],
  14: [
    task(14, 1, ['¿Te levantas temprano?', '*Me levanto a las siete.', 'Mis hermanos se {levanta>levantan} temprano.'], 'Братьев несколько — значит levantan.'),
    task(14, 2, ['¿Te duchas en casa?', '*Me ducho en casa.', 'Ana se {ducho>ducha} por la mañana.'], 'Про Ану говорят ducha. Ducho — про себя.'),
  ],
  15: [
    task(15, 1, ['¿Puedes esperar fuera?', '*Puedo esperar fuera.', 'Mis hermanos {puede>pueden} esperar aquí.'], 'Братьев несколько — значит pueden.'),
    task(15, 2, ['¿Puedo pagar aquí?', 'Puedes pagar {en>con} tarjeta.', 'Ana *puede pagar en efectivo.'], 'Картой — con tarjeta.'),
  ],
  16: [
    task(16, 1, ['¿Vas a llamar al hotel?', '*Voy a llamar a Ana.', 'Mis hermanos {va>van} a llamar al hotel.'], 'Братьев несколько — значит van.'),
    task(16, 2, ['¿Vas a comer en casa?', '*Voy a comer en casa.', 'Ella no {voy>va} a comer en casa.'], 'Про неё говорят va. Voy — про себя.'),
  ],
  17: [
    task(17, 1, ['¿Te gusta el hotel?', 'Me {gustan>gusta} el hotel.', 'A Ana le *gusta la playa.'], 'Отель один — значит gusta.'),
    task(17, 2, ['¿Te gustan mis fotos?', '*Me gustan tus fotos.', 'A mis hermanos {le>les} gustan tus fotos.'], 'Братьев несколько — значит les.'),
  ],
  18: [
    task(18, 1, ['¿Dónde está el pasaporte?', 'Ella lo {tengo>tiene} en el bolso.', '*Lo necesito hoy.'], 'Про неё говорят tiene. Tengo — про себя.'),
    task(18, 2, ['¿Llevas las fotos a casa?', '*Las llevo a casa.', 'Él las {llevo>lleva} a clase.'], 'Про него говорят lleva. Llevo — про себя.'),
  ],
  19: [
    task(19, 1, ['¿Estás trabajando en casa?', '*Estoy trabajando en el hotel.', 'Mis hermanos {está>están} trabajando en casa.'], 'Братьев несколько — значит están.'),
    task(19, 2, ['¿Estás leyendo el libro?', 'Estoy {lee>leyendo} el mensaje.', 'Ana *está leyendo el libro.'], 'После estoy — leyendo.'),
  ],
  20: [
    task(20, 1, ['¿Has llamado a Ana?', '*He llamado a Ana hoy.', 'Mis hermanos {ha>han} llamado al hotel.'], 'Братьев несколько — значит han.'),
    task(20, 2, ['¿Has leído el libro?', 'Ya lo he {leer>leído}.', '¿Luis *ha leído el mensaje?'], 'После he — leído.'),
  ],
};
