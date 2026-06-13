import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  activateUrgencyIfNeeded,
  getUrgencyState,
  formatCountdown,
  getDoubledPrice,
  URGENCY_SHOWN_AT_KEY,
} from '../app/paywall_urgency';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  jest.clearAllMocks();
  Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);

  (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) =>
    Promise.resolve(mockStorage[k] ?? null),
  );
  (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
    mockStorage[k] = v;
    return Promise.resolve();
  });
  (AsyncStorage.removeItem as jest.Mock).mockImplementation((k: string) => {
    delete mockStorage[k];
    return Promise.resolve();
  });
});

// ── activateUrgencyIfNeeded ───────────────────────────────────────────────────

describe('activateUrgencyIfNeeded', () => {
  it('записывает timestamp при первом вызове', async () => {
    const before = Date.now();
    await activateUrgencyIfNeeded();
    const after = Date.now();

    const stored = mockStorage['paywall_urgency_shown_at_v1'];
    expect(stored).toBeDefined();
    const ts = parseInt(stored, 10);
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('НЕ перезаписывает при повторных вызовах (идемпотентно)', async () => {
    await activateUrgencyIfNeeded();
    const first = mockStorage['paywall_urgency_shown_at_v1'];

    // Небольшая пауза чтобы Date.now() точно изменился
    await new Promise((r) => setTimeout(r, 5));

    await activateUrgencyIfNeeded();
    const second = mockStorage['paywall_urgency_shown_at_v1'];

    expect(first).toBe(second);
  });
});

// ── getUrgencyState ───────────────────────────────────────────────────────────

describe('getUrgencyState', () => {
  it('возвращает isActive: false когда нет записи', async () => {
    const state = await getUrgencyState();
    expect(state.isActive).toBe(false);
    expect(state.remainingMs).toBe(0);
    expect(state.remainingFormatted).toBe('00:00:00');
  });

  it('возвращает isActive: true сразу после активации', async () => {
    await activateUrgencyIfNeeded();
    const state = await getUrgencyState();

    expect(state.isActive).toBe(true);
    expect(state.remainingMs).toBeGreaterThan(76 * 60 * 60 * 1000); // > 76 ч (окно 77ч)
    expect(state.remainingMs).toBeLessThanOrEqual(77 * 60 * 60 * 1000);
  });

  it('возвращает isActive: false и чистит storage когда время истекло', async () => {
    // Записываем timestamp 78 часов назад (окно 77ч уже прошло).
    // remainingMs > 0 → активен grace-период «цена сохранена ещё ~2 недели».
    const expiredTs = Date.now() - 78 * 60 * 60 * 1000;
    mockStorage['paywall_urgency_shown_at_v1'] = String(expiredTs);

    const state = await getUrgencyState();

    expect(state.isActive).toBe(false);
    expect(state.remainingMs).toBeGreaterThan(0); // grace-окно ещё идёт
    // shown_at очищается (новый цикл при следующем открытии не запустится)
    expect(mockStorage['paywall_urgency_shown_at_v1']).toBeUndefined();
  });

  it('grace полностью истёк (> 77ч + 14 дней) → всё сброшено', async () => {
    const longAgo = Date.now() - (77 + 14 * 24 + 1) * 60 * 60 * 1000;
    mockStorage['paywall_urgency_shown_at_v1'] = String(longAgo);
    // Истёкший expired-маркер тоже за пределами grace.
    mockStorage['paywall_urgency_expired_at_v1'] = String(Date.now() - 15 * 24 * 60 * 60 * 1000);

    const state = await getUrgencyState();

    expect(state.isActive).toBe(false);
    expect(state.remainingMs).toBe(0);
  });

  it('корректно считает оставшееся время (12 часов назад, окно 77ч)', async () => {
    const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
    mockStorage['paywall_urgency_shown_at_v1'] = String(twelveHoursAgo);

    const state = await getUrgencyState();

    expect(state.isActive).toBe(true);
    // 77ч окно − 12ч прошло = ~65ч осталось (±5 секунд на выполнение теста).
    const expected = (77 - 12) * 60 * 60 * 1000;
    expect(state.remainingMs).toBeGreaterThan(expected - 5000);
    expect(state.remainingMs).toBeLessThanOrEqual(expected);
  });

  it('возвращает isActive: false при невалидном timestamp', async () => {
    mockStorage['paywall_urgency_shown_at_v1'] = 'not-a-number';
    const state = await getUrgencyState();
    expect(state.isActive).toBe(false);
  });
});

// ── formatCountdown ───────────────────────────────────────────────────────────

describe('formatCountdown', () => {
  it('форматирует 24 часа', () => {
    expect(formatCountdown(24 * 60 * 60 * 1000)).toBe('24:00:00');
  });

  it('форматирует 23:47:12', () => {
    const ms = (23 * 3600 + 47 * 60 + 12) * 1000;
    expect(formatCountdown(ms)).toBe('23:47:12');
  });

  it('форматирует 0', () => {
    expect(formatCountdown(0)).toBe('00:00:00');
  });

  it('форматирует отрицательное значение', () => {
    expect(formatCountdown(-1000)).toBe('00:00:00');
  });

  it('форматирует 1 секунду', () => {
    expect(formatCountdown(1000)).toBe('00:00:01');
  });

  it('форматирует 1 минуту', () => {
    expect(formatCountdown(60 * 1000)).toBe('00:01:00');
  });

  it('форматирует 1:00:00', () => {
    expect(formatCountdown(3600 * 1000)).toBe('01:00:00');
  });

  it('добавляет ведущий ноль', () => {
    const ms = (2 * 3600 + 5 * 60 + 9) * 1000;
    expect(formatCountdown(ms)).toBe('02:05:09');
  });
});

// ── getDoubledPrice ───────────────────────────────────────────────────────────

describe('getDoubledPrice', () => {
  // Доллары
  it('$4.99 → $9.98', () => {
    expect(getDoubledPrice('$4.99')).toBe('$9.98');
  });

  it('$9.99 → $19.98', () => {
    expect(getDoubledPrice('$9.99')).toBe('$19.98');
  });

  it('$19.99 → $39.98', () => {
    expect(getDoubledPrice('$19.99')).toBe('$39.98');
  });

  // Рубли (целые)
  it('₽299 → ₽598', () => {
    expect(getDoubledPrice('₽299')).toBe('₽598');
  });

  it('₽1490 → ₽2980', () => {
    expect(getDoubledPrice('₽1490')).toBe('₽2980');
  });

  // Евро с запятой
  it('€9,99 → €19,98', () => {
    expect(getDoubledPrice('€9,99')).toBe('€19,98');
  });

  it('€19,99 → €39,98', () => {
    expect(getDoubledPrice('€19,99')).toBe('€39,98');
  });

  // Реал (бразильский)
  it('R$19,90 → R$39,80', () => {
    expect(getDoubledPrice('R$19,90')).toBe('R$39,80');
  });

  // Рупия (тысячный разделитель)
  it('Rp 79.000 → Rp 158000', () => {
    // Тысячный разделитель: 79.000 = 79000, x2 = 158000
    const result = getDoubledPrice('Rp 79.000');
    // prefix может быть "Rp " или без пробела — проверяем число
    expect(result).not.toBeNull();
    expect(result).toContain('158000');
  });

  // Фунт
  it('£2.99 → £5.98', () => {
    expect(getDoubledPrice('£2.99')).toBe('£5.98');
  });

  // Граничные случаи
  it('возвращает null для пустой строки', () => {
    expect(getDoubledPrice('')).toBeNull();
  });

  it('возвращает null для строки без числа', () => {
    expect(getDoubledPrice('Price pending')).toBeNull();
  });

  it('возвращает null для undefined', () => {
    // @ts-expect-error — тест граничного случая
    expect(getDoubledPrice(undefined)).toBeNull();
  });

  it('не меняет знак валюты', () => {
    const result = getDoubledPrice('$4.99');
    expect(result?.startsWith('$')).toBe(true);
  });

  it('результат содержит то же количество знаков после запятой', () => {
    const result = getDoubledPrice('$4.99');
    const decimalPart = result?.split('.')?.[1];
    expect(decimalPart?.length).toBe(2);
  });
});
