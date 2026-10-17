// зачем (решение владельца 13.10, dialogs.html D2): на итоге диалога при записанных ошибках под «Готово» — «Добить: Ещё учу (N)», в карточке «Ошибки» —
// «Повторить ошибки»; оба запускают отработку ошибок диалога (хук Ядра useDialogueV2MistakeCapture); без ошибок остаётся «Ещё раз».
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/dialogue_v2_completion.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('итог диалога: «Добить: Ещё учу (N)» и «Повторить ошибки»', () => {
  it('кнопки только когда ошибки записаны (ready) и их N > 0', () => {
    expect(src).toContain("const finishableMistakes = dialogMistakes.status === 'ready' && dialogMistakes.mistakeIds.length > 0;");
  });

  it('нижняя тихая кнопка: при ошибках «Добить: Ещё учу (N)» с отработкой, иначе прежнее «Ещё раз»', () => {
    expect(src).toContain("{scenarioId || finishableMistakes ? (");
    expect(src).toContain("testID={finishableMistakes ? 'dialogue-v2-completion-finish-mistakes' : 'dialogue-v2-completion-again'}");
    expect(src).toContain('onPress={finishableMistakes ? dialogMistakes.openPractice : again}');
    expect(src).toContain('{finishableMistakes ? labels.finishMistakes(dialogMistakes.mistakeIds.length) : labels.again}');
  });

  it('кнопка «Повторить ошибки» в карточке «Ошибки» делает то же действие', () => {
    expect(src).toContain('testID="dialogue-v2-completion-repeat-mistakes"');
    expect(src).toContain('onPress={dialogMistakes.openPractice}');
    expect(src).toContain('{labels.repeatMistakes}');
  });

  it('подпись «Добить: Ещё учу (N)» с числом в скобках на всех языках', () => {
    for (const piece of ["ru: `Добить: Ещё учу (${n})`", 'uk: `Виправити помилки (${n})`', 'en: `Fix mistakes (${n})`', "'pt-BR': `Corrigir erros (${n})`", 'pl: `Popraw błędy (${n})`']) {
      expect(src).toContain(piece);
    }
  });
});
