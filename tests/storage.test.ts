import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  storageGet,
  storageGetString,
  storageGetNumber,
  storageSet,
  storageSetString,
  storageRemove,
} from '../lib/storage';

const mockStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

beforeEach(() => {
  (AsyncStorage as unknown as { __reset: () => void }).__reset();
  jest.clearAllMocks();
});

describe('storageGet', () => {
  it('returns null when key does not exist', async () => {
    expect(await storageGet('missing')).toBeNull();
  });

  it('parses and returns a JSON object', async () => {
    await AsyncStorage.setItem('obj', JSON.stringify({ x: 1 }));
    expect(await storageGet<{ x: number }>('obj')).toEqual({ x: 1 });
  });

  it('parses and returns a JSON array', async () => {
    await AsyncStorage.setItem('arr', JSON.stringify([1, 2, 3]));
    expect(await storageGet<number[]>('arr')).toEqual([1, 2, 3]);
  });

  it('returns null when value is invalid JSON', async () => {
    await AsyncStorage.setItem('bad', 'not-json{');
    expect(await storageGet('bad')).toBeNull();
  });

  it('returns null when AsyncStorage throws', async () => {
    mockStorage.getItem.mockRejectedValueOnce(new Error('disk error'));
    expect(await storageGet('key')).toBeNull();
  });
});

describe('storageGetString', () => {
  it('returns null when key does not exist', async () => {
    expect(await storageGetString('missing')).toBeNull();
  });

  it('returns raw string without parsing', async () => {
    await AsyncStorage.setItem('s', 'hello');
    expect(await storageGetString('s')).toBe('hello');
  });

  it('returns null when AsyncStorage throws', async () => {
    mockStorage.getItem.mockRejectedValueOnce(new Error('fail'));
    expect(await storageGetString('key')).toBeNull();
  });
});

describe('storageGetNumber', () => {
  it('returns defaultValue when key does not exist', async () => {
    expect(await storageGetNumber('missing')).toBe(0);
    expect(await storageGetNumber('missing', 42)).toBe(42);
  });

  it('parses and returns a valid number', async () => {
    await AsyncStorage.setItem('n', '123');
    expect(await storageGetNumber('n')).toBe(123);
  });

  it('returns defaultValue when value is not a number', async () => {
    await AsyncStorage.setItem('bad', 'abc');
    expect(await storageGetNumber('bad', 5)).toBe(5);
  });

  it('returns defaultValue when AsyncStorage throws', async () => {
    mockStorage.getItem.mockRejectedValueOnce(new Error('fail'));
    expect(await storageGetNumber('key', 7)).toBe(7);
  });
});

describe('storageSet', () => {
  it('stores a value as JSON', async () => {
    await storageSet('obj', { a: 1 });
    const raw = await AsyncStorage.getItem('obj');
    expect(JSON.parse(raw!)).toEqual({ a: 1 });
  });

  it('stores a number as JSON', async () => {
    await storageSet('num', 42);
    const raw = await AsyncStorage.getItem('num');
    expect(JSON.parse(raw!)).toBe(42);
  });

  it('does not throw when AsyncStorage fails', async () => {
    mockStorage.setItem.mockRejectedValueOnce(new Error('fail'));
    await expect(storageSet('key', { x: 1 })).resolves.toBeUndefined();
  });
});

describe('storageSetString', () => {
  it('stores a raw string', async () => {
    await storageSetString('s', 'hello');
    expect(await AsyncStorage.getItem('s')).toBe('hello');
  });

  it('does not throw when AsyncStorage fails', async () => {
    mockStorage.setItem.mockRejectedValueOnce(new Error('fail'));
    await expect(storageSetString('key', 'val')).resolves.toBeUndefined();
  });
});

describe('storageRemove', () => {
  it('removes an existing key', async () => {
    await AsyncStorage.setItem('r', 'val');
    await storageRemove('r');
    expect(await AsyncStorage.getItem('r')).toBeNull();
  });

  it('does not throw when key does not exist', async () => {
    await expect(storageRemove('nonexistent')).resolves.toBeUndefined();
  });

  it('does not throw when AsyncStorage fails', async () => {
    mockStorage.removeItem.mockRejectedValueOnce(new Error('fail'));
    await expect(storageRemove('key')).resolves.toBeUndefined();
  });
});
