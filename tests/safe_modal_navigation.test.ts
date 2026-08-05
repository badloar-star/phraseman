describe('safe modal navigation', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.resetModules();
    jest.dontMock('react-native');
  });

  it('waits for the full native-modal dismissal gap on iOS before navigating', () => {
    jest.useFakeTimers();
    const runAfterInteractions = jest.fn((work: () => void) => {
      work();
      return { cancel: jest.fn() };
    });
    jest.doMock('react-native', () => ({
      InteractionManager: { runAfterInteractions },
      Platform: { OS: 'ios' },
    }));

    const { navigateAfterModalClose } = jest.requireActual<typeof import('../app/safe_modal_navigation')>(
      '../app/safe_modal_navigation',
    );
    const close = jest.fn();
    const navigate = jest.fn();

    navigateAfterModalClose(close, navigate);

    expect(close).toHaveBeenCalledTimes(1);
    expect(runAfterInteractions).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(359);
    expect(navigate).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('keeps the same dismissal safety gap on Android native modals', () => {
    jest.useFakeTimers();
    const runAfterInteractions = jest.fn((work: () => void) => {
      work();
      return { cancel: jest.fn() };
    });
    jest.doMock('react-native', () => ({
      InteractionManager: { runAfterInteractions },
      Platform: { OS: 'android' },
    }));

    const { navigateAfterModalClose } = jest.requireActual<typeof import('../app/safe_modal_navigation')>(
      '../app/safe_modal_navigation',
    );
    const navigate = jest.fn();

    navigateAfterModalClose(jest.fn(), navigate);

    jest.advanceTimersByTime(359);
    expect(navigate).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});
