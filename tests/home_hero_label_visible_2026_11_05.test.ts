// 🔴 кадр 5554 10:53: кнопка героя «Начать» без текста (только треугольник) и «Фраза дня» без значения строкой.
// Причина кнопки: подпись меняется A→B→A, пока идёт растворение; ветка «текст совпал» выходила, не вернув непрозрачность 1.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string): string => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('кнопка героя: подпись всегда видна', () => {
  const body = read('components/lesson_prep/LessonPrepCtaBody.tsx');
  it('при совпадении текста непрозрачность подписи возвращается к 1 (A→B→A не оставляет её невидимой)', () => {
    expect(body).toContain('if (text === shownText) {');
    expect(body).toContain('textOpacity.value = reduceMotion ? 1 : withTiming(1, { duration: PREP_SWAP_MS * 0.55, easing: EASE_OUT });');
  });
  it('журнал [HOME-HERO]: восстановление и смена подписи называют значения', () => {
    expect(body).toContain("console.log('[HOME-HERO]', 'label_restore'");
    expect(body).toContain("console.log('[HOME-HERO]', 'label_change'");
    expect(read('components/home/v2/scene/HomeSceneStage.tsx')).toContain("console.log('[HOME-HERO]', 'copy'");
  });
});

describe('«Фраза дня» на Главной: значение строкой', () => {
  const card = read('components/DailyPhraseCard.tsx');
  it('под фразой — смысл (meaning), буквальный перевод только если смысла нет', () => {
    expect(card).toContain("const cardLiteral = translationAllowed ? (phraseCopy.meaning || phraseCopy.literal) : '';"); // перевод — только после ответа на вопрос дня (05.11)
  });
  it('кнопки озвучки на карточке нет (замок владельца 18.10 в силе)', () => {
    const v2 = card.slice(card.indexOf('testID="home-v2-phrase-of-day"'), card.indexOf('</Pressable>', card.indexOf('testID="home-v2-phrase-of-day"')));
    expect(v2).not.toContain('volume-high');
    expect(v2).not.toContain('speak(');
  });
});
