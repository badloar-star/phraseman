export function completeAnalyticsLoad(current, snapshot, rangeDays) {
  if (snapshot?.state === 'error') {
    return {
      status: 'error',
      snapshot: current.snapshot,
      error: 'Все источники аналитики недоступны. Последний успешный снимок сохранён.',
      rangeDays,
    };
  }
  return {
    status: snapshot?.state || 'ready',
    snapshot,
    error: '',
    rangeDays,
  };
}
