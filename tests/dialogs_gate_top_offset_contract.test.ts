// зачем (разбор размеров реестра 13.10, dialogs-033 и родственные гейты): блок экрана-гейта диалогов стоит сверху на `.gate { margin-top: 150px }` образца dialogs.html,
// отсчитанном ПОСЛЕ строки шапки с «назад». Шапка здесь — отдельный блок (`gateTop`), поэтому в `gateBody` отступ ровно 150, а не 194 (шапку считали дважды).
import fs from 'node:fs';
import path from 'node:path';

const kit = fs.readFileSync(path.join(__dirname, '..', 'components/dialogs/glass/DialogueGlassKit.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('экран-гейт диалогов: отступ сверху по образцу', () => {
  it('gateBody: paddingTop 150, значок 84, заголовок 26/32 с отступом 22', () => {
    expect(kit).toMatch(/gateBody: \{ flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 150,/);
    expect(kit).toMatch(/gateBig: \{ width: 84, height: 84, borderRadius: 42,/);
    expect(kit).toMatch(/gateTitle: \{ marginTop: 22, fontSize: 26, lineHeight: 32, fontWeight: '700', letterSpacing: -0\.3,/);
  });
});
