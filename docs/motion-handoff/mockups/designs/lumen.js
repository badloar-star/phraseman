/* ============================================================================
   НАПРАВЛЕНИЕ II — «СВЕТОВОД». Свет и глубина.
   Ничто не летит и не падает. Элементы ПРОЯВЛЯЮТСЯ: сначала свет, потом форма.
   Вместо перемещения — фокус, глубина и зажигание кромки.
   ========================================================================== */

const sp = (t, f) => ENGINE.origami(t, f);
const RS = (mass, damping, stiffness) => ({ mass, damping, stiffness });

const TOK = {
  bloom:   { duration: 420, ease: 'out' },    // источник света разгорается
  resolve: { duration: 380, ease: 'out' },    // форма выходит из расфокуса
  settle:  RS(1, 22, 150),                    // посадка БЕЗ отскока
  rim:     { duration: 620, ease: 'inOut' },  // свет обегает кромку
  depth:   { duration: 460, ease: 'out' },    // слои расходятся по глубине
  exit:    { duration: 260, ease: 'in' },     // растворяется обратно в свет
  stagger: 74,
  parallax: [0.35, 0.62, 1],                  // фон / средний план / передний
  /* Закон 2 эталона: ритм замедляется к кульминации. Шаг растёт. */
  ladder: [0, 74, 172, 306, 478, 688],
};

const DESIGN = {
  slug: 'lumen', letter: 'II',
  name: 'Световод',
  tagline: 'Свет и глубина. Ничто не летит — сначала загорается свет, потом из него выходит форма.',
  brand: '#8FA0FF', brandDim: 'rgba(143,160,255,.16)',
  defaultTheme: 'midnight',

  css: `
  .ov{position:absolute;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
  .ov.bottom{align-items:flex-end;padding:0}
  .bd{position:absolute;inset:0;background:rgba(1,2,6,.66)}
  .src{position:absolute;left:50%;top:50%;width:340px;height:340px;margin:-170px 0 0 -170px;border-radius:50%;
    pointer-events:none;opacity:0;
    background:radial-gradient(circle,color-mix(in srgb,var(--acc) 40%,transparent) 0%,color-mix(in srgb,var(--acc) 12%,transparent) 34%,transparent 66%)}
  .pl{position:relative;width:100%;max-width:290px;border-radius:28px;padding:24px 22px 20px;text-align:center;overflow:hidden;
    background:linear-gradient(158deg,color-mix(in srgb,var(--cardG1) 30%,var(--card)) 0%,var(--card) 52%,var(--cardG2) 100%);
    border:1px solid transparent;
    box-shadow:0 30px 70px rgba(0,0,0,.66),inset 0 1px 0 rgba(255,255,255,.05)}
  .pl.sheet{max-width:none;width:100%;border-radius:30px 30px 0 0;padding:22px 22px 32px}
  .edge{position:absolute;inset:0;border-radius:inherit;pointer-events:none;
    background:conic-gradient(from var(--ang,0deg),transparent 0deg,color-mix(in srgb,var(--acc) 78%,#fff) 26deg,transparent 62deg);
    -webkit-mask:linear-gradient(#000,#000) content-box,linear-gradient(#000,#000);
    -webkit-mask-composite:xor;mask-composite:exclude;padding:1px;opacity:0}
  .halo{position:absolute;inset:-1px;border-radius:inherit;pointer-events:none;opacity:0;
    box-shadow:0 0 0 1px color-mix(in srgb,var(--acc) 34%,transparent),0 0 40px color-mix(in srgb,var(--acc) 22%,transparent)}

  .kick{font-size:9.5px;font-weight:800;letter-spacing:.22em;text-transform:uppercase;color:var(--acc);opacity:.92}
  .ttl{font-size:21px;font-weight:800;letter-spacing:-.03em;margin-top:9px;color:var(--tx);line-height:1.18}
  .txt{font-size:12.5px;color:var(--mut);margin-top:8px;line-height:1.55;font-weight:450}
  .big{font-size:56px;font-weight:800;letter-spacing:-.055em;line-height:1;margin-top:2px;color:var(--tx);
    text-shadow:0 0 40px color-mix(in srgb,var(--acc) 55%,transparent)}
  .lamp{width:96px;height:96px;margin:0 auto;border-radius:50%;position:relative;
    display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:800;color:var(--tx);
    background:radial-gradient(circle at 50% 46%,color-mix(in srgb,var(--acc) 30%,transparent),transparent 68%);
    border:1px solid color-mix(in srgb,var(--acc) 26%,transparent)}
  .lamp .core{position:absolute;inset:16px;border-radius:50%;
    background:radial-gradient(circle,color-mix(in srgb,var(--acc) 62%,#fff) 0%,color-mix(in srgb,var(--acc) 18%,transparent) 58%,transparent 72%)}
  .lamp span{position:relative;z-index:2}
  .rowi{display:flex;gap:11px;align-items:center;border-radius:16px;padding:10px 12px;margin-top:9px;text-align:left;
    background:linear-gradient(100deg,color-mix(in srgb,var(--tint,var(--acc)) 9%,transparent),transparent 78%);
    border:1px solid color-mix(in srgb,var(--tint,var(--acc)) 17%,transparent)}
  .rowi i{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-style:normal;flex:none;
    background:radial-gradient(circle,color-mix(in srgb,var(--tint,var(--acc)) 34%,transparent),transparent 70%);
    border:1px solid color-mix(in srgb,var(--tint,var(--acc)) 26%,transparent)}
  .rowi b{display:block;font-size:9px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--tint,var(--acc));opacity:.85}
  .rowi em{display:block;font-size:12.5px;font-weight:700;font-style:normal;color:var(--tx);margin-top:2px}
  .btn{margin-top:17px;border-radius:17px;padding:13px;font-weight:800;font-size:13.5px;position:relative;overflow:hidden;
    background:linear-gradient(100deg,color-mix(in srgb,var(--acc) 90%,#fff),var(--acc) 46%,color-mix(in srgb,var(--acc) 72%,#000));
    color:var(--onAcc);box-shadow:0 0 30px color-mix(in srgb,var(--acc) 28%,transparent)}
  .btn .sweep{position:absolute;top:0;bottom:0;width:60px;left:-80px;
    background:linear-gradient(90deg,transparent,rgba(255,255,255,.42),transparent);transform:skewX(-16deg)}
  .btn.ghost{background:transparent;color:var(--mut);border:1px solid var(--bd);box-shadow:none;font-weight:650}
  .two{display:flex;gap:10px;margin-top:17px}.two .btn{flex:1;margin:0}

  .beam{position:absolute;left:50%;top:50%;width:1.5px;transform-origin:50% 100%;pointer-events:none;opacity:0;
    background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--acc) 80%,#fff),transparent)}
  .mote{position:absolute;left:50%;top:50%;width:3px;height:3px;border-radius:50%;pointer-events:none;opacity:0;
    background:color-mix(in srgb,var(--acc) 80%,#fff);box-shadow:0 0 8px color-mix(in srgb,var(--acc) 70%,transparent)}

  .tst{position:absolute;left:12px;right:12px;border-radius:20px;padding:13px 14px;display:flex;gap:12px;align-items:center;z-index:200;overflow:hidden;
    background:linear-gradient(140deg,color-mix(in srgb,var(--cardG1) 26%,var(--card)),var(--card) 66%,var(--cardG2));
    border:1px solid color-mix(in srgb,var(--tint,var(--acc)) 20%,transparent);
    box-shadow:0 18px 40px rgba(0,0,0,.58),0 0 30px color-mix(in srgb,var(--tint,var(--acc)) 12%,transparent)}
  .tst.bot{bottom:84px}.tst.top{top:52px}
  .tst .ic{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex:none;
    background:radial-gradient(circle,color-mix(in srgb,var(--tint,var(--acc)) 32%,transparent),transparent 70%);
    border:1px solid color-mix(in srgb,var(--tint,var(--acc)) 24%,transparent)}
  .tst .tx{flex:1;min-width:0;text-align:left}
  .tst .tx b{display:block;font-size:13px;font-weight:750;color:var(--tx);letter-spacing:-.012em}
  .tst .tx span{display:block;font-size:11px;color:var(--mut);margin-top:2px}
  .tst .glowline{position:absolute;left:14px;right:14px;bottom:0;height:1.5px;transform-origin:left;
    background:linear-gradient(90deg,color-mix(in srgb,var(--tint,var(--acc)) 80%,#fff),transparent)}

  .skel{border-radius:22px;background:linear-gradient(100deg,var(--surf) 0%,color-mix(in srgb,var(--acc) 10%,var(--surf2)) 48%,var(--surf) 92%);
    background-size:240% 100%}
  .cel{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:26px;text-align:center;z-index:150}
  `,

  surfaces: [

    {
      id: 'P-01', cat: 'Принцип', title: 'Свет прежде формы', base: 'plain', duration: 2600,
      sub: 'Источник разгорается 420мс → форма выходит из расфокуса 380мс → кромка зажигается 620мс',
      timeline: [{ t: 0, label: 'источник света 420мс' }, { t: 180, label: 'форма из расфокуса' }, { t: 420, label: 'кромка обегает' }, { t: 560, label: 'текст ×74мс' }],
      html: () => `<div class="cel">
        <div style="position:relative;height:150px;width:100%;display:flex;align-items:center;justify-content:center">
          <i class="src" id="src" style="width:230px;height:230px;margin:-115px 0 0 -115px"></i>
          <div class="lamp" id="lamp"><i class="core" id="core"></i><span>12</span></div>
          ${Array.from({ length: 14 }, (_, i) => `<div class="beam b${i}" style="height:${20 + (i % 4) * 14}px"></div>`).join('')}
        </div>
        <div class="kick" id="k">Принцип направления</div>
        <div class="ttl" id="t">Сначала свет</div>
        <div class="txt" id="s" style="max-width:250px">Форма не прилетает — она проявляется из свечения. Движение идёт по глубине и фокусу, а не по экрану.</div></div>`,
      play: ({ $, $$, A }) => {
        const lamp = $('#lamp');
        A.animate($('#src'), 'opacity', { from: 0, to: 1, duration: 420, ease: 'out' });
        A.animate($('#src'), 'scale', { from: .55, to: 1, duration: 620, ease: 'out' });
        A.set(lamp, { opacity: 0, scale: 1.14, blur: 14 });
        A.animate(lamp, 'opacity', { from: 0, to: 1, duration: 380, delay: 180, ease: 'out' });
        A.animate(lamp, 'scale', { from: 1.14, to: 1, duration: 460, delay: 180, ease: 'out' });
        A.animate(lamp, 'blur', { from: 14, to: 0, duration: 420, delay: 180, ease: 'out' });
        A.animate($('#core'), 'opacity', { from: 0, to: 1, duration: 520, delay: 240, ease: 'out' });
        A.animate($('#core'), 'scale', { from: .4, to: 1, duration: 620, delay: 240, ease: 'out' });
        $$('.beam').forEach((b, i) => {
          const ang = (i / 14) * 360;
          b.style.transform = `rotate(${ang}deg)`;
          A.animate(b, 'opacity', { from: 0, to: .85, duration: 300, delay: 420 + i * 22, ease: 'out',
            onDone: () => A.animate(b, 'opacity', { from: .85, to: 0, duration: 620, ease: 'linear' }) });
          A.animate(b, 'scaleY', { from: .2, to: 1, duration: 620, delay: 420 + i * 22, ease: 'out' });
        });
        ['#k', '#t', '#s'].forEach((sel, i) => {
          A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 420, delay: 560 + i * 74, ease: 'out' });
          A.animate($(sel), 'blur', { from: 7, to: 0, duration: 420, delay: 560 + i * 74, ease: 'out' });
        });
      },
      rn: `// НАПРАВЛЕНИЕ II — токены
export const LUMEN = {
  BLOOM:   { duration: 420, easing: Easing.out(Easing.cubic) },   // источник света
  RESOLVE: { duration: 380, easing: Easing.out(Easing.cubic) },   // выход из расфокуса
  SETTLE:  { stiffness: 150, damping: 22, mass: 1 },              // посадка БЕЗ отскока
  RIM:     { duration: 620, easing: Easing.inOut(Easing.ease) },  // свет обегает кромку
  DEPTH:   { duration: 460, easing: Easing.out(Easing.cubic) },
  EXIT:    { duration: 260, easing: Easing.in(Easing.cubic) },
  STAGGER: 74,
  PARALLAX:[0.35, 0.62, 1],
};

// ЗАКОН 1. Ни один элемент не перемещается по экрану больше чем на 14px.
//          Движение — по оси Z: масштаб, размытие, свечение.
// ЗАКОН 2. Расфокус имитируется масштабом 1.14 → 1.0 + opacity.
//          НАСТОЯЩИЙ blur НЕ используется — на Android это дорого.
//          Исключение: одна BlurView на backdrop, не более.
// ЗАКОН 3. Ни одной пружины с отскоком. damping ≥ 20 везде.
// ЗАКОН 4. Свет всегда опережает форму минимум на 180мс.
// ЗАКОН 5. Выход — обратное растворение: opacity + scale 1.0 → 1.06,
//          элемент уходит ВГЛУБЬ, а не вбок.`,
    },

    {
      id: 'M-01', cat: 'Модалки', title: 'Повышение уровня', base: 'lesson', duration: 3200,
      sub: 'Свет за панелью → панель из расфокуса → кромка зажигается → число загорается',
      timeline: [{ t: 0, label: 'фон + источник 420мс' }, { t: 180, label: 'панель scale 1.06→1' }, { t: 420, label: 'кромка обегает 620мс' }, { t: 520, label: 'число разгорается' }, { t: 700, label: 'награды ×74мс' }],
      html: () => `<div class="ov"><div class="bd" id="bd"></div><i class="src" id="src"></i>
        <div class="pl" id="c"><div class="edge" id="edge"></div><div class="halo" id="halo"></div>
          <div style="position:relative;height:104px;display:flex;align-items:center;justify-content:center">
            <div class="lamp" id="lamp"><i class="core" id="core"></i><span id="lnum">12</span></div>
            ${Array.from({ length: 10 }, () => `<div class="mote"></div>`).join('')}
          </div>
          <div class="kick" id="k">Уровень достигнут</div>
          <div class="big" id="n">12</div>
          <div class="txt" id="s">Ты в верхних 18% учеников курса</div>
          <div class="rowi" style="--tint:var(--gold)"><i>✦</i><div><b>Бонус</b><em>+100 XP</em></div></div>
          <div class="rowi" style="--tint:var(--acc)"><i>⚡</i><div><b>Энергия</b><em>Максимум поднят до 6</em></div></div>
          <div class="rowi" style="--tint:var(--second)"><i>🎖</i><div><b>Титул</b><em>Wordsmith</em></div></div>
          <div class="btn" id="cta"><i class="sweep" id="sw"></i>Забрать награду</div>
        </div></div>`,
      play: ({ $, $$, A }) => {
        const c = $('#c');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 380, ease: 'out' });
        A.animate($('#src'), 'opacity', { from: 0, to: .9, duration: 420, ease: 'out' });
        A.animate($('#src'), 'scale', { from: .5, to: 1, duration: 760, ease: 'out' });
        A.set(c, { opacity: 0, scale: 1.06 });
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 380, delay: 180, ease: 'out' });
        A.animate(c, 'scale', { from: 1.06, to: 1, spring: TOK.settle, delay: 180 });
        // свет обегает кромку
        A.animate($('#edge'), 'opacity', { from: 0, to: 1, duration: 180, delay: 420, ease: 'out' });
        A.animate($('#edge'), 'opacity', { from: 1, to: 0, duration: 260, delay: 900, ease: 'linear' });
        A.animate($('#edge'), 'scale', { from: 1, to: 1, duration: 620, delay: 420, ease: 'inOut',
          set: (v, p) => { $('#edge').style.setProperty('--ang', (p * 360) + 'deg'); } });
        A.animate($('#halo'), 'opacity', { from: 0, to: 1, duration: 520, delay: 480, ease: 'out' });
        // лампа и число
        A.animate($('#lamp'), 'opacity', { from: 0, to: 1, duration: 420, delay: 340, ease: 'out' });
        A.animate($('#lamp'), 'scale', { from: 1.2, to: 1, duration: 560, delay: 340, ease: 'out' });
        A.animate($('#core'), 'opacity', { from: 0, to: 1, duration: 620, delay: 400, ease: 'out' });
        A.animate($('#core'), 'scale', { from: .3, to: 1, duration: 720, delay: 400, ease: 'out' });
        $$('.mote').forEach((m, i) => {
          const a = (i / 10) * Math.PI * 2, d = 56 + (i % 3) * 18;
          A.animate(m, 'opacity', { from: 0, to: .9, duration: 300, delay: 520 + i * 30, ease: 'out',
            onDone: () => A.animate(m, 'opacity', { from: .9, to: 0, duration: 900, ease: 'linear' }) });
          A.animate(m, 'x', { from: 0, to: Math.cos(a) * d, duration: 1200, delay: 520 + i * 30, ease: 'out' });
          A.animate(m, 'y', { from: 0, to: Math.sin(a) * d - 20, duration: 1200, delay: 520 + i * 30, ease: 'out' });
        });
        ['#k', '#n', '#s'].forEach((sel, i) => {
          A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 420, delay: 520 + i * 74, ease: 'out' });
          A.animate($(sel), 'scale', { from: 1.08, to: 1, duration: 520, delay: 520 + i * 74, ease: 'out' }); });
        $$('.rowi').forEach((r, i) => {
          const d = 760 + TOK.ladder[i];       // замедляющийся каскад, закон 2 эталона
          A.animate(r, 'opacity', { from: 0, to: 1, duration: 400, delay: d, ease: 'out' });
          A.animate(r, 'scale', { from: 1.04, to: 1, duration: 460, delay: d, ease: 'out' }); });
        A.animate($('#cta'), 'opacity', { from: 0, to: 1, duration: 400, delay: 1090, ease: 'out' });
        A.animate($('#sw'), 'x', { from: 0, to: 380, duration: 900, delay: 1300, ease: 'inOut' });
      },
      rn: `// M-01 Повышение уровня — «Световод»
source.opacity = withTiming(0.9, LUMEN.BLOOM);          // свет ПЕРВЫМ
source.scale   = withTiming(1,   { duration: 760, easing: Easing.out(Easing.cubic) });

panel.opacity  = withDelay(180, withTiming(1, LUMEN.RESOLVE));
panel.scale    = withDelay(180, withSpring(1, LUMEN.SETTLE));   // из 1.06 — ИЗ ГЛУБИНЫ, не снизу

// Кромка: свет обегает периметр за 620мс.
// В RN это НЕ conic-gradient (его нет), а MaskedView + вращающийся
// LinearGradient, либо react-native-svg <Circle> со strokeDasharray
// и анимируемым strokeDashoffset — второе дешевле.
rimAngle.value = withDelay(420, withTiming(360, LUMEN.RIM));

// 10 мотыльков света расходятся и гаснут — 3×3px View со свечением
// через shadowColor (iOS) / elevation-free glow-слоем (Android).

// ЦЕНА: ни одного BlurView. Расфокус имитируется scale 1.06→1 + opacity.
// Всё на transform/opacity, 21 узел.
// (Аудит: expo-blur в проекте не используется вовсе — правильное решение
//  для Android-бюджетников, направление его не нарушает.)
//
// ОБЯЗАТЕЛЬНО по итогам аудита:
//   • hapticSuccess() синхронно со звуком (закон 5) — сейчас во всём
//     GlobalLevelUpHandler (_layout.tsx:770-1500) ноль haptic-вызовов.
//   • 100мс тишины между двумя наградными звуками (закон 4).
//   • число уровня N−1 → N на AnimatedTextInput, ширина слота
//     фиксируется заранее (законы 6-7).
//   • каскад наград неравномерный: 760 + [0, 74, 172] (закон 2).
//   • скип по тапу за 120-160мс, второй тап закрывает (закон 10).
//   • фон обязан быть ВНУТРИ анимируемого узла. Сейчас в
//     LevelUpThresholdModal.tsx фон на :154-162, а анимация на :169 —
//     экран заливается за 1 кадр, и только потом пружинит содержимое.`,
    },

    {
      id: 'M-02', cat: 'Модалки', title: 'Закончилась энергия', base: 'lesson', duration: 2800,
      sub: 'Свет гаснет вместо того, чтобы вспыхнуть — единственная модалка с обратной динамикой',
      timeline: [{ t: 0, label: 'источник ярко' }, { t: 260, label: 'угасание до 30% за 900мс' }, { t: 300, label: 'панель проявляется' }, { t: 620, label: 'строки' }],
      html: () => `<div class="ov"><div class="bd" id="bd"></div><i class="src" id="src" style="background:radial-gradient(circle,color-mix(in srgb,var(--gold) 34%,transparent) 0%,transparent 64%)"></i>
        <div class="pl" id="c"><div class="halo" id="halo" style="box-shadow:0 0 0 1px color-mix(in srgb,var(--gold) 26%,transparent),0 0 36px color-mix(in srgb,var(--gold) 14%,transparent)"></div>
          <div style="position:relative;height:82px;display:flex;align-items:center;justify-content:center">
            <div class="lamp" id="lamp" style="width:74px;height:74px;font-size:30px;border-color:color-mix(in srgb,var(--gold) 22%,transparent);
              background:radial-gradient(circle at 50% 46%,color-mix(in srgb,var(--gold) 26%,transparent),transparent 68%)">
              <i class="core" id="core" style="background:radial-gradient(circle,color-mix(in srgb,var(--gold) 62%,#fff) 0%,transparent 70%)"></i><span>⚡</span></div>
          </div>
          <div class="ttl" id="t">Энергия иссякла</div>
          <div class="txt" id="s">Восстановится через 14:32</div>
          <div class="rowi" id="r1" style="--tint:var(--gold)"><i>💎</i><div><b>Мгновенно</b><em>25 осколков</em></div></div>
          <div class="two"><div class="btn ghost" id="b1">Позже</div><div class="btn" id="b2" style="background:linear-gradient(100deg,color-mix(in srgb,var(--gold) 92%,#fff),var(--gold) 46%,color-mix(in srgb,var(--gold) 70%,#000));color:var(--onGold);box-shadow:0 0 26px color-mix(in srgb,var(--gold) 26%,transparent)">Восстановить</div></div>
        </div></div>`,
      play: ({ $, A }) => {
        const c = $('#c');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 380, ease: 'out' });
        A.animate($('#src'), 'opacity', { from: 0, to: 1, duration: 260, ease: 'out' });
        A.animate($('#src'), 'scale', { from: .6, to: 1.1, duration: 260, ease: 'out',
          onDone: () => {
            A.animate($('#src'), 'opacity', { from: 1, to: .3, duration: 900, ease: 'inOut' });
            A.animate($('#src'), 'scale', { from: 1.1, to: .82, duration: 900, ease: 'inOut' });
          } });
        A.set(c, { opacity: 0, scale: 1.05 });
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 380, delay: 300, ease: 'out' });
        A.animate(c, 'scale', { from: 1.05, to: 1, spring: TOK.settle, delay: 300 });
        A.animate($('#halo'), 'opacity', { from: 0, to: .8, duration: 520, delay: 420, ease: 'out' });
        A.animate($('#lamp'), 'opacity', { from: 0, to: 1, duration: 400, delay: 380, ease: 'out' });
        A.animate($('#core'), 'opacity', { from: 1, to: .22, duration: 1100, delay: 460, ease: 'inOut' });
        A.animate($('#core'), 'scale', { from: 1.1, to: .55, duration: 1100, delay: 460, ease: 'inOut' });
        ['#t', '#s', '#r1'].forEach((sel, i) => {
          A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 400, delay: 620 + i * 74, ease: 'out' });
          A.animate($(sel), 'scale', { from: 1.05, to: 1, duration: 460, delay: 620 + i * 74, ease: 'out' }); });
        ['#b1', '#b2'].forEach((sel, i) => {
          A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 400, delay: 880 + i * 60, ease: 'out' }); });
      },
      rn: `// M-02 Нет энергии — ЕДИНСТВЕННАЯ модалка с обратной динамикой света.
// Везде свет разгорается. Здесь — вспыхивает и УГАСАЕТ до 30% за 900мс.
// Пользователь считывает «ресурс закончился» до того, как прочитает текст.
source.opacity = withSequence(
  withTiming(1,   { duration: 260, easing: Easing.out(Easing.cubic) }),
  withTiming(0.3, { duration: 900, easing: Easing.inOut(Easing.ease) }),
);
core.scale = withDelay(460, withTiming(0.55, { duration: 1100, easing: Easing.inOut(Easing.ease) }));

// Никакого halo-цикла (в текущем NoEnergyModal он крутится вечно).
// Свет доходит до 30% и ЗАМИРАЕТ — ноль работы GPU после 1.5с.`,
    },

    {
      id: 'M-03', cat: 'Модалки', title: 'Стрик под угрозой', base: 'home', duration: 3000,
      sub: 'Пламя-источник дрожит и сжимается, число остаётся ярким — контраст «угасает / держится»',
      timeline: [{ t: 0, label: 'источник янтарный' }, { t: 300, label: 'панель' }, { t: 520, label: 'число разгорается' }, { t: 800, label: 'источник сжимается' }],
      html: () => `<div class="ov"><div class="bd" id="bd"></div>
        <i class="src" id="src" style="background:radial-gradient(circle,rgba(255,154,61,.36) 0%,rgba(255,90,61,.12) 34%,transparent 66%)"></i>
        <div class="pl" id="c"><div class="halo" id="halo" style="box-shadow:0 0 0 1px rgba(255,154,61,.28),0 0 38px rgba(255,154,61,.16)"></div>
          <div style="position:relative;height:96px;display:flex;align-items:center;justify-content:center;flex-direction:column">
            <div id="fire" style="font-size:38px;line-height:1">🔥</div>
            <div class="big" id="n" style="font-size:46px;margin-top:2px;text-shadow:0 0 40px rgba(255,154,61,.6)">28</div>
          </div>
          <div class="kick" id="k" style="color:#FF9A3D">Цепочка под угрозой</div>
          <div class="ttl" id="t">28 дней сгорят в полночь</div>
          <div class="txt" id="s">Позанимайся 5 минут — или заморозь цепочку</div>
          <div class="two"><div class="btn ghost" id="b1">Отпустить</div>
            <div class="btn" id="b2" style="background:linear-gradient(100deg,#FFC48A,#FF9A3D 46%,#C25A18);color:#2A1002;box-shadow:0 0 26px rgba(255,154,61,.3)">Спасти · 50 💎</div></div>
        </div></div>`,
      play: ({ $, A }) => {
        const c = $('#c');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 380, ease: 'out' });
        A.animate($('#src'), 'opacity', { from: 0, to: 1, duration: 420, ease: 'out' });
        A.animate($('#src'), 'scale', { from: .5, to: 1, duration: 700, ease: 'out' });
        A.set(c, { opacity: 0, scale: 1.06 });
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 380, delay: 300, ease: 'out' });
        A.animate(c, 'scale', { from: 1.06, to: 1, spring: TOK.settle, delay: 300 });
        A.animate($('#halo'), 'opacity', { from: 0, to: .9, duration: 520, delay: 420, ease: 'out' });
        A.animate($('#fire'), 'opacity', { from: 0, to: 1, duration: 400, delay: 380, ease: 'out' });
        A.animate($('#fire'), 'scale', { from: 1.24, to: 1, duration: 520, delay: 380, ease: 'out' });
        A.animate($('#n'), 'opacity', { from: 0, to: 1, duration: 420, delay: 520, ease: 'out' });
        A.animate($('#n'), 'scale', { from: 1.12, to: 1, duration: 560, delay: 520, ease: 'out' });
        setTimeout(() => {
          A.animate($('#src'), 'scale', { from: 1, to: .7, duration: 1100, ease: 'inOut' });
          A.animate($('#src'), 'opacity', { from: 1, to: .42, duration: 1100, ease: 'inOut' });
          A.animate($('#fire'), 'scale', { from: 1, to: .88, duration: 1100, ease: 'inOut' });
        }, 800 / A.speed);
        ['#k', '#t', '#s'].forEach((sel, i) => {
          A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 400, delay: 620 + i * 74, ease: 'out' });
          A.animate($(sel), 'scale', { from: 1.05, to: 1, duration: 460, delay: 620 + i * 74, ease: 'out' }); });
        ['#b1', '#b2'].forEach((sel, i) =>
          A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 400, delay: 900 + i * 60, ease: 'out' }));
      },
      rn: `// M-03 Стрик
// Источник янтарный (rgba 255,154,61), не акцентный — цвет кодирует тревогу,
// но движение остаётся спокойным. Никакого дрожания и тряски.
// Свет сжимается 1 → 0.7 за 1100мс, число при этом держит полную яркость:
// «ресурс уходит, но ты ещё можешь удержать».`,
    },

    {
      id: 'M-04', cat: 'Модалки', title: 'Подтверждение удаления', base: 'lessons', duration: 2200,
      sub: 'Свет холодный и узкий, кромка не зажигается — отсутствие света и есть сигнал',
      timeline: [{ t: 0, label: 'фон 380мс' }, { t: 160, label: 'панель, БЕЗ источника' }, { t: 400, label: 'строки' }, { t: 700, label: 'опасная кнопка последней' }],
      html: () => `<div class="ov"><div class="bd" id="bd" style="background:rgba(1,2,6,.76)"></div>
        <div class="pl" id="c" style="max-width:264px">
          <div class="lamp" id="ic" style="width:64px;height:64px;font-size:24px;color:var(--wrong);
            background:radial-gradient(circle at 50% 46%,color-mix(in srgb,var(--wrong) 22%,transparent),transparent 68%);
            border-color:color-mix(in srgb,var(--wrong) 24%,transparent)"><span>✕</span></div>
          <div class="ttl" id="t">Удалить колоду?</div>
          <div class="txt" id="s">54 карточки будут удалены безвозвратно</div>
          <div class="two"><div class="btn ghost" id="b1">Отмена</div>
            <div class="btn" id="b2" style="background:linear-gradient(100deg,color-mix(in srgb,var(--wrong) 88%,#fff),var(--wrong) 48%,color-mix(in srgb,var(--wrong) 66%,#000));color:#2A0808;box-shadow:none">Удалить</div></div>
        </div></div>`,
      play: ({ $, A }) => {
        const c = $('#c');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 380, ease: 'out' });
        A.set(c, { opacity: 0, scale: 1.04 });
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 380, delay: 160, ease: 'out' });
        A.animate(c, 'scale', { from: 1.04, to: 1, spring: TOK.settle, delay: 160 });
        A.animate($('#ic'), 'opacity', { from: 0, to: 1, duration: 400, delay: 280, ease: 'out' });
        A.animate($('#ic'), 'scale', { from: 1.1, to: 1, duration: 460, delay: 280, ease: 'out' });
        ['#t', '#s'].forEach((sel, i) => {
          A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 400, delay: 400 + i * 74, ease: 'out' }); });
        A.animate($('#b1'), 'opacity', { from: 0, to: 1, duration: 380, delay: 600, ease: 'out' });
        A.animate($('#b2'), 'opacity', { from: 0, to: 1, duration: 380, delay: 700, ease: 'out' });
      },
      rn: `// M-04 Деструктив
// Единственная модалка направления БЕЗ источника света и БЕЗ зажигания кромки.
// В системе, где всё светится, отсутствие свечения читается как предупреждение
// сильнее, чем красный цвет. Опасная кнопка приходит на 100мс позже безопасной.`,
    },

    {
      id: 'M-05', cat: 'Модалки', title: 'Нижний лист', base: 'lessons', duration: 2600,
      sub: 'Лист не выезжает — он проступает из свечения у нижней кромки экрана',
      timeline: [{ t: 0, label: 'свечение у нижней кромки' }, { t: 200, label: 'лист проявляется, y 22→0' }, { t: 420, label: 'строки ×74мс' }],
      html: () => `<div class="ov bottom"><div class="bd" id="bd"></div>
        <i id="floorglow" style="position:absolute;left:-20%;right:-20%;bottom:-120px;height:320px;pointer-events:none;opacity:0;
          background:radial-gradient(ellipse at 50% 100%,color-mix(in srgb,var(--acc) 36%,transparent),transparent 66%)"></i>
        <div class="pl sheet" id="c">
          <div id="grab" style="width:40px;height:4px;border-radius:3px;margin:0 auto 18px;
            background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--acc) 60%,transparent),transparent)"></div>
          <div class="ttl" id="t" style="text-align:left;margin:0">Выбери режим</div>
          ${[['🎧', 'Аудирование', 'Слушай и повторяй'], ['✍️', 'Письмо', 'Собирай фразы'], ['⚡', 'Блиц', '60 секунд на серию']]
            .map(([e, n, d]) => `<div class="rowi" style="--tint:var(--acc)"><i>${e}</i><div><b>${n}</b><em>${d}</em></div></div>`).join('')}
          <div class="btn" id="cta"><i class="sweep" id="sw"></i>Начать</div>
        </div></div>`,
      play: ({ $, $$, A }) => {
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 380, ease: 'out' });
        A.animate($('#floorglow'), 'opacity', { from: 0, to: 1, duration: 420, ease: 'out' });
        A.animate($('#floorglow'), 'scale', { from: .7, to: 1, duration: 700, ease: 'out' });
        A.animate($('#c'), 'opacity', { from: 0, to: 1, duration: 400, delay: 200, ease: 'out' });
        A.animate($('#c'), 'y', { from: 22, to: 0, spring: TOK.settle, delay: 200 });
        A.animate($('#grab'), 'opacity', { from: 0, to: 1, duration: 400, delay: 340, ease: 'out' });
        A.animate($('#t'), 'opacity', { from: 0, to: 1, duration: 400, delay: 360, ease: 'out' });
        $$('.rowi').forEach((r, i) => {
          A.animate(r, 'opacity', { from: 0, to: 1, duration: 400, delay: 420 + i * 74, ease: 'out' });
          A.animate(r, 'scale', { from: 1.03, to: 1, duration: 460, delay: 420 + i * 74, ease: 'out' }); });
        A.animate($('#cta'), 'opacity', { from: 0, to: 1, duration: 400, delay: 660, ease: 'out' });
        A.animate($('#sw'), 'x', { from: 0, to: 400, duration: 900, delay: 900, ease: 'inOut' });
      },
      rn: `// M-05 Нижний лист
// Смещение всего 22px вместо привычных 400+. Лист не «едет» —
// он проступает из свечения у кромки экрана, которое загорается ПЕРВЫМ.
floorGlow.opacity = withTiming(1, LUMEN.BLOOM);
sheet.y = withDelay(200, withSpring(0, LUMEN.SETTLE));   // из 22
// Жест закрытия при этом работает как обычно — он про пальцы, а не про свет.`,
    },

    {
      id: 'T-01', cat: 'Тосты', title: 'Единая система: успех', base: 'home', duration: 3600,
      sub: 'Тост проявляется, а не выезжает. Линия света под ним отсчитывает время',
      timeline: [{ t: 0, label: 'свечение' }, { t: 120, label: 'тост из расфокуса, y 16→0' }, { t: 300, label: 'линия света 3000мс' }, { t: 3300, label: 'растворение 260мс' }],
      html: () => `<div class="tst bot" id="t" style="--tint:var(--acc)">
        <div class="ic" id="ic">✓</div>
        <div class="tx"><b>Урок пройден</b><span>+50 XP получено</span></div>
        <div class="glowline" id="gl"></div></div>`,
      play: ({ $, A }) => {
        const t = $('#t');
        A.set(t, { opacity: 0, scale: 1.04, y: 16 });
        A.animate(t, 'opacity', { from: 0, to: 1, duration: 380, delay: 120, ease: 'out' });
        A.animate(t, 'scale', { from: 1.04, to: 1, spring: TOK.settle, delay: 120 });
        A.animate(t, 'y', { from: 16, to: 0, spring: TOK.settle, delay: 120 });
        A.animate($('#ic'), 'opacity', { from: 0, to: 1, duration: 420, delay: 220, ease: 'out' });
        A.animate($('#ic'), 'scale', { from: .7, to: 1, duration: 480, delay: 220, ease: 'out' });
        A.animate($('#gl'), 'scaleX', { from: 1, to: 0, duration: 3000, delay: 300, ease: 'linear' });
        setTimeout(() => {
          A.animate(t, 'opacity', { from: 1, to: 0, duration: 260, ease: 'in' });
          A.animate(t, 'scale', { from: 1, to: 1.05, duration: 260, ease: 'in' });   // уходит ВГЛУБЬ
        }, 3300 / A.speed);
      },
      rn: `// T-01 Тост — «Световод»
// ЕДИНАЯ система вместо 13 реализаций. Отличие от направления I:
// тост не выезжает на 130px, а проявляется со сдвигом 16px и масштабом 1.04→1.
enter: opacity withTiming(1, LUMEN.RESOLVE) + scale/y withSpring(LUMEN.SETTLE)
exit:  opacity → 0 и scale → 1.05 за 260мс — уходит вглубь, а не вниз.

// Линия света под тостом заменяет прогресс-бар: она гаснет слева направо
// и не выглядит как «полоска загрузки».`,
    },

    {
      id: 'T-02', cat: 'Тосты', title: 'Награда с действием', base: 'home', duration: 4600,
      sub: 'Награда приносит свой источник света, кнопка ловит блик',
      timeline: [{ t: 0, label: 'источник за тостом' }, { t: 120, label: 'тост' }, { t: 400, label: 'кнопка + блик' }, { t: 500, label: 'линия 4000мс' }],
      html: () => `
        <i id="src" style="position:absolute;left:50%;bottom:70px;width:260px;height:180px;margin-left:-130px;pointer-events:none;opacity:0;
          background:radial-gradient(ellipse,color-mix(in srgb,var(--gold) 32%,transparent),transparent 66%);z-index:190"></i>
        <div class="tst bot" id="t" style="--tint:var(--gold)">
          <div class="ic" id="ic">🎁</div>
          <div class="tx"><b>Вызов дня выполнен</b><span>Награда: +50 XP</span></div>
          <div class="btn" id="b" style="margin:0;padding:9px 15px;font-size:12px;border-radius:13px;overflow:hidden;
            background:linear-gradient(100deg,color-mix(in srgb,var(--gold) 92%,#fff),var(--gold) 46%,color-mix(in srgb,var(--gold) 70%,#000));color:var(--onGold)">
            <i class="sweep" id="sw"></i>Забрать</div>
          <div class="glowline" id="gl"></div></div>`,
      play: ({ $, A }) => {
        const t = $('#t');
        A.animate($('#src'), 'opacity', { from: 0, to: 1, duration: 420, ease: 'out' });
        A.animate($('#src'), 'scale', { from: .6, to: 1, duration: 700, ease: 'out' });
        A.set(t, { opacity: 0, scale: 1.04, y: 16 });
        A.animate(t, 'opacity', { from: 0, to: 1, duration: 380, delay: 120, ease: 'out' });
        A.animate(t, 'scale', { from: 1.04, to: 1, spring: TOK.settle, delay: 120 });
        A.animate(t, 'y', { from: 16, to: 0, spring: TOK.settle, delay: 120 });
        A.animate($('#ic'), 'opacity', { from: 0, to: 1, duration: 420, delay: 220, ease: 'out' });
        A.animate($('#ic'), 'scale', { from: .7, to: 1, duration: 480, delay: 220, ease: 'out' });
        A.animate($('#b'), 'opacity', { from: 0, to: 1, duration: 380, delay: 400, ease: 'out' });
        A.animate($('#sw'), 'x', { from: 0, to: 160, duration: 800, delay: 700, ease: 'inOut', repeat: 1 });
        A.animate($('#gl'), 'scaleX', { from: 1, to: 0, duration: 4000, delay: 500, ease: 'linear' });
      },
      rn: `// T-02 Награда
// Награда — единственный тост, который приносит СВОЙ источник света
// за спиной. Это визуально поднимает её над обычными уведомлениями,
// не увеличивая размер и не двигая её в центр экрана.`,
    },

    {
      id: 'T-03', cat: 'Тосты', title: 'Ошибка — липкая', base: 'lesson', duration: 3000,
      sub: 'Без свечения вовсе. Тёмная плашка среди светящихся — сама по себе сигнал',
      timeline: [{ t: 0, label: 'тост, БЕЗ источника' }, { t: 220, label: 'кромка краснеет 300мс' }],
      html: () => `<div class="tst bot" id="t" style="--tint:var(--wrong);box-shadow:0 18px 40px rgba(0,0,0,.6)">
        <div class="ic" id="ic">!</div>
        <div class="tx"><b>Не удалось сохранить</b><span>Проверь соединение</span></div>
        <div class="btn ghost" id="b" style="margin:0;padding:9px 13px;font-size:12px;border-radius:13px">Повторить</div></div>`,
      play: ({ $, A }) => {
        const t = $('#t');
        A.set(t, { opacity: 0, scale: 1.04, y: 16 });
        A.animate(t, 'opacity', { from: 0, to: 1, duration: 320, ease: 'out' });
        A.animate(t, 'scale', { from: 1.04, to: 1, spring: TOK.settle });
        A.animate(t, 'y', { from: 16, to: 0, spring: TOK.settle });
        A.animate($('#ic'), 'opacity', { from: 0, to: 1, duration: 380, delay: 160, ease: 'out' });
        A.animate($('#b'), 'opacity', { from: 0, to: 1, duration: 360, delay: 300, ease: 'out' });
      },
      rn: `// T-03 Ошибка
// Ни источника, ни линии света, ни свечения кромки.
// В системе, построенной на свете, тёмный элемент — самый заметный.
// LIFE = null: не уходит, пока не нажмут.`,
    },

    {
      id: 'S-01', cat: 'Состояния', title: 'Загрузка → содержимое', base: 'plain', duration: 3200,
      sub: 'Скелетон — это свет, ещё не принявший форму. Он не подменяется, а доводится до резкости',
      timeline: [{ t: 0, label: 'скелетоны, световая волна 1400мс' }, { t: 1500, label: 'резкость: scale 1.03→1, 460мс' }, { t: 1500, label: 'без подмены — тот же слой' }],
      html: () => `<div style="position:absolute;inset:0;padding:64px 16px 0;z-index:150">
        <div id="sk">${[92, 70, 70].map(h => `<div class="skel" style="height:${h}px;margin-bottom:12px"></div>`).join('')}</div>
        <div id="re" style="position:absolute;left:16px;right:16px;top:64px;opacity:0">
          ${[['Present Perfect', 'Урок 14 · A2', 'var(--acc)'], ['124 слова к повтору', 'Карточки', '#8FA0FF'], ['Онлайн 312', 'Арена', 'var(--wrong)']]
            .map(([t, k, c]) => `<div class="rl" style="background:linear-gradient(158deg,color-mix(in srgb,var(--cardG1) 26%,var(--card)),var(--card) 62%,var(--cardG2));
              border:1px solid color-mix(in srgb,${c} 18%,transparent);border-radius:22px;padding:15px 17px;margin-bottom:12px;
              box-shadow:0 0 26px color-mix(in srgb,${c} 8%,transparent)">
              <div style="font-size:9.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:${c}">${k}</div>
              <div style="font-size:17px;font-weight:800;margin-top:7px;letter-spacing:-.025em">${t}</div></div>`).join('')}
        </div></div>`,
      play: ({ $, $$, A }) => {
        $$('.skel').forEach((s, i) => {
          A.animate(s, 'opacity', { from: .55, to: .55, duration: 1400, delay: i * 110, repeat: 1,
            set: (v, p) => { s.style.backgroundPosition = (140 - p * 280) + '% 0'; } }); });
        setTimeout(() => {
          A.animate($('#sk'), 'opacity', { from: 1, to: 0, duration: 300, ease: 'in' });
          A.animate($('#re'), 'opacity', { from: 0, to: 1, duration: 420, delay: 100, ease: 'out' });
          $$('.rl').forEach((r, i) => {
            A.animate(r, 'scale', { from: 1.03, to: 1, duration: 460, delay: 100 + i * 74, ease: 'out' }); });
        }, 1500 / A.speed);
      },
      rn: `// S-01 Загрузка
// Скелетон и карточка живут в ОДНОЙ геометрии и перекрываются на 200мс:
// скелетон гаснет 300мс (Easing.in), содержимое проявляется 420мс (Easing.out)
// со стартом на 100мс. Пользователь не видит момента подмены.
// Световая волна — translateX на LinearGradient внутри MaskedView,
// а НЕ анимация backgroundPosition (её в RN нет).`,
    },

    {
      id: 'S-02', cat: 'Состояния', title: 'Пусто', base: 'plain', duration: 2800,
      sub: 'Пустой экран — это неосвещённая комната. Свет приходит вместе с приглашением',
      timeline: [{ t: 0, label: 'тускло' }, { t: 300, label: 'источник разгорается 620мс' }, { t: 520, label: 'иконка из расфокуса' }, { t: 760, label: 'текст ×74мс' }],
      html: () => `<div class="cel">
        <i class="src" id="src" style="width:250px;height:250px;margin:-125px 0 0 -125px;opacity:0"></i>
        <div class="lamp" id="ic" style="width:76px;height:76px;font-size:28px"><i class="core" id="core"></i><span>🗂</span></div>
        <div class="ttl" id="t" style="margin-top:16px">Здесь пока пусто</div>
        <div class="txt" id="s" style="max-width:236px">Добавь первую карточку — и она появится в этой колоде</div>
        <div class="btn" id="cta" style="padding:13px 28px"><i class="sweep" id="sw"></i>Добавить карточку</div></div>`,
      play: ({ $, A }) => {
        A.animate($('#src'), 'opacity', { from: 0, to: .8, duration: 620, delay: 300, ease: 'out' });
        A.animate($('#src'), 'scale', { from: .4, to: 1, duration: 900, delay: 300, ease: 'out' });
        A.animate($('#ic'), 'opacity', { from: 0, to: 1, duration: 420, delay: 520, ease: 'out' });
        A.animate($('#ic'), 'scale', { from: 1.16, to: 1, duration: 560, delay: 520, ease: 'out' });
        A.animate($('#core'), 'opacity', { from: 0, to: .8, duration: 620, delay: 600, ease: 'out' });
        ['#t', '#s'].forEach((sel, i) => {
          A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 420, delay: 760 + i * 74, ease: 'out' });
          A.animate($(sel), 'scale', { from: 1.05, to: 1, duration: 480, delay: 760 + i * 74, ease: 'out' }); });
        A.animate($('#cta'), 'opacity', { from: 0, to: 1, duration: 420, delay: 980, ease: 'out' });
        A.animate($('#sw'), 'x', { from: 0, to: 300, duration: 900, delay: 1300, ease: 'inOut' });
      },
      rn: `// S-02 Пусто
// Свет приходит ПОСЛЕ паузы в 300мс — экран сначала честно тёмный.
// Это единственное место направления, где допустима задержка перед светом:
// пауза делает появление приглашения событием.`,
    },

    {
      id: 'X-01', cat: 'Переходы', title: 'Между экранами', base: 'plain', duration: 3200,
      sub: 'Уходящий экран уходит вглубь и гаснет, входящий выходит из света. Без бокового сдвига',
      timeline: [{ t: 400, label: 'уходящий: scale .94 + затемнение, 320мс' }, { t: 400, label: 'входящий: scale 1.05 → 1' }, { t: 1900, label: 'назад — зеркально' }],
      html: () => `<div style="position:absolute;inset:0;overflow:hidden">
        <div id="a" style="position:absolute;inset:0">${BASES.home('midnight')}</div>
        <div id="ash" style="position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:5"></div>
        <div id="b" style="position:absolute;inset:0;z-index:10;opacity:0">${BASES.lessons('midnight')}</div>
      </div>`,
      play: ({ $, A }) => {
        const a = $('#a'), b = $('#b'), sh = $('#ash');
        A.set(b, { scale: 1.05 });
        setTimeout(() => {
          A.animate(a, 'scale', { from: 1, to: .94, duration: 320, ease: 'out' });
          A.animate(sh, 'opacity', { from: 0, to: .6, duration: 320, ease: 'out' });
          A.animate(b, 'opacity', { from: 0, to: 1, duration: 320, ease: 'out' });
          A.animate(b, 'scale', { from: 1.05, to: 1, duration: 420, ease: 'out' });
        }, 400 / A.speed);
        setTimeout(() => {
          A.animate(b, 'opacity', { from: 1, to: 0, duration: 260, ease: 'in' });
          A.animate(b, 'scale', { from: 1, to: 1.05, duration: 260, ease: 'in' });
          A.animate(a, 'scale', { from: .94, to: 1, duration: 320, ease: 'out' });
          A.animate(sh, 'opacity', { from: .6, to: 0, duration: 320, ease: 'out' });
        }, 1900 / A.speed);
      },
      rn: `// X-01 Переход
// Ни одного пикселя бокового сдвига. Экраны движутся по оси Z:
// уходящий scale 1 → 0.94 + затемнение до 60%, входящий 1.05 → 1.
// В expo-router: animation: 'fade' + собственный
//   cardStyleInterpolator / screenOptions.animationTypeForReplace,
// либо react-native-screens со stackAnimation="fade" и кастомным
// transitionSpec. Белого кроссфейда не будет: contentStyle непрозрачный.`,
    },

    {
      id: 'X-02', cat: 'Переходы', title: 'Кнопка под пальцем', base: 'plain', duration: 2800,
      sub: 'Нажатие приглушает свечение, отпускание возвращает его с бликом',
      timeline: [{ t: 400, label: 'нажатие: свечение 28%→8%, 120мс' }, { t: 900, label: 'отпускание: блик пробегает 420мс' }],
      html: () => `<div class="cel">
        <div class="btn" id="b" style="width:210px;padding:16px;font-size:15px"><i class="sweep" id="sw"></i>Продолжить</div>
        <div class="txt" style="margin-top:24px;max-width:238px">Кнопка не проваливается — она приглушает собственный свет. Отпускание возвращает свечение и пускает блик.</div></div>`,
      play: ({ $, A }) => {
        const b = $('#b');
        A.animate(b, 'opacity', { from: 0, to: 1, duration: 420, ease: 'out' });
        A.animate(b, 'scale', { from: 1.05, to: 1, duration: 480, ease: 'out' });
        const press = (t) => {
          setTimeout(() => {
            b.style.boxShadow = '0 0 8px color-mix(in srgb,var(--acc) 8%,transparent)';
            A.animate(b, 'scale', { from: 1, to: .985, duration: 120, ease: 'out' });
          }, t / A.speed);
          setTimeout(() => {
            b.style.boxShadow = '0 0 30px color-mix(in srgb,var(--acc) 28%,transparent)';
            A.animate(b, 'scale', { from: .985, to: 1, spring: TOK.settle });
            A.animate($('#sw'), 'x', { from: 0, to: 300, duration: 420, ease: 'out' });
          }, (t + 500) / A.speed);
        };
        press(400); press(1600);
      },
      rn: `// X-02 Кнопка
onPressIn:  glow.value = withTiming(0.08, { duration: 120 });  // из 0.28
            scale.value = withTiming(0.985, { duration: 120 });
onPressOut: glow.value = withTiming(0.28, { duration: 260 });
            scale.value = withSpring(1, LUMEN.SETTLE);
            sweep.value = withTiming(300, { duration: 420, easing: Easing.out(Easing.cubic) });

// Масштаб меняется всего на 1.5% — почти незаметно.
// Основную обратную связь несёт свет, а не деформация.`,
    },
  ],
};
