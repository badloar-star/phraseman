/**
 * AA S6b: тесты на выживших мутантов надёжного списка слотов SecureStore
 * (DS1 — проверка записи перечитыванием, DS4 — запрет дубля ключа,
 * DS8 — причина «слот пропал» в тревоге).
 */
import { createDurableSlotList } from '../modules/account-authority-v2/account_authority_durable_slots';

type Entry = Readonly<{ id: string }>;

function makeStore(options?: Readonly<{ dropWrites?: () => boolean }>) {
  const data = new Map<string, string>();
  return {
    data,
    store: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        if (options?.dropWrites?.()) return;
        data.set(key, value);
      },
      deleteItemAsync: async (key: string) => { data.delete(key); },
    },
  };
}

function makeList(store: ReturnType<typeof makeStore>['store'], reportCritical?: (event: string, code: string) => void) {
  return createDurableSlotList<Entry>({
    secureStore: store,
    options: {},
    log: { info: () => undefined, warn: () => undefined },
    prefix: 'aa_s6b_test',
    schema: 'aa_s6b_test.v1',
    max: 4,
    label: 'test_queue',
    invalidCode: 'test_invalid',
    fullCode: 'test_full',
    unavailableCode: 'test_unavailable',
    parse: (value: unknown) => {
      if (typeof value !== 'object' || value === null || typeof (value as { id?: unknown }).id !== 'string') {
        throw new Error('test_parse');
      }
      return Object.freeze({ id: (value as { id: string }).id });
    },
    keyOf: (value: Entry) => value.id,
    reportCritical,
  });
}

describe('AA-S6b durable slots: убийцы выживших мутантов', () => {
  it('DS1: запись, которую хранилище молча не сохранило, — громкий отказ (а не мнимый успех)', () => {
    let drop = false;
    const { store } = makeStore({ dropWrites: () => drop });
    const list = makeList(store);
    drop = true;
    expect(() => list.add({ id: 'a' })).toThrow('test_unavailable');
    expect(list.size()).toBe(0);
  });

  it('DS4: повторное добавление той же записи отклоняется, дубль в индекс не попадает', () => {
    const { store, data } = makeStore();
    const list = makeList(store);
    list.add({ id: 'a' });
    expect(() => list.add({ id: 'a' })).toThrow('test_invalid');
    expect(list.size()).toBe(1);
    const index = JSON.parse(data.get('aa_s6b_test.index') ?? '{}') as { slots?: number[] };
    expect(index.slots).toEqual([0]);
  });

  it('DS8: пропавший слот поднимает тревогу с причиной account_authority_slot_missing, запись не теряется из индекса', () => {
    const { store, data } = makeStore();
    makeList(store).add({ id: 'a' });
    data.delete('aa_s6b_test.slot.0');
    const alarms: Array<[string, string]> = [];
    const reloaded = makeList(store, (event, code) => { alarms.push([event, code]); });
    expect(reloaded.size()).toBe(0);
    expect(reloaded.unreadable()).toBe(1);
    expect(alarms).toContainEqual(['aa_s4:test_queue slot_unreadable', 'account_authority_slot_missing']);
  });
});
