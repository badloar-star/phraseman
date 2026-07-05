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

export function requireCodexOpenAiTtsOnly({ action, endpoint }) {
  if (!process.env.CODEX_THREAD_ID) return;
  if (endpoint === 'audio/speech') return;
  throw new Error(
    `[codex-openai-firewall] ${action} is blocked in Codex sessions. ` +
      'Codex may use the project OpenAI API only for TTS voiceover generation via /v1/audio/speech. ' +
      'Use Firebase user runtime, local files, or an exported report instead.',
  );
}
