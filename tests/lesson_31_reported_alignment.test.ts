import { LESSON_31_PHRASES } from '../app/lesson_data_25_32';
import { LESSON_31_INTRO_EXTRA } from '../app/lesson_intro_screens_en_17_32';

const phraseById = new Map(LESSON_31_PHRASES.map((phrase) => [phrase.id, phrase]));

describe('lesson 31 reported phrase alignment', () => {
  it.each([
    ['lesson31_phrase_31', 'I saw a lost dog leave the busy street.', 'Я видел, как потерявшаяся собака покинула оживлённую улицу.', 'Я бачив, як загублений пес залишив жваву вулицю.', 'Vi a un perro perdido salir de la calle concurrida.'],
    ['lesson31_phrase_32', 'They heard a quiet student ask a difficult question.', 'Они слышали, как тихий ученик задал трудный вопрос.', 'Вони чули, як тихий учень поставив складне запитання.', 'Oyeron a un alumno tranquilo hacer una pregunta difícil.'],
    ['lesson31_phrase_35', 'A brave man made the nervous family follow the exit signs.', 'Храбрый мужчина заставил нервную семью следовать указателям выхода.', 'Хоробрий чоловік змусив нервову родину йти за вказівниками виходу.', 'Un hombre valiente hizo que la familia nerviosa siguiera las señales de salida.'],
    ['lesson31_phrase_42', 'She noticed an old man drop a metal key into his bag.', 'Она заметила, как пожилой мужчина уронил металлический ключ в свою сумку.', 'Вона помітила, як літній чоловік упустив металевий ключ у свою сумку.', 'Notó a un hombre mayor dejar caer una llave metálica en su bolsa.'],
    ['lesson31_phrase_46', 'She let a helpful local guide show the old map to her tourist group.', 'Она разрешила отзывчивому местному гиду показать старую карту своей группе туристов.', 'Вона дозволила привітному місцевому гіду показати стару мапу своїй групі туристів.', 'Dejó que un guía local servicial mostrara el mapa antiguo a su grupo de turistas.'],
  ])('keeps %s exactly aligned in all four locales', (dataId, english, russian, ukrainian, spanish) => {
    expect(phraseById.get(dataId)).toMatchObject({ english, russian, ukrainian, spanish });
  });

  it('keeps lesson31_phrase_31 word training coverage for busy', () => {
    expect(phraseById.get('lesson31_phrase_31')?.words?.some((entry) => entry.correct === 'busy')).toBe(true);
  });

  it('keeps the Complex Object vocabulary intro before the phrase practice', () => {
    expect(LESSON_31_INTRO_EXTRA.find(
      (screen) => screen.screenId === 'lesson_31_intro_2_complex_noun_groups',
    )).toMatchObject({ order: 2 });
  });
});
