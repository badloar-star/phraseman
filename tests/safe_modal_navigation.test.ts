describe('safe modal navigation', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.resetModules();
    jest.dontMock('react-native');
  });

  it('prepares the destination synchronously after asking the modal to close', () => {
    const { navigateAfterModalClose } = jest.requireActual<typeof import('../app/safe_modal_navigation')>(
      '../app/safe_modal_navigation',
    );
    const close = jest.fn();
    const navigate = jest.fn();

    navigateAfterModalClose(close, navigate);

    expect(close).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(close.mock.invocationCallOrder[0]).toBeLessThan(navigate.mock.invocationCallOrder[0]);
  });

  it('keeps the native lifecycle gap separate for HybridSheetShell observers', () => {
    const { NATIVE_MODAL_DISMISS_GAP_MS } = jest.requireActual<typeof import('../app/safe_modal_navigation')>(
      '../app/safe_modal_navigation',
    );
    expect(NATIVE_MODAL_DISMISS_GAP_MS).toBe(360);
  });
});
