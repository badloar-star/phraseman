// зачем (координатор 12.10, dialogs-030/014): название цели в карточке сессии — с заглавной и без точки (как в брифинге), плейсхолдер поля ввода короткий и не переносится на 2 строки.
import fs from 'node:fs';
import path from 'node:path';

import { formatDialogObjectiveLabel } from '../components/dialogs/dialog_objective_label';

const session = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_session.tsx'), 'utf8');

describe('dialogue v2 session: goal card label and input placeholder', () => {
  it('the goal card shows the label through formatDialogObjectiveLabel', () => {
    expect(session).toContain('label: formatDialogObjectiveLabel(currentObjective.label),');
    expect(session).toContain("import { formatDialogObjectiveLabel } from '../components/dialogs/dialog_objective_label';");
    expect(session).toContain('[DIALOG-GOAL] card');
  });

  it('formatter capitalises and drops the final dot', () => {
    expect(formatDialogObjectiveLabel('поздороваться с администратором.')).toBe('Поздороваться с администратором');
    expect(formatDialogObjectiveLabel('Order a coffee.')).toBe('Order a coffee');
  });

  it('the placeholder is short in ru/uk/en (fits one line in the narrow field)', () => {
    const match = session.match(/placeholder: triLang\(lang, \{ ru: '([^']+)', uk: '([^']+)', en: '([^']+)'/);
    expect(match).not.toBeNull();
    expect(match!.slice(1)).toEqual(['Напиши или говори', 'Напиши або говори', 'Type or speak']);
    for (const text of match!.slice(1)) expect(text.length).toBeLessThanOrEqual(20);
  });
});
