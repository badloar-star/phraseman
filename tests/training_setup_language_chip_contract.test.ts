// зачем (решение владельца 12.10, cards-027, вариант «а»): на настройке тренировки Карточек — чип языка тренировки, который ТОЛЬКО показывает язык (без меню и стрелки), в верхнем ряду справа рядом с пилюлей остатка.
// Причина read-only: список наборов тренировки строго по изучаемому языку приложения (loadFcDeckOptions(..., studyTarget)), а запуск сессий читает карточки по тому же языку — выбирать нечего.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('cards-027: чип языка на настройке тренировки — только показ', () => {
  const view = read('app/flashcards/TrainingSetupV2.tsx');
  const screen = read('app/flashcards_training_setup.tsx');

  it('экран передаёт код изучаемого языка (EN/ES/FR/DE/IT) в чип', () => {
    expect(screen).toContain('languageLabel={langChip(studyTarget)}');
    expect(screen).toContain("const langChip = (code: string): string => code.split('-')[0].toUpperCase();");
  });

  it('чип в верхнем ряду справа РЯДОМ с пилюлей остатка; это обычный текстовый элемент, не кнопка: нет onPress, меню, стрелки', () => {
    const start = view.indexOf('<View style={styles2.topRight}>');
    expect(start).toBeGreaterThan(-1);
    const row = view.slice(start, view.indexOf('</View>\n          ) : null}\n        </View>', start));
    const chip = row.slice(row.indexOf('testID="fc-training-setup-language-chip"'), row.indexOf('testID="fc-training-setup-monthly-limit"'));
    expect(chip).toContain('accessibilityRole="text"');
    expect(chip).not.toContain('onPress');
    expect(chip).not.toContain('chevron');
    expect(chip).not.toContain('Pressable');
    expect(chip).not.toContain('Touchable');
    // чип стоит ПЕРЕД пилюлей остатка в том же правом ряду
    expect(row.indexOf('fc-training-setup-language-chip')).toBeLessThan(row.indexOf('fc-training-setup-monthly-limit'));
  });

  it('цвета из токенов, длинный код не сжимается: нет adjustsFontSizeToFit и numberOfLines у чипа', () => {
    const start = view.indexOf('testID="fc-training-setup-language-chip"');
    const chip = view.slice(start, view.indexOf('</View>', start));
    expect(chip).toContain('backgroundColor: g.opaqueControl');
    expect(chip).toContain('color: g.text');
    expect(chip).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    expect(chip).not.toContain('adjustsFontSizeToFit');
    expect(chip).not.toContain('numberOfLines');
  });

  it('подпись для озвучки есть на 9 языках («Язык тренировки: EN»)', () => {
    for (const text of ['Язык тренировки', 'Мова тренування', 'Practice language', 'Idioma de práctica', 'Idioma da prática', 'Ngôn ngữ luyện tập', 'Bahasa latihan', 'Pratik dili', 'Język ćwiczeń']) {
      expect(view).toContain(`language: '${text}'`);
    }
    expect(view).toContain('accessibilityLabel={`${copy.language}: ${languageLabel}`}');
  });

  it('правый ряд переносится при нехватке места, а не режет и не сжимает чипы', () => {
    expect(view).toContain("topRight: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, flexShrink: 1 }");
  });
});
