// зачем (Макеты, en-проход cards-021): при открытой клавиатуре поле «Translation» оказывалось наполовину под панелью «Add».
// Редактор карточки теперь прокручивает фокусное поле в видимую часть (после фокуса и после показа клавиатуры) и пишет
// [CARD-EDITOR-KB] — где поле, где прокрутка и сколько места осталось.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/flashcards_card_editor.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('редактор карточки: фокусное поле видно при клавиатуре', () => {
  it('все три поля запоминают верх и прокручиваются при фокусе', () => {
    for (const name of ['front', 'back', 'description']) {
      expect(src).toContain(`revealField('${name}', 'фокус')`);
      expect(src).toContain(`fieldTopRef.current.${name} = e.nativeEvent.layout.y`);
    }
  });

  it('после показа клавиатуры фокусное поле показывается ещё раз, слушатель снимается', () => {
    expect(src).toContain("Keyboard.addListener('keyboardDidShow'");
    expect(src).toContain("revealField(focusedFieldRef.current, 'клавиатура')");
    expect(src).toContain('show.remove();');
  });

  it('прокрутка получает ref и размеры, журнал [CARD-EDITOR-KB] показывает входные значения и решение', () => {
    expect(src).toContain('ref={editorScrollRef}');
    expect(src).toContain('onContentSizeChange');
    expect(src).toContain("DebugLogger.info('[CARD-EDITOR-KB]'");
    expect(src).toContain('scrollTo y=');
    expect(src).not.toContain('adjustsFontSizeToFit');
  });
});
