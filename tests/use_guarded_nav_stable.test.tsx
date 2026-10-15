// зачем (координатор 15.10, «перерисовки Главной»): useGuardedNav возвращает один и тот же объект между рендерами (пока роутер тот же), иначе всё, что держит `nav` в зависимостях,
// пересоздаётся на каждом рендере экрана; двойной тап по-прежнему гасится окном 600 мс.
import { renderHook } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRouter = { push: mockPush, replace: mockReplace };
jest.mock('expo-router', () => ({ useRouter: () => mockRouter }));

import { useGuardedNav } from '../hooks/use-guarded-nav';

beforeEach(() => { jest.clearAllMocks(); });

test('объект навигации не меняется между рендерами', async () => {
  const { result, rerender } = await renderHook(() => useGuardedNav());
  const first = result.current;
  await rerender({});
  await rerender({});
  expect(result.current).toBe(first);
  expect(result.current.push).toBe(first.push);
});

test('второй push в окне 600 мс игнорируется', async () => {
  const { result } = await renderHook(() => useGuardedNav());
  result.current.push('/a' as never);
  result.current.push('/a' as never);
  expect(mockPush).toHaveBeenCalledTimes(1);
});
