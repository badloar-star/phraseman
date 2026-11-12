/**
 * Банк игры «Точное слово» — испанский классический курс, уроки 1–20 (D207). 6 заданий на урок.
 * зачем: владелец 11.11.2026 — «оно должно работать на всех языках», «без багов».
 * Правила вычитки: фраза с верным вариантом — фраза урока (или из слов этого и прошлых уроков);
 * каждый неверный вариант даёт грамматически неверную фразу (правило владельца о неверных вариантах);
 * варианты — только слова, которые ученик уже встречал. Там, где проверяется форма está/están/es/son,
 * подлежащее названо явно и это не имя. Верный вариант записан первым, место на экране — четвёртый аргумент.
 * Проверка: tests/game_task_bank_es_it.test.ts.
 */
import type { QuizRound } from '../quiz_core';
import { gapRound } from './make_es_it';

const round = (lesson: number, n: number, gapped: string, correct: string, wrong: readonly string[], at: number, note: string): QuizRound =>
  gapRound('es', lesson, n, gapped, correct, wrong, at, note);

export const EXACT_BANK_ES: Readonly<Record<number, readonly QuizRound[]>> = {
  1: [
    round(1, 1, 'Ella ___ en casa', 'está', ['estoy', 'están'], 0, 'Она одна — значит está.'),
    round(1, 2, 'Las llaves ___ aquí', 'están', ['está'], 1, 'Ключей несколько — значит están.'),
    round(1, 3, 'Estamos en ___ estación', 'la', ['el'], 0, 'Estación — «она», поэтому la.'),
    round(1, 4, '___ móvil está aquí', 'El', ['La', 'Los'], 2, 'Móvil — «он», и он один: el.'),
    round(1, 5, 'Ellos ___ allí', 'están', ['está', 'estoy'], 1, 'Их несколько — значит están.'),
    round(1, 6, 'El coche está ___', 'fuera', ['en fuera'], 0, 'Fuera обходится без en.'),
  ],
  2: [
    round(2, 1, 'Luis ___ en clase', 'no está', ['está no'], 1, 'No ставят перед está.'),
    round(2, 2, 'Las llaves no ___ en la mesa', 'están', ['está'], 0, 'Ключей несколько — значит están.'),
    round(2, 3, 'El móvil no está en ___ bolsillo', 'el', ['la'], 1, 'Bolsillo — «он», поэтому el.'),
    round(2, 4, 'La tienda no está ___', 'cerca', ['en cerca'], 0, 'Cerca обходится без en.'),
    round(2, 5, '___ bolso no está en casa', 'El', ['La'], 0, 'Bolso — «он», поэтому el.'),
    round(2, 6, 'Ellos no ___ en casa', 'están', ['está', 'estoy'], 2, 'Их несколько — значит están.'),
  ],
  3: [
    round(3, 1, '¿El bolso ___ en el coche?', 'está', ['están'], 0, 'Сумка одна — значит está.'),
    round(3, 2, '¿Los pasaportes ___ en la mochila?', 'están', ['está'], 1, 'Паспортов несколько — значит están.'),
    round(3, 3, '¿Está el móvil en ___ bolso?', 'el', ['la'], 1, 'Bolso — «он», поэтому el.'),
    round(3, 4, '¿Está ___ llave en casa?', 'la', ['el'], 0, 'Llave — «она», поэтому la.'),
    round(3, 5, '¿Están ___ billetes en el bolso?', 'los', ['las', 'el'], 1, 'Billetes — «они», и их несколько: los.'),
    round(3, 6, '¿La estación está ___?', 'lejos', ['en lejos'], 0, 'Lejos обходится без en.'),
  ],
  4: [
    round(4, 1, 'Ana ___ médica', 'es', ['está', 'son'], 0, 'Про профессию говорят es.'),
    round(4, 2, 'Luis es ___', 'profesor', ['profesora'], 1, 'Луис — мужчина, поэтому profesor.'),
    round(4, 3, 'Ana es ___', 'enfermera', ['enfermero'], 0, 'Ана — женщина, поэтому enfermera.'),
    round(4, 4, 'Ellos ___ profesores', 'son', ['es'], 1, 'Их несколько — значит son.'),
    round(4, 5, 'Usted ___ médica', 'es', ['eres', 'soy'], 2, 'С usted говорят es.'),
    round(4, 6, 'Ana y Luis son ___', 'guías', ['guía'], 0, 'Их двое — значит guías.'),
  ],
  5: [
    round(5, 1, '¿Dónde ___ las llaves?', 'están', ['está'], 1, 'Ключей несколько — значит están.'),
    round(5, 2, '¿Quién ___ el guía?', 'es', ['está', 'son'], 0, '«Кто он такой» — это es.'),
    round(5, 3, '¿Quiénes ___ ellos?', 'son', ['es'], 1, 'Их несколько — значит son.'),
    round(5, 4, '¿Qué libro ___ en la mesa?', 'está', ['están'], 0, 'Книга одна — значит está.'),
    round(5, 5, '¿Dónde está ___ recepción?', 'la', ['el'], 1, 'Recepción — «она», поэтому la.'),
    round(5, 6, '¿Quién está en ___ ascensor?', 'el', ['la'], 0, 'Ascensor — «он», поэтому el.'),
  ],
  6: [
    round(6, 1, '___ mapa está en la mesa', 'El', ['La'], 1, 'Говорят el mapa, хотя слово кончается на -a.'),
    round(6, 2, '___ foto está en la mochila', 'La', ['El'], 0, 'Говорят la foto, хотя слово кончается на -o.'),
    round(6, 3, 'Los trenes ___ en la estación', 'están', ['está'], 1, 'Поездов несколько — значит están.'),
    round(6, 4, 'Las fotos están en ___ mochilas', 'las', ['la', 'los'], 2, 'Mochilas — «они», и их несколько: las.'),
    round(6, 5, '___ abrigos están dentro', 'Los', ['El', 'Las'], 0, 'Abrigos — «они», и их несколько: los.'),
    round(6, 6, 'La maleta ___ en el coche', 'está', ['están'], 0, 'Чемодан один — значит está.'),
  ],
  7: [
    round(7, 1, 'Hay ___ llave aquí', 'una', ['un'], 1, 'Llave — «она», поэтому una.'),
    round(7, 2, 'Hay ___ mapa aquí', 'un', ['una'], 0, 'Mapa — «он», поэтому un.'),
    round(7, 3, 'Hay dos ___ en la mesa', 'libros', ['libro'], 1, 'Dos — это два, значит libros.'),
    round(7, 4, 'Hay gente ___', 'dentro', ['en dentro'], 0, 'Dentro обходится без en.'),
    round(7, 5, 'Hay ___ farmacias cerca', 'dos', ['una', 'un'], 2, 'Farmacias — их несколько, значит dos.'),
    round(7, 6, '¿Hay ___ salida aquí?', 'una', ['un', 'dos'], 0, 'Salida — «она», и она одна: una.'),
  ],
  8: [
    round(8, 1, '___ llaves están aquí', 'Mis', ['Mi'], 1, 'Ключей несколько — значит mis.'),
    round(8, 2, '___ libro está aquí', 'Tu', ['Tus'], 0, 'Книга одна — значит tu.'),
    round(8, 3, 'Su hermano ___ médico', 'es', ['está', 'son'], 1, 'Про профессию говорят es.'),
    round(8, 4, 'Sus pasaportes ___ en el bolso', 'están', ['está'], 0, 'Паспортов несколько — значит están.'),
    round(8, 5, 'Tus fotos están en ___ móvil', 'mi', ['mis'], 1, 'Телефон один — значит mi.'),
    round(8, 6, '¿Dónde están ___ maletas?', 'sus', ['su'], 0, 'Чемоданов несколько — значит sus.'),
  ],
  9: [
    round(9, 1, 'Él ___ español', 'habla', ['hablo', 'hablas'], 0, 'Про него говорят habla.'),
    round(9, 2, 'Mis hermanos ___ aquí', 'trabajan', ['trabaja'], 1, 'Братьев несколько — значит trabajan.'),
    round(9, 3, 'Busco ___ llaves', 'mis', ['mi'], 0, 'Ключей несколько — значит mis.'),
    round(9, 4, 'Trabajo ___', 'hoy', ['en hoy'], 1, 'Hoy обходится без en.'),
    round(9, 5, 'Los estudiantes ___ español', 'hablan', ['habla'], 0, 'Студентов несколько — значит hablan.'),
    round(9, 6, '¿Dónde ___ tu madre?', 'trabaja', ['trabajas', 'trabajo'], 2, 'Про маму говорят trabaja.'),
  ],
  10: [
    round(10, 1, 'Él ___ café', 'bebe', ['bebo', 'bebes'], 1, 'Про него говорят bebe.'),
    round(10, 2, 'Mis hermanos ___ agua', 'beben', ['bebe'], 0, 'Братьев несколько — значит beben.'),
    round(10, 3, 'Leemos ___ mensaje', 'el', ['la'], 1, 'Mensaje — «он», поэтому el.'),
    round(10, 4, 'Abrimos ___ puerta', 'la', ['el'], 0, 'Puerta — «она», поэтому la.'),
    round(10, 5, 'Vivo ___ de la estación', 'cerca', ['en cerca'], 0, 'Cerca обходится без en.'),
    round(10, 6, 'Ella ___ un mensaje', 'escribe', ['escribo', 'escribes'], 2, 'Про неё говорят escribe.'),
  ],
  11: [
    round(11, 1, 'Él ___ una pregunta', 'tiene', ['tengo', 'tienes'], 2, 'Про него говорят tiene.'),
    round(11, 2, 'Mis hermanas ___ las llaves de casa', 'tienen', ['tiene'], 0, 'Сестёр несколько — значит tienen.'),
    round(11, 3, '¿Tienes ___ minuto?', 'un', ['una'], 1, 'Minuto — «он», поэтому un.'),
    round(11, 4, 'No tengo ___ llaves', 'las', ['la'], 0, 'Ключей несколько — значит las.'),
    round(11, 5, 'Tenemos ___ reserva', 'una', ['un'], 1, 'Reserva — «она», поэтому una.'),
    round(11, 6, 'Ella ___ una cita', 'tiene', ['tienes', 'tengo'], 0, 'Про неё говорят tiene.'),
  ],
  12: [
    round(12, 1, 'La tienda es ___', 'nueva', ['nuevo'], 0, 'Tienda — «она», поэтому nueva.'),
    round(12, 2, 'Los coches son ___', 'pequeños', ['pequeñas'], 1, 'Coche — «он», поэтому pequeños.'),
    round(12, 3, 'Mi mochila es ___', 'roja', ['rojo'], 1, 'Mochila — «она», поэтому roja.'),
    round(12, 4, 'Las camisetas son ___', 'blancas', ['blanca'], 0, 'Футболок несколько — значит blancas.'),
    round(12, 5, 'El hotel ___ grande', 'es', ['son'], 0, 'Отель один — значит es.'),
    round(12, 6, 'Busco una bufanda ___', 'negra', ['negro'], 1, 'Bufanda — «она», поэтому negra.'),
  ],
  13: [
    round(13, 1, 'La tienda está ___', 'abierta', ['abiertos'], 0, 'Tienda — одна и «она», поэтому abierta.'),
    round(13, 2, 'Mis hermanos ___ cansados', 'están', ['está', 'estamos'], 1, 'Братьев несколько — значит están.'),
    round(13, 3, 'Hoy estoy ___', 'ocupado', ['ocupados'], 1, 'Про себя одного — ocupado.'),
    round(13, 4, 'El café está ___', 'frío', ['fría'], 0, 'Café — «он», поэтому frío.'),
    round(13, 5, '¿Está ___ la mesa?', 'libre', ['libres'], 1, 'Стол один — значит libre.'),
    round(13, 6, 'Las mesas están ___', 'limpias', ['limpia'], 1, 'Столов несколько — значит limpias.'),
  ],
  14: [
    round(14, 1, 'Ana se ___ las manos', 'lava', ['lavo', 'lavan'], 1, 'Про Ану говорят lava.'),
    round(14, 2, 'Mis hermanos se ___ en casa', 'duchan', ['ducha'], 0, 'Братьев несколько — значит duchan.'),
    round(14, 3, 'Me levanto ___ las siete', 'a', ['en'], 1, 'Время называют с a: a las siete.'),
    round(14, 4, 'Ana se lava ___ cara', 'la', ['las'], 0, 'Лицо одно — la cara.'),
    round(14, 5, 'Mis hermanas se ___ cerca de la ventana', 'sientan', ['sienta'], 1, 'Сестёр несколько — значит sientan.'),
    round(14, 6, 'Luis se prepara para ___ clase', 'la', ['el'], 1, 'Clase — «она», поэтому la.'),
  ],
  15: [
    round(15, 1, 'Ana ___ esperar aquí', 'puede', ['puedo', 'pueden'], 0, 'Про Ану говорят puede.'),
    round(15, 2, 'Mis hermanos ___ llevar la maleta', 'pueden', ['puede'], 1, 'Братьев несколько — значит pueden.'),
    round(15, 3, 'Puedes pagar ___ tarjeta', 'con', ['en'], 0, 'Картой — con tarjeta.'),
    round(15, 4, 'Ana puede volver ___ casa', 'a', ['en'], 1, 'Домой — a casa.'),
    round(15, 5, 'Puedo abrir ___ puerta', 'la', ['el'], 1, 'Puerta — «она», поэтому la.'),
    round(15, 6, 'Ana puede comprar ___ billete', 'un', ['una'], 0, 'Billete — «он», поэтому un.'),
  ],
  16: [
    round(16, 1, 'Ana ___ a entrar en la tienda', 'va', ['voy', 'vas'], 2, 'Про Ану говорят va.'),
    round(16, 2, 'Mis hermanos ___ a preparar la cena', 'van', ['va'], 0, 'Братьев несколько — значит van.'),
    round(16, 3, 'Voy ___ llamar al hotel', 'a', ['de'], 1, 'После voy нужно a.'),
    round(16, 4, 'Vamos a comprar ___ verduras', 'las', ['los'], 0, 'Verdura — «она», поэтому las.'),
    round(16, 5, 'Luis va a leer el libro más ___', 'tarde', ['hoy'], 0, 'Позже — más tarde.'),
    round(16, 6, 'Ana va a pasar por ___ supermercado', 'el', ['la'], 1, 'Supermercado — «он», поэтому el.'),
  ],
  17: [
    round(17, 1, 'Me ___ las fotos', 'gustan', ['gusta'], 1, 'Фотографий несколько — значит gustan.'),
    round(17, 2, 'Me gusta ___ libro', 'este', ['estos'], 0, 'Книга одна — este libro.'),
    round(17, 3, 'A Ana ___ gusta este hotel', 'le', ['les'], 0, 'Ана одна — значит le.'),
    round(17, 4, 'A mis hermanos ___ gusta este hotel', 'les', ['le'], 1, 'Братьев несколько — значит les.'),
    round(17, 5, 'No me gusta ___ música', 'esta', ['este'], 1, 'Música — «она», поэтому esta.'),
    round(17, 6, 'Nos gustan ___ fotos de Ana', 'las', ['los'], 0, 'Foto — «она», поэтому las.'),
  ],
  18: [
    round(18, 1, 'Ella la ___', 'busca', ['busco', 'buscas'], 1, 'Про неё говорят busca.'),
    round(18, 2, 'Mis hermanos lo ___ hoy', 'necesitan', ['necesita'], 0, 'Братьев несколько — значит necesitan.'),
    round(18, 3, 'Las guardo en ___ bolsillo', 'el', ['la'], 1, 'Bolsillo — «он», поэтому el.'),
    round(18, 4, 'Él los ___ a casa', 'lleva', ['llevo'], 0, 'Про него говорят lleva.'),
    round(18, 5, 'Ella lo ___ en casa', 'deja', ['dejo', 'dejas'], 2, 'Про неё говорят deja.'),
    round(18, 6, 'La lavo ___ mano', 'a', ['en'], 1, 'Вручную — a mano.'),
  ],
  19: [
    round(19, 1, 'Ana ___ escribiendo una carta', 'está', ['estoy'], 0, 'Про Ану говорят está.'),
    round(19, 2, 'Mis hermanos ___ comiendo en casa', 'están', ['está'], 1, 'Братьев несколько — значит están.'),
    round(19, 3, 'Luis está ___ en casa', 'comiendo', ['come'], 0, 'После está — comiendo.'),
    round(19, 4, 'Estoy ___ la puerta', 'abriendo', ['abro'], 1, 'После estoy — abriendo.'),
    round(19, 5, 'Ana está secando ___ platos', 'los', ['el'], 1, 'Тарелок несколько — значит los.'),
    round(19, 6, 'Mis hermanas ___ esperando aquí', 'están', ['está', 'estamos'], 2, 'Сестёр несколько — значит están.'),
  ],
  20: [
    round(20, 1, 'Ana ya ___ comprado un billete', 'ha', ['he', 'han'], 0, 'Про Ану говорят ha.'),
    round(20, 2, 'Mis hermanos ___ vuelto a casa', 'han', ['ha'], 1, 'Братьев несколько — значит han.'),
    round(20, 3, 'Ya he ___ al hotel', 'llamado', ['llamar'], 0, 'После he — llamado.'),
    round(20, 4, 'Luis ha ___ el libro', 'leído', ['lee'], 1, 'После ha — leído.'),
    round(20, 5, 'Luis ha preparado ___ cena', 'la', ['el'], 1, 'Cena — «она», поэтому la.'),
    round(20, 6, 'Hemos recibido ___ pedido', 'el', ['la'], 0, 'Pedido — «он», поэтому el.'),
  ],
};
