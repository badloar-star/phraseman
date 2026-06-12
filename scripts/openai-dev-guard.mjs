export function requireOpenAiDevSpendGuard({ action, estimatedCostUsd = null, units = null }) {
  if (process.env.PHRASEMAN_ALLOW_OPENAI_DEV_SPEND === '1') return;

  const cost = Number.isFinite(Number(estimatedCostUsd))
    ? ` Estimated cost: $${Number(estimatedCostUsd).toFixed(4)}.`
    : '';
  const planned = units == null ? '' : ` Planned units: ${units}.`;
  throw new Error(
    `[openai-dev-guard] ${action} is blocked.${planned}${cost} ` +
      'Run a dry-run/cost estimate first, then set PHRASEMAN_ALLOW_OPENAI_DEV_SPEND=1 to spend intentionally.',
  );
}
