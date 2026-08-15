/* ============================================================================
   НАПРАВЛЕНИЕ III — «МЕТРОНОМ». Ритм, цифры, линии.
   Ни свечений, ни ударов, ни частиц. Всё держится на точной сетке времени,
   считающихся числах и линиях, которые прочерчиваются.
   ========================================================================== */

const sp = (t, f) => ENGINE.origami(t, f);
const RS = (mass, damping, stiffness) => ({ mass, damping, stiffness });

/* Вся система живёт на сетке 60мс. Ни одной длительности вне кратности. */
const B = 60;
const TOK = {
  beat: B,
  line: { duration: B * 6, ease: 'out' },     // 360мс — линия прочерчивается
  text: { duration: B * 4, ease: 'out' },     // 240мс — строка приходит
  count:{ duration: B * 12, ease: 'out' },    // 720мс — число досчитывает
  open: { duration: B * 7, ease: 'std' },     // 420мс — панель раскрывается
  exit: { duration: B * 3, ease: 'exit' },    // 180мс
  shift: 6,                                    // единственное смещение в системе
  /* Каскад НЕ равномерный. Закон 2 эталона (ResultsSequence): ритм
     замедляется к кульминации — 440 → 560мс между звёздами.
     Здесь та же логика на сетке 60: шаг растёт 60 → 80 → 120 → 160. */
  ladder: [0, 60, 140, 260, 420, 620],
};

const DESIGN = {
  slug: 'metronome', letter: 'III',
  name: 'Метроном',
  tagline: 'Ритм и цифры. Ни свечений, ни частиц. База — такт 60мс, но каскад замедляется к кульминации, как в эталонном ResultsSequence.',
  brand: '#E8E8EE', brandDim: 'rgba(232,232,238,.13)',
  defaultTheme: 'minimalDark',

  css: `
  .ov{position:absolute;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:18px}
  .ov.bottom{align-items:flex-end;padding:0}
  .bd{position:absolute;inset:0;background:rgba(0,0,0,.78)}
  .pl{position:relative;width:100%;max-width:292px;overflow:hidden;text-align:left;
    background:var(--card);border:1px solid var(--bd);border-radius:18px;padding:0}
  .pl.sheet{max-width:none;width:100%;border-radius:20px 20px 0 0}
  .pad{padding:20px}
  .hr{height:1px;background:var(--bd);transform-origin:left;width:100%}
  .hr.acc{height:2px;background:var(--acc)}
  .eyebrow{font-size:9px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--mut)}
  .num{font-size:64px;font-weight:750;letter-spacing:-.055em;line-height:.92;color:var(--tx);font-variant-numeric:tabular-nums}
  .num.sm{font-size:34px;letter-spacing:-.04em}
  .unit{font-size:11px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);margin-top:8px}
  .ttl{font-size:19px;font-weight:750;letter-spacing:-.03em;color:var(--tx);line-height:1.22}
  .txt{font-size:12.5px;color:var(--mut);line-height:1.55;font-weight:450}
  .kv{display:flex;justify-content:space-between;align-items:baseline;padding:11px 0}
  .kv .k{font-size:11.5px;color:var(--mut);font-weight:550;letter-spacing:.01em}
  .kv .v{font-size:14px;font-weight:750;color:var(--tx);font-variant-numeric:tabular-nums}
  .kv .v.acc{color:var(--acc)}
  .bar{height:3px;background:var(--surf2);overflow:hidden;border-radius:2px}
  .bar i{display:block;height:100%;background:var(--acc);width:100%;transform-origin:left}
  .btn{display:block;text-align:center;padding:14px;font-weight:750;font-size:13.5px;
    background:var(--acc);color:var(--onAcc);border-radius:0}
  .btn.ghost{background:transparent;color:var(--mut);border-top:1px solid var(--bd)}
  .two{display:flex}.two .btn{flex:1}
  .two .btn.ghost{border-right:1px solid var(--bd)}
  .clip{overflow:hidden}
  .ln{display:block}

  .tst{position:absolute;left:0;right:0;z-index:200;background:var(--card);
    border-top:1px solid var(--bd);border-bottom:1px solid var(--bd);overflow:hidden}
  .tst.bot{bottom:76px}.tst.top{top:44px}
  .tstin{display:flex;gap:12px;align-items:center;padding:13px 16px}
  .tst .idx{font-size:10px;font-weight:800;letter-spacing:.14em;color:var(--acc);font-variant-numeric:tabular-nums;flex:none}
  .tst .tx{flex:1;min-width:0}
  .tst .tx b{display:block;font-size:13px;font-weight:750;color:var(--tx);letter-spacing:-.01em}
  .tst .tx span{display:block;font-size:11px;color:var(--mut);margin-top:2px}
  .tst .val{font-size:14px;font-weight:800;color:var(--tx);font-variant-numeric:tabular-nums;flex:none}
  .tst .rail{position:absolute;left:0;bottom:0;height:2px;background:var(--acc);width:100%;transform-origin:left}

  .cel{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;padding:30px 24px;z-index:150}
  .skel{background:var(--surf);border-radius:4px}
  .grid{position:absolute;inset:0;pointer-events:none;opacity:0;
    background-image:linear-gradient(var(--bd) 1px,transparent 1px);background-size:100% 60px}
  `,

  surfaces: [

    {
      id: 'P-01', cat: 'Принцип', title: 'Сетка 60 мс, каскад с замедлением', base: 'plain', duration: 2600,
      sub: 'Такт 60мс — база. Но шаг между строками растёт 60 → 80 → 120 → 160: закон 2 эталона запрещает ровный метроном',
      timeline: [{ t: 0, label: 'такт 1: линия' }, { t: 360, label: 'такт 7: число считает' }, { t: 1080, label: 'такт 19: строки ×60мс' }],
      html: () => `<div class="cel">
        <div class="grid" id="grid"></div>
        <div class="eyebrow ln" id="e">Принцип направления</div>
        <div style="margin:14px 0 16px"><div class="hr acc" id="l1"></div></div>
        <div class="num" id="n">0</div>
        <div class="unit ln" id="u">миллисекунд — базовый такт</div>
        <div style="margin:20px 0 14px"><div class="hr" id="l2"></div></div>
        <div class="txt ln" id="t1" style="max-width:250px">Ни одной длительности вне кратности 60. Глаз не видит сетку, но чувствует, что всё попадает в ритм.</div>
        <div style="margin-top:14px">
          <div class="kv" id="k1"><span class="k">Линия чертится</span><span class="v">360 мс · 6 тактов</span></div>
          <div class="hr"></div>
          <div class="kv" id="k2"><span class="k">Строка приходит</span><span class="v">240 мс · 4 такта</span></div>
          <div class="hr"></div>
          <div class="kv" id="k3"><span class="k">Число досчитывает</span><span class="v">720 мс · 12 тактов</span></div>
          <div class="hr"></div>
          <div class="kv" id="k4"><span class="k">Шаг каскада</span><span class="v acc">60 → 80 → 120 → 160</span></div>
        </div></div>`,
      play: ({ $, A }) => {
        A.animate($('#grid'), 'opacity', { from: 0, to: .5, duration: 360, ease: 'out' });
        A.animate($('#e'), 'opacity', { from: 0, to: 1, duration: 240, ease: 'out' });
        A.animate($('#e'), 'y', { from: 6, to: 0, duration: 240, ease: 'out' });
        A.animate($('#l1'), 'scaleX', { from: 0, to: 1, duration: 360, delay: 120, ease: 'out' });
        const n = $('#n');
        A.animate(n, 'opacity', { from: 0, to: 1, duration: 240, delay: 360, ease: 'out' });
        A.animate(n, 'opacity', { from: 1, to: 1, duration: 720, delay: 360, ease: 'out',
          set: (v, p) => { n.textContent = Math.round(p * 60); } });
        A.animate($('#u'), 'opacity', { from: 0, to: 1, duration: 240, delay: 900, ease: 'out' });
        A.animate($('#l2'), 'scaleX', { from: 0, to: 1, duration: 360, delay: 960, ease: 'out' });
        ['#t1', '#k1', '#k2', '#k3', '#k4'].forEach((s, i) => {
          const d = 1080 + TOK.ladder[i];   // 60 → 80 → 120 → 160, не ровный шаг
          A.animate($(s), 'opacity', { from: 0, to: 1, duration: 240, delay: d, ease: 'out' });
          A.animate($(s), 'y', { from: 6, to: 0, duration: 240, delay: d, ease: 'out' }); });
      },
      rn: `// НАПРАВЛЕНИЕ III — вся система на одной константе.
export const BEAT = 60;
export const METRO = {
  LINE:  { duration: BEAT * 6,  easing: Easing.out(Easing.cubic) },   // 360
  TEXT:  { duration: BEAT * 4,  easing: Easing.out(Easing.cubic) },   // 240
  COUNT: { duration: BEAT * 12, easing: Easing.out(Easing.expo)  },   // 720
  OPEN:  { duration: BEAT * 7,  easing: Easing.bezier(0.32,0.72,0,1) },// 420
  EXIT:  { duration: BEAT * 3,  easing: Easing.bezier(0.4,0,1,1) },   // 180
  SHIFT: 6,        // единственное смещение во всей системе, в пикселях
  STAGGER: BEAT,   // 60
};

// ЗАКОН 1. Любая длительность — кратна 60. Нет 250, 280, 320, 450.
// ЗАКОН 2. Единственное перемещение — 6px по вертикали. Больше ничего не ездит.
// ЗАКОН 3. Ни одной пружины. Только timing. Пружина размывает сетку.
// ЗАКОН 4. Числа НИКОГДА не появляются готовыми — они досчитывают
//          за 720мс с Easing.out(Easing.expo). Это единственная «награда».
// ЗАКОН 5. Ни свечений, ни теней, ни частиц, ни градиентов на движущемся.
// ЗАКОН 6. Разделители — это анимация: линия чертится слева направо
//          за 360мс и заменяет собой всю декорацию.
// ЗАКОН 7. Каскад НЕ равномерный. Аудит показал закон 2 эталона
//          (components/feedback/ResultsSequence.tsx): между звёздами
//          440мс, затем 560мс — ритм замедляется к кульминации.
//          Ровный метроном запрещён самим эталоном, поэтому шаг
//          здесь растёт по лестнице [0, 60, 140, 260, 420, 620],
//          оставаясь кратным такту.`,
    },

    {
      id: 'M-01', cat: 'Модалки', title: 'Повышение уровня', base: 'lesson', duration: 3400,
      sub: 'Панель раскрывается по вертикали, номер уровня досчитывает 11→12, награды приходят строками',
      timeline: [{ t: 0, label: 'фон 240мс' }, { t: 120, label: 'панель раскрывается 420мс' }, { t: 360, label: 'число 11→12 за 720мс' }, { t: 1080, label: 'линия' }, { t: 1200, label: 'награды ×60мс' }],
      html: () => `<div class="ov"><div class="bd" id="bd"></div>
        <div class="pl clip" id="c">
          <div class="pad" id="body">
            <div class="eyebrow ln" id="e">Уровень достигнут</div>
            <div style="display:flex;align-items:baseline;gap:10px;margin-top:12px">
              <div class="num" id="n">11</div>
              <div class="unit" id="u" style="margin:0">уровень</div>
            </div>
            <div style="margin:16px 0"><div class="hr acc" id="l1"></div></div>
            <div class="ttl ln" id="t">Wordsmith</div>
            <div class="txt ln" id="s" style="margin-top:6px">Ты в верхних 18% учеников курса</div>
            <div style="margin-top:16px">
              <div class="kv" id="k1"><span class="k">Бонус за уровень</span><span class="v acc" id="v1">+0 XP</span></div>
              <div class="hr" id="h1"></div>
              <div class="kv" id="k2"><span class="k">Максимум энергии</span><span class="v" id="v2">5 → 6</span></div>
              <div class="hr" id="h2"></div>
              <div class="kv" id="k3"><span class="k">Титул</span><span class="v">Wordsmith</span></div>
            </div>
            <div style="margin-top:16px">
              <div style="display:flex;justify-content:space-between;font-size:10.5px;color:var(--mut);margin-bottom:7px">
                <span>До 13 уровня</span><span id="pv">760 XP</span></div>
              <div class="bar"><i id="bar"></i></div></div>
          </div>
          <div class="btn" id="cta">Забрать награду</div>
        </div></div>`,
      play: ({ $, A }) => {
        const c = $('#c'), n = $('#n');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 240, ease: 'out' });
        c.style.maxHeight = '0px';
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 120, delay: 120, ease: 'linear' });
        A.animate(c, 'opacity', { from: 1, to: 1, duration: 420, delay: 120, ease: 'std',
          set: (v, p) => { c.style.maxHeight = (p * 480) + 'px'; } });
        A.animate($('#e'), 'opacity', { from: 0, to: 1, duration: 240, delay: 240, ease: 'out' });
        A.animate(n, 'opacity', { from: 0, to: 1, duration: 240, delay: 360, ease: 'out' });
        A.animate(n, 'opacity', { from: 1, to: 1, duration: 720, delay: 360, ease: 'out',
          set: (v, p) => { n.textContent = p < .5 ? 11 : 12; } });
        A.animate($('#u'), 'opacity', { from: 0, to: 1, duration: 240, delay: 420, ease: 'out' });
        A.animate($('#l1'), 'scaleX', { from: 0, to: 1, duration: 360, delay: 1080, ease: 'out' });
        ['#t', '#s'].forEach((s, i) => {
          A.animate($(s), 'opacity', { from: 0, to: 1, duration: 240, delay: 1140 + i * 60, ease: 'out' });
          A.animate($(s), 'y', { from: 6, to: 0, duration: 240, delay: 1140 + i * 60, ease: 'out' }); });
        ['#k1', '#h1', '#k2', '#h2', '#k3'].forEach((s, i) => {
          const el = $(s);
          const d = 1320 + TOK.ladder[i];   // замедляющийся каскад, закон 2 эталона
          if (s.startsWith('#h')) { A.animate(el, 'scaleX', { from: 0, to: 1, duration: 360, delay: d, ease: 'out' }); return; }
          A.animate(el, 'opacity', { from: 0, to: 1, duration: 240, delay: d, ease: 'out' });
          A.animate(el, 'y', { from: 6, to: 0, duration: 240, delay: d, ease: 'out' }); });
        const v1 = $('#v1');
        A.animate(v1, 'opacity', { from: 1, to: 1, duration: 720, delay: 1440, ease: 'out',
          set: (v, p) => { v1.textContent = '+' + Math.round(p * 100) + ' XP'; } });
        A.animate($('#bar'), 'scaleX', { from: 0, to: .62, duration: 720, delay: 1680, ease: 'out' });
        A.animate($('#cta'), 'opacity', { from: 0, to: 1, duration: 240, delay: 1920, ease: 'out' });
      },
      rn: `// M-01 Повышение уровня — «Метроном»
// Панель РАСКРЫВАЕТСЯ, а не прилетает. В RN высоту не анимируем:
const open = useSharedValue(0);
open.value = withDelay(BEAT * 2, withTiming(1, METRO.OPEN));
const cardStyle = useAnimatedStyle(() => ({
  transform: [{ scaleY: open.value }], transformOrigin: 'top',
}));
const inner = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 / Math.max(0.02, open.value) }] }));

// Число НЕ появляется готовым — оно переключается 11 → 12 в середине счёта.
// Бонус досчитывает 0 → 100 за 720мс Easing.out(Easing.expo):
const xp = useSharedValue(0);
xp.value = withDelay(BEAT * 24, withTiming(100, METRO.COUNT));
const label = useDerivedValue(() => '+' + Math.round(xp.value) + ' XP');
// Текст через AnimatedTextInput + useAnimatedProps — ровно так, как
// уже сделано в эталоне (ResultsSequence.tsx:126, 139-142). БЕЗ setState.
// Аудит нашёл 5 мест, где счётчики идут через JS-поток:
//   DialogVictoryCelebration.tsx:303  setInterval(…,16)+setState
//   StatCountUpText.tsx:59            runOnJS(setDisplay) покадрово
//   leagueStatusShared.ts:92          rAF + setState
//   TypewriterText.tsx:50             посимвольный setState
// Ширина слота фиксируется ДО старта: max(84, len*32+20) — закон 7 эталона,
// иначе цифры двигают соседей на переходе 9→10.

// Разделители — часть анимации: scaleX 0 → 1 за 360мс, transformOrigin left.
// ЦЕНА: 12 узлов, ни одной тени, ни одного градиента на движущемся элементе.
// Самое дешёвое направление из трёх.`,
    },

    {
      id: 'M-02', cat: 'Модалки', title: 'Закончилась энергия', base: 'lesson', duration: 3000,
      sub: 'Таймер тикает вниз с первой секунды — ожидание становится информацией',
      timeline: [{ t: 0, label: 'фон' }, { t: 120, label: 'раскрытие' }, { t: 360, label: 'таймер идёт' }, { t: 720, label: 'строки ×60мс' }],
      html: () => `<div class="ov"><div class="bd" id="bd"></div>
        <div class="pl clip" id="c">
          <div class="pad">
            <div class="eyebrow ln" id="e">Энергия</div>
            <div class="num" id="n" style="margin-top:12px;font-size:52px">14:32</div>
            <div class="unit ln" id="u" style="margin-top:6px">до следующей единицы</div>
            <div style="margin:16px 0"><div class="hr" id="l1"></div></div>
            <div class="kv" id="k1"><span class="k">Осталось энергии</span><span class="v">0 / 5</span></div>
            <div class="hr" id="h1"></div>
            <div class="kv" id="k2"><span class="k">Полный заряд сейчас</span><span class="v acc">25 осколков</span></div>
          </div>
          <div class="two"><div class="btn ghost" id="b1">Позже</div><div class="btn" id="b2">Восстановить</div></div>
        </div></div>`,
      play: ({ $, A }) => {
        const c = $('#c'), n = $('#n');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 240, ease: 'out' });
        c.style.maxHeight = '0px';
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 120, delay: 120, ease: 'linear' });
        A.animate(c, 'opacity', { from: 1, to: 1, duration: 420, delay: 120, ease: 'std',
          set: (v, p) => { c.style.maxHeight = (p * 320) + 'px'; } });
        A.animate($('#e'), 'opacity', { from: 0, to: 1, duration: 240, delay: 240, ease: 'out' });
        A.animate(n, 'opacity', { from: 0, to: 1, duration: 240, delay: 360, ease: 'out' });
        A.animate(n, 'opacity', { from: 1, to: 1, duration: 2400, delay: 480, ease: 'linear',
          set: (v, p) => { const s = 872 - Math.floor(p * 4); n.textContent = Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); } });
        A.animate($('#u'), 'opacity', { from: 0, to: 1, duration: 240, delay: 480, ease: 'out' });
        A.animate($('#l1'), 'scaleX', { from: 0, to: 1, duration: 360, delay: 660, ease: 'out' });
        ['#k1', '#h1', '#k2'].forEach((s, i) => {
          const el = $(s);
          if (s.startsWith('#h')) { A.animate(el, 'scaleX', { from: 0, to: 1, duration: 360, delay: 720 + i * 60, ease: 'out' }); return; }
          A.animate(el, 'opacity', { from: 0, to: 1, duration: 240, delay: 720 + i * 60, ease: 'out' });
          A.animate(el, 'y', { from: 6, to: 0, duration: 240, delay: 720 + i * 60, ease: 'out' }); });
        ['#b1', '#b2'].forEach((s, i) => A.animate($(s), 'opacity', { from: 0, to: 1, duration: 240, delay: 900 + i * 60, ease: 'out' }));
      },
      rn: `// M-02 Нет энергии
// Ключевое отличие направления: таймер ЖИВОЙ с первого кадра.
// Пользователь видит, что время реально идёт — ожидание перестаёт
// быть заглушкой и становится данными.
// Реализация: useDerivedValue от общего clock, ReText. Ноль setState.`,
    },

    {
      id: 'M-03', cat: 'Модалки', title: 'Стрик под угрозой', base: 'home', duration: 3200,
      sub: 'Полоса дней осыпается справа налево — потеря показана как движение назад',
      timeline: [{ t: 0, label: 'раскрытие' }, { t: 360, label: '28 дней' }, { t: 720, label: 'полоса гаснет справа налево 720мс' }, { t: 1200, label: 'строки' }],
      html: () => `<div class="ov"><div class="bd" id="bd"></div>
        <div class="pl clip" id="c">
          <div class="pad">
            <div class="eyebrow ln" id="e" style="color:var(--gold)">Цепочка под угрозой</div>
            <div style="display:flex;align-items:baseline;gap:10px;margin-top:12px">
              <div class="num" id="n">28</div><div class="unit" id="u" style="margin:0">дней подряд</div></div>
            <div style="display:flex;gap:3px;margin-top:16px" id="days">
              ${Array.from({ length: 14 }, () => `<i class="dd" style="flex:1;height:22px;border-radius:3px;background:var(--acc);display:block"></i>`).join('')}
            </div>
            <div style="margin:16px 0"><div class="hr" id="l1"></div></div>
            <div class="ttl ln" id="t">Сгорит в 00:00</div>
            <div class="txt ln" id="s" style="margin-top:6px">Позанимайся 5 минут — или заморозь цепочку</div>
          </div>
          <div class="two"><div class="btn ghost" id="b1">Отпустить</div><div class="btn" id="b2">Спасти · 50</div></div>
        </div></div>`,
      play: ({ $, $$, A }) => {
        const c = $('#c');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 240, ease: 'out' });
        c.style.maxHeight = '0px';
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 120, delay: 120, ease: 'linear' });
        A.animate(c, 'opacity', { from: 1, to: 1, duration: 420, delay: 120, ease: 'std',
          set: (v, p) => { c.style.maxHeight = (p * 380) + 'px'; } });
        A.animate($('#e'), 'opacity', { from: 0, to: 1, duration: 240, delay: 240, ease: 'out' });
        ['#n', '#u'].forEach((s, i) => A.animate($(s), 'opacity', { from: 0, to: 1, duration: 240, delay: 360 + i * 60, ease: 'out' }));
        $$('.dd').forEach((d, i) => {
          A.animate(d, 'scaleY', { from: 0, to: 1, duration: 240, delay: 480 + i * 24, ease: 'out' });
          A.animate(d, 'opacity', { from: 1, to: .16, duration: 240, delay: 900 + (13 - i) * 44, ease: 'linear' }); });
        A.animate($('#l1'), 'scaleX', { from: 0, to: 1, duration: 360, delay: 1140, ease: 'out' });
        ['#t', '#s'].forEach((s, i) => {
          A.animate($(s), 'opacity', { from: 0, to: 1, duration: 240, delay: 1200 + i * 60, ease: 'out' });
          A.animate($(s), 'y', { from: 6, to: 0, duration: 240, delay: 1200 + i * 60, ease: 'out' }); });
        ['#b1', '#b2'].forEach((s, i) => A.animate($(s), 'opacity', { from: 0, to: 1, duration: 240, delay: 1380 + i * 60, ease: 'out' }));
      },
      rn: `// M-03 Стрик
// Полоса дней сначала выстраивается слева направо (24мс на день),
// затем гаснет СПРАВА НАЛЕВО (44мс на день) — движение назад во времени.
// Это единственная анимация направления, идущая против чтения,
// и именно поэтому она читается как потеря.`,
    },

    {
      id: 'M-04', cat: 'Модалки', title: 'Подтверждение удаления', base: 'lessons', duration: 2400,
      sub: 'Цифра «54» досчитывает до нуля — последствие показано, а не описано',
      timeline: [{ t: 0, label: 'раскрытие' }, { t: 360, label: '54 → 0 за 720мс' }, { t: 1080, label: 'строки' }],
      html: () => `<div class="ov"><div class="bd" id="bd"></div>
        <div class="pl clip" id="c" style="max-width:268px">
          <div class="pad">
            <div class="eyebrow ln" id="e" style="color:var(--wrong)">Необратимое действие</div>
            <div style="display:flex;align-items:baseline;gap:10px;margin-top:12px">
              <div class="num" id="n" style="color:var(--wrong)">54</div>
              <div class="unit" id="u" style="margin:0">карточки будут удалены</div></div>
            <div style="margin:16px 0"><div class="hr" id="l1"></div></div>
            <div class="txt ln" id="s">Колода «Idioms» и весь прогресс по ней исчезнут. Восстановить нельзя.</div>
          </div>
          <div class="two"><div class="btn ghost" id="b1">Отмена</div>
            <div class="btn" id="b2" style="background:var(--wrong);color:#fff">Удалить</div></div>
        </div></div>`,
      play: ({ $, A }) => {
        const c = $('#c'), n = $('#n');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 240, ease: 'out' });
        c.style.maxHeight = '0px';
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 120, delay: 120, ease: 'linear' });
        A.animate(c, 'opacity', { from: 1, to: 1, duration: 420, delay: 120, ease: 'std',
          set: (v, p) => { c.style.maxHeight = (p * 300) + 'px'; } });
        A.animate($('#e'), 'opacity', { from: 0, to: 1, duration: 240, delay: 240, ease: 'out' });
        A.animate(n, 'opacity', { from: 0, to: 1, duration: 240, delay: 360, ease: 'out' });
        A.animate(n, 'opacity', { from: 1, to: 1, duration: 720, delay: 420, ease: 'out',
          set: (v, p) => { n.textContent = Math.round(54 - p * 54); } });
        A.animate($('#u'), 'opacity', { from: 0, to: 1, duration: 240, delay: 420, ease: 'out' });
        A.animate($('#l1'), 'scaleX', { from: 0, to: 1, duration: 360, delay: 1020, ease: 'out' });
        A.animate($('#s'), 'opacity', { from: 0, to: 1, duration: 240, delay: 1080, ease: 'out' });
        A.animate($('#b1'), 'opacity', { from: 0, to: 1, duration: 240, delay: 1200, ease: 'out' });
        A.animate($('#b2'), 'opacity', { from: 0, to: 1, duration: 240, delay: 1320, ease: 'out' });
      },
      rn: `// M-04 Деструктив
// Число досчитывает 54 → 0 за 720мс. Пользователь ВИДИТ, как исчезает
// то, что он собирается удалить, до того как нажмёт кнопку.
// Опасная кнопка приходит на 2 такта позже безопасной (1320 против 1200).`,
    },

    {
      id: 'T-01', cat: 'Тосты', title: 'Единая система: успех', base: 'home', duration: 3600,
      sub: 'Полоса во всю ширину, без скруглений и теней. Значение досчитывает',
      timeline: [{ t: 0, label: 'полоса раскрывается 240мс' }, { t: 180, label: 'значение считает 720мс' }, { t: 300, label: 'рельс 3000мс' }],
      html: () => `<div class="tst bot" id="t"><div class="tstin">
        <div class="idx">01</div>
        <div class="tx"><b>Урок пройден</b><span>Present Perfect · A2</span></div>
        <div class="val" id="v">+0 XP</div></div><div class="rail" id="rail"></div></div>`,
      play: ({ $, A }) => {
        const t = $('#t'), v = $('#v');
        t.style.maxHeight = '0px';
        A.animate(t, 'opacity', { from: 1, to: 1, duration: 240, ease: 'out',
          set: (x, p) => { t.style.maxHeight = (p * 70) + 'px'; } });
        A.animate(v, 'opacity', { from: 1, to: 1, duration: 720, delay: 180, ease: 'out',
          set: (x, p) => { v.textContent = '+' + Math.round(p * 50) + ' XP'; } });
        A.animate($('#rail'), 'scaleX', { from: 1, to: 0, duration: 3000, delay: 300, ease: 'linear' });
        setTimeout(() => A.animate(t, 'opacity', { from: 1, to: 1, duration: 180, ease: 'exit',
          set: (x, p) => { t.style.maxHeight = (70 - p * 70) + 'px'; } }), 3300 / A.speed);
      },
      rn: `// T-01 Тост
// Единая система вместо 13 реализаций. Тост не выезжает и не проявляется —
// он РАСКРЫВАЕТСЯ по высоте за 240мс, как строка таблицы.
// В RN: scaleY на контейнере + компенсация на содержимом
// (height анимировать нельзя — это layout на JS-потоке).
// Значение всегда досчитывает: «+50 XP» не появляется готовым.
// Порядковый номер 01/02/03 слева — очередь видна пользователю.`,
    },

    {
      id: 'T-02', cat: 'Тосты', title: 'Очередь из трёх', base: 'home', duration: 5200,
      sub: 'Тосты складываются в стек строками, как список. Номера показывают порядок',
      timeline: [{ t: 0, label: '01' }, { t: 600, label: '02 раскрывается под ним' }, { t: 1200, label: '03' }, { t: 3000, label: '01 сворачивается' }],
      html: () => `
        <div style="position:absolute;left:0;right:0;bottom:76px;z-index:200">
          ${[['01', 'Урок пройден', 'Present Perfect · A2', '+50 XP'],
             ['02', 'Достижение', 'Марафонец · 7 дней', '+120 XP'],
             ['03', 'Ранг вырос', 'Золотая лига · 3 место', '—']]
            .map(([i, a, b, c], k) => `<div class="tst" id="q${k}" style="position:static"><div class="tstin">
              <div class="idx">${i}</div><div class="tx"><b>${a}</b><span>${b}</span></div>
              <div class="val">${c}</div></div><div class="rail" id="rl${k}"></div></div>`).join('')}
        </div>`,
      play: ({ $, A }) => {
        [0, 1, 2].forEach(k => {
          const t = $('#q' + k);
          t.style.maxHeight = '0px'; t.style.overflow = 'hidden';
          A.animate(t, 'opacity', { from: 1, to: 1, duration: 240, delay: k * 600, ease: 'out',
            set: (x, p) => { t.style.maxHeight = (p * 70) + 'px'; } });
          A.animate($('#rl' + k), 'scaleX', { from: 1, to: 0, duration: 3000, delay: k * 600 + 240, ease: 'linear' });
        });
        setTimeout(() => {
          const t = $('#q0');
          A.animate(t, 'opacity', { from: 1, to: 1, duration: 180, ease: 'exit',
            set: (x, p) => { t.style.maxHeight = (70 - p * 70) + 'px'; } });
        }, 3300 / A.speed);
      },
      rn: `// T-02 Очередь
// Тосты не перекрывают друг друга и не толкаются — они складываются
// в список сверху вниз, каждый со своим номером.
// Сейчас в приложении AchievementToast (zIndex 9999), ActionToast (9997)
// и ArenaFriendInviteHost (9998) выезжают в ОДНУ точку и накладываются.
// Здесь стек — это обычный column, каждая строка раскрывается по scaleY.
// LIMIT 3, дальше — счётчик «+2 ещё».`,
    },

    {
      id: 'S-01', cat: 'Состояния', title: 'Загрузка → содержимое', base: 'plain', duration: 3000,
      sub: 'Ни shimmer, ни пульсации. Строки просто прочерчиваются по одной, пока данных нет',
      timeline: [{ t: 0, label: 'линии чертятся ×60мс' }, { t: 1440, label: 'данные заменяют линии построчно' }],
      html: () => `<div style="position:absolute;inset:0;padding:60px 22px 0;z-index:150">
        <div class="eyebrow" style="margin-bottom:16px">Сегодня</div>
        ${[['Пройдено уроков', '4'], ['Новых слов', '38'], ['Точность', '92%'], ['Время', '34 мин'], ['Опыт', '+520 XP']]
          .map(([k, v], i) => `<div>
            <div class="kv" style="opacity:0" id="kv${i}"><span class="k">${k}</span><span class="v" id="vv${i}">${v}</span></div>
            <div class="hr" id="hh${i}"></div></div>`).join('')}
      </div>`,
      play: ({ $, A }) => {
        [0, 1, 2, 3, 4].forEach(i => {
          A.animate($('#hh' + i), 'scaleX', { from: 0, to: 1, duration: 360, delay: i * 60, ease: 'out' });
          A.animate($('#kv' + i), 'opacity', { from: 0, to: 1, duration: 240, delay: 1440 + i * 60, ease: 'out' });
          A.animate($('#kv' + i), 'y', { from: 6, to: 0, duration: 240, delay: 1440 + i * 60, ease: 'out' });
        });
      },
      rn: `// S-01 Загрузка
// Направление отказывается от скелетонов как таковых.
// Пока данных нет, видна только СТРУКТУРА: разделители прочерчиваются
// по одному за 360мс с шагом 60мс. Это честно показывает, сколько
// строк придёт, и не мигает при быстром ответе.
// Когда данные пришли — строки проявляются в том же ритме.`,
    },

    {
      id: 'S-02', cat: 'Состояния', title: 'Пусто', base: 'plain', duration: 2400,
      sub: 'Ноль — это тоже число. Оно досчитывает и остаётся нулём',
      timeline: [{ t: 0, label: 'eyebrow' }, { t: 240, label: 'ноль' }, { t: 600, label: 'линия' }, { t: 720, label: 'текст + CTA' }],
      html: () => `<div class="cel">
        <div class="eyebrow ln" id="e">Колода «Idioms»</div>
        <div class="num" id="n" style="margin-top:12px">0</div>
        <div class="unit ln" id="u">карточек</div>
        <div style="margin:20px 0"><div class="hr acc" id="l1"></div></div>
        <div class="txt ln" id="s" style="max-width:250px">Добавь первую карточку — она появится здесь и сразу попадёт в повторение</div>
        <div style="margin-top:20px"><div class="btn" id="cta" style="border-radius:10px">Добавить карточку</div></div></div>`,
      play: ({ $, A }) => {
        A.animate($('#e'), 'opacity', { from: 0, to: 1, duration: 240, ease: 'out' });
        A.animate($('#n'), 'opacity', { from: 0, to: 1, duration: 240, delay: 240, ease: 'out' });
        A.animate($('#u'), 'opacity', { from: 0, to: 1, duration: 240, delay: 300, ease: 'out' });
        A.animate($('#l1'), 'scaleX', { from: 0, to: 1, duration: 360, delay: 600, ease: 'out' });
        A.animate($('#s'), 'opacity', { from: 0, to: 1, duration: 240, delay: 720, ease: 'out' });
        A.animate($('#s'), 'y', { from: 6, to: 0, duration: 240, delay: 720, ease: 'out' });
        A.animate($('#cta'), 'opacity', { from: 0, to: 1, duration: 240, delay: 840, ease: 'out' });
      },
      rn: `// S-02 Пусто
// Пустое состояние выглядит как обычная карточка статистики со значением 0.
// Никаких иллюстраций и «грустных» иконок — экран не выглядит сломанным,
// он выглядит как начало отсчёта.`,
    },

    {
      id: 'X-01', cat: 'Переходы', title: 'Между экранами', base: 'plain', duration: 3000,
      sub: 'Шторка: новый экран открывается сверху вниз за 420мс, старый остаётся на месте',
      timeline: [{ t: 400, label: 'шторка 420мс сверху вниз' }, { t: 1900, label: 'закрывается снизу вверх 300мс' }],
      html: () => `<div style="position:absolute;inset:0;overflow:hidden">
        <div id="a" style="position:absolute;inset:0">${BASES.home('minimalDark')}</div>
        <div id="b" style="position:absolute;inset:0;z-index:10;overflow:hidden;max-height:0">${BASES.lessons('minimalDark')}</div>
      </div>`,
      play: ({ $, A }) => {
        const b = $('#b');
        setTimeout(() => A.animate(b, 'opacity', { from: 1, to: 1, duration: 420, ease: 'std',
          set: (v, p) => { b.style.maxHeight = (p * 814) + 'px'; } }), 400 / A.speed);
        setTimeout(() => A.animate(b, 'opacity', { from: 1, to: 1, duration: 300, ease: 'exit',
          set: (v, p) => { b.style.maxHeight = (814 - p * 814) + 'px'; } }), 1900 / A.speed);
      },
      rn: `// X-01 Переход
// Шторка вместо слайда: новый экран раскрывается сверху вниз,
// старый НЕ двигается. Пространственная связь между экранами
// сохраняется без параллакса и без бокового хода.
// В expo-router это кастомный animation через react-native-screens
// (stackAnimation="none" + собственный Reanimated-слой поверх).
// Плюс: одинаково работает и вперёд, и назад — не нужен
// отдельный обратный переход.`,
    },

    {
      id: 'X-02', cat: 'Переходы', title: 'Кнопка под пальцем', base: 'plain', duration: 2600,
      sub: 'Кнопка не масштабируется. Меняется только заливка — 120мс туда, 180мс обратно',
      timeline: [{ t: 400, label: 'нажатие: заливка 120мс' }, { t: 900, label: 'отпускание 180мс' }],
      html: () => `<div class="cel" style="align-items:stretch">
        <div class="btn" id="b" style="border-radius:10px;padding:16px">Продолжить</div>
        <div class="txt" style="margin-top:24px">Ни масштаба, ни тени. Только смена заливки: 120мс на нажатие, 180мс на возврат. Асимметрия в 60мс — это и есть ощущение отклика.</div></div>`,
      play: ({ $, A }) => {
        const b = $('#b');
        A.animate(b, 'opacity', { from: 0, to: 1, duration: 240, ease: 'out' });
        const press = (t) => {
          setTimeout(() => A.animate(b, 'opacity', { from: 1, to: .62, duration: 120, ease: 'out' }), t / A.speed);
          setTimeout(() => A.animate(b, 'opacity', { from: .62, to: 1, duration: 180, ease: 'out' }), (t + 500) / A.speed);
        };
        press(400); press(1500);
      },
      rn: `// X-02 Кнопка
onPressIn:  fill.value = withTiming(0.62, { duration: BEAT * 2 });   // 120
onPressOut: fill.value = withTiming(1,    { duration: BEAT * 3 });   // 180
// Никакого scale. Асимметрия 120/180 — единственный носитель отклика.
// Это дешевле любого другого варианта: одна интерполяция цвета,
// ноль трансформаций, ноль перерисовки теней.`,
    },
  ],
};
