/**
 * Проверки здоровья среды для робота съёмки (scripts/parity_batch_shoot.mjs): Metro и «битые» экраны.
 *
 * зачем (координатор 12.10): кадр cards-007 попал на красный экран «Unable to load script…» — сторож перезапускал Metro; зависшее «DEV-STATE…» и красные
 * страницы ошибок тоже нельзя принимать за кадр. Робот перед каждым id ждёт Metro и после кадра распознаёт такие экраны по `uiautomator dump`.
 */

export const METRO_DOWN_PATTERNS = [/Unable to load script/i, /Could not connect to development server/i, /running Metro/i, /Make sure you['’]re running/i];
export const REDBOX_PATTERNS = [/Render Error/i, /Unhandled JS Exception/i, /Uncaught Error/i, /Invariant Violation/i, /Unable to resolve module/i, /ReferenceError:/, /TypeError:/];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Metro жив, если /status отвечает «packager-status:running». Любая ошибка сети = не жив (причина — в возврате). */
export async function metroRunning(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    const text = await response.text();
    return { running: text.includes('packager-status:running'), detail: text.trim().slice(0, 60) || `http_${response.status}` };
  } catch (error) {
    return { running: false, detail: String(error?.message ?? error).slice(0, 80) };
  } finally {
    clearTimeout(timer);
  }
}

/** Ждать Metro до maxMs; возвращает { ok, waitedMs, detail }. */
export async function waitMetro(url, maxMs, pollMs = 2000, log = () => {}) {
  const started = Date.now();
  let last = { running: false, detail: 'не опрашивался' };
  for (;;) {
    last = await metroRunning(url);
    if (last.running) return { ok: true, waitedMs: Date.now() - started, detail: last.detail };
    if (Date.now() - started >= maxMs) return { ok: false, waitedMs: Date.now() - started, detail: last.detail };
    log(`Metro не отвечает (${last.detail}) — ждём`);
    await sleep(pollMs);
  }
}

const decodeXml = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/**
 * По дампу uiautomator: 'metro_down' | 'redbox' | 'fixture_hang' | null.
 * fixture_hang — на экране висит «DEV-STATE…» (экран фикстуры ещё применяет состояние; «DEV-STATE OK» — норма и сюда не попадает).
 */
export function classifyScreenXml(xml) {
  const text = String(xml ?? '');
  const labels = [...text.matchAll(/\s(?:text|content-desc)="([^"]*)"/g)].map((m) => decodeXml(m[1])).join('\n');
  if (METRO_DOWN_PATTERNS.some((rx) => rx.test(labels))) return 'metro_down';
  if (REDBOX_PATTERNS.some((rx) => rx.test(labels))) return 'redbox';
  if (/(^|\n)DEV-STATE(\.\.\.|…)\s*(\n|$)/.test(labels)) return 'fixture_hang';
  return null;
}
