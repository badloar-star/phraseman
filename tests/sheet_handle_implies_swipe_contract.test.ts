// зачем (владелец через координатора 14.10, расследование «закрыл шторку — всё зависло»): если у шторки нарисована «ручка»,
// свайп вниз обязан её закрывать тем же путём, что крестик/фон. Сторож ловит новую шторку с ручкой без свайпа.
// Допустимо ровно одно из: оболочка со свайпом (HybridSheetShell / KitSheetModal), SheetSwipeClose, собственный Gesture.Pan / PanResponder
// либо запись в EXEMPT с причиной. Сработал — подключи SheetSwipeClose (components/modal_fx), а не расширяй список.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8').split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));

/** Нарисованная ручка: <View style={…styles.grab|grabber|grabberPill|handle…}> */
const HANDLE_JSX = /<View[^>]*style=\{\[?\s*styles\.(grab|grabber|grabberPill|handle)\b/;
const SWIPE_OK = /HybridSheetShell|KitSheetModal|SheetSwipeClose|Gesture\.Pan\(|PanResponder\.create/;

/** Файл → причина. Пейвол Plus ведёт Авторизация (gestureEnabled:false у route, правит она); сами оболочки — источник свайпа. */
const EXEMPT: Readonly<Record<string, string>> = {
  'components/paywall/PaywallPlus.tsx': 'пейвол Plus — зона Авторизации (момент оплаты: ручку прячет она)',
  'components/modal_fx/HybridSheetShell.tsx': 'оболочка: свайп встроен (Gesture.Pan), при dismissDisabled ручка скрыта',
  'components/v2/KitSheetModal.tsx': 'оболочка: свайп по ручке и шапке',
};

function walk(dir: string, out: string[]): void {
  for (const name of fs.readdirSync(path.join(ROOT, dir))) {
    const rel = `${dir}/${name}`;
    const stat = fs.statSync(path.join(ROOT, rel));
    if (stat.isDirectory()) { if (name !== 'node_modules' && name !== 'generated') walk(rel, out); } else if (/\.tsx$/.test(name)) out.push(rel);
  }
}

describe('ручка шторки ⇒ свайп вниз закрывает', () => {
  const files: string[] = [];
  walk('app', files);
  walk('components', files);
  const withHandle = files.filter((f) => HANDLE_JSX.test(read(f)));

  it('находит шторки с ручкой (иначе сторож слеп)', () => {
    expect(withHandle.length).toBeGreaterThan(15);
  });

  it('у каждой шторки с ручкой есть свайп или запись в EXEMPT', () => {
    const bad = withHandle.filter((f) => !SWIPE_OK.test(read(f)) && !EXEMPT[f]);
    expect(bad).toEqual([]);
  });

  it('помощник свайпа закрывает тем же onClose и тем же порогом, что оболочка', () => {
    const helper = read('components/modal_fx/SheetSwipeClose.tsx');
    expect(helper).toContain('SHEET.dragClosePx');
    expect(helper).toContain('SHEET.dragCloseVelocity');
    // лист едет за пальцем внешним слоем со своим translateY, не закрылась — пружина назад, закрытие не состоялось — лист возвращается
    expect(helper).toContain('translateY: drag.value');
    expect(helper).toContain('withSpring(0, SHEET.dragReturn)');
    expect(helper).toContain('закрытие не состоялось, лист возвращён на место');
    expect(helper).toContain('useReducedMotion');
    expect(helper).toContain('[SHEET-SWIPE] close source=swipe id=${name}');
    // жест живёт только в верхней зоне листа (ручка + шапка): тело со списком/полем прокручивается как обычно
    expect(helper).toContain('.hitSlop({ top: 0, height: zoneHeight })');
    expect(helper).toContain('runOnJS(startClose)()');
  });

  it('пока идёт сохранение/отправка/покупка, свайп выключен и ручка спрятана', () => {
    expect(read('components/ReportErrorButton.tsx')).toContain('enabled={!sending}');
    expect(read('components/ReportErrorButton.tsx')).toContain('{sending ? null : <View style={[styles.grabber');
    expect(read('components/ExplainReportButton.tsx')).toContain('enabled={!sending}');
    expect(read('components/profile-card/ProfileCardProSheet.tsx')).toContain('enabled={!busy}');
    expect(read('components/profile-card/ProfileCardBioSheet.tsx')).toContain('enabled={!saving}');
  });

  it('оболочка HybridSheetShell прячет ручку, когда закрытие запрещено', () => {
    expect(read('components/modal_fx/HybridSheetShell.tsx')).toContain('{dismissDisabled ? null : (');
  });

  it('там, где свайп подключён к собственному Modal, есть корень жестов', () => {
    for (const f of withHandle) {
      const src = read(f);
      if (!/SheetSwipeClose/.test(src) || !/<Modal\b|<MotionModal\b/.test(src)) continue;
      expect([f, /SheetSwipeRoot/.test(src)]).toEqual([f, true]);
    }
  });
});
