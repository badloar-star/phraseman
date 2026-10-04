
import { swallowed } from './swallowed_error'; // зачем: PM-229 — немой catch пишет причину [PM-229]/** Best-effort Expo push transport shared by social notifications. */
export type ExpoPushTransport = 'sent' | 'failed' | 'timeout' | 'skipped';

export async function sendExpoPush(
  token: string,
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<ExpoPushTransport> {
  const to = String(token ?? '').trim();
  if (!to) return 'skipped';
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | null = null;
  try {
    const request = fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{ to, sound: 'default', title, body, data }]),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return 'failed' as const;
        const payload = await response.json().catch(swallowed('expo_push:json', null)) as { data?: Array<{ status?: string }> } | null;
        const tickets = Array.isArray(payload?.data) ? payload!.data! : [];
        return tickets.length > 0 && tickets.every((ticket) => ticket?.status === 'ok')
          ? 'sent' as const
          : 'failed' as const;
      })
      .catch(() => controller.signal.aborted ? 'timeout' as const : 'failed' as const);
    const deadline = new Promise<'timeout'>((resolve) => {
      timeout = setTimeout(() => {
        controller.abort();
        resolve('timeout');
      }, 2_000);
    });
    return await Promise.race([request, deadline]);
  } catch {
    return controller.signal.aborted ? 'timeout' : 'failed';
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
