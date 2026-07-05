import { pickRemoteBool } from './remote_gates';

describe('remote_gates — pickRemoteBool (серверное чтение feature-флага)', () => {
  it('возвращает fallback, если bools отсутствует', () => {
    expect(pickRemoteBool(undefined, 'gate_ai_dialog_premium', true)).toBe(true);
    expect(pickRemoteBool(undefined, 'gate_ai_dialog_premium', false)).toBe(false);
  });

  it('возвращает fallback, если ключа нет', () => {
    expect(pickRemoteBool({ other: true }, 'gate_ai_dialog_premium', true)).toBe(true);
  });

  it('читает boolean напрямую', () => {
    expect(pickRemoteBool({ gate_ai_dialog_premium: false }, 'gate_ai_dialog_premium', true)).toBe(false);
    expect(pickRemoteBool({ gate_ai_dialog_premium: true }, 'gate_ai_dialog_premium', false)).toBe(true);
  });

  it('ai_global_disable — дефолт FALSE (ИИ работает), пока админ не поставит TRUE', () => {
    // Ключа нет / нет конфига → ИИ включён (fallback false).
    expect(pickRemoteBool(undefined, 'ai_global_disable', false)).toBe(false);
    expect(pickRemoteBool({}, 'ai_global_disable', false)).toBe(false);
    // Админ включил рубильник → true.
    expect(pickRemoteBool({ ai_global_disable: true }, 'ai_global_disable', false)).toBe(true);
    expect(pickRemoteBool({ ai_global_disable: 'true' }, 'ai_global_disable', false)).toBe(true);
  });

  it('приводит строковые "true"/"false"/"1"/"0"', () => {
    expect(pickRemoteBool({ k: 'false' }, 'k', true)).toBe(false);
    expect(pickRemoteBool({ k: 'true' }, 'k', false)).toBe(true);
    expect(pickRemoteBool({ k: '0' }, 'k', true)).toBe(false);
    expect(pickRemoteBool({ k: '1' }, 'k', false)).toBe(true);
  });

  it('приводит числовые 0/1', () => {
    expect(pickRemoteBool({ k: 0 }, 'k', true)).toBe(false);
    expect(pickRemoteBool({ k: 1 }, 'k', false)).toBe(true);
  });

  it('некорректное значение → fallback', () => {
    expect(pickRemoteBool({ k: 'maybe' }, 'k', true)).toBe(true);
    expect(pickRemoteBool({ k: 7 }, 'k', false)).toBe(false);
    expect(pickRemoteBool({ k: null }, 'k', true)).toBe(true);
  });
});
