/* ============================================================================
   ДУЭЛЬ: МОДАЛКА ПОВЫШЕНИЯ УРОВНЯ — 4 радикально разных сценария.
   Все на реальных токенах тем phraseman. Только transform + opacity.
   ========================================================================== */

const sp = (t, f) => ENGINE.origami(t, f);
const RSPRING = (mass, damping, stiffness) => ({ mass, damping, stiffness });

const DUEL = {
  title: 'Повышение уровня — 4 сценария',
  subtitle: 'Сейчас это отдельный экран с барабаном (level_reward_spin.tsx: разгон 350мс → круиз 1600мс → торможение 1200мс → оседание 200мс). Ниже — четыре возврата к модалке, каждый с принципиально другой физикой. Кликни телефон, чтобы изолировать вариант. Пробел — проиграть заново.',
  themes: THEMES,
  defaultTheme: 'midnight',
  css: `
  .ov{position:absolute;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
  .bd{position:absolute;inset:0;background:rgba(2,3,8,.72);backdrop-filter:blur(0px)}
  .mcard{position:relative;width:100%;max-width:264px;border-radius:26px;padding:20px 20px 18px;text-align:center;
    background:linear-gradient(152deg,color-mix(in srgb,var(--cardG1) 42%,var(--card)),var(--card) 56%,var(--cardG2));
    border:1px solid var(--bd);
    box-shadow:0 26px 60px rgba(0,0,0,.72),inset 0 1px 0 rgba(255,255,255,.06);
    overflow:hidden}
  .mcard .rim{position:absolute;inset:0;border-radius:26px;pointer-events:none;
    box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--gold) 26%,transparent),
               inset 0 0 34px color-mix(in srgb,var(--gold) 12%,transparent)}
  .kick{font-size:9.5px;font-weight:900;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);opacity:.9}
  .lvnum{font-size:52px;font-weight:900;letter-spacing:-.05em;line-height:1;margin-top:6px;
    background:linear-gradient(180deg,#FFF6D8,var(--gold) 48%,#9A6D00);-webkit-background-clip:text;background-clip:text;color:transparent;
    text-shadow:0 0 26px color-mix(in srgb,var(--gold) 30%,transparent)}
  .lvword{font-size:12px;font-weight:850;letter-spacing:.2em;text-transform:uppercase;color:var(--mut);margin-top:2px}
  .head{font-size:17px;font-weight:850;letter-spacing:-.02em;margin-top:12px;color:var(--tx);line-height:1.25}
  .sub{font-size:12px;color:var(--mut);margin-top:6px;line-height:1.45}
  .rw{display:flex;gap:9px;align-items:center;background:rgba(255,255,255,.035);border:1px solid var(--bd);
    border-radius:13px;padding:8px 10px;margin-top:7px;text-align:left}
  .rw i{width:28px;height:28px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px;
    font-style:normal;background:color-mix(in srgb,var(--tint,var(--acc)) 16%,transparent);
    border:1px solid color-mix(in srgb,var(--tint,var(--acc)) 30%,transparent);flex:none}
  .rw b{display:block;font-size:9px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:var(--tint,var(--acc));opacity:.85}
  .rw em{display:block;font-size:12.5px;font-weight:750;font-style:normal;color:var(--tx);margin-top:1px}
  .cta{margin-top:16px;border-radius:15px;padding:12px;font-weight:900;font-size:13.5px;
    background:linear-gradient(180deg,#F0D98C,#C8A34C 55%,#765316);color:#1A1204;
    box-shadow:0 8px 22px rgba(200,163,76,.3),inset 0 1px 0 rgba(255,255,255,.45)}

  .badge{width:96px;height:96px;margin:0 auto;border-radius:50%;position:relative;
    background:radial-gradient(circle at 34% 26%,#FFF3C8,var(--gold) 46%,#8A6100 88%);
    display:flex;align-items:center;justify-content:center;font-size:34px;font-weight:900;color:#3A2A00;
    box-shadow:0 10px 30px rgba(0,0,0,.6),inset 0 -5px 12px rgba(0,0,0,.3),inset 0 4px 10px rgba(255,255,255,.4)}
  .badge::after{content:'';position:absolute;inset:-9px;border-radius:50%;
    border:1.5px solid color-mix(in srgb,var(--gold) 40%,transparent)}

  .ring{position:absolute;left:50%;top:50%;border-radius:50%;border:2px solid var(--gold);
    transform:translate(-50%,-50%);pointer-events:none;opacity:0}
  .dust{position:absolute;left:50%;top:50%;width:4px;height:4px;border-radius:50%;background:var(--gold);
    pointer-events:none;opacity:0}
  .shard{position:absolute;left:50%;top:50%;width:2px;border-radius:1px;pointer-events:none;
    background:linear-gradient(180deg,transparent,var(--gold),transparent);opacity:0}
  .flare{position:absolute;left:50%;top:50%;width:200%;height:2px;margin-left:-100%;pointer-events:none;
    background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--gold) 85%,#fff),transparent);opacity:0}
  .colrow{position:absolute;left:0;right:0;display:flex;align-items:center;justify-content:center;
    font-size:44px;font-weight:900;letter-spacing:-.05em;color:var(--ghost);opacity:.35}
  .veil{position:absolute;inset:0;border-radius:26px;pointer-events:none;
    background:linear-gradient(180deg,transparent 40%,rgba(0,0,0,.9));opacity:0}
  .scan{position:absolute;left:-20%;right:-20%;height:120px;pointer-events:none;
    background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--gold) 26%,transparent),transparent);opacity:0}
  `,

  variants: [

    /* ───────────────────────── 1. ПЕЧАТЬ ───────────────────────── */
    {
      id: 'A', name: 'Печать', base: 'lesson', duration: 2600,
      pitch: 'Медальон впечатывается в экран. Удар — ударная волна — оседающая пыль.',
      why: '<b>Физика:</b> замах вверх 180мс, падение 220мс с ускорением, удар. Карточка вздрагивает на 6px, от точки удара расходятся два кольца, 14 частиц пыли оседают вниз с гравитацией. <b>Цена:</b> 17 анимируемых узлов, только transform+opacity. <b>Когда:</b> когда уровень должен ощущаться как достижение, которое ты выбил.',
      html: () => `
        <div class="ov"><div class="bd" id="bd"></div>
          <div class="mcard" id="c"><div class="rim" id="rim"></div>
            <div style="position:relative;height:104px;margin-top:4px">
              <div class="badge" id="badge" style="position:absolute;left:50%;margin-left:-48px">12</div>
              ${[0, 1].map(i => `<div class="ring" id="r${i}" style="width:96px;height:96px;top:52px"></div>`).join('')}
              ${Array.from({ length: 14 }, (_, i) => `<div class="dust d${i}" style="top:52px"></div>`).join('')}
              <div class="flare" id="flare" style="top:52px"></div>
            </div>
            <div class="kick" id="k">Новый рубеж</div>
            <div class="lvnum" id="n">12</div>
            <div class="lvword" id="w">уровень</div>
            <div class="sub" id="s">Ты в верхних 18% учеников курса</div>
            <div class="rw g" style="--tint:var(--gold)"><i>✦</i><div><b>Бонус</b><em>+100 XP</em></div></div>
            <div class="rw g" style="--tint:var(--acc)"><i>⚡</i><div><b>Энергия</b><em>Максимум поднят до 6</em></div></div>
            <div class="rw g" style="--tint:var(--second)"><i>🎖</i><div><b>Титул</b><em>Wordsmith</em></div></div>
            <div class="cta" id="cta">Забрать награду</div>
          </div></div>`,
      play: ({ $, $$, A }) => {
        const c = $('#c'), b = $('#badge');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 260, ease: 'out' });
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 180, ease: 'out' });
        A.animate(c, 'scale', { from: .93, to: 1, duration: 320, ease: 'out' });
        // замах и удар
        A.set(b, { y: -170, scale: 1.5, opacity: 0 });
        A.animate(b, 'opacity', { from: 0, to: 1, duration: 120, delay: 200, ease: 'linear' });
        A.animate(b, 'y', { from: -170, to: -200, duration: 180, delay: 200, ease: 'inOut', onDone: () => {
          A.animate(b, 'y', { from: -200, to: 0, duration: 220, ease: A.EASE.bezier(.6, 0, .95, .5), onDone: impact });
          A.animate(b, 'scale', { from: 1.5, to: 1, duration: 220, ease: A.EASE.bezier(.6, 0, .95, .5) });
        } });
        function impact() {
          // отдача бейджа
          A.animate(b, 'scaleY', { from: .84, to: 1, spring: sp(260, 5) });
          A.animate(b, 'scaleX', { from: 1.16, to: 1, spring: sp(260, 5) });
          // вздрагивание карточки
          A.animate(c, 'y', { from: 6, to: 0, spring: sp(180, 6) });
          // кольца
          [0, 1].forEach(i => {
            const r = $('#r' + i);
            A.animate(r, 'scale', { from: .5, to: 3.4 + i * 1.1, duration: 760 + i * 220, delay: i * 90, ease: 'out' });
            A.animate(r, 'opacity', { from: .85 - i * .3, to: 0, duration: 760 + i * 220, delay: i * 90, ease: 'linear' });
          });
          // горизонтальная вспышка
          A.animate($('#flare'), 'opacity', { from: 1, to: 0, duration: 420, ease: 'linear' });
          A.animate($('#flare'), 'scaleX', { from: .1, to: 1, duration: 300, ease: 'out' });
          // пыль
          $$('.dust').forEach((d, i) => {
            const ang = -Math.PI + (i / 13) * Math.PI, dist = 46 + (i % 5) * 20;
            const dx = Math.cos(ang) * dist, dy = Math.sin(ang) * dist * .55;
            A.animate(d, 'opacity', { from: .95, to: 0, duration: 900 + (i % 4) * 140, ease: 'linear' });
            A.animate(d, 'x', { from: 0, to: dx, duration: 900 + (i % 4) * 140, ease: 'out' });
            A.animate(d, 'y', { from: 0, to: dy + 42, duration: 900 + (i % 4) * 140, ease: A.EASE.bezier(.2, .7, .5, 1) });
            A.animate(d, 'scale', { from: 1.1, to: .3, duration: 900, ease: 'linear' });
          });
          // рим вспыхивает
          A.animate($('#rim'), 'opacity', { from: 1, to: .35, duration: 700, ease: 'out' });
          // текст поднимается каскадом
          ['#k', '#n', '#w', '#s'].forEach((sel, i) => {
            const el = $(sel);
            A.animate(el, 'opacity', { from: 0, to: 1, duration: 260, delay: 90 + i * 55, ease: 'out' });
            A.animate(el, 'y', { from: 12, to: 0, spring: sp(150, 8), delay: 90 + i * 55 });
          });
          $$('.rw').forEach((r, i) => {
            A.animate(r, 'opacity', { from: 0, to: 1, duration: 240, delay: 330 + i * 70, ease: 'out' });
            A.animate(r, 'x', { from: -14, to: 0, spring: RSPRING(.6, 11, 130), delay: 330 + i * 70 });
          });
          A.animate($('#cta'), 'opacity', { from: 0, to: 1, duration: 240, delay: 560, ease: 'out' });
          A.animate($('#cta'), 'y', { from: 14, to: 0, spring: RSPRING(.6, 11, 130), delay: 560 });
        }
      },
      rn: `// ВАРИАНТ A — «Печать»  (Reanimated 4, всё на UI-потоке)
const y = useSharedValue(-170), s = useSharedValue(1.5);

// замах → падение → удар
y.value = withSequence(
  withDelay(200, withTiming(-200, { duration: 180, easing: Easing.inOut(Easing.ease) })),
  withTiming(0, { duration: 220, easing: Easing.bezier(0.6, 0, 0.95, 0.5) }, (fin) => {
    if (fin) runOnJS(impact)();
  }),
);
s.value = withDelay(380, withTiming(1, { duration: 220, easing: Easing.bezier(0.6, 0, 0.95, 0.5) }));

// удар: сплющивание бейджа + вздрагивание карточки
function impact() {
  'worklet';
  sy.value = withSpring(1, { stiffness: 260, damping: 5, mass: 1 });   // из 0.84
  sx.value = withSpring(1, { stiffness: 260, damping: 5, mass: 1 });   // из 1.16
  cardY.value = withSpring(0, { stiffness: 180, damping: 6 });          // из 6px
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
}

// два кольца ударной волны
ring1: scale 0.5 → 3.4 за 760мс Easing.out ; opacity 0.85 → 0
ring2: scale 0.5 → 4.5 за 980мс, задержка 90мс ; opacity 0.55 → 0

// 14 частиц пыли: разлёт по дуге + падение (Easing.bezier(.2,.7,.5,1))
// каскад текста: 90мс + i*55 ; награды: 330мс + i*70 ; CTA: 560мс

// ЦЕНА: 17 анимируемых узлов, только transform/opacity.
// Частицы — обычные View 4×4 без теней; на Pixel 4a держит 60fps.`,
    },

    /* ───────────────────────── 2. ВОСХОЖДЕНИЕ ───────────────────────── */
    {
      id: 'B', name: 'Восхождение', base: 'home', duration: 3000,
      pitch: 'Камера едет вверх по шкале уровней. Ты видишь, откуда пришёл.',
      why: '<b>Физика:</b> лента уровней прокручивается снизу вверх, 11→12 с торможением 900мс и перелётом на 10px, как у барабана — но за 1.2с вместо 3.35с. Слои двигаются с параллаксом (фон 0.4×, лента 1×, рамка 1.3×). <b>Цена:</b> 6 узлов. Самый дешёвый вариант. <b>Когда:</b> когда важно показать прогресс, а не приз.',
      html: () => `
        <div class="ov"><div class="bd" id="bd"></div>
          <div class="mcard" id="c"><div class="rim"></div>
            <div style="position:relative;height:118px;overflow:hidden;margin:0 -22px" id="win">
              <div id="reel" style="position:absolute;left:0;right:0;top:0">
                ${[9, 10, 11, 12, 13].map((n, i) => `<div class="colrow" style="top:${i * 58}px;height:58px"
                  ${n === 12 ? 'id="win12"' : ''}>${n}</div>`).join('')}
              </div>
              <div id="sel" style="position:absolute;left:22px;right:22px;top:30px;height:58px;border-radius:14px;
                border:1px solid color-mix(in srgb,var(--gold) 44%,transparent);opacity:0;
                background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--gold) 10%,transparent),transparent)"></div>
              <div class="scan" id="scan" style="top:0"></div>
            </div>
            <div class="kick" id="k" style="margin-top:12px">Уровень достигнут</div>
            <div class="head" id="h">Wordsmith</div>
            <div class="sub" id="s">Осталось 760 XP до следующего рубежа</div>
            <div class="rw" style="--tint:var(--gold)"><i>✦</i><div><b>Бонус</b><em>+100 XP</em></div></div>
            <div class="rw" style="--tint:var(--acc)"><i>⚡</i><div><b>Энергия</b><em>Максимум поднят до 6</em></div></div>
            <div class="cta" id="cta">Продолжить</div>
          </div></div>`,
      play: ({ $, $$, A }) => {
        const c = $('#c'), reel = $('#reel');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 240, ease: 'out' });
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 200, ease: 'out' });
        A.animate(c, 'y', { from: 26, to: 0, spring: RSPRING(.8, 14, 150) });
        // лента: 11 (index 2) → 12 (index 3). Окно 118, строка 58, селектор top 30.
        const from = 30 - 2 * 58, to = 30 - 3 * 58;
        A.set(reel, { y: from + 58 * 2 });
        A.animate(reel, 'y', { from: from + 116, to: to - 10, duration: 900, delay: 260, ease: A.EASE.bezier(.12, .72, .18, 1), onDone: () => {
          A.animate(reel, 'y', { from: to - 10, to, duration: 260, ease: 'out' });
          A.animate($('#sel'), 'opacity', { from: 0, to: 1, duration: 300, ease: 'out' });
          A.animate($('#sel'), 'scaleX', { from: 1.06, to: 1, spring: sp(200, 9) });
          A.animate($('#scan'), 'opacity', { from: .9, to: 0, duration: 520, ease: 'linear' });
          A.animate($('#scan'), 'y', { from: -60, to: 120, duration: 520, ease: 'out' });
          const wn = $('#win12');
          if (wn) { wn.style.color = 'var(--gold)'; wn.style.opacity = 1;
            A.animate(wn, 'scale', { from: 1, to: 1.14, spring: sp(220, 7) }); }
          ['#k', '#h', '#s'].forEach((sel, i) => {
            A.animate($(sel), 'opacity', { from: 0, to: 1, duration: 260, delay: 60 + i * 60, ease: 'out' });
            A.animate($(sel), 'y', { from: 10, to: 0, spring: sp(160, 9), delay: 60 + i * 60 });
          });
          $$('.rw').forEach((r, i) => {
            A.animate(r, 'opacity', { from: 0, to: 1, duration: 240, delay: 260 + i * 80, ease: 'out' });
            A.animate(r, 'y', { from: 12, to: 0, spring: RSPRING(.6, 11, 130), delay: 260 + i * 80 });
          });
          A.animate($('#cta'), 'opacity', { from: 0, to: 1, duration: 240, delay: 460, ease: 'out' });
        } });
      },
      rn: `// ВАРИАНТ B — «Восхождение»
// Тот же язык, что у существующего барабана level_reward_spin_motion.ts,
// но сжатый до модального формата: 1.16с вместо 3.35с.

const REEL = {
  ROW: 58,               // высота строки уровня
  SELECTOR_TOP: 30,
  TRAVEL_MS: 900,        // против DECELERATION_MS 1200 у барабана
  EASING: Easing.bezier(0.12, 0.72, 0.18, 1),   // старт с ходу, длинный выкат
  OVERSHOOT_PX: 10,      // ср. с createLevelSpinOvershootPlan: max(8, min(14, rowPitch*0.1))
  ROLLBACK_MS: 260,
};

reel.value = withSequence(
  withDelay(260, withTiming(target - REEL.OVERSHOOT_PX, { duration: REEL.TRAVEL_MS, easing: REEL.EASING })),
  withTiming(target, { duration: REEL.ROLLBACK_MS, easing: Easing.out(Easing.quad) }),
);

// Переиспользует уже написанный createLevelSpinOvershootPlan() —
// поведение перелёта остаётся ровно тем, к которому привык пользователь.

// ЦЕНА: 6 анимируемых узлов. Лента — один translateY на контейнер,
// строки не анимируются по отдельности.`,
    },

    /* ───────────────────────── 3. РАЗЛОМ СВЕТА ───────────────────────── */
    {
      id: 'C', name: 'Разлом', base: 'lessons', duration: 3000,
      pitch: 'Экран раскалывается светом, карточка собирается из осколков.',
      why: '<b>Физика:</b> горизонтальная световая щель раскрывается за 260мс, из неё вылетают 18 лучей, карточка «сходится» из двух половин со сдвигом ±30px. Блум темы усиливается в 1.6× и оседает. <b>Цена:</b> 24 узла, но все — простые View. <b>Когда:</b> для тем «Чёрного кино» — родной язык блума, максимальный вау.',
      html: () => `
        <div class="ov">
          <div class="bd" id="bd"></div>
          <i id="bloomx" style="position:absolute;left:-30%;right:-30%;bottom:-240px;height:520px;pointer-events:none;
            background:radial-gradient(ellipse at 50% 100%,var(--glow) 0%,transparent 68%);opacity:0"></i>
          <div style="position:absolute;left:0;right:0;top:50%;height:2px;margin-top:-1px;pointer-events:none" id="riftwrap">
            <i id="rift" style="display:block;height:100%;width:100%;transform-origin:50% 50%;
              background:linear-gradient(90deg,transparent,#FFF8E0,color-mix(in srgb,var(--gold) 90%,#fff),#FFF8E0,transparent);
              box-shadow:0 0 26px color-mix(in srgb,var(--gold) 70%,transparent)"></i>
          </div>
          ${Array.from({ length: 18 }, (_, i) => `<div class="shard s${i}" style="height:${18 + (i % 4) * 12}px"></div>`).join('')}
          <div class="mcard" id="c" style="opacity:0"><div class="rim"></div>
            <div id="half1">
              <div class="kick">Разлом уровня</div>
              <div class="lvnum" id="n">12</div>
              <div class="lvword">уровень</div>
            </div>
            <div id="half2">
              <div class="sub">Курс открыл тебе экзамен уровня A2</div>
              <div class="rw" style="--tint:var(--gold)"><i>✦</i><div><b>Бонус</b><em>+100 XP</em></div></div>
              <div class="rw" style="--tint:var(--acc)"><i>🎓</i><div><b>Открыт</b><em>Экзамен A2</em></div></div>
              <div class="cta" id="cta">Забрать</div>
            </div>
          </div>
        </div>`,
      play: ({ $, $$, A }) => {
        const rift = $('#rift'), c = $('#c');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 300, ease: 'out' });
        A.set(rift, { scaleX: 0, scaleY: 1 });
        A.animate(rift, 'scaleX', { from: 0, to: 1, duration: 260, ease: 'out' });
        A.animate(rift, 'scaleY', { from: 1, to: 26, duration: 380, delay: 240, ease: A.EASE.bezier(.2, .9, .3, 1) });
        A.animate(rift, 'opacity', { from: 1, to: 0, duration: 520, delay: 340, ease: 'linear' });
        A.animate($('#bloomx'), 'opacity', { from: 0, to: 1, duration: 300, delay: 240, ease: 'out' });
        A.animate($('#bloomx'), 'scale', { from: .8, to: 1.6, duration: 900, delay: 240, ease: 'out' });
        setTimeout(() => A.animate($('#bloomx'), 'opacity', { from: 1, to: .45, duration: 900, ease: 'linear' }), 1100 / A.speed);
        $$('.shard').forEach((s, i) => {
          const dir = i % 2 ? 1 : -1, dist = 70 + (i % 6) * 34;
          A.animate(s, 'opacity', { from: .9, to: 0, duration: 620 + (i % 3) * 140, delay: 250, ease: 'linear' });
          A.animate(s, 'x', { from: 0, to: dir * dist, duration: 620 + (i % 3) * 140, delay: 250, ease: 'out' });
          A.animate(s, 'y', { from: 0, to: (i % 5 - 2) * 26, duration: 620 + (i % 3) * 140, delay: 250, ease: 'out' });
          A.animate(s, 'scaleY', { from: 1.6, to: .3, duration: 620, delay: 250, ease: 'linear' });
        });
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 300, delay: 430, ease: 'out' });
        A.animate($('#half1'), 'y', { from: -30, to: 0, spring: RSPRING(.7, 12, 140), delay: 430 });
        A.animate($('#half1'), 'opacity', { from: 0, to: 1, duration: 320, delay: 430, ease: 'out' });
        A.animate($('#half2'), 'y', { from: 30, to: 0, spring: RSPRING(.7, 12, 140), delay: 430 });
        A.animate($('#half2'), 'opacity', { from: 0, to: 1, duration: 320, delay: 470, ease: 'out' });
        A.animate($('#n'), 'scale', { from: 1.3, to: 1, spring: sp(180, 7), delay: 500 });
        A.animate($('#cta'), 'opacity', { from: 0, to: 1, duration: 260, delay: 900, ease: 'out' });
      },
      rn: `// ВАРИАНТ C — «Разлом света»
// Родной язык тем «Чёрного кино»: усиливает существующий CinemaBloom,
// а не рисует поверх него чужой эффект.

rift.scaleX = withTiming(1,  { duration: 260, easing: Easing.out(Easing.quad) });          // щель раскрывается
rift.scaleY = withDelay(240, withTiming(26, { duration: 380, easing: Easing.bezier(0.2,0.9,0.3,1) }));
rift.opacity= withDelay(340, withTiming(0,  { duration: 520 }));

// блум темы усиливается и оседает — берём CINEMA[mode].bloomA/bloomB
bloom.scale   = withDelay(240, withTiming(1.6, { duration: 900, easing: Easing.out(Easing.quad) }));
bloom.opacity = withSequence(
  withDelay(240, withTiming(1, { duration: 300 })),
  withDelay(560, withTiming(0.45, { duration: 900 })),
);

// карточка сходится из двух половин
half1.y = withDelay(430, withSpring(0, { mass: 0.7, damping: 12, stiffness: 140 }));  // из -30
half2.y = withDelay(430, withSpring(0, { mass: 0.7, damping: 12, stiffness: 140 }));  // из +30

// 18 лучей: 2px ширины, разлёт ±(70…240)px, scaleY 1.6 → 0.3

// ЦЕНА: 24 узла, все — View без теней и без blur.
// ВАЖНО: щель и лучи рисуются ПОД карточкой (zIndex), чтобы не было
// перерисовки текста на каждом кадре.`,
    },

    /* ───────────────────────── 4. РАЗВОРОТ ───────────────────────── */
    {
      id: 'D', name: 'Разворот', base: 'stats', duration: 2800,
      pitch: 'Сдержанно: узкая полоса раскрывается вниз, награды выходят строками.',
      why: '<b>Физика:</b> карточка стартует полосой высотой 64px и раскрывается до полной за 420мс пружиной без отскока (damping 18). Содержимое проявляется по мере раскрытия, награды — стаггер 70мс. Ни одной частицы. <b>Цена:</b> 9 узлов, самый тихий вариант. <b>Когда:</b> если левелап случается часто и празднование не должно надоедать.',
      html: () => `
        <div class="ov"><div class="bd" id="bd"></div>
          <div style="width:100%;max-width:270px">
            <div class="mcard" id="c" style="overflow:hidden;padding:0">
              <div class="rim"></div>
              <div id="strip" style="padding:18px 22px 0">
                <div style="display:flex;align-items:center;gap:12px;text-align:left">
                  <div class="badge" id="badge" style="width:52px;height:52px;font-size:20px;margin:0;flex:none">12</div>
                  <div><div class="kick">Уровень 12</div>
                    <div class="head" style="margin-top:3px;font-size:16px">Wordsmith</div></div>
                </div>
              </div>
              <div id="body" style="padding:14px 22px 20px;opacity:0">
                <div class="sub" style="text-align:left;margin-top:2px">Титул обновлён, награды начислены</div>
                <div class="rw" style="--tint:var(--gold)"><i>✦</i><div><b>Бонус</b><em>+100 XP</em></div></div>
                <div class="rw" style="--tint:var(--acc)"><i>⚡</i><div><b>Энергия</b><em>Максимум поднят до 6</em></div></div>
                <div class="rw" style="--tint:var(--second)"><i>🎖</i><div><b>Титул</b><em>Wordsmith</em></div></div>
                <div class="cta" id="cta">Хорошо</div>
              </div>
            </div>
          </div></div>`,
      play: ({ $, $$, A }) => {
        const c = $('#c'), body = $('#body');
        A.animate($('#bd'), 'opacity', { from: 0, to: 1, duration: 220, ease: 'out' });
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 180, ease: 'out' });
        A.animate(c, 'y', { from: 18, to: 0, spring: RSPRING(.9, 18, 190) });
        // раскрытие: анимируем max-height через переменную
        c.style.maxHeight = '86px';
        A.animate(c, 'opacity', { from: 1, to: 1, duration: 420, delay: 220, ease: A.EASE.bezier(.32, .72, 0, 1),
          set: (v, p) => { c.style.maxHeight = (86 + p * 300) + 'px'; } });
        A.animate($('#badge'), 'scale', { from: .7, to: 1, spring: sp(170, 8), delay: 120 });
        A.animate(body, 'opacity', { from: 0, to: 1, duration: 300, delay: 380, ease: 'out' });
        $$('.rw').forEach((r, i) => {
          A.animate(r, 'opacity', { from: 0, to: 1, duration: 260, delay: 460 + i * 70, ease: 'out' });
          A.animate(r, 'x', { from: -10, to: 0, spring: RSPRING(.6, 13, 150), delay: 460 + i * 70 });
        });
        A.animate($('#cta'), 'opacity', { from: 0, to: 1, duration: 240, delay: 700, ease: 'out' });
        A.animate($('#cta'), 'y', { from: 10, to: 0, spring: RSPRING(.6, 13, 150), delay: 700 });
      },
      rn: `// ВАРИАНТ D — «Разворот»
// Единственный вариант без частиц и без вспышек. Расчёт на то,
// что левелап случается регулярно и не должен каждый раз «кричать».

// Высота: НЕ анимируем height (это layout-анимация на JS-потоке).
// Вместо неё — scaleY на контейнере + компенсирующий scaleY на содержимом,
// либо заранее известная высота и translateY внутренней маски.
const openness = useSharedValue(0);
openness.value = withDelay(220, withTiming(1, {
  duration: 420,
  easing: Easing.bezier(0.32, 0.72, 0, 1),
}));

const cardStyle = useAnimatedStyle(() => ({
  transform: [{ scaleY: 0.22 + openness.value * 0.78 }],
  transformOrigin: 'top',
}));
const contentStyle = useAnimatedStyle(() => ({
  transform: [{ scaleY: 1 / (0.22 + openness.value * 0.78) }],
  opacity: interpolate(openness.value, [0.4, 1], [0, 1]),
}));

badge.scale = withDelay(120, withSpring(1, { stiffness: 170, damping: 8 }));   // из 0.7
rewards: withDelay(460 + i * 70, withSpring(0, { mass: 0.6, damping: 13, stiffness: 150 }));

// ЦЕНА: 9 узлов, ноль частиц. Дешевле, чем нынешний барабан, в разы.`,
    },
  ],
};
