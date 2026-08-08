/* eslint-disable @typescript-eslint/no-require-imports */

function createLifecycle(initialVisible = true) {
  const lifecycleModule = require('../components/auth_prompt_attempt_lifecycle');
  return lifecycleModule.createAuthPromptAttemptLifecycle(initialVisible);
}

test('one attempt stays authoritative and hide invalidates its late result', () => {
  const lifecycle = createLifecycle();
  const firstToken = lifecycle.startAttempt();

  expect(firstToken).toBe(1);
  expect(lifecycle.startAttempt()).toBeNull();
  expect(lifecycle.isCurrent(firstToken)).toBe(true);

  lifecycle.setVisible(false);
  expect(lifecycle.isCurrent(firstToken)).toBe(false);
  expect(lifecycle.completeAttempt(firstToken)).toBe(false);

  lifecycle.setVisible(true);
  const secondToken = lifecycle.startAttempt();
  expect(secondToken).toBe(2);
  expect(lifecycle.isCurrent(firstToken)).toBe(false);
  expect(lifecycle.completeAttempt(firstToken)).toBe(false);
  expect(lifecycle.isCurrent(secondToken)).toBe(true);
  expect(lifecycle.completeAttempt(secondToken)).toBe(true);
});

test('unmount invalidates the token until a fresh mount setup', () => {
  const lifecycle = createLifecycle();
  const token = lifecycle.startAttempt();

  lifecycle.unmount();

  expect(lifecycle.isCurrent(token)).toBe(false);
  expect(lifecycle.completeAttempt(token)).toBe(false);
  expect(lifecycle.startAttempt()).toBeNull();

  lifecycle.mount();
  lifecycle.setVisible(true);
  expect(lifecycle.startAttempt()).toBe(2);
  expect(lifecycle.isCurrent(token)).toBe(false);
});
