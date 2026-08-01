import { createDisposableAdoption } from '../app/disposable_adoption';

test('immediately disposes a resource that resolves after its owner cleanup', async () => {
  const lifetime = createDisposableAdoption();
  const cleanup = jest.fn();
  lifetime.dispose();

  expect(lifetime.adopt(cleanup)).toBe(false);
  expect(cleanup).toHaveBeenCalledTimes(1);
});

test('disposes each adopted resource once', () => {
  const lifetime = createDisposableAdoption();
  const first = jest.fn();
  const second = jest.fn();
  expect(lifetime.adopt(first)).toBe(true);
  expect(lifetime.adopt(second)).toBe(true);

  lifetime.dispose();
  lifetime.dispose();

  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
});
