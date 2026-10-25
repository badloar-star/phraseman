// зачем (аудит «назад» и Optimistic UI 26.10, зона 5 · ВХОД): окно входа отбивает «назад»/«Позже», пока идёт вход или
// восстановление, — это верно, но каждый такой ранний выход обязан писать причину (раньше был немым).
import { readSource } from './helpers/read_source';

it('окно входа: каждый отбитый «закрыть» пишет причину', () => {
  const src = readSource('components/RegistrationPromptModal.tsx');
  const fn = src.slice(src.indexOf('const dismissSheet = useCallback(() => {'), src.indexOf('const closeAfterSwipe'));
  for (const reason of ['clean_recovery_cancelling', 'sign_in_in_flight', 'recovery_not_dismissible']) {
    expect(fn).toContain(`dismiss ignored reason=${reason}`);
  }
  expect(fn).not.toMatch(/\) return;/);
});
