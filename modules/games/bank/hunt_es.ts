/**
 * Банк игры «Охота на ошибку» — испанский классический курс, уроки 1–8 (D207). 2 мини-диалога на урок.
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
};
