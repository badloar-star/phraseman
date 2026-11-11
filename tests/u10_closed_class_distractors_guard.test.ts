/**
 * Сторож U10, часть 3 (владелец 11.11.2026, выбор «только служебные слова»).
 *
 * зачем: соблазн-служебное слово того же класса не должен ГРАММАТИЧЕСКИ вставать в слот, даже если показанный перевод его
 * исключает: «[This] door is open» при «Дверь открыта», «[She] works here» при «Он работает здесь», «[When] it rains…» при
 * «Если пойдёт дождь…». Правила согласования и замены — scripts/u10_closed_class_distractors.cjs; этот сторож прогоняет те же
 * правила по всем плиткам пяти курсов и требует ноль подходящих соблазнов. Смысловые слова и предлоги правилом не решаются
 * и сюда не входят (решение владельца). Сработал — запустить скрипт без --check, а не ослаблять сторож.
 */
// eslint-disable-next-line @typescript-eslint/no-require-imports -- скрипт правки данных написан на CommonJS и запускается из node без сборки
const { scan, verdict, LANGS } = require('../scripts/u10_closed_class_distractors.cjs') as {
  scan: (lang: string, mode: 'count') => { stats: Record<string, { fit: number; nofit: number; skip: number }>; rows: string[] };
  verdict: (lang: string, tiles: { correct: string }[], i: number, distractor: string, target?: string) => { cls: string | null; v: string };
  LANGS: string[];
};

const tiles = (...words: string[]) => words.map((correct) => ({ correct }));

describe('U10, часть 3: служебные соблазны не встают в слот грамматически', () => {
  it.each(LANGS)('%s: подходящих служебных соблазнов нет', (lang) => {
    const result = scan(lang, 'count');
    const fits = Object.entries(result.stats).map(([cls, s]) => `${cls}:${s.fit}`);
    expect([lang, fits, result.rows.slice(0, 10)]).toEqual([lang, fits.map((x) => x.replace(/:\d+$/u, ':0')), []]);
  });

  it('правила: что считается подходящим, а что — полезной грамматической ошибкой', () => {
    // определители: согласование по числу, a/an по звуку
    expect(verdict('en', tiles('The', 'door', 'is', 'open'), 0, 'This').v).toBe('fit');
    expect(verdict('en', tiles('The', 'door', 'is', 'open'), 0, 'These').v).toBe('nofit');
    expect(verdict('en', tiles('I', 'have', 'a', 'question'), 2, 'an').v).toBe('nofit');
    expect(verdict('en', tiles('The', 'shop', 'opens', 'at', 'nine'), 0, 'Both').v).toBe('nofit');
    // относительное «that» — не определитель
    expect(verdict('en', tiles('The', 'key', 'that', 'opens', 'the', 'barrier'), 2, 'an').v).toBe('nofit');
    // подлежащее: лицо и число по глаголу; «need» — не прошедшее время
    expect(verdict('en', tiles('He', 'is', 'busy'), 0, 'She').v).toBe('fit');
    expect(verdict('en', tiles('He', 'is', 'busy'), 0, 'They').v).toBe('nofit');
    expect(verdict('en', tiles('I', 'need', 'help'), 0, 'She').v).toBe('nofit');
    expect(verdict('en', tiles('Yes', 'it', 'is'), 1, 'you').v).toBe('nofit');
    // вспомогательные: согласование с местоимением с любой стороны
    expect(verdict('en', tiles('Which', 'platform', 'do', 'we', 'need'), 2, 'does').v).toBe('nofit');
    expect(verdict('en', tiles('I', 'will', 'wait'), 1, 'should').v).toBe('fit');
    // союзы: «если ↔ когда» встаёт; вопросительное слово и «because of» — не союзы
    expect(verdict('en', tiles('If', 'it', 'rains', 'we', 'stay'), 0, 'When', 'If it rains, we stay.').v).toBe('fit');
    expect(verdict('en', tiles('When', 'do', 'we', 'start'), 0, 'If', 'When do we start?').v).toBe('nofit');
    // французский: род и элизия — полезная ошибка; тот же род — встаёт
    expect(verdict('fr', tiles('La', 'porte', 'est', 'ouverte'), 0, 'Le').v).toBe('nofit');
    expect(verdict('fr', tiles('Il', 'travaille', 'ici'), 0, 'Elle').v).toBe('fit');
    expect(verdict('fr', tiles('Nous', 'nous', 'levons'), 0, 'Je').v).toBe('nofit');
    // немецкий: als/wenn для однократного прошлого — ошибка, её оставляем; лицо по окончанию глагола
    expect(verdict('de', tiles('Als', 'ich', 'ankam', 'war', 'die', 'Tür', 'offen'), 0, 'Wenn', 'Als ich ankam, war die Tür offen.').v).toBe('nofit');
    expect(verdict('de', tiles('Ich', 'arbeite', 'heute'), 0, 'Er').v).toBe('nofit');
    // смысловые слова и предлоги правило не решает
    expect(verdict('en', tiles('We', 'buy', 'food'), 2, 'coffee').cls).toBeNull();
    expect(verdict('en', tiles('They', 'walk', 'in', 'the', 'evening'), 2, 'on').v).toBe('skip');
  });
});
