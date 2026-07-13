import { documentVersion, projectNativeRow } from './admin_native_operations';

describe('Admin native operation safety primitives', () => {
  it('detects changes beyond UI projection depth, key and array limits', () => {
    const deepA = { a: { b: { c: { d: 'one' } } } };
    const deepB = { a: { b: { c: { d: 'two' } } } };
    expect(documentVersion('row', deepA)).not.toBe(documentVersion('row', deepB));
    const manyA = Object.fromEntries(Array.from({ length: 90 }, (_, index) => [`k${index}`, index]));
    const manyB = { ...manyA, k89: 999 };
    expect(documentVersion('row', manyA)).not.toBe(documentVersion('row', manyB));
    const arrayA = Array.from({ length: 60 }, (_, index) => index);
    const arrayB = [...arrayA];
    arrayB[59] = 999;
    expect(documentVersion('row', { arrayA })).not.toBe(documentVersion('row', { arrayA: arrayB }));
  });

  it('masks identity fields recursively without hiding operational fields', () => {
    expect(projectNativeRow({
      authorUid: 'stable-user-123456',
      email: 'person@example.com',
      status: 'pending',
      nested: { reportedName: 'Alice Example', count: 3 },
    }, false)).toEqual({
      authorUid: 'stab…3456',
      email: 'pe***@example.com',
      status: 'pending',
      nested: { reportedName: 'Alic…mple', count: 3 },
    });
  });
});
