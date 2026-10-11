// зачем (координатор 12.10, «сперва логи»: dev_state?toast=… не показывает тост на Главной): цепочка журнала [DEV-STATE] toast: должна оставаться полной —
// что пришло и сколько хостов подписано, как решила очередь хоста (каждый ранний выход называет причину), кто держит слот окон, что отбросил анти-всплеск.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('[DEV-STATE] toast trace', () => {
  it('the fixture logs the chosen toast and how many hosts are subscribed', () => {
    const src = read('app/dev_state_fixtures.ts');
    expect(src).toContain("DeviceEventEmitter.listenerCount('action_toast')");
    expect(src).toMatch(/\[DEV-STATE\] toast: \$\{kind\} → type=\$\{payload\.type\}/);
  });

  it('every early exit of the host queue and the slot wait say why', () => {
    const src = read('components/ActionToast.tsx');
    for (const reason of ['охлаждение после показа', 'такой тост уже на экране', 'такой тост уже в очереди', 'хост занят, тост поставлен в очередь', 'принят к показу, запрошен слот окон', 'слот окон не дали за']) {
      expect(src).toContain(reason);
    }
    expect(src).toContain('useOverlayActiveKey');
    expect(src).toMatch(/слотДержит=\$\{slotHolder \?\? 'никто'\}/);
    expect(src).toContain('[DEV-STATE] toast: хост смонтирован');
  });

  it('the emit-level burst filter logs what it drops', () => {
    expect(read('app/events.ts')).toContain('[DEV-STATE] toast: emit отброшен как повтор');
  });
});
