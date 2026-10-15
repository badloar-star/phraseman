// [FS-READS] (координатор 15.10): счётчик чтений Firestore считает только оплачиваемые чтения с сервера, по шаблону коллекции,
// и видит слушателей, которые не закрыты.
import {
  __resetFsReadsForTests,
  fsCallerFromStack,
  fsPathTemplate,
  fsReadsReport,
  installFirestoreReadCounter,
} from '../app/dev_firestore_read_counter';

type Snap = { metadata: { fromCache: boolean }; size?: number; docChanges?: () => unknown[] };

function makeClasses() {
  class FakeQuery {
    _collectionPath: { relativeName: string };
    snaps: Snap[] = [];
    listener: ((s: Snap) => void) | null = null;
    constructor(path: string) { this._collectionPath = { relativeName: path }; }
    get(): Promise<Snap> { return Promise.resolve(this.snaps.shift() ?? { metadata: { fromCache: false }, size: 0 }); }
    onSnapshot(onNext: (s: Snap) => void): () => void { this.listener = onNext; return () => { this.listener = null; }; }
  }
  class FakeDoc {
    _documentPath: { relativeName: string };
    constructor(path: string) { this._documentPath = { relativeName: path }; }
    get(): Promise<Snap> { return Promise.resolve({ metadata: { fromCache: false } }); }
    onSnapshot(observer: { next: (s: Snap) => void }): () => void { observer.next({ metadata: { fromCache: true } }); return () => undefined; }
  }
  return { FakeQuery, FakeDoc };
}

describe('[FS-READS] счётчик чтений Firestore (dev)', () => {
  let t = 0;
  const lines: string[] = [];
  beforeEach(() => {
    __resetFsReadsForTests();
    t = 1000;
    lines.length = 0;
  });

  it('шаблон пути прячет id, стек даёт боевые функции', () => {
    expect(fsPathTemplate('users/AbC123/notifications/n1')).toBe('users/{id}/notifications/{id}');
    expect(fsPathTemplate('remote_config/app')).toBe('remote_config/{id}');
    const stack = 'Error\n    at wrapped (http://x/dev_firestore_read_counter.bundle:1:1)\n    at getDoc (http://x/node_modules/rnfb.js:2:2)\n    at loadProfile (http://x/index.bundle:3:3)\n    at useHome (http://x/index.bundle:4:4)';
    expect(fsCallerFromStack(stack)).toBe('loadProfile<useHome');
  });

  it('get документа и запроса: только с сервера, пустой запрос = 1, кэш не оплачивается', async () => {
    const { FakeQuery, FakeDoc } = makeClasses();
    installFirestoreReadCounter({ queryProto: FakeQuery.prototype as never, docProto: FakeDoc.prototype as never, nowFn: () => t, logFn: (l) => lines.push(l) });
    t = 1500;
    await new FakeDoc('users/u1').get();
    const q = new FakeQuery('users/u1/notifications');
    q.snaps.push({ metadata: { fromCache: false }, size: 5 }, { metadata: { fromCache: false }, size: 0 }, { metadata: { fromCache: true }, size: 9 });
    await q.get();
    await q.get();
    await q.get();
    const report = fsReadsReport(10_000);
    expect(report.billedDocs).toBe(1 + 5 + 1);
    expect(report.cacheHits).toBe(1);
    expect(report.byPath.map((r) => [r.path, r.docs, r.calls])).toEqual([['users/{id}/notifications', 6, 2], ['users/{id}', 1, 1]]);
  });

  it('слушатель: первый снимок = размер, дальше — изменения; незакрытый виден в сводке, закрытый — нет', () => {
    const { FakeQuery, FakeDoc } = makeClasses();
    installFirestoreReadCounter({ queryProto: FakeQuery.prototype as never, docProto: FakeDoc.prototype as never, nowFn: () => t, logFn: (l) => lines.push(l) });
    const q = new FakeQuery('daily_poll');
    const seen: number[] = [];
    const unsubscribe = q.onSnapshot((s) => { seen.push(s.size ?? -1); });
    q.listener?.({ metadata: { fromCache: false }, size: 3 });
    q.listener?.({ metadata: { fromCache: false }, size: 3, docChanges: () => [1, 2] });
    expect(seen).toEqual([3, 3]);
    expect(fsReadsReport(60_000).billedDocs).toBe(5);
    expect(fsReadsReport(60_000).openListeners.map((l) => [l.path, l.billedDocs])).toEqual([['daily_poll', 5]]);
    unsubscribe();
    expect(fsReadsReport(60_000).openListeners).toEqual([]);
    expect(lines.some((l) => l.includes('listen:close #1 daily_poll'))).toBe(true);
    // слушатель-наблюдатель документа из кэша не оплачивается
    new FakeDoc('profiles/p1').onSnapshot({ next: () => undefined });
    expect(fsReadsReport(60_000).billedDocs).toBe(5);
  });

  it('повторная установка не оборачивает дважды', () => {
    const { FakeQuery, FakeDoc } = makeClasses();
    expect(installFirestoreReadCounter({ queryProto: FakeQuery.prototype as never, docProto: FakeDoc.prototype as never, logFn: () => undefined })).toBe(true);
    expect(installFirestoreReadCounter({ queryProto: FakeQuery.prototype as never, docProto: FakeDoc.prototype as never, logFn: () => undefined })).toBe(false);
  });
});
