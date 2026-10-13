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
 *   await:Текст | await:#id     ждать появления элемента (до таймаута шага), НИЧЕГО не нажимая и не прокручивая — для тостов у нижней кромки, которые `see` бы «подкрутил» свайпом
 *   long:#id | long:Текст        долгое нажатие (1500 мс: 900 мс не хватало — шторка «Удалить» в cards-034 не открывалась)
 *   swipe-left:Текст | swipe-right:Текст   свайп поперёк рамки элемента (удаление свайпом)
 *   type:abc                     ввести ASCII-текст в сфокусированное поле (кириллицу `input text` не умеет)
 *   back | key:ENTER             системная кнопка / клавиша
 *   hidekb                       убрать экранную клавиатуру, ТОЛЬКО если она показана (dumpsys input_method: mInputShown=true); `back` без клавиатуры выходит с экрана (кадры settings-gap-023/profile-015: после ввода оказались на Главной)
 *   scroll:down | scroll:up      прокрутка экрана
 *   wait:600                     пауза, мс
 *   settle:0                     мета-шаг строки: пауза перед снимком вместо --settle-ms (для коротких состояний вроде «ИИ печатает»); шагом не выполняется, а предыдущий шаг не ждёт afterStepMs
 *   xy:540,1200                  последнее средство: тап по координатам
 */
export const LONG_PRESS_MS = 1500;
const OPS_WITH_TARGET = new Set(['tap', 'long', 'swipe-left', 'swipe-right', 'see', 'await']);
const OPS_NO_TARGET = new Set(['back', 'hidekb']);
const OPS_WITH_VALUE = new Set(['type', 'key', 'scroll', 'wait', 'xy', 'settle']);

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
      if ((op === 'wait' || op === 'settle') && !/^\d{1,5}$/.test(value)) throw new Error(`step_bad_wait:${part}`);
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
  // зачем (сбои ROBOT8/ROBOT9, 12.10): uiautomator отдаёт только ВИДИМЫЕ узлы — кнопка «Отмена подписки», «Добавить карточку» в редакторе набора, переключатель сравнения на пейволе
  // лежат ниже экрана, и шаг падал с step_target_not_found, хотя элемент есть. Если дерево пришло (nodes > 0), а элемента нет, после паузы прокручиваем вниз и ищем снова (до 8 раз);
  // пустое дерево (хаб Карточек с бесконечной анимацией) не листаем вслепую. `scroll:false` — для шага `await` (тосты у нижней кромки не трогаем).
  const SEARCH_SCROLLS = 8;
  const SEARCH_AFTER_MS = 1500;
  const waitNode = async (selector, { scroll = true } = {}) => {
    const started = Date.now();
    let scrolls = 0;
    let budget = stepTimeoutMs;
    for (;;) {
      const nodes = snapshot();
      const node = findNode(nodes, selector);
      if (node) return { node, screen: nodes[0] ?? null };
      const elapsed = Date.now() - started;
      if (scroll && nodes.length > 0 && scrolls < SEARCH_SCROLLS && elapsed >= SEARCH_AFTER_MS) {
        scrolls += 1;
        budget += 2500;
        log(`элемент ${selector} не виден — ищем прокруткой вниз (${scrolls}/${SEARCH_SCROLLS})`); // guard-ok: причина действия
        swipeScreen(nodes[0], 'down');
        await sleep(500);
        continue;
      }
      if (elapsed >= budget) throw new Error(`step_target_not_found:${selector}`);
      await sleep(pollMs);
    }
  };
  // зачем (cards-gap-021, 12.10): строка шторки найдена в дереве В МОМЕНТ анимации появления — тап по устаревшим границам промахивался, шаг «проходил», а действие не случалось.
  // Перед тапом ждём, пока границы узла перестанут меняться (до 3 перепроверок).
  const settleNode = async (selector, first) => {
    let current = first;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await sleep(350);
      const again = findNode(snapshot(), selector);
      if (!again) return current;
      const same = Math.abs(again.top - current.top) <= 4 && Math.abs(again.left - current.left) <= 4
        && Math.abs(again.bottom - current.bottom) <= 4 && Math.abs(again.right - current.right) <= 4;
      current = again;
      if (same) return current;
      log(`границы ${selector} ещё меняются (анимация) — перепроверка ${attempt + 1}/3`); // guard-ok: причина паузы
    }
    return current;
  };
  const swipeScreen = (screen, dir) => {
    const height = screen ? screen.bottom - screen.top : 2400;
    const x = screen ? Math.round((screen.left + screen.right) / 2) : 540;
    const [from, to] = dir === 'down' ? [Math.round(height * 0.7), Math.round(height * 0.3)] : [Math.round(height * 0.3), Math.round(height * 0.7)];
    run(['shell', 'input', 'swipe', String(x), String(from), String(x), String(to), '400']);
  };
  // зачем: элемент ниже/выше экрана (блок «Free и Plus» на пейволе) tap-ом не достать — прокручиваем до 6 раз, каждый раз заново снимая дерево
  const bringIntoView = async (selector, bottomMargin = 60) => {
    let found = await waitNode(selector);
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const { node, screen } = found;
      const top = screen ? screen.top : 0;
      const bottom = screen ? screen.bottom : 2400;
      const centreY = (node.top + node.bottom) / 2;
      // зачем: прокручиваем только если ЦЕНТР за краем экрана — кнопки у нижней кромки («Начать», «Купить») трогать прокруткой нельзя
      if (centreY > bottom - bottomMargin) { log(`bringIntoView ${selector}: центр y=${centreY} ниже границы ${bottom - bottomMargin} — прокрутка вниз (попытка ${attempt + 1})`); swipeScreen(screen, 'down'); }
      else if (centreY < top + 60) { log(`bringIntoView ${selector}: центр y=${centreY} выше границы ${top + 60} — прокрутка вверх (попытка ${attempt + 1})`); swipeScreen(screen, 'up'); }
      else return node;
      await sleep(600);
      found = await waitNode(selector);
    }
    log(`элемент ${selector} не удалось вывести на экран за 6 прокруток — жмём как есть`); // guard-ok: причина, по которой тап может промахнуться
    return found.node;
  };
  // зачем (Авторизация 13.10): клавиша «назад» прошлой строки включает режим клавиатурного фокуса — на кадрах серая подложка вокруг кнопок; касание по шапке (центр) сбрасывает режим
  if (steps.some((st) => ['tap', 'long', 'see', 'swipe-left', 'swipe-right'].includes(st.op))) {
    run(['shell', 'input', 'tap', '540', '160']);
    await sleep(300);
  }
  for (let index = 0; index < steps.length; index += 1) {
    const step = steps[index];
    if (step.op === 'settle') continue; // мета-шаг: читает робот, а не исполнитель
    log(`шаг ${step.op}${step.value ? `:${step.value}` : ''}`);
    if (step.op === 'wait') { await sleep(Number(step.value)); continue; }
    // зачем (Макеты cards-gap-034, 12.10): тост «не скачан» живёт у нижней кромки — `see` подкрутил бы экран свайпом; ждём только появления
    if (step.op === 'await') { await waitNode(step.value, { scroll: false }); continue; }
    // зачем (Макеты 12.10, ответ Сверке «после type кадры на Главной»): на эмуляторе с аппаратной клавиатурой экранная не показывается, и `back` уходил с экрана
    if (step.op === 'hidekb') {
      const ime = String(run(['shell', 'dumpsys', 'input_method']) ?? '');
      const shown = /mInputShown=true/.test(ime);
      log(`hidekb: клавиатура ${shown ? 'показана — скрываю' : 'не показана — ничего не делаю'}`);
      if (shown) run(['shell', 'input', 'keyevent', '4']);
      continue;
    }
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
      // see: запас снизу 320 px — над таб-баром/нижней панелью, иначе следующий tap попадает в неё, а не в строку
      // зачем (Авторизация/Сверка 13.10, paywalls-023): центр кнопки в 60 px от низа попадал в полосу жестов — шаг «проходил», а экран не менялся; запас 130 px
      const found = await bringIntoView(step.value, step.op === 'see' ? 320 : 130);
      const node = step.op === 'see' ? found : await settleNode(step.value, found);
      const [cx, cy] = centre(node);
      log(`${step.op} ${step.value} → x=${cx} y=${cy} bounds=[${node.left},${node.top}][${node.right},${node.bottom}] после_bringIntoView=да`); // зачем (координатор 13.10): координаты тапа в журнал — чтобы вопросы «тап ушёл за экран?» решались по журналу
      if (step.op === 'see') { /* только прокрутка до видимости */ }
      else if (step.op === 'tap') run(['shell', 'input', 'tap', String(cx), String(cy)]);
      else if (step.op === 'long') run(['shell', 'input', 'swipe', String(cx), String(cy), String(cx), String(cy), String(LONG_PRESS_MS)]); // зачем (координатор 12.10, cards-034): удержание 1500 мс
      else {
        const width = node.right - node.left;
        const a = Math.round(node.left + width * (step.op === 'swipe-left' ? 0.85 : 0.15));
        const b = Math.round(node.left + width * (step.op === 'swipe-left' ? 0.15 : 0.85));
        run(['shell', 'input', 'swipe', String(a), String(cy), String(b), String(cy), '250']);
      }
    }
    // зачем: перед мета-шагом settle пауза после тапа не нужна — окно «ИИ печатает» живёт 1,5 с
    if (steps[index + 1]?.op === 'settle') continue;
    await sleep(afterStepMs);
  }
}

export function describeSteps(steps) {
  return steps.map((s) => `${s.op}${s.value ? `:${s.value}` : ''}`);
}
