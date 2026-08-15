/* ============================================================================
   НАПРАВЛЕНИЕ I — «ЧЕКАН». Материал и вес.
   Каждый элемент имеет массу. Он падает, ударяется, сплющивается и встаёт.
   Пружины короткие и жёсткие, отскок один, всегда есть отдача поверхности.
   ========================================================================== */

const sp = (t, f) => ENGINE.origami(t, f);
const RS = (mass, damping, stiffness) => ({ mass, damping, stiffness });

/* Токены направления — из них выведены ВСЕ анимации ниже */
const TOK = {
  // удар: тело падает с ускорением, поверхность отвечает
  fall:    { duration: 220, ease: 'in' },
  impact:  RS(1, 5, 260),      // сплющивание тела после удара
  recoil:  RS(1, 6, 180),      // отдача поверхности
  // появление панелей
  panel:   RS(0.9, 15, 165),
  row:     RS(0.6, 12, 145),
  chip:    RS(0.5, 10, 190),
  // выход — всегда быстрее входа и в ту же сторону, откуда пришло
  exit:    { duration: 190, ease: 'exit' },
  stagger: 62,
  backdrop:{ duration: 240, ease: 'out' },
  /* Закон 2 эталона (ResultsSequence): ритм ЗАМЕДЛЯЕТСЯ к кульминации —
     между звёздами 440мс, затем 560мс. Ровный шаг запрещён. */
  ladder: [0, 62, 146, 262, 410, 590],
};

const DESIGN = {
  slug: 'impact', letter: 'I',
  name: 'Чекан',
  tagline: 'Материал и вес. Всё падает, ударяется и вздрагивает. Один отскок, ни одного лишнего.',
  brand: '#E8C86A', brandDim: 'rgba(232,200,106,.16)',
  defaultTheme: 'midnight',

  css: `
  .ov{position:absolute;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
  .ov.bottom{align-items:flex-end;padding:0}
  .bd{position:absolute;inset:0;background:rgba(2,3,8,.74)}
  .pl{position:relative;width:100%;max-width:288px;border-radius:24px;padding:22px 20px 18px;text-align:center;
    background:linear-gradient(152deg,color-mix(in srgb,var(--cardG1) 40%,var(--card)),var(--card) 58%,var(--cardG2));
    border:1px solid var(--bd);overflow:hidden;
    box-shadow:0 24px 56px rgba(0,0,0,.7),inset 0 1px 0 rgba(255,255,255,.07),inset 0 -18px 30px rgba(0,0,0,.28)}
  .pl.sheet{max-width:none;width:100%;border-radius:26px 26px 0 0;padding:20px 20px 30px}
  .pl .rim{position:absolute;inset:0;border-radius:inherit;pointer-events:none;
    box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--gold) 22%,transparent),inset 0 0 30px color-mix(in srgb,var(--gold) 10%,transparent)}
  .kick{font-size:9.5px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:var(--gold)}
  .ttl{font-size:20px;font-weight:900;letter-spacing:-.028em;margin-top:8px;color:var(--tx);line-height:1.2}
  .txt{font-size:12.5px;color:var(--mut);margin-top:7px;line-height:1.5}
  .big{font-size:50px;font-weight:900;letter-spacing:-.05em;line-height:1;margin-top:4px;
    background:linear-gradient(180deg,#FFF6D8,var(--gold) 48%,#96690B);-webkit-background-clip:text;background-clip:text;color:transparent}
  .disc{width:92px;height:92px;margin:0 auto;border-radius:50%;position:relative;
    background:radial-gradient(circle at 34% 26%,#FFF3C8,var(--gold) 46%,#8A6100 88%);
    display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:900;color:#3A2A00;
    box-shadow:0 12px 30px rgba(0,0,0,.62),inset 0 -6px 14px rgba(0,0,0,.32),inset 0 5px 11px rgba(255,255,255,.42)}
  .disc.sm{width:60px;height:60px;font-size:26px}
  .disc::after{content:'';position:absolute;inset:-8px;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--gold) 36%,transparent)}
  .rowi{display:flex;gap:10px;align-items:center;background:rgba(255,255,255,.035);border:1px solid var(--bd);
    border-radius:14px;padding:9px 11px;margin-top:8px;text-align:left}
  .rowi i{width:30px;height:30px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:15px;font-style:normal;
    background:color-mix(in srgb,var(--tint,var(--acc)) 16%,transparent);
    border:1px solid color-mix(in srgb,var(--tint,var(--acc)) 30%,transparent);flex:none}
  .rowi b{display:block;font-size:9px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:var(--tint,var(--acc));opacity:.9}
  .rowi em{display:block;font-size:12.5px;font-weight:750;font-style:normal;color:var(--tx);margin-top:1px}
  .btn{margin-top:15px;border-radius:15px;padding:12px;font-weight:900;font-size:13.5px;
    background:linear-gradient(180deg,#F0D98C,#C8A34C 55%,#765316);color:#1A1204;
    box-shadow:0 8px 20px rgba(200,163,76,.28),inset 0 1px 0 rgba(255,255,255,.45)}
  .btn.ghost{background:rgba(255,255,255,.05);color:var(--mut);border:1px solid var(--bd);box-shadow:none;font-weight:750}
  .btn.dang{background:linear-gradient(180deg,color-mix(in srgb,var(--wrong) 82%,#fff),var(--wrong) 60%,color-mix(in srgb,var(--wrong) 60%,#000));color:#2A0808}
  .two{display:flex;gap:9px;margin-top:15px}.two .btn{flex:1;margin:0}

  .ring{position:absolute;left:50%;top:50%;border-radius:50%;border:2px solid var(--gold);
    transform:translate(-50%,-50%);pointer-events:none;opacity:0}
  .dust{position:absolute;left:50%;top:50%;width:4px;height:4px;border-radius:50%;background:var(--gold);pointer-events:none;opacity:0}
  .flare{position:absolute;left:50%;top:50%;width:220%;height:2px;margin-left:-110%;pointer-events:none;opacity:0;
    background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--gold) 88%,#fff),transparent)}

  .tst{position:absolute;left:12px;right:12px;border-radius:18px;padding:12px 13px;display:flex;gap:11px;align-items:center;z-index:200;
    background:linear-gradient(150deg,color-mix(in srgb,var(--cardG1) 34%,var(--card)),var(--card) 62%,var(--cardG2));
    border:1px solid var(--bd);box-shadow:0 16px 34px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06);overflow:hidden}
  .tst.bot{bottom:84px}.tst.top{top:52px}
  .tst .ic{width:38px;height:38px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:19px;flex:none;
    background:color-mix(in srgb,var(--tint,var(--acc)) 16%,transparent);
    border:1px solid color-mix(in srgb,var(--tint,var(--acc)) 32%,transparent)}
  .tst .tx{flex:1;min-width:0;text-align:left}
  .tst .tx b{display:block;font-size:13px;font-weight:800;color:var(--tx);letter-spacing:-.01em}
  .tst .tx span{display:block;font-size:11px;color:var(--mut);margin-top:1px}
  .tst .amt{font-size:14px;font-weight:900;color:var(--gold);flex:none}
  .tst .rail{position:absolute;left:0;bottom:0;height:2.5px;background:var(--tint,var(--acc));width:100%;transform-origin:left}
  .tst .edge{position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--tint,var(--acc))}

  .skel{background:linear-gradient(90deg,var(--surf) 0%,var(--surf2) 42%,var(--surf) 84%);background-size:220% 100%;border-radius:12px}
  .cel{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:26px;text-align:center;z-index:150}
  `,

  surfaces: [

    /* ═════════ ПРИНЦИПЫ ═════════ */
    {
      id: 'P-01', cat: 'Принцип', title: 'Удар как основа', base: 'plain', duration: 2200,
      sub: 'Тело падает 220мс с ускорением → сплющивание spring(260/5) → отдача поверхности spring(180/6)',
      timeline: [{ t: 0, label: 'замах' }, { t: 200, label: 'падение 220мс, ease-in' }, { t: 420, label: 'УДАР: squash 1.16/0.84' }, { t: 420, label: 'кольца + вспышка + пыль' }],
      html: () => `<div class="cel"><div style="position:relative;height:150px;width:100%">
        <div class="disc" id="d" style="position:absolute;left:50%;margin-left:-46px;top:40px">12</div>
        ${[0, 1].map(i => `<div class="ring" id="r${i}" style="width:92px;height:92px;top:86px"></div>`).join('')}
        ${Array.from({ length: 14 }, () => `<div class="dust" style="top:86px"></div>`).join('')}
        <div class="flare" id="fl" style="top:86px"></div>
        <div id="floor" style="position:absolute;left:22%;right:22%;top:134px;height:2px;border-radius:2px;
          background:linear-gradient(90deg,transparent,var(--bd),transparent)"></div>
      </div>
      <div class="kick" id="k">Принцип направления</div>
      <div class="ttl" id="t">Всё имеет вес</div>
      <div class="txt" id="s" style="max-width:250px">Тело падает с ускорением, сплющивается от удара и встаёт за один отскок. Поверхность отвечает отдачей.</div></div>`,
      play: ({ $, $$, A }) => {
        const d = $('#d');
        A.set(d, { y: -220, opacity: 0 });
        A.animate(d, 'opacity', { from: 0, to: 1, duration: 110, delay: 190, ease: 'linear' });
        A.animate(d, 'y', { from: -220, to: -250, duration: 180, ease: 'inOut', onDone: () => {
          A.animate(d, 'y', { from: -250, to: 0, duration: 220, ease: A.EASE.bezier(.6, 0, .95, .5), onDone: hit });
        } });
        function hit() {
          A.animate(d, 'scaleY', { from: .84, to: 1, spring: TOK.impact });
          A.animate(d, 'scaleX', { from: 1.16, to: 1, spring: TOK.impact });
          A.animate($('#floor'), 'scaleX', { from: 1.5, to: 1, spring: TOK.recoil });
          A.animate($('#floor'), 'opacity', { from: 1, to: .35, duration: 620, ease: 'out' });
          [0, 1].forEach(i => { const r = $('#r' + i);
            A.animate(r, 'scale', { from: .5, to: 3.2 + i, duration: 720 + i * 200, delay: i * 80, ease: 'out' });
            A.animate(r, 'opacity', { from: .8 - i * .3, to: 0, duration: 720 + i * 200, delay: i * 80, ease: 'linear' }); });
          A.animate($('#fl'), 'opacity', { from: 1, to: 0, duration: 400, ease: 'linear' });
          A.animate($('#fl'), 'scaleX', { from: .08, to: 1, duration: 300, ease: 'out' });
          $$('.dust').forEach((p, i) => { const a = -Math.PI + (i / 13) * Math.PI, dist = 44 + (i % 5) * 20;
            A.animate(p, 'opacity', { from: .95, to: 0, duration: 880 + (i % 4) * 130, ease: 'linear' });
            A.animate(p, 'x', { from: 0, to: Math.cos(a) * dist, duration: 880 + (i % 4) * 130, ease: 'out' });
            A.animate(p, 'y', { from: 0, to: Math.sin(a) * dist * .5 + 40, duration: 880 + (i % 4) * 130, ease: A.EASE.bezier(.2, .7, .5, 1) });
            A.animate(p, 'scale', { from: 1.1, to: .28, duration: 880, ease: 'linear' }); });
          ['#k', '#t', '#s'].forEach((sel, i) => {
            A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 250, delay: 80 + i * TOK.stagger, ease: 'out' });
            A.animate($(sel), 'y', { from: 12, to: 0, spring: TOK.row, delay: 80 + i * TOK.stagger });
          });
        }
      },
      rn: `// НАПРАВЛЕНИЕ I — токены. Всё остальное выводится из них.
export const IMPACT = {
  FALL:     { duration: 220, easing: Easing.bezier(0.6, 0, 0.95, 0.5) },  // с ускорением
  SQUASH:   { stiffness: 260, damping: 5,  mass: 1 },    // сплющивание тела
  RECOIL:   { stiffness: 180, damping: 6,  mass: 1 },    // отдача поверхности
  PANEL:    { stiffness: 165, damping: 15, mass: 0.9 },  // панель садится без отскока
  ROW:      { stiffness: 145, damping: 12, mass: 0.6 },
  CHIP:     { stiffness: 190, damping: 10, mass: 0.5 },
  EXIT:     { duration: 190, easing: Easing.bezier(0.4, 0, 1, 1) },
  STAGGER:  62,
  BACKDROP: { duration: 240, easing: Easing.out(Easing.quad) },
};

// ЗАКОН 1. Никакой элемент не появляется «на месте» — он приходит откуда-то
//          и уходит туда же. Вход всегда медленнее выхода (220 против 190).
// ЗАКОН 2. Любой удар порождает три вещи: сплющивание тела, отдачу
//          поверхности и расходящееся кольцо. Одно без других не бывает.
// ЗАКОН 3. Отскок ровно один. Damping ниже 5 запрещён — это уже игрушка.
// ЗАКОН 4. Частицы подчиняются гравитации: горизонталь Easing.out,
//          вертикаль Easing.bezier(.2,.7,.5,1) со сносом вниз.
// ЗАКОН 5. Хаптика привязана к кадру удара, не к началу анимации.`,
    },

    /* ═════════ МОДАЛКИ ═════════ */
    {
      id: 'M-01', cat: 'Модалки', title: 'Повышение уровня', base: 'lesson', duration: 2800,
      sub: 'Медальон падает и впечатывается, награды выходят по 62мс',
      timeline: [{ t: 0, label: 'фон 240мс' }, { t: 200, label: 'замах' }, { t: 380, label: 'падение' }, { t: 600, label: 'УДАР' }, { t: 680, label: 'текст ×62мс' }, { t: 930, label: 'награды' }],
      html: () => `<div class="ov"><div class="bd" id="bd"></div>
        <div class="pl" id="c"><div class="rim" id="rim"></div>
          <div style="position:relative;height:100px">
            <div class="disc" id="d" style="position:absolute;left:50%;margin-left:-46px">12</div>
            ${[0, 1].map(i => `<div class="ring" id="r${i}" style="width:92px;height:92px;top:46px"></div>`).join('')}
            ${Array.from({ length: 12 }, () => `<div class="dust" style="top:46px"></div>`).join('')}
            <div class="flare" id="fl" style="top:46px"></div>
          </div>
          <div class="kick" id="k">Новый рубеж</div>
          <div class="big" id="n">12</div>
          <div class="txt" id="s">Ты в верхних 18% учеников курса</div>
          <div class="rowi" style="--tint:var(--gold)"><i>✦</i><div><b>Бонус</b><em>+100 XP</em></div></div>
          <div class="rowi" style="--tint:var(--acc)"><i>⚡</i><div><b>Энергия</b><em>Максимум поднят до 6</em></div></div>
          <div class="rowi" style="--tint:var(--second)"><i>🎖</i><div><b>Титул</b><em>Wordsmith</em></div></div>
          <div class="btn" id="cta">Забрать награду</div>
        </div></div>`,
      play: ({ $, $$, A }) => {
        const c = $('#c'), d = $('#d');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 240, ease: 'out' });
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 170, ease: 'out' });
        A.animate(c, 'scale', { from: .94, to: 1, spring: TOK.panel });
        A.set(d, { y: -180, scale: 1.45, opacity: 0 });
        A.animate(d, 'opacity', { from: 0, to: 1, duration: 110, delay: 200, ease: 'linear' });
        A.animate(d, 'y', { from: -180, to: -210, duration: 180, delay: 200, ease: 'inOut', onDone: () => {
          A.animate(d, 'y', { from: -210, to: 0, duration: 220, ease: A.EASE.bezier(.6, 0, .95, .5), onDone: hit });
          A.animate(d, 'scale', { from: 1.45, to: 1, duration: 220, ease: A.EASE.bezier(.6, 0, .95, .5) });
        } });
        function hit() {
          A.animate(d, 'scaleY', { from: .84, to: 1, spring: TOK.impact });
          A.animate(d, 'scaleX', { from: 1.16, to: 1, spring: TOK.impact });
          A.animate(c, 'y', { from: 6, to: 0, spring: TOK.recoil });
          [0, 1].forEach(i => { const r = $('#r' + i);
            A.animate(r, 'scale', { from: .5, to: 3.2 + i, duration: 720 + i * 200, delay: i * 80, ease: 'out' });
            A.animate(r, 'opacity', { from: .8 - i * .3, to: 0, duration: 720 + i * 200, delay: i * 80, ease: 'linear' }); });
          A.animate($('#fl'), 'opacity', { from: 1, to: 0, duration: 400, ease: 'linear' });
          A.animate($('#fl'), 'scaleX', { from: .08, to: 1, duration: 300, ease: 'out' });
          A.animate($('#rim'), 'opacity', { from: 1, to: .38, duration: 700, ease: 'out' });
          $$('.dust').forEach((p, i) => { const a = -Math.PI + (i / 11) * Math.PI, dist = 40 + (i % 5) * 18;
            A.animate(p, 'opacity', { from: .95, to: 0, duration: 860, ease: 'linear' });
            A.animate(p, 'x', { from: 0, to: Math.cos(a) * dist, duration: 860, ease: 'out' });
            A.animate(p, 'y', { from: 0, to: Math.sin(a) * dist * .5 + 36, duration: 860, ease: A.EASE.bezier(.2, .7, .5, 1) });
            A.animate(p, 'scale', { from: 1, to: .3, duration: 860, ease: 'linear' }); });
          ['#k', '#n', '#s'].forEach((sel, i) => {
            A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 250, delay: 80 + i * TOK.stagger, ease: 'out' });
            A.animate($(sel), 'y', { from: 12, to: 0, spring: TOK.row, delay: 80 + i * TOK.stagger }); });
          $$('.rowi').forEach((r, i) => {
            const d = 330 + TOK.ladder[i];        // замедляющийся каскад, закон 2 эталона
            A.animate(r, 'opacity', { from: 0, to: 1, duration: 240, delay: d, ease: 'out' });
            A.animate(r, 'x', { from: -14, to: 0, spring: TOK.row, delay: d }); });
          A.animate($('#cta'), 'opacity', { from: 0, to: 1, duration: 240, delay: 620, ease: 'out' });
          A.animate($('#cta'), 'y', { from: 14, to: 0, spring: TOK.row, delay: 620 });
        }
      },
      rn: `// M-01 Повышение уровня
backdrop.opacity = withTiming(1, IMPACT.BACKDROP);
panel.scale      = withSpring(1, IMPACT.PANEL);                  // из 0.94

disc.y = withSequence(
  withDelay(200, withTiming(-210, { duration: 180, easing: Easing.inOut(Easing.ease) })),
  withTiming(0, IMPACT.FALL, (fin) => { if (fin) runOnJS(onImpact)(); }),
);

function onImpact() {
  'worklet';
  discSY.value = withSpring(1, IMPACT.SQUASH);   // из 0.84
  discSX.value = withSpring(1, IMPACT.SQUASH);   // из 1.16
  panelY.value = withSpring(0, IMPACT.RECOIL);   // из 6
  runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Heavy);
}

// каскад НЕравномерный: награды 330 + [0, 62, 146] — шаг растёт.
// Это закон 2 эталона (components/feedback/ResultsSequence.tsx):
// между звёздами 440мс, затем 560мс. Ровный метроном запрещён.
//
// ОБЯЗАТЕЛЬНО по итогам аудита — сейчас этого нет ни в одной наградной модалке:
//   • hapticSuccess() СИНХРОННО со звуком в onShow (закон 5).
//     В LevelUpThresholdModal.tsx — ноль haptic-вызовов на 539 строк.
//   • между pm.reward.level_up и pm.reward.small минимум 100мс тишины
//     (закон 4). Сейчас они стартуют в один момент:
//     _layout.tsx:1468 и SpinRewardPlaque.tsx:59.
//   • «+100 XP» — AnimatedTextInput + useAnimatedProps, ширина слота
//     фиксируется до старта: max(84, len*32+20) (законы 6-7).
//   • LevelBadge autoplay={true} — сейчас false в свой звёздный час.
//   • тап в любой момент = скип за 120-160мс, второй тап закрывает (закон 10).
//   • ConfettiBurst: кап 120 частиц, 1200мс, фиксированный seed, автостоп (закон 11).
//
// ВЫХОД (которого сейчас в приложении нет ни у одной модалки):
// disc.y  = withTiming(70, IMPACT.EXIT);   // уходит вниз, откуда пришёл
// panel.scale = withTiming(0.96, IMPACT.EXIT);
// panel.opacity = withTiming(0, { duration: 150 });
// backdrop.opacity = withTiming(0, { duration: 190 });
//
// Канон уже написан в проекте: components/MotionModal.tsx (open 280 / close 180,
// translateY 18, scaleFrom 0.985, reduce-motion через getModalMotionPlan).
// grep MotionModal app/ → ПУСТО. Причина в MotionModal.tsx:71 — panel:{flex:1},
// шелл не даёт ни радиуса, ни тени, ни центрирования. Чинится в шелле,
// а не в 66 потребителях.`,
    },

    {
      id: 'M-02', cat: 'Модалки', title: 'Закончилась энергия', base: 'lesson', duration: 2400,
      sub: 'Молния втыкается в панель, панель отвечает отдачей и тревожным ободком',
      timeline: [{ t: 0, label: 'фон' }, { t: 120, label: 'панель spring 165/15' }, { t: 260, label: 'молния падает' }, { t: 460, label: 'УДАР + тревожный ободок' }, { t: 540, label: 'строки ×62мс' }],
      html: () => `<div class="ov"><div class="bd" id="bd"></div>
        <div class="pl" id="c"><div class="rim" id="rim" style="box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--wrong) 30%,transparent),inset 0 0 30px color-mix(in srgb,var(--wrong) 12%,transparent);opacity:0"></div>
          <div style="position:relative;height:74px">
            <div id="bolt" style="position:absolute;left:50%;margin-left:-26px;font-size:48px;width:52px;text-align:center">⚡</div>
            <div class="ring" id="r0" style="width:70px;height:70px;top:34px;border-color:var(--wrong)"></div>
          </div>
          <div class="ttl" id="t">Энергия закончилась</div>
          <div class="txt" id="s">Следующая единица через 14:32</div>
          <div class="rowi" id="row1" style="--tint:var(--gold);justify-content:center"><i>💎</i><div><b>Восстановить</b><em>25 осколков · мгновенно</em></div></div>
          <div class="two"><div class="btn ghost" id="b1">Позже</div><div class="btn" id="b2">Восстановить</div></div>
        </div></div>`,
      play: ({ $, $$, A }) => {
        const c = $('#c'), b = $('#bolt');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 240, ease: 'out' });
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 170, delay: 120, ease: 'out' });
        A.animate(c, 'scale', { from: .94, to: 1, spring: TOK.panel, delay: 120 });
        A.set(b, { y: -120, opacity: 0, rotate: -14 });
        A.animate(b, 'opacity', { from: 0, to: 1, duration: 100, delay: 260, ease: 'linear' });
        A.animate(b, 'y', { from: -120, to: 0, duration: 200, delay: 260, ease: A.EASE.bezier(.6, 0, .95, .5), onDone: hit });
        A.animate(b, 'rotate', { from: -14, to: 0, duration: 200, delay: 260, ease: A.EASE.bezier(.6, 0, .95, .5) });
        function hit() {
          A.animate(b, 'scaleY', { from: .82, to: 1, spring: TOK.impact });
          A.animate(b, 'scaleX', { from: 1.14, to: 1, spring: TOK.impact });
          A.animate(c, 'x', { from: -5, to: 0, spring: sp(300, 4) });
          A.animate(c, 'y', { from: 4, to: 0, spring: TOK.recoil });
          const r = $('#r0');
          A.animate(r, 'scale', { from: .6, to: 2.6, duration: 640, ease: 'out' });
          A.animate(r, 'opacity', { from: .7, to: 0, duration: 640, ease: 'linear' });
          A.animate($('#rim'), 'opacity', { from: 0, to: 1, duration: 200, ease: 'out' });
          setTimeout(() => A.animate($('#rim'), 'opacity', { from: 1, to: .4, duration: 700, ease: 'out' }), 260 / A.speed);
          ['#t', '#s', '#row1'].forEach((sel, i) => {
            A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 240, delay: 80 + i * TOK.stagger, ease: 'out' });
            A.animate($(sel), 'y', { from: 10, to: 0, spring: TOK.row, delay: 80 + i * TOK.stagger }); });
          ['#b1', '#b2'].forEach((sel, i) => {
            A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 240, delay: 280 + i * 50, ease: 'out' });
            A.animate($(sel), 'y', { from: 12, to: 0, spring: TOK.row, delay: 280 + i * 50 }); });
        }
      },
      rn: `// M-02 Нет энергии
// Сейчас: spring(90/7) + halo-цикл, но при закрытии setValue(0.85) — выхода нет.
// Здесь: удар даёт тревогу без красной паники, ободок вспыхивает и оседает до 40%.

bolt.y = withDelay(260, withTiming(0, IMPACT.FALL, (f) => { if (f) runOnJS(onImpact)(); }));
// на удар: squash + горизонтальный сдвиг панели -5px spring(300/4) — «тряхнуло»
rim.opacity = withSequence(withTiming(1, { duration: 200 }), withDelay(60, withTiming(0.4, { duration: 700 })));

// БЕЗ вечного halo-цикла: ободок оседает и замирает.
// Это снимает постоянную работу GPU, пока модалка открыта.`,
    },

    {
      id: 'M-03', cat: 'Модалки', title: 'Стрик под угрозой', base: 'home', duration: 2600,
      sub: 'Число дней чеканится, огонь оседает — тревога через вес, не через красный цвет',
      timeline: [{ t: 0, label: 'фон' }, { t: 140, label: 'панель' }, { t: 300, label: '«28» падает' }, { t: 520, label: 'УДАР + осыпь искр' }, { t: 600, label: 'строки' }],
      html: () => `<div class="ov"><div class="bd" id="bd"></div>
        <div class="pl" id="c"><div class="rim"></div>
          <div style="position:relative;height:96px">
            <div id="fire" style="position:absolute;left:50%;margin-left:-24px;top:-2px;font-size:42px">🔥</div>
            <div class="big" id="n" style="position:absolute;left:0;right:0;top:34px;font-size:44px">28</div>
            ${Array.from({ length: 10 }, () => `<div class="dust" style="top:56px;background:#FF9A3D"></div>`).join('')}
            <div class="ring" id="r0" style="width:80px;height:80px;top:56px;border-color:#FF9A3D"></div>
          </div>
          <div class="kick" id="k" style="color:#FF9A3D">Цепочка под угрозой</div>
          <div class="ttl" id="t">28 дней сгорят в полночь</div>
          <div class="txt" id="s">Позанимайся 5 минут — или заморозь цепочку</div>
          <div class="two"><div class="btn ghost" id="b1">Отпустить</div><div class="btn" id="b2">Спасти · 50 💎</div></div>
        </div></div>`,
      play: ({ $, $$, A }) => {
        const c = $('#c'), n = $('#n'), f = $('#fire');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 240, ease: 'out' });
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 170, delay: 140, ease: 'out' });
        A.animate(c, 'scale', { from: .94, to: 1, spring: TOK.panel, delay: 140 });
        A.animate(f, 'opacity', { from: 0, to: 1, duration: 220, delay: 200, ease: 'out' });
        A.animate(f, 'scale', { from: .6, to: 1, spring: TOK.chip, delay: 200 });
        A.set(n, { y: -110, opacity: 0, scale: 1.3 });
        A.animate(n, 'opacity', { from: 0, to: 1, duration: 100, delay: 300, ease: 'linear' });
        A.animate(n, 'scale', { from: 1.3, to: 1, duration: 220, delay: 300, ease: A.EASE.bezier(.6, 0, .95, .5) });
        A.animate(n, 'y', { from: -110, to: 0, duration: 220, delay: 300, ease: A.EASE.bezier(.6, 0, .95, .5), onDone: hit });
        function hit() {
          A.animate(n, 'scaleY', { from: .86, to: 1, spring: TOK.impact });
          A.animate(n, 'scaleX', { from: 1.14, to: 1, spring: TOK.impact });
          A.animate(c, 'y', { from: 5, to: 0, spring: TOK.recoil });
          A.animate(f, 'y', { from: -6, to: 0, spring: sp(220, 6) });
          const r = $('#r0');
          A.animate(r, 'scale', { from: .5, to: 2.8, duration: 700, ease: 'out' });
          A.animate(r, 'opacity', { from: .65, to: 0, duration: 700, ease: 'linear' });
          $$('.dust').forEach((p, i) => { const a = -Math.PI + (i / 9) * Math.PI, dist = 34 + (i % 4) * 16;
            A.animate(p, 'opacity', { from: .9, to: 0, duration: 900, ease: 'linear' });
            A.animate(p, 'x', { from: 0, to: Math.cos(a) * dist, duration: 900, ease: 'out' });
            A.animate(p, 'y', { from: 0, to: -Math.abs(Math.sin(a)) * 40 - 10, duration: 900, ease: 'out' });
            A.animate(p, 'scale', { from: 1, to: .2, duration: 900, ease: 'linear' }); });
          ['#k', '#t', '#s'].forEach((sel, i) => {
            A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 240, delay: 80 + i * TOK.stagger, ease: 'out' });
            A.animate($(sel), 'y', { from: 10, to: 0, spring: TOK.row, delay: 80 + i * TOK.stagger }); });
          ['#b1', '#b2'].forEach((sel, i) => {
            A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 240, delay: 300 + i * 50, ease: 'out' });
            A.animate($(sel), 'y', { from: 12, to: 0, spring: TOK.row, delay: 300 + i * 50 }); });
        }
      },
      rn: `// M-03 Стрик под угрозой
// Тревога передаётся ВЕСОМ и осыпающимися вверх искрами, а не красной заливкой.
// Искры летят ВВЕРХ (огонь), в отличие от золотой пыли левелапа, которая падает.
sparks: y → -(40…50), Easing.out ; dust левелапа: y → +36, Easing.bezier(.2,.7,.5,1)

// Это и есть словарь направления: направление частиц кодирует смысл события.`,
    },

    {
      id: 'M-04', cat: 'Модалки', title: 'Подтверждение удаления', base: 'lessons', duration: 2000,
      sub: 'Деструктив имеет свой ритм: панель приходит с замахом и садится жёстче',
      timeline: [{ t: 0, label: 'фон' }, { t: 60, label: 'замах панели вверх на 8px' }, { t: 200, label: 'посадка spring 165/15' }, { t: 320, label: 'строки' }],
      html: () => `<div class="ov"><div class="bd" id="bd"></div>
        <div class="pl" id="c" style="max-width:262px"><div class="rim" style="box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--wrong) 26%,transparent)"></div>
          <div class="disc sm" id="ic" style="background:radial-gradient(circle at 34% 26%,#FFC9C2,var(--wrong) 48%,#5A1410 90%);color:#fff">✕</div>
          <div class="ttl" id="t">Удалить колоду?</div>
          <div class="txt" id="s">54 карточки будут удалены безвозвратно</div>
          <div class="two"><div class="btn ghost" id="b1">Отмена</div><div class="btn dang" id="b2">Удалить</div></div>
        </div></div>`,
      play: ({ $, A }) => {
        const c = $('#c');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 200, ease: 'out' });
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 150, ease: 'out' });
        A.animate(c, 'y', { from: -8, to: 6, duration: 140, delay: 60, ease: 'inOut', onDone: () => {
          A.animate(c, 'y', { from: 6, to: 0, spring: sp(200, 16) }); } });
        A.animate(c, 'scale', { from: .96, to: 1, spring: TOK.panel });
        A.animate($('#ic'), 'scale', { from: .6, to: 1, spring: TOK.chip, delay: 120 });
        ['#t', '#s'].forEach((sel, i) => {
          A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 230, delay: 200 + i * TOK.stagger, ease: 'out' });
          A.animate($(sel), 'y', { from: 8, to: 0, spring: TOK.row, delay: 200 + i * TOK.stagger }); });
        A.animate($('#b1'), 'opacity', { from: 0, to: 1, duration: 220, delay: 330, ease: 'out' });
        A.animate($('#b2'), 'opacity', { from: 0, to: 1, duration: 220, delay: 400, ease: 'out' });
        A.animate($('#b2'), 'scale', { from: .94, to: 1, spring: TOK.chip, delay: 400 });
      },
      rn: `// M-04 Деструктивное подтверждение
// Единственная модалка с ЗАМАХОМ ВВЕРХ перед посадкой (-8 → +6 → 0).
// Это микро-задержка в 140мс, за которую глаз успевает считать «стоп».
// Опасная кнопка приходит ПОСЛЕДНЕЙ (400мс против 330мс у безопасной)
// и с отдельным spring — её труднее нажать вслепую.`,
    },

    {
      id: 'M-05', cat: 'Модалки', title: 'Нижний лист', base: 'lessons', duration: 2200,
      sub: 'Лист действительно выезжает снизу — сейчас в приложении он проявляется на месте',
      timeline: [{ t: 0, label: 'фон 240мс' }, { t: 40, label: 'лист spring 165/15 снизу' }, { t: 240, label: 'ручка' }, { t: 300, label: 'строки ×62мс' }],
      html: () => `<div class="ov bottom"><div class="bd" id="bd"></div>
        <div class="pl sheet" id="c"><div class="rim"></div>
          <div id="grab" style="width:38px;height:4px;border-radius:3px;background:var(--bdLight);margin:0 auto 16px"></div>
          <div class="ttl" id="t" style="text-align:left;margin:0">Выбери режим</div>
          ${[['🎧', 'Аудирование', 'Слушай и повторяй'], ['✍️', 'Письмо', 'Собирай фразы'], ['⚡', 'Блиц', '60 секунд на серию']]
            .map(([e, n, d]) => `<div class="rowi" style="--tint:var(--acc)"><i>${e}</i><div><b>${n}</b><em>${d}</em></div></div>`).join('')}
          <div class="btn" id="cta">Начать</div>
        </div></div>`,
      play: ({ $, $$, A }) => {
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 240, ease: 'out' });
        A.animate($('#c'), 'y', { from: 420, to: 0, spring: TOK.panel, delay: 40 });
        A.animate($('#grab'), 'opacity', { from: 0, to: 1, duration: 240, delay: 240, ease: 'out' });
        A.animate($('#t'), 'opacity', { from: 0, to: 1, duration: 240, delay: 260, ease: 'out' });
        $$('.rowi').forEach((r, i) => {
          A.animate(r, 'opacity', { from: 0, to: 1, duration: 240, delay: 300 + i * TOK.stagger, ease: 'out' });
          A.animate(r, 'y', { from: 16, to: 0, spring: TOK.row, delay: 300 + i * TOK.stagger }); });
        A.animate($('#cta'), 'opacity', { from: 0, to: 1, duration: 240, delay: 500, ease: 'out' });
      },
      rn: `// M-05 Нижний лист
// СЕЙЧАС в приложении (lesson_complete.tsx ReviewModal и др.):
//   Animated.timing(fadeAnim, { toValue: 1, duration: 200 })
//   Лист НЕ выезжает — он проявляется на месте. Метафора листа сломана.
// ЗДЕСЬ:
sheet.y = withDelay(40, withSpring(0, IMPACT.PANEL));   // из высоты листа
// + жест: PanGestureHandler, при скорости > 800 px/s — закрыть,
//   иначе withSpring обратно. Ручка (grab handle) обязательна.`,
    },

    /* ═════════ ТОСТЫ ═════════ */
    {
      id: 'T-01', cat: 'Тосты', title: 'Единая система: успех', base: 'home', duration: 3400,
      sub: 'Одна геометрия для всех 13 тостов. Рельс автозакрытия виден.',
      timeline: [{ t: 0, label: 'тост snap 190/12 снизу' }, { t: 90, label: 'иконка chip' }, { t: 220, label: 'рельс 3000мс' }, { t: 3000, label: 'уход вниз 190мс' }],
      html: () => `<div class="tst bot" id="t" style="--tint:var(--acc)">
        <div class="edge"></div><div class="ic" id="ic">✓</div>
        <div class="tx"><b>Урок пройден</b><span>+50 XP получено</span></div>
        <div class="rail" id="rail"></div></div>`,
      play: ({ $, A }) => {
        const t = $('#t');
        A.animate(t, 'y', { from: 130, to: 0, spring: sp(190, 12) });
        A.animate(t, 'opacity', { from: 0, to: 1, duration: 160, ease: 'out' });
        A.animate($('#ic'), 'scale', { from: .5, to: 1, spring: TOK.chip, delay: 90 });
        A.animate($('#rail'), 'scaleX', { from: 1, to: 0, duration: 3000, delay: 220, ease: 'linear' });
        setTimeout(() => {
          A.animate(t, 'y', { from: 0, to: 130, duration: 190, ease: 'exit' });
          A.animate(t, 'opacity', { from: 1, to: 0, duration: 150, ease: 'linear' });
        }, 3000 / A.speed);
      },
      rn: `// ЕДИНАЯ СИСТЕМА ТОСТОВ — вместо 13 разных реализаций.
export const TOAST = {
  ENTER:  { stiffness: 190, damping: 12, mass: 1 },   // одна пружина на все тосты
  EXIT:   { duration: 190, easing: Easing.bezier(0.4, 0, 1, 1) },
  OFFSET: 130,                                        // одно стартовое смещение
  LIFE:   { success: 3000, info: 4000, warning: 6000, error: null },  // null = липкий
  LIMIT:  2,                                          // максимум одновременно
  DEDUP:  1600,                                       // склейка одинаковых
};

// Сейчас в коде: 160/120/20/22/12/-160 px стартовых смещений,
// 250/280/240/220/200 мс, четыре разные пружины. Здесь — одна.
// Рельс автозакрытия виден пользователю и ставится на паузу при удержании.`,
    },

    {
      id: 'T-02', cat: 'Тосты', title: 'Награда с действием', base: 'home', duration: 4400,
      sub: 'Тот же скелет, другой акцент. Награда не теряется: без тапа — напоминание позже',
      timeline: [{ t: 0, label: 'тост' }, { t: 90, label: 'иконка' }, { t: 160, label: 'кнопка chip' }, { t: 220, label: 'рельс 4000мс' }],
      html: () => `<div class="tst bot" id="t" style="--tint:var(--gold)">
        <div class="edge"></div><div class="ic" id="ic">🎁</div>
        <div class="tx"><b>Вызов дня выполнен</b><span>Награда: +50 XP</span></div>
        <div class="btn" id="b" style="margin:0;padding:8px 14px;font-size:12px;border-radius:11px">Забрать</div>
        <div class="rail" id="rail"></div></div>`,
      play: ({ $, A }) => {
        const t = $('#t');
        A.animate(t, 'y', { from: 130, to: 0, spring: sp(190, 12) });
        A.animate(t, 'opacity', { from: 0, to: 1, duration: 160, ease: 'out' });
        A.animate($('#ic'), 'scale', { from: .5, to: 1, spring: TOK.chip, delay: 90 });
        A.animate($('#b'), 'scale', { from: .8, to: 1, spring: TOK.chip, delay: 160 });
        A.animate($('#b'), 'opacity', { from: 0, to: 1, duration: 200, delay: 160, ease: 'out' });
        A.animate($('#rail'), 'scaleX', { from: 1, to: 0, duration: 4000, delay: 220, ease: 'linear' });
      },
      rn: `// T-02 Тост с действием
// Тот же ENTER/EXIT/OFFSET, что и у success. Отличается только:
//   • --tint = gold
//   • LIFE 4000 вместо 3000
//   • кнопка появляется на 160мс с CHIP-пружиной
// Награда не сгорает: если тост ушёл без тапа, событие переносится
// в «Подарки», а не пропадает.`,
    },

    {
      id: 'T-03', cat: 'Тосты', title: 'Ошибка — липкая', base: 'lesson', duration: 3000,
      sub: 'Единственный тост, который не уходит сам. Приезжает жёстче: spring 240/11',
      timeline: [{ t: 0, label: 'тост spring 240/11' }, { t: 0, label: 'сдвиг ±4px — «отказ»' }, { t: 120, label: 'иконка' }],
      html: () => `<div class="tst bot" id="t" style="--tint:var(--wrong)">
        <div class="edge"></div><div class="ic" id="ic">!</div>
        <div class="tx"><b>Не удалось сохранить</b><span>Проверь соединение</span></div>
        <div class="btn ghost" id="b" style="margin:0;padding:8px 12px;font-size:12px;border-radius:11px">Повторить</div></div>`,
      play: ({ $, A }) => {
        const t = $('#t');
        A.animate(t, 'y', { from: 130, to: 0, spring: sp(240, 11) });
        A.animate(t, 'opacity', { from: 0, to: 1, duration: 150, ease: 'out' });
        setTimeout(() => {
          A.animate(t, 'x', { from: 0, to: -4, duration: 60, ease: 'linear', onDone: () =>
            A.animate(t, 'x', { from: -4, to: 4, duration: 70, ease: 'linear', onDone: () =>
              A.animate(t, 'x', { from: 4, to: 0, spring: sp(300, 8) }) }) });
        }, 210 / A.speed);
        A.animate($('#ic'), 'scale', { from: .5, to: 1, spring: TOK.chip, delay: 120 });
      },
      rn: `// T-03 Ошибка
// Единственная тяжесть без авто-закрытия (LIFE.error = null).
// Отличается характером посадки: stiffness 240 вместо 190 — приезжает резче,
// плюс микро-отказ ±4px за 130мс. Этого достаточно, чтобы отличить
// ошибку от успеха ПЕРИФЕРИЙНЫМ зрением, не читая текст.`,
    },

    {
      id: 'T-04', cat: 'Тосты', title: 'Очередь из трёх', base: 'home', duration: 5000,
      sub: 'Лимит 2 одновременно, третий ждёт. Сейчас в приложении очереди нет вовсе',
      timeline: [{ t: 0, label: 'тост 1' }, { t: 500, label: 'тост 2 — первый уступает место' }, { t: 2600, label: 'тост 1 ушёл, приходит 3' }],
      html: () => `
        <div class="tst bot" id="t1" style="--tint:var(--acc);bottom:84px"><div class="edge"></div><div class="ic">✓</div>
          <div class="tx"><b>Карточка добавлена</b><span>В колоду «Idioms»</span></div><div class="rail"></div></div>
        <div class="tst bot" id="t2" style="--tint:var(--gold);bottom:84px"><div class="edge"></div><div class="ic">🏅</div>
          <div class="tx"><b>Достижение</b><span>Марафонец · 7 дней</span></div><div class="rail"></div></div>
        <div class="tst bot" id="t3" style="--tint:var(--second);bottom:84px"><div class="edge"></div><div class="ic">📈</div>
          <div class="tx"><b>Ранг вырос</b><span>3 место в лиге</span></div><div class="rail"></div></div>`,
      play: ({ $, A }) => {
        const [t1, t2, t3] = ['#t1', '#t2', '#t3'].map(s => $(s));
        A.set(t2, { opacity: 0 }); A.set(t3, { opacity: 0 });
        A.animate(t1, 'y', { from: 130, to: 0, spring: sp(190, 12) });
        A.animate(t1, 'opacity', { from: 0, to: 1, duration: 160, ease: 'out' });
        setTimeout(() => {
          A.animate(t1, 'y', { from: 0, to: -68, spring: sp(190, 14) });   // уступает место
          A.animate(t2, 'y', { from: 130, to: 0, spring: sp(190, 12) });
          A.animate(t2, 'opacity', { from: 0, to: 1, duration: 160, ease: 'out' });
        }, 500 / A.speed);
        setTimeout(() => {
          A.animate(t1, 'y', { from: -68, to: -140, duration: 190, ease: 'exit' });
          A.animate(t1, 'opacity', { from: 1, to: 0, duration: 150, ease: 'linear' });
          A.animate(t2, 'y', { from: 0, to: -68, spring: sp(190, 14) });
          A.animate(t3, 'y', { from: 130, to: 0, spring: sp(190, 12) });
          A.animate(t3, 'opacity', { from: 0, to: 1, duration: 160, ease: 'out' });
        }, 2600 / A.speed);
      },
      rn: `// T-04 Очередь
// Сейчас: AchievementToast (zIndex 9999), ActionToast (9997) и
// ArenaFriendInviteHost (9998) смонтированы глобально и выезжают
// В ОДНУ И ТУ ЖЕ ТОЧКУ экрана. Ни один не знает о существовании других.
//
// Здесь — один ToastHost с очередью:
//   • LIMIT 2 видимых, остальные ждут
//   • новый приходит снизу, старые поднимаются на 68px (spring 190/14)
//   • ушедший освобождает слот, следующий из очереди въезжает
//   • дедуп 1600мс: «+50 XP» ×3 склеивается в «+150 XP»`,
    },

    /* ═════════ СОСТОЯНИЯ ═════════ */
    {
      id: 'S-01', cat: 'Состояния', title: 'Загрузка → содержимое', base: 'plain', duration: 3000,
      sub: 'Скелетоны той же геометрии, что и карточки. Подмена не мигает — она осаживается',
      timeline: [{ t: 0, label: 'скелетоны + shimmer 1200мс' }, { t: 1400, label: 'скелетон гаснет 160мс' }, { t: 1480, label: 'карточки садятся ×62мс' }],
      html: () => `<div style="position:absolute;inset:0;padding:64px 16px 0;z-index:150">
        <div id="sk">${[86, 64, 64].map(h => `<div class="skel" style="height:${h}px;margin-bottom:11px;border-radius:22px"></div>`).join('')}</div>
        <div id="re" style="position:absolute;left:16px;right:16px;top:64px;opacity:0">
          ${[['Present Perfect', 'Урок 14 · A2', 'var(--acc)'], ['124 слова к повтору', 'Карточки', '#8FA0FF'], ['Онлайн 312', 'Арена', 'var(--wrong)']]
            .map(([t, k, c], i) => `<div class="rl" style="background:linear-gradient(150deg,color-mix(in srgb,var(--cardG1) 34%,var(--card)),var(--card) 62%,var(--cardG2));
              border:1px solid var(--bd);border-radius:22px;padding:14px 16px;margin-bottom:11px">
              <div style="font-size:9.5px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:${c}">${k}</div>
              <div style="font-size:17px;font-weight:850;margin-top:6px;letter-spacing:-.02em">${t}</div></div>`).join('')}
        </div></div>`,
      play: ({ $, $$, A }) => {
        $$('.skel').forEach((s, i) => {
          A.animate(s, 'opacity', { from: .5, to: .5, duration: 1200, delay: i * 90, repeat: 2,
            set: (v, p) => { s.style.backgroundPosition = (120 - p * 240) + '% 0'; } });
        });
        setTimeout(() => {
          A.animate($('#sk'), 'opacity', { from: 1, to: 0, duration: 160, ease: 'linear' });
          A.animate($('#re'), 'opacity', { from: 0, to: 1, duration: 200, delay: 80, ease: 'out' });
          $$('.rl').forEach((r, i) => {
            A.animate(r, 'y', { from: 14, to: 0, spring: TOK.row, delay: 80 + i * TOK.stagger });
            A.animate(r, 'scale', { from: .97, to: 1, spring: TOK.row, delay: 80 + i * TOK.stagger }); });
        }, 1400 / A.speed);
      },
      rn: `// S-01 Загрузка
// В приложении есть docs/NO_VISIBLE_LOADING_AUDIT.md — тема известная.
// Правила направления:
//   1. Скелетон имеет ТУ ЖЕ геометрию, что и реальная карточка
//      (радиус 22, те же высоты) — подмена не двигает layout.
//   2. Скелетон не показывается раньше 180мс: быстрые ответы не мигают.
//   3. Shimmer — translateX градиента, не изменение backgroundPosition
//      (в RN: LinearGradient + transform, на UI-потоке).
//   4. Скелетон гаснет за 160мс, содержимое садится через 80мс —
//      перекрытие в 80мс убирает «дыру» между состояниями.`,
    },

    {
      id: 'S-02', cat: 'Состояния', title: 'Пусто и ошибка', base: 'plain', duration: 2600,
      sub: 'Пустота — приглашение, а не тупик. Иконка чеканится, CTA приходит последним',
      timeline: [{ t: 200, label: 'иконка падает' }, { t: 420, label: 'УДАР' }, { t: 500, label: 'текст ×62мс' }, { t: 700, label: 'CTA' }],
      html: () => `<div class="cel">
        <div style="position:relative;height:88px;width:100%">
          <div class="disc sm" id="ic" style="position:absolute;left:50%;margin-left:-30px;background:radial-gradient(circle at 34% 26%,var(--surf2),var(--surf) 70%);color:var(--mut);border:1px solid var(--bd);box-shadow:0 10px 24px rgba(0,0,0,.5)">🗂</div>
          <div class="ring" id="r0" style="width:60px;height:60px;top:30px;border-color:var(--bdLight)"></div>
        </div>
        <div class="ttl" id="t">Здесь пока пусто</div>
        <div class="txt" id="s" style="max-width:230px">Добавь первую карточку — и она появится в этой колоде</div>
        <div class="btn" id="cta" style="padding:12px 26px">Добавить карточку</div></div>`,
      play: ({ $, A }) => {
        const ic = $('#ic');
        A.set(ic, { y: -90, opacity: 0 });
        A.animate(ic, 'opacity', { from: 0, to: 1, duration: 110, delay: 200, ease: 'linear' });
        A.animate(ic, 'y', { from: -90, to: 0, duration: 220, delay: 200, ease: A.EASE.bezier(.6, 0, .95, .5), onDone: () => {
          A.animate(ic, 'scaleY', { from: .86, to: 1, spring: TOK.impact });
          A.animate(ic, 'scaleX', { from: 1.14, to: 1, spring: TOK.impact });
          const r = $('#r0');
          A.animate(r, 'scale', { from: .6, to: 2.2, duration: 640, ease: 'out' });
          A.animate(r, 'opacity', { from: .5, to: 0, duration: 640, ease: 'linear' });
          ['#t', '#s'].forEach((sel, i) => {
            A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 240, delay: 80 + i * TOK.stagger, ease: 'out' });
            A.animate($(sel), 'y', { from: 10, to: 0, spring: TOK.row, delay: 80 + i * TOK.stagger }); });
          A.animate($('#cta'), 'opacity', { from: 0, to: 1, duration: 240, delay: 280, ease: 'out' });
          A.animate($('#cta'), 'scale', { from: .94, to: 1, spring: TOK.chip, delay: 280 });
        } });
      },
      rn: `// S-02 Пустое состояние
// Тот же удар, что у награды, но БЕЗ золота и БЕЗ частиц —
// нейтральные материалы (surf/surf2), одно бледное кольцо.
// Пустота получает тот же вес, что и событие: экран не выглядит сломанным.
// components/ui/EmptyState.tsx получает проп motion="impact" и
// перестаёт быть статичным.`,
    },

    /* ═════════ ПЕРЕХОДЫ ═════════ */
    {
      id: 'X-01', cat: 'Переходы', title: 'Между экранами', base: 'plain', duration: 3000,
      sub: 'Сейчас animation:"none" — подмена кадра за 0мс на всех 55 экранах',
      timeline: [{ t: 400, label: 'уходящий: -12% + затемнение' }, { t: 400, label: 'входящий: +100% → 0, 300мс' }, { t: 1800, label: 'назад — зеркально' }],
      html: () => `<div style="position:absolute;inset:0;overflow:hidden">
        <div id="a" style="position:absolute;inset:0">${BASES.home('midnight')}</div>
        <div id="ashade" style="position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:5"></div>
        <div id="b" style="position:absolute;inset:0;z-index:10">${BASES.lessons('midnight')}</div>
      </div>`,
      play: ({ $, A }) => {
        const a = $('#a'), b = $('#b'), sh = $('#ashade');
        A.set(b, { x: 376 });
        setTimeout(() => {
          A.animate(b, 'x', { from: 376, to: 0, duration: 300, ease: A.EASE.bezier(.32, .72, 0, 1) });
          A.animate(a, 'x', { from: 0, to: -45, duration: 300, ease: A.EASE.bezier(.32, .72, 0, 1) });
          A.animate(sh, 'opacity', { from: 0, to: .34, duration: 300, ease: 'linear' });
        }, 400 / A.speed);
        setTimeout(() => {
          A.animate(b, 'x', { from: 0, to: 376, duration: 260, ease: 'exit' });
          A.animate(a, 'x', { from: -45, to: 0, duration: 260, ease: 'exit' });
          A.animate(sh, 'opacity', { from: .34, to: 0, duration: 260, ease: 'linear' });
        }, 1800 / A.speed);
      },
      rn: `// X-01 Переход между экранами
// СЕЙЧАС app/_layout.tsx:
//   <Stack screenOptions={{ animation: 'none' }}>
//   Комментарий в коде: «Без fade: глобальный fade на native-stack даёт
//   поздний белый кроссфейд при каждом push/replace».
//   Проблема реальная — но лечится не отключением анимации.
//
// РЕШЕНИЕ: причина белой вспышки — прозрачный contentStyle.
//   contentStyle: { backgroundColor: tTheme.bgPrimary }  // уже стоит
//   + animation: 'slide_from_right'
//   + animationDuration: 300
//   + на Android: react-native-screens ≥ 4 корректно уважает contentStyle.
//
// ПАРАЛЛАКС: уходящий экран сдвигается на -45px (12%), а не на -100%,
// и притеняется до 34%. Глаз держит связь между экранами —
// это и есть разница между «переходом» и «подменой».`,
    },

    {
      id: 'X-02', cat: 'Переходы', title: 'Кнопка под пальцем', base: 'plain', duration: 2600,
      sub: 'Нажатие прогибает кнопку, отпускание возвращает с отдачей',
      timeline: [{ t: 400, label: 'нажатие: scale .96 за 90мс' }, { t: 900, label: 'отпускание spring 190/10' }, { t: 1400, label: 'повтор' }],
      html: () => `<div class="cel">
        <div class="btn" id="b" style="width:200px;padding:15px;font-size:15px">Продолжить</div>
        <div class="txt" style="margin-top:22px;max-width:230px">Нажатие — 90мс линейно. Отпускание — пружина с отдачей. Разница в характере говорит о том, что действие принято.</div></div>`,
      play: ({ $, A }) => {
        const b = $('#b');
        A.animate(b, 'opacity', { from: 0, to: 1, duration: 240, ease: 'out' });
        A.animate(b, 'y', { from: 12, to: 0, spring: TOK.row });
        const press = (t) => {
          setTimeout(() => A.animate(b, 'scale', { from: 1, to: .96, duration: 90, ease: 'linear' }), t / A.speed);
          setTimeout(() => A.animate(b, 'scale', { from: .96, to: 1, spring: sp(190, 10) }), (t + 500) / A.speed);
        };
        press(400); press(1400);
      },
      rn: `// X-02 Микровзаимодействие кнопки
onPressIn:  scale.value = withTiming(0.96, { duration: 90, easing: Easing.linear });
onPressOut: scale.value = withSpring(1, { stiffness: 190, damping: 10 });

// В приложении есть components/PressableScale.tsx — но применён он
// далеко не везде. Правило направления: любой кликабельный элемент
// площадью больше 44×44 обязан прогибаться. Иконки в тулбаре — нет.`,
    },
  ],
};
