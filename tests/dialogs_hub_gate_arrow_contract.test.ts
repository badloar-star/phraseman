// зачем (R1 dialogs-005, Ядро 12.10): в образце A6 кнопка «К урокам» со стрелкой вправо; у карточки-ошибки загрузки каталога (другой значок) стрелки нет.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'components/dialogs/DialogueV2HubNotices.tsx'), 'utf8').replace(/\r\n/g, '\n');

describe('хаб «Диалоги»: карточка «язык ещё проверяется»', () => {
  it('кнопка «К урокам» несёт стрелку только у карточки с замком (gate), не у ошибки загрузки', () => {
    expect(src).toContain("trailingArrow={icon === 'lock-closed'}");
    expect(src).toContain("icon = 'lock-closed'");
  });
});
