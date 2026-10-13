import fs from 'fs';
import path from 'path';

/**
 * зачем (energy-modes-017, координатор 13.10, деньги): при ⚡0 окно «Энергия закончилась» в уроке закрывалось тапом по фону /
 * «назад» через onClose = resetNoEnergyModal — окно пряталось, урок оставался, энергия не списана, слова нажимались → урок
 * бесплатно. Сторож: после отказа списания ответы заблокированы, закрытие окна без энергии — выход, переход в Plus окно только
 * прячет, повтор списания при появлении энергии.
 */
const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'lesson1.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('lesson1: отказ списания энергии не даёт бесплатный урок', () => {
  it('отказ списания включает блокировку', () => {
    const gate = src.slice(src.indexOf('const lessonEnergyGate = useFirstQuestionEnergyGate({'));
    const insufficient = gate.slice(gate.indexOf('onInsufficient:'), gate.indexOf('onCancelled:'));
    expect(insufficient).toContain('energyGateBlockedRef.current = true;');
    expect(insufficient).toContain('showEnergyEmptyFeedback();');
  });

  it('тап по слову и проверка ответа заблокированы, пока списание не прошло', () => {
    const word = src.slice(src.indexOf('const handleWordPress = useCallback('), src.indexOf('const handleWordPress = useCallback(') + 600);
    expect(word).toContain('if (energyGateBlockedRef.current) {');
    const check = src.slice(src.indexOf('const checkAnswer = useCallback('), src.indexOf('const checkAnswer = useCallback(') + 400);
    expect(check).toContain('if (energyGateBlockedRef.current) {');
  });

  it('закрытие окна без энергии — выход из урока; переход в Plus только прячет окно', () => {
    expect(src).toMatch(/<NoEnergyModal variant="learn"[\s\S]{0,200}onClose=\{closeNoEnergyModal\}\s*onBeforeOpenPremium=\{resetNoEnergyModal\}/);
    expect(src).toContain('if (energyGateBlockedRef.current) dismissEnergyModal();');
  });

  it('появилась энергия или Plus — списание повторяется и урок разблокируется', () => {
    expect(src).toContain('void lessonEnergyGate.charge().then((result) => {');
    expect(src).toMatch(/if \(result === 'spent' \|\| result === 'unlimited'\) \{\s*energyGateBlockedRef\.current = false;/);
  });
});
