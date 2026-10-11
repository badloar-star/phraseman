/**
 * Шаги «добраться до состояния» для робота пакетной съёмки (scripts/parity_batch_shoot.mjs).
 *
 * зачем (координатор 12.10, поправка Сверки): у 476 из 503 строк DEV_LINKS_R1 ссылка общая с соседями, а состояние добирается
 * тапами. Вместо координат Pixel_8 (ломаются от любого сдвига вёрстки) шаги ищут элемент по testID или по видимому тексту
 * в `uiautomator dump` и жмут в центр его рамки — работает на любом разрешении и после правок вёрстки.
 *
 * Грамматика (шаги через «;», в документе — в колонке «тапы»):
 *   tap:#fc-saved-actions        нажать элемент с testID (resource-id)
 *   tap:Отметить несколько       нажать элемент с таким текстом / content-desc (сначала точное совпадение, потом «содержит»)
 *   tap:#fc-gallery-tile-*       testID по префиксу (любая плитка); `@2` в конце — второй подходящий элемент: `tap:#fc-gallery-tile-*@2`
 *   see:#id | see:Текст          прокрутить так, чтобы элемент оказался на экране (без нажатия); tap/long/swipe сами подкручивают, если элемент за краем
 *   long:#id | long:Текст        долгое нажатие (900 мс)
 *   swipe-left:Текст | swipe-right:Текст   свайп поперёк рамки элемента (удаление свайпом)
 *   type:abc                     ввести ASCII-текст в сфокусированное поле (кириллицу `input text` не умеет)
 *   back | key:ENTER             системная кнопка / клавиша
 *   scroll:down | scroll:up      прокрутка экрана
 *   wait:600                     пауза, мс
 *   xy:540,1200                  последнее средство: тап по координатам
 */
const OPS_WITH_TARGET = new Set(['tap', 'long', 'swipe-left', 'swipe-right', 'see']);
const OPS_NO_TARGET = new Set(['back']);
const OPS_WITH_VALUE = new Set(['type', 'key', 'scroll', 'wait', 'xy']);

export function parseSteps(raw) {
  const text = String(raw ?? '').replace(/`/g, '').trim();
  if (!text || text === '—' || text === '-') return [];
  return text.split(';').map((part) => part.trim()).filter(Boolean).map((part) => {
    const at = part.indexOf(':');
    const op = (at < 0 ? part : part.slice(0, at)).trim();
    const value = at < 0 ? '' : part.slice(at + 1).trim();
    if (OPS_NO_TARGET.has(op)) return { op, value: '' };
    if (OPS_WITH_TARGET.has(op)) {
      if (!value) throw new Error(`step_no_target:${part}`);
      return { op, value };
    }
    if (OPS_WITH_VALUE.has(op)) {
      if (!value) throw new Error(`step_no_value:${part}`);
      if (op === 'wait' && !/^\d{1,5}$/.test(value)) throw new Error(`step_bad_wait:${part}`);
      if (op === 'xy' && !/^\d{1,4},\d{1,4}$/.test(value)) throw new Error(`step_bad_xy:${part}`);
      if (op === 'scroll' && !/^(down|up)$/.test(value)) throw new Error(`step_bad_scroll:${part}`);
      if (op === 'type' && !/^[\x20-\x7e]+$/.test(value)) throw new Error(`step_type_not_ascii:${part}`);
      if (op === 'key' && !/^[A-Z_]+$/.test(value)) throw new Error(`step_bad_key:${part}`);
      return { op, value };
    }
    throw new Error(`step_unknown_op:${part}`);
  });
}

const decodeXml = (s) => s.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

export function parseUiNodes(xml) {
  const nodes = [];
  for (const m of String(xml).matchAll(/<node\b[^>]*>/g)) {
    const tag = m[0];
    const attr = (name) => {
      const found = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
      return found ? decodeXml(found[1]) : '';
    };
    const bounds = attr('bounds').match(/\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]/);
    if (!bounds) continue;
    const [left, top, right, bottom] = bounds.slice(1).map(Number);
    nodes.push({ text: attr('text'), desc: attr('content-desc'), id: attr('resource-id'), left, top, right, bottom });
  }
  return nodes;
}

export function findNode(nodes, selector) {
  // зачем: `#fc-gallery-tile-*` — любая плитка (id карточек в демо не фиксируем), `@2` в конце — второй подходящий элемент
  let sel = selector.trim();
  let nth = 1;
  const nthMatch = sel.match(/@(\d{1,2})$/);
  if (nthMatch) { nth = Number(nthMatch[1]); sel = sel.slice(0, nthMatch.index).trim(); }
  const usable = (n) => n.right > n.left && n.bottom > n.top;
  const pick = (list) => list[nth - 1] ?? null;
  if (sel.startsWith('#')) {
    const id = sel.slice(1);
    if (id.endsWith('*')) {
      const prefix = id.slice(0, -1);
      return pick(nodes.filter((n) => usable(n) && n.id.split(/[/:]/).pop().startsWith(prefix)));
    }
    return pick(nodes.filter((n) => usable(n) && (n.id === id || n.id.endsWith(`/${id}`) || n.id.endsWith(`:${id}`))));
  }
  const want = sel.toLowerCase();
  const lower = (s) => s.toLowerCase();
  const tiers = [
    nodes.filter((n) => usable(n) && lower(n.text) === want),
    nodes.filter((n) => usable(n) && lower(n.desc) === want),
    nodes.filter((n) => usable(n) && lower(n.text).includes(want)),
    nodes.filter((n) => usable(n) && lower(n.desc).includes(want)),
  ];
  for (const tier of tiers) {
    const found = pick(tier);
    if (found) return found;
  }
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const centre = (n) => [Math.round((n.left + n.right) / 2), Math.round((n.top + n.bottom) / 2)];

/**
 * @param {(args: string[], opts?: object) => string} run  вызов adb для устройства (бросает при ошибке)
 * @param {Array<{op: string, value: string}>} steps
 * @param {{ stepTimeoutMs?: number, pollMs?: number, afterStepMs?: number, log?: (msg: string) => void }} [opts]
 */
export async function runSteps(run, steps, opts = {}) {
  const { stepTimeoutMs = 6000, pollMs = 500, afterStepMs = 700, log = () => {} } = opts;
  const dump = () => {
    run(['shell', 'rm', '-f', '/sdcard/phm_ui.xml']); // зачем: uiautomator dump оставляет СТАРЫЙ файл при пустом экране (память 2026-10-11)
    run(['shell', 'uiautomator', 'dump', '/sdcard/phm_ui.xml'], { timeout: 20_000 });
    return parseUiNodes(run(['exec-out', 'cat', '/sdcard/phm_ui.xml'], { timeout: 20_000 }));
  };
  const snapshot = () => {
    try {
      return dump();
    } catch (error) {
      log(`dump не снят (повторим): ${String(error).slice(0, 160)}`); // зачем: сбой снимка дерева не должен ронять шаг — повтор до потолка
      return [];
    }
  };
  const waitNode = async (selector) => {
    const started = Date.now();
    for (;;) {
      const nodes = snapshot();
      const node = findNode(nodes, selector);
      if (node) return { node, screen: nodes[0] ?? null };
      if (Date.now() - started >= stepTimeoutMs) throw new Error(`step_target_not_found:${selector}`);
      await sleep(pollMs);
    }
  };
  const swipeScreen = (screen, dir) => {
    const height = screen ? screen.bottom - screen.top : 2400;
    const x = screen ? Math.round((screen.left + screen.right) / 2) : 540;
    const [from, to] = dir === 'down' ? [Math.round(height * 0.7), Math.round(height * 0.3)] : [Math.round(height * 0.3), Math.round(height * 0.7)];
    run(['shell', 'input', 'swipe', String(x), String(from), String(x), String(to), '400']);
  };
  // зачем: элемент ниже/выше экрана (блок «Free и Plus» на пейволе) tap-ом не достать — прокручиваем до 6 раз, каждый раз заново снимая дерево
  const bringIntoView = async (selector) => {
    let found = await waitNode(selector);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { node, screen } = found;
      const top = screen ? screen.top : 0;
      const bottom = screen ? screen.bottom : 2400;
      const centreY = (node.top + node.bottom) / 2;
      // зачем: прокручиваем только если ЦЕНТР за краем экрана — кнопки у нижней кромки («Начать», «Купить») трогать прокруткой нельзя
      if (centreY > bottom - 60) swipeScreen(screen, 'down');
      else if (centreY < top + 60) swipeScreen(screen, 'up');
      else return node;
      await sleep(600);
      found = await waitNode(selector);
    }
    log(`элемент ${selector} не удалось вывести на экран за 6 прокруток — жмём как есть`); // guard-ok: причина, по которой тап может промахнуться
    return found.node;
  };
  for (const step of steps) {
    log(`шаг ${step.op}${step.value ? `:${step.value}` : ''}`);
    if (step.op === 'wait') { await sleep(Number(step.value)); continue; }
    if (step.op === 'back') run(['shell', 'input', 'keyevent', '4']);
    else if (step.op === 'key') run(['shell', 'input', 'keyevent', `KEYCODE_${step.value}`]);
    else if (step.op === 'type') run(['shell', 'input', 'text', step.value.replace(/ /g, '%s')]);
    else if (step.op === 'xy') run(['shell', 'input', 'tap', ...step.value.split(',')]);
    else if (step.op === 'scroll') {
      const root = snapshot()[0];
      const height = root ? root.bottom - root.top : 2400;
      const x = root ? Math.round((root.left + root.right) / 2) : 540;
      const [from, to] = step.value === 'down' ? [Math.round(height * 0.7), Math.round(height * 0.3)] : [Math.round(height * 0.3), Math.round(height * 0.7)];
      run(['shell', 'input', 'swipe', String(x), String(from), String(x), String(to), '400']);
    } else {
      const node = await bringIntoView(step.value);
      const [cx, cy] = centre(node);
      if (step.op === 'see') { /* только прокрутка до видимости */ }
      else if (step.op === 'tap') run(['shell', 'input', 'tap', String(cx), String(cy)]);
      else if (step.op === 'long') run(['shell', 'input', 'swipe', String(cx), String(cy), String(cx), String(cy), '900']);
      else {
        const width = node.right - node.left;
        const a = Math.round(node.left + width * (step.op === 'swipe-left' ? 0.85 : 0.15));
        const b = Math.round(node.left + width * (step.op === 'swipe-left' ? 0.15 : 0.85));
        run(['shell', 'input', 'swipe', String(a), String(cy), String(b), String(cy), '250']);
      }
    }
    await sleep(afterStepMs);
  }
}

export function describeSteps(steps) {
  return steps.map((s) => `${s.op}${s.value ? `:${s.value}` : ''}`);
}
