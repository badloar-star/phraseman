/* ============================================================================
   «СЕЙЧАС» — реконструкция текущих анимаций phraseman 1:1 из исходников.
   Каждая цифра взята из кода, ссылка на файл указана в панели React Native.
   Это интерактивная версия аудита и точка отсчёта для сравнения «до/после».
   ========================================================================== */

const sp = (t, f) => ENGINE.origami(t, f);          // RN Animated.spring(tension, friction)
const D  = { fast: 180, normal: 240, slow: 320, celebrate: 420 };

const DESIGN = {
  slug: 'current',
  letter: '0',
  name: 'Как сейчас',
  tagline: 'Точная реконструкция существующих анимаций из кода. База для сравнения.',
  brand: '#F0A64A',
  brandDim: 'rgba(240,166,74,.17)',

  themes: {
    dark: { label: 'Dark', vars: {
      bg: '#07100A', card: '#152019', surf: '#1D2D23', surf2: '#253630',
      tx: '#F0F7F2', mut: '#8AB49A', acc: '#47C870', gold: '#FFC800',
      onAcc: '#042010', bd: 'rgba(255,255,255,.07)', wrong: '#F05454' } },
    neon: { label: 'Neon', vars: {
      bg: '#0D0D0D', card: '#202020', surf: '#2A2A2A', surf2: '#343434',
      tx: '#F0F0F0', mut: '#A8A8A8', acc: '#C8FF00', gold: '#FFE600',
      onAcc: '#1A2400', bd: 'rgba(200,255,0,.12)', wrong: '#FF4444' } },
    coral: { label: 'Coral', vars: {
      bg: '#14142A', card: '#1E1E3C', surf: '#25254A', surf2: '#2E2E58',
      tx: '#FFFFFF', mut: '#9898B8', acc: '#4A90FF', gold: '#FFD060',
      onAcc: '#04122A', bd: 'rgba(255,100,100,.15)', wrong: '#FF6464' } },
  },

  css: `
  .ov{position:absolute;inset:0;z-index:100}
  .bd{position:absolute;inset:0;background:rgba(0,0,0,.6)}
  .bd.d75{background:rgba(0,0,0,.75)}
  .bd.d5{background:rgba(0,0,0,.5)}
  .ctr{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:24px}
  .card{background:linear-gradient(135deg,var(--card),color-mix(in srgb,var(--bg) 70%,var(--card)));
    border-radius:28px;padding:28px;width:100%;max-width:326px;text-align:center;
    border:1px solid color-mix(in srgb,var(--acc) 27%,transparent);
    box-shadow:0 22px 44px rgba(0,0,0,.42)}
  .lvbadge{width:100px;height:100px;margin:0 auto;border-radius:50%;display:flex;align-items:center;justify-content:center;
    background:radial-gradient(circle at 34% 28%,color-mix(in srgb,var(--gold) 70%,#fff),var(--gold) 52%,#9a6d00);
    font-size:38px;font-weight:900;color:#3a2a00;box-shadow:0 8px 22px rgba(0,0,0,.4),inset 0 -4px 10px rgba(0,0,0,.24)}
  .lvttl{font-size:26px;font-weight:900;margin-top:11px;letter-spacing:-.02em;color:var(--tx)}
  .lvsub{font-size:14px;color:var(--mut);margin-top:6px;line-height:1.4}
  .lvav{width:60px;height:60px;border-radius:50%;background:var(--surf);margin:15px auto 0;
    display:flex;align-items:center;justify-content:center;font-size:28px;border:2px solid var(--acc)}
  .pill{background:var(--surf);border-radius:16px;padding:6px 16px;display:inline-block;margin-top:10px;
    color:var(--gold);font-weight:800;font-size:12px}
  .rowbox{background:var(--surf);border-radius:14px;padding:10px 16px;margin-top:10px;border:1px solid var(--bd)}
  .rowbox .k{font-size:9.5px;text-transform:uppercase;letter-spacing:.08em;color:var(--mut);font-weight:800}
  .rowbox .v{font-size:14px;font-weight:800;margin-top:2px;color:var(--gold)}
  .cbtn{margin-top:20px;background:var(--acc);color:var(--onAcc);border-radius:16px;padding:12px 40px;
    display:inline-block;font-weight:800;font-size:14px}
  .giftbox{font-size:96px;line-height:1;display:block;margin:6px auto 0;width:110px;text-align:center}
  .rev .rt{font-size:11px;letter-spacing:.14em;text-transform:uppercase;font-weight:800;color:var(--gold)}
  .rev .rn{font-size:19px;font-weight:850;margin-top:8px;color:var(--tx)}
  .rev .rd{font-size:13px;color:var(--mut);margin-top:6px;line-height:1.45}
  .hdr-sm{font-size:11px;letter-spacing:.13em;text-transform:uppercase;font-weight:800;color:var(--gold)}
  .h2{font-size:20px;font-weight:850;margin-top:6px;color:var(--tx)}
  .p{font-size:13.5px;color:var(--mut);margin-top:9px;line-height:1.5}
  .btns{display:flex;gap:10px;margin-top:22px}
  .btn2{flex:1;border-radius:14px;padding:13px;font-weight:750;font-size:13.5px;text-align:center}
  .btn2.g{background:var(--surf);color:var(--mut);border:1px solid var(--bd)}
  .btn2.p{background:var(--acc);color:var(--onAcc);font-weight:850}

  .toast{position:absolute;left:14px;right:14px;background:var(--card);border:1px solid var(--bd);
    border-radius:17px;padding:13px 15px;display:flex;gap:11px;align-items:center;
    box-shadow:0 14px 30px rgba(0,0,0,.46);z-index:200}
  .toast.bot{bottom:86px}.toast.top{top:52px}
  .toast .ic{width:38px;height:38px;border-radius:12px;background:var(--surf);display:flex;align-items:center;
    justify-content:center;font-size:19px;flex:none}
  .toast .tt{flex:1;min-width:0}
  .toast .tt b{display:block;font-size:13px;font-weight:750;color:var(--tx)}
  .toast .tt span{display:block;font-size:11px;color:var(--mut);margin-top:1px}
  .toast .amt{font-size:14px;font-weight:900;color:var(--gold);flex:none}
  .sheen{position:absolute;inset:0;border-radius:17px;overflow:hidden;pointer-events:none}
  .sheen i{position:absolute;top:-40%;bottom:-40%;width:56px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent);
    transform:skewX(-18deg);left:-70px}

  .fly{position:absolute;left:50%;top:44%;transform:translateX(-50%);font-size:24px;font-weight:900;color:var(--acc);z-index:210}
  .star{font-size:38px;display:inline-block}
  .stars{position:absolute;left:0;right:0;top:38%;text-align:center;display:flex;gap:12px;justify-content:center;z-index:150}
  .medal{font-size:96px;text-align:center;display:block}
  .cplt{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;text-align:center;z-index:150}
  .cplt h1{font-size:28px;font-weight:800;margin:22px 0 0;color:var(--tx)}
  .cplt .s{font-size:16px;color:var(--acc);margin-top:9px}
  .cplt .bonus{margin-top:18px;display:inline-flex;gap:8px;align-items:center;background:color-mix(in srgb,var(--acc) 16%,transparent);
    border:1px solid var(--acc);border-radius:14px;padding:11px 18px;color:var(--acc);font-weight:800;font-size:16px}
  .qres{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px;z-index:150}
  .qres .rank{font-size:52px}
  .qres .pct{font-size:34px;font-weight:800;color:var(--acc);margin-top:8px}
  .qres .xpline{font-size:20px;font-weight:700;color:var(--acc);margin-top:10px}
  .lvcard{background:var(--card);border:1px solid var(--bd);border-radius:14px;padding:14px;width:100%;
    display:flex;gap:12px;align-items:center;margin-top:26px}
  .lvcard .b{width:40px;height:40px;border-radius:50%;background:var(--gold);color:#3a2a00;font-weight:900;
    display:flex;align-items:center;justify-content:center;font-size:16px;flex:none}
  .lvcard .g{flex:1}
  .lvcard .g b{font-size:13px;font-weight:750;color:var(--tx)}
  .lvcard .track{height:5px;background:var(--surf);border-radius:3px;margin-top:6px;overflow:hidden}
  .lvcard .track i{display:block;height:100%;width:0%;background:#D4A017;border-radius:3px}
  .lvcard .cnt{font-size:10.5px;color:var(--mut);margin-top:4px}
  `,

  surfaces: [

    /* ═══════════════════════ МОДАЛКИ ═══════════════════════ */
    {
      id: 'M-01', cat: 'Модалки', title: 'Повышение уровня', base: 'home', duration: 2000,
      sub: 'app/_layout.tsx:277 — spring(friction 6), scale берётся из opacity',
      timeline: [{ t: 0, label: 'backdrop' }, { t: 0, label: 'карточка: spring y40→0 + scale .85→1' }],
      html: () => `
        <div class="ov"><div class="bd"></div>
          <div class="ctr"><div class="card" id="c">
            <div class="lvbadge">12</div>
            <div class="lvttl">УРОВЕНЬ 12!</div>
            <div class="lvsub">Ты растёшь быстрее, чем 80% учеников</div>
            <div class="lvav">🦊</div>
            <div class="rowbox"><div class="k">🎖️ Новый титул</div><div class="v">Wordsmith</div></div>
            <div class="pill">+100 XP — бонус за 12 уровень</div>
            <div class="cbtn">Отлично!</div>
          </div></div></div>`,
      play: ({ $, A }) => {
        const c = $('#c'), bd = $('.bd');
        A.animate(bd, 'opacity', { from: 0, to: 1, duration: 1 });   // RN: animationType="none" — backdrop появляется мгновенно
        A.animate(c, 'y',       { from: 40, to: 0, spring: sp(40, 6) });
        A.animate(c, 'opacity', { from: 0, to: 1, spring: sp(40, 6) });
        A.animate(c, 'scale',   { from: .85, to: 1, spring: sp(40, 6) });
      },
      rn: `// app/_layout.tsx:277 — showNext()
Animated.parallel([
  Animated.spring(levelUpOpacity,   { toValue: 1, friction: 6, useNativeDriver: true }),
  Animated.spring(levelUpTranslateY,{ toValue: 0, friction: 6, useNativeDriver: true }),
]).start();

// scale выведен из opacity — это экономит анимацию, но связывает
// прозрачность и масштаб намертво: разнести их уже нельзя.
scale: levelUpOpacity.interpolate({ inputRange:[0,1], outputRange:[0.85,1] })

// ПРОБЛЕМЫ
// • tension по умолчанию 40 → медленная вялая пружина (~950мс до покоя)
// • backdrop не анимируется вообще: animationType="none" + сплошной rgba(0,0,0,0.6)
// • выход — timing 300мс только по opacity, карточка не уезжает
// • нет ни одной частицы, ни свечения, ни хаптики на пике`,
    },

    {
      id: 'M-02', cat: 'Модалки', title: 'Подарок за уровень', base: 'home', duration: 3400,
      sub: 'components/LevelGiftModal.tsx:160 — покачивание → тряска → рост → раскрытие',
      timeline: [{ t: 0, label: 'idle: float 450мс + rock 380мс, вечный цикл' }, { t: 1200, label: 'тап: shake ±10 (42/42/36мс)' }, { t: 1320, label: 'scale 1.35 за 130мс' }, { t: 1450, label: 'scale→0 за 95мс' }, { t: 1545, label: 'reveal spring t160 f9' }],
      html: () => `
        <div class="ov"><div class="bd d75"></div>
          <div class="ctr"><div class="card" id="c">
            <div class="hdr-sm">Уровень 12</div>
            <div class="h2">🎁 Твой подарок!</div>
            <div style="margin-top:22px;position:relative;height:130px">
              <span class="giftbox" id="box">🎁</span>
              <div id="rev" class="rev" style="position:absolute;inset:0;opacity:0">
                <div style="font-size:52px">⚡</div>
                <div class="rt">Редкий</div>
                <div class="rn">Полная энергия</div>
                <div class="rd">Энергия восстановлена до максимума</div>
              </div>
            </div>
            <div class="cbtn" style="margin-top:16px">Забрать</div>
          </div></div></div>`,
      play: ({ $, A }) => {
        const box = $('#box'), rev = $('#rev');
        A.set(rev, { opacity: 0, scale: .8 });
        A.animate(box, 'y', { from: 0, to: -6, duration: 450, ease: 'linear', repeat: 3, yoyo: true });
        A.animate(box, 'rotate', { from: -5, to: 5, duration: 380, ease: 'linear', repeat: 3, yoyo: true });
        setTimeout(() => {
          A.killAll();
          A.set(box, { y: 0, rotate: 0 });
          A.animate(box, 'x', { from: 0, to: 10, duration: 42, ease: 'linear', onDone: () =>
            A.animate(box, 'x', { from: 10, to: -10, duration: 42, ease: 'linear', onDone: () =>
              A.animate(box, 'x', { from: -10, to: 0, duration: 36, ease: 'linear', onDone: () =>
                A.animate(box, 'scale', { from: 1, to: 1.35, duration: 130, ease: 'linear', onDone: () =>
                  A.animate(box, 'scale', { from: 1.35, to: 0, duration: 95, ease: 'linear', onDone: () => {
                    A.animate(rev, 'opacity', { from: 0, to: 1, spring: sp(160, 9) });
                    A.animate(rev, 'scale',   { from: .8, to: 1, spring: sp(160, 9) });
                  } }) }) }) }) });
        }, 1200 / A.speed);
      },
      rn: `// components/LevelGiftModal.tsx:159 — вечный idle-цикл
Animated.loop(Animated.sequence([
  Animated.timing(floatAnim,{ toValue:-6, duration:450, useNativeDriver:true }),
  Animated.timing(floatAnim,{ toValue: 0, duration:450, useNativeDriver:true }),
]));
Animated.loop(Animated.sequence([
  Animated.timing(rockAnim,{ toValue:-5, duration:380, useNativeDriver:true }),
  Animated.timing(rockAnim,{ toValue: 5, duration:380, useNativeDriver:true }),
  Animated.timing(rockAnim,{ toValue: 0, duration:320, useNativeDriver:true }),
]));

// :215 — тап по коробке
Animated.sequence([
  Animated.timing(shakeAnim,{ toValue: 10, duration:42 }),
  Animated.timing(shakeAnim,{ toValue:-10, duration:42 }),
  Animated.timing(shakeAnim,{ toValue:  0, duration:36 }),
]).start(() => Animated.sequence([
  Animated.timing(scaleAnim,{ toValue:1.35, duration:130 }),
  Animated.timing(scaleAnim,{ toValue:0,    duration:95  }),
]).start(finalize));

// finalize → Animated.spring(fadeReveal,{ tension:160, friction:9 })

// ПРОБЛЕМЫ
// • коробка исчезает в точку, награда появляется на пустом месте —
//   нет ни вспышки, ни разлёта, ни свечения по редкости
// • rarity влияет только на цвет рамки и картинку, но не на движение:
//   common и epic открываются абсолютно одинаково
// • safetyTimer 900мс может обогнать анимацию и оборвать её на середине
// • idle-цикл крутится, даже когда модалка скрыта под другой`,
    },

    {
      id: 'M-03', cat: 'Модалки', title: 'Закончилась энергия', base: 'lesson', duration: 3000,
      sub: 'components/NoEnergyModal.tsx:159 — spring t90 f7 + молния t130 f4 + тряска + halo',
      timeline: [{ t: 0, label: 'карточка: spring t90 f7, scale .85→1' }, { t: 0, label: 'opacity 220мс' }, { t: 120, label: 'молния: spring t130 f4' }, { t: 400, label: 'тряска 70/70/70/90' }, { t: 600, label: 'halo 1100+1100, вечный цикл' }],
      html: () => `
        <div class="ov"><div class="bd"></div>
          <div class="ctr"><div class="card" id="c">
            <div style="position:relative;height:70px;display:flex;align-items:center;justify-content:center">
              <i id="halo" style="position:absolute;width:86px;height:86px;border-radius:50%;
                background:radial-gradient(circle,color-mix(in srgb,var(--gold) 42%,transparent),transparent 68%)"></i>
              <div id="bolt" style="font-size:52px;position:relative">⚡</div>
            </div>
            <div class="h2">Энергия закончилась</div>
            <div class="p">Следующая единица через 14:32. Или восстанови сразу за осколки.</div>
            <div class="rowbox" style="display:flex;gap:6px;justify-content:center;align-items:center">
              <span style="font-size:15px">💎</span><span class="v" style="margin:0">25 осколков</span>
            </div>
            <div class="btns"><div class="btn2 g">Позже</div><div class="btn2 p">Восстановить</div></div>
          </div></div></div>`,
      play: ({ $, A }) => {
        const c = $('#c'), bolt = $('#bolt'), halo = $('#halo');
        A.animate($('.bd'), 'opacity', { from: 0, to: 1, duration: 300, ease: 'linear' });
        A.animate(c, 'scale', { from: .85, to: 1, spring: sp(90, 7) });
        A.animate(c, 'opacity', { from: 0, to: 1, duration: 220, ease: 'linear' });
        A.animate(bolt, 'scale', { from: 0, to: 1, spring: sp(130, 4), delay: 120 });
        setTimeout(() => {
          A.animate(bolt, 'rotate', { from: 0, to: 12, duration: 70, ease: 'linear', onDone: () =>
            A.animate(bolt, 'rotate', { from: 12, to: -12, duration: 70, ease: 'linear', onDone: () =>
              A.animate(bolt, 'rotate', { from: -12, to: 7, duration: 70, ease: 'linear', onDone: () =>
                A.animate(bolt, 'rotate', { from: 7, to: 0, duration: 90, ease: 'linear' }) }) }) });
        }, 400 / A.speed);
        A.animate(halo, 'opacity', { from: .25, to: .85, duration: 1100, ease: 'inOut', delay: 600, repeat: 3, yoyo: true });
        A.animate(halo, 'scale', { from: .85, to: 1.18, duration: 1100, ease: 'inOut', delay: 600, repeat: 3, yoyo: true });
      },
      rn: `// components/NoEnergyModal.tsx:159 — одна из немногих модалок с настоящей анимацией
Animated.parallel([
  Animated.spring(cardScale, { toValue:1, friction:7, tension:90,  useNativeDriver:true }),
  Animated.timing(cardOp,    { toValue:1, duration:220,            useNativeDriver:true }),
  Animated.sequence([
    Animated.spring(boltScale,{ toValue:1, friction:4, tension:130, useNativeDriver:true }),
    Animated.sequence([  // тряска молнии
      Animated.timing(boltShake,{ toValue: 1,   duration:70 }),
      Animated.timing(boltShake,{ toValue:-1,   duration:70 }),
      Animated.timing(boltShake,{ toValue: 0.6, duration:70 }),
      Animated.timing(boltShake,{ toValue: 0,   duration:90 }),
    ]),
  ]),
]).start();
Animated.loop(Animated.sequence([   // halo, вечный
  Animated.timing(haloPulse,{ toValue:1, duration:1100, easing: Easing.inOut(Easing.ease) }),
  Animated.timing(haloPulse,{ toValue:0, duration:1100, easing: Easing.inOut(Easing.ease) }),
]));

// ПРОБЛЕМЫ
// • при закрытии — :143-148 просто setValue(0.85) / setValue(0):
//   вся эта работа обнуляется мгновенно, выхода нет вообще
// • animationType="fade" поверх собственной пружины: два наложенных
//   движения фона и карточки, которые никто не согласовывал
// • halo-цикл продолжает крутиться, пока модалка смонтирована`,
    },

    {
      id: 'M-04', cat: 'Модалки', title: 'Премиум', base: 'home', duration: 1600,
      sub: 'app/premium_modal.tsx — полноэкранный слайд',
      timeline: [{ t: 0, label: 'push-переход роутера' }],
      html: () => `
        <div class="ov" id="sheet" style="background:var(--bg)">
          <div style="padding:56px 26px 26px;text-align:center">
            <div style="font-size:46px">👑</div>
            <div class="h2" style="font-size:24px">Phraseman Premium</div>
            <div class="p">Безлимитная энергия, эксклюзивные паки и разбор ошибок</div>
            ${[['⚡', 'Безлимитная энергия'], ['🎴', 'Все паки карточек'], ['📊', 'Личный разбор ошибок'], ['🚫', 'Без рекламы']]
              .map(([e, t]) => `<div class="rowbox" style="display:flex;gap:11px;align-items:center;text-align:left">
                <span style="font-size:17px">${e}</span><span style="font-size:13px;font-weight:650;color:var(--tx)">${t}</span></div>`).join('')}
            <div class="cbtn" style="width:100%;margin-top:24px">790 ₽ / месяц</div>
            <div style="color:var(--mut);font-size:12px;margin-top:14px">Восстановить покупку</div>
          </div></div>`,
      play: ({ $, A }) => {
        A.animate($('#sheet'), 'y', { from: 814, to: 0, duration: 350, ease: A.EASE.bezier(.36, .66, .04, 1) });
      },
      rn: `router.push('/premium_modal')   // обычный экран, не модалка

// ПРОБЛЕМЫ
// • пейволл — отдельный маршрут: назад уводит из контекста,
//   пользователь теряет то, ради чего пришёл (урок / карточку)
// • переход — дефолтный slide роутера, не настроен под премиум-ощущение
// • нет анимации появления преимуществ (стаггер списка), всё прилетает разом
// • цена не акцентирована движением — главный элемент экрана статичен`,
    },

    {
      id: 'M-05', cat: 'Модалки', title: 'Подтверждение действия', base: 'list', duration: 1200,
      sub: 'components/ThemedConfirmModal.tsx',
      timeline: [{ t: 0, label: 'fade' }],
      html: () => `
        <div class="ov"><div class="bd d5"></div>
          <div class="ctr"><div class="card" id="c" style="max-width:300px">
            <div class="h2">Удалить колоду?</div>
            <div class="p">54 карточки будут удалены безвозвратно.</div>
            <div class="btns"><div class="btn2 g">Отмена</div>
              <div class="btn2 p" style="background:var(--wrong);color:#fff">Удалить</div></div>
          </div></div></div>`,
      play: ({ $, A }) => { A.animate($('.ov'), 'opacity', { from: 0, to: 1, duration: 300, ease: 'linear' }); },
      rn: `<Modal transparent animationType="fade">

// ПРОБЛЕМЫ
// • деструктивное действие визуально ничем не отличается по движению
//   от нейтрального — нет замаха, нет предупреждающего ритма
// • нет фокуса на безопасной кнопке
// • закрытие мгновенное, без ощущения «отпустило»`,
    },

    {
      id: 'M-06', cat: 'Модалки', title: 'Спасение стрика', base: 'home', duration: 1600,
      sub: 'components/StreakReviveModal.tsx',
      timeline: [{ t: 0, label: 'fade' }],
      html: () => `
        <div class="ov"><div class="bd d75"></div>
          <div class="ctr"><div class="card" id="c">
            <div style="font-size:56px">🔥</div>
            <div class="h2">Стрик под угрозой</div>
            <div class="p">28 дней подряд. Восстанови за осколки, пока не сгорел.</div>
            <div class="btns"><div class="btn2 g">Отпустить</div><div class="btn2 p">Спасти · 50 💎</div></div>
          </div></div></div>`,
      play: ({ $, A }) => { A.animate($('.ov'), 'opacity', { from: 0, to: 1, duration: 300, ease: 'linear' }); },
      rn: `// ПРОБЛЕМЫ
// • самый эмоциональный момент в приложении подан самой скучной анимацией
// • огонь статичен — ни мерцания, ни угасания, ни тревожного ритма
// • число «28 дней» не выделено движением, хотя это главная ценность
// • нет тактильной обратной связи`,
    },

    {
      id: 'M-07', cat: 'Модалки', title: 'Получены осколки', base: 'home', duration: 1800,
      sub: 'components/ShardsEarnedModal.tsx',
      timeline: [{ t: 0, label: 'fade' }, { t: 300, label: 'число статично' }],
      html: () => `
        <div class="ov"><div class="bd d75"></div>
          <div class="ctr"><div class="card" id="c">
            <div style="font-size:52px">💎</div>
            <div class="h2">+40 осколков</div>
            <div class="p">За серию из 5 правильных ответов подряд</div>
            <div class="cbtn">Забрать</div>
          </div></div></div>`,
      play: ({ $, A }) => { A.animate($('.ov'), 'opacity', { from: 0, to: 1, duration: 300, ease: 'linear' }); },
      rn: `// ПРОБЛЕМЫ
// • валюта начисляется мгновенно, без счётчика и без полёта к балансу —
//   пользователь не видит связи «награда → мой кошелёк»
// • одинаковая подача для 5 и для 500 осколков`,
    },

    {
      id: 'M-08', cat: 'Модалки', title: 'Открытие пака', base: 'home', duration: 2600,
      sub: 'app/pack_opening.tsx — отдельный экран',
      timeline: [{ t: 0, label: 'экран' }, { t: 400, label: 'карты по очереди' }],
      html: () => `
        <div class="ov" style="background:var(--bg);display:flex;align-items:center;justify-content:center;flex-direction:column">
          <div style="font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut);font-weight:800">Пак «Идиомы»</div>
          <div style="display:flex;gap:9px;margin-top:24px">
            ${[1, 2, 3, 4, 5].map(i => `<div class="pc" style="width:52px;height:74px;border-radius:11px;background:var(--card);
              border:1px solid var(--bd);display:flex;align-items:center;justify-content:center;font-size:20px">🎴</div>`).join('')}
          </div>
          <div class="cbtn" style="margin-top:30px">Дальше</div></div>`,
      play: ({ $$, A }) => {
        $$('.pc').forEach((c, i) => {
          A.animate(c, 'opacity', { from: 0, to: 1, duration: 240, delay: 400 + i * 120, ease: 'linear' });
          A.animate(c, 'y', { from: 20, to: 0, duration: 240, delay: 400 + i * 120, ease: 'linear' });
        });
      },
      rn: `// ПРОБЛЕМЫ
// • открытие пака — главный момент «дофамина» — сделано как обычный список
// • нет переворота карт, нет редкости в движении, нет нарастания
// • отдельный экран вместо оверлея: возврат ломает контекст`,
    },

    {
      id: 'M-09', cat: 'Модалки', title: 'Обновление приложения', base: 'home', duration: 1200,
      sub: 'components/UpdateModal.tsx — приоритет 1 в OverlayArbiter',
      timeline: [{ t: 0, label: 'fade' }],
      html: () => `
        <div class="ov"><div class="bd"></div>
          <div class="ctr"><div class="card" id="c">
            <div style="font-size:44px">🚀</div>
            <div class="h2">Доступно обновление</div>
            <div class="p">Версия 1.5.31 — новые паки и исправления</div>
            <div class="btns"><div class="btn2 g">Позже</div><div class="btn2 p">Обновить</div></div>
          </div></div></div>`,
      play: ({ $, A }) => { A.animate($('.ov'), 'opacity', { from: 0, to: 1, duration: 300, ease: 'linear' }); },
      rn: `// components/OverlayArbiter.tsx — приоритет:
// update > releaseNotes > releaseWave > broadcast > notifNudge > levelUp

// ХОРОШО: арбитр решил реальную проблему — на Android несколько
// одновременных RN Modal вешали System UI.
// ПЛОХО: между модалками нет паузы и нет перехода — одна исчезает,
// следующая тут же появляется таким же fade. Очередь читается как глюк.`,
    },

    {
      id: 'M-10', cat: 'Модалки', title: 'Оценить приложение', base: 'plain', duration: 1400,
      sub: 'app/lesson_complete.tsx:64 — нижний лист, fade 200мс',
      timeline: [{ t: 0, label: 'timing 200мс, лист уже на месте' }],
      html: () => `
        <div class="ov"><div class="bd d5"></div>
          <div style="position:absolute;left:0;right:0;bottom:0;background:var(--card);border-radius:24px 24px 0 0;
            padding:28px 28px 40px;text-align:center;border-top:.5px solid var(--bd)" id="sheet">
            <div style="font-size:36px">⭐</div>
            <div class="h2">Нравится Phraseman?</div>
            <div class="p">Оценка помогает нам расти</div>
            <div class="btns"><div class="btn2 g">Не сейчас</div><div class="btn2 p">Оценить ⭐</div></div>
          </div></div>`,
      play: ({ $, A }) => { A.animate($('.ov'), 'opacity', { from: 0, to: 1, duration: 200, ease: 'linear' }); },
      rn: `Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true })

// ПРОБЛЕМЫ
// • нижний лист НЕ выезжает снизу — он проявляется на месте.
//   Это ломает главную метафору bottom sheet
// • нет ручки (grab handle), нет свайпа вниз для закрытия
// • закрытие вообще без анимации: onClose() вызывается сразу`,
    },

    /* ═══════════════════════ ТОСТЫ ═══════════════════════ */
    {
      id: 'T-01', cat: 'Тосты', title: 'Достижение получено', base: 'home', duration: 2400,
      sub: 'components/AchievementToast.tsx:46 — снизу, y 160→0, scale .88→1',
      timeline: [{ t: 0, label: 'y 160→0 + scale .88→1' }, { t: 2000, label: 'автоскрытие' }],
      html: () => `<div class="toast bot" id="t"><div class="ic">🏅</div>
        <div class="tt"><b>Достижение!</b><span>Марафонец · 7 дней подряд</span></div><div class="amt">+50</div></div>`,
      play: ({ $, A }) => {
        const t = $('#t');
        A.animate(t, 'y', { from: 160, to: 0, spring: sp(40, 7) });
        A.animate(t, 'scale', { from: .88, to: 1, spring: sp(40, 7) });
        A.animate(t, 'opacity', { from: 0, to: 1, duration: 240, ease: 'linear' });
      },
      rn: `const translateY = useRef(new Animated.Value(160)).current;
const scale      = useRef(new Animated.Value(0.88)).current;
// выход: Animated.timing(translateY,{ toValue:160, duration:240 })
//        Animated.timing(opacity,   { toValue:0,   duration:180 })
// свайп-возврат: Animated.spring({ tension:80, friction:10 })

// ПРОБЛЕМЫ
// • стартовое смещение 160px — тост «прилетает» из-за края слишком издалека
// • у этого тоста есть свайп, у остальных семи — нет`,
    },

    {
      id: 'T-02', cat: 'Тосты', title: 'Действие выполнено', base: 'list', duration: 2400,
      sub: 'components/ActionToast.tsx:73 — MOTION_SPRING.toast (t70 f9)',
      timeline: [{ t: 0, label: 'spring t70 f9, y 120→0' }, { t: 1800, label: 'выход 240мс' }],
      html: () => `<div class="toast bot" id="t"><div class="ic">✓</div>
        <div class="tt"><b>Карточка добавлена</b><span>В колоду «Idioms»</span></div></div>`,
      play: ({ $, A }) => {
        const t = $('#t');
        A.animate(t, 'y', { from: 120, to: 0, spring: sp(70, 9) });
        A.animate(t, 'opacity', { from: 0, to: 1, duration: 240, ease: 'linear' });
        setTimeout(() => {
          A.animate(t, 'y', { from: 0, to: 120, duration: 240, ease: 'linear' });
          A.animate(t, 'opacity', { from: 1, to: 0, duration: 180, ease: 'linear' });
        }, 1800 / A.speed);
      },
      rn: `Animated.spring(y, { toValue:0, tension:70, friction:9, useNativeDriver:true })
Animated.timing(opacity, { toValue:1, duration:240 })

// ПРОБЛЕМЫ
// • стартовое смещение 120px против 160px у AchievementToast и 20px у InGameToast —
//   три разных «характера» у трёх тостов в одном приложении
// • выход линейный timing, вход пружинный — асимметрия не намеренная, а случайная`,
    },

    {
      id: 'T-03', cat: 'Тосты', title: 'Подсказка тренера', base: 'lesson', duration: 2400,
      sub: 'components/CoachToast.tsx:39 — spring t80 f10',
      timeline: [{ t: 0, label: 'spring t80 f10 + opacity 250мс' }, { t: 1800, label: 'выход 220/200мс' }],
      html: () => `<div class="toast bot" id="t" style="bottom:104px"><div class="ic">💡</div>
        <div class="tt"><b>Совет</b><span>«have been» — опыт в прошлом без указания времени</span></div></div>`,
      play: ({ $, A }) => {
        const t = $('#t');
        A.animate(t, 'y', { from: 120, to: 0, spring: sp(80, 10) });
        A.animate(t, 'opacity', { from: 0, to: 1, duration: 250, ease: 'linear' });
        setTimeout(() => {
          A.animate(t, 'y', { from: 0, to: 120, duration: 220, ease: 'linear' });
          A.animate(t, 'opacity', { from: 1, to: 0, duration: 200, ease: 'linear' });
        }, 1800 / A.speed);
      },
      rn: `Animated.spring(slideAnim, { toValue:0, tension:80, friction:10 })
Animated.timing(opacityAnim, { toValue:1, duration:250 })
// выход: 220мс / 200мс

// ПРОБЛЕМЫ
// • ещё одна пара таймингов (250/220/200), не совпадающая ни с одним другим тостом
// • ни один из этих чисел не берётся из constants/motion.ts, хотя токены есть`,
    },

    {
      id: 'T-04', cat: 'Тосты', title: 'Внутриигровое сообщение', base: 'lesson', duration: 2200,
      sub: 'components/InGameToast.tsx:20 — сверху, всего -20px',
      timeline: [{ t: 0, label: 'timing 250мс, y -20→0' }, { t: 1450, label: 'выход 250мс' }],
      html: () => `<div class="toast top" id="t" style="justify-content:center">
        <div class="tt" style="text-align:center"><b>Осталось 2 попытки</b></div></div>`,
      play: ({ $, A }) => {
        const t = $('#t');
        A.animate(t, 'y', { from: -20, to: 0, duration: 250, ease: 'linear' });
        A.animate(t, 'opacity', { from: 0, to: 1, duration: 250, ease: 'linear' });
        setTimeout(() => {
          A.animate(t, 'y', { from: 0, to: -20, duration: 250, ease: 'linear' });
          A.animate(t, 'opacity', { from: 1, to: 0, duration: 250, ease: 'linear' });
        }, 1450 / A.speed);
      },
      rn: `Animated.sequence([
  Animated.timing(anim,{ toValue:1, duration:250 }),
  Animated.delay(duration),
  Animated.timing(anim,{ toValue:0, duration:250 }),
])
transform: [{ translateY: anim.interpolate({ inputRange:[0,1], outputRange:[-20,0] }) }]

// ПРОБЛЕМЫ
// • линейный easing по умолчанию — самое дешёвое движение в приложении
// • одна общая переменная на opacity и translate: развязать нельзя
// • вход и выход абсолютно симметричны — выглядит механически`,
    },

    {
      id: 'T-05', cat: 'Тосты', title: 'Соперник найден', base: 'home', duration: 3200,
      sub: 'components/MatchFoundToast.tsx:71 — MOTION_SPRING.ui + пульс + sheen',
      timeline: [{ t: 0, label: 'spring t85 f10, y -160→0' }, { t: 0, label: 'пульс точки 700+700мс, вечный' }, { t: 1200, label: 'sheen-волна' }, { t: 2200, label: 'наклон меча 90×3' }],
      html: () => `<div class="toast top" id="t" style="top:58px">
        <div class="ic" style="position:relative">⚔️<i id="dot" style="position:absolute;top:-2px;right:-2px;width:8px;height:8px;
          border-radius:50%;background:#4ADE80"></i></div>
        <div class="tt"><b>Соперник найден</b><span>Anna_92 · рейтинг 1240</span></div>
        <div class="amt" style="color:var(--acc);font-size:12px">Принять</div>
        <div class="sheen"><i id="sh"></i></div></div>`,
      play: ({ $, A }) => {
        const t = $('#t');
        A.animate(t, 'y', { from: -160, to: 0, spring: sp(85, 10) });
        A.animate(t, 'opacity', { from: 0, to: 1, duration: 200, ease: 'linear' });
        A.animate($('#dot'), 'opacity', { from: 1, to: .25, duration: 700, ease: 'linear', repeat: 4, yoyo: true });
        A.animate($('#sh'), 'x', { from: 0, to: 420, duration: 900, ease: 'std', delay: 1200, repeat: 1 });
      },
      rn: `Animated.spring(translateY,{ toValue:0, tension:85, friction:10 })
Animated.loop(Animated.sequence([   // пульс индикатора
  Animated.timing(dotPulse,{ toValue:1, duration:700 }),
  Animated.timing(dotPulse,{ toValue:0, duration:700 }),
]))
Animated.loop(...)  // sheen-волна
Animated.loop(...)  // наклон меча каждые 2200мс

// ПРОБЛЕМЫ
// • три вечных Animated.loop на одном тосте: пульс, sheen, наклон.
//   Они продолжают работать, пока компонент смонтирован — даже если
//   тост уехал за экран. На слабом Android это заметная нагрузка
// • комментарий в коде прямо признаёт борьбу с Fabric (duration:1 вместо 0)`,
    },

    {
      id: 'T-06', cat: 'Тосты', title: 'Новая медаль', base: 'home', duration: 2600,
      sub: 'components/MedalToast.tsx:267 — y 22→0, scale .92→1',
      timeline: [{ t: 0, label: 'y 22→0 + scale .92→1' }],
      html: () => `<div class="toast bot" id="t"><div class="ic" style="background:linear-gradient(140deg,#FFD86B,#B8860B)">🥇</div>
        <div class="tt"><b>Золотая медаль</b><span>Урок 14 пройден на 100%</span></div></div>`,
      play: ({ $, A }) => {
        const t = $('#t');
        A.animate(t, 'y', { from: 22, to: 0, duration: 300, ease: 'std' });
        A.animate(t, 'scale', { from: .92, to: 1, duration: 300, ease: 'std' });
        A.animate(t, 'opacity', { from: 0, to: 1, duration: 300, ease: 'linear' });
      },
      rn: `opacity: anim,
transform: [
  { translateY: anim.interpolate({ inputRange:[0,1], outputRange:[22,0] }) },
  { scale:      anim.interpolate({ inputRange:[0,1], outputRange:[0.92,1] }) },
]

// ПРОБЛЕМЫ
// • медаль нарисована богатым SVG с градиентами и бликами,
//   но появляется тем же безликим движением, что и текстовый тост
// • золото / серебро / бронза не отличаются ничем в движении`,
    },

    {
      id: 'T-07', cat: 'Тосты', title: 'Изменение ранга', base: 'home', duration: 2400,
      sub: 'components/RankChangeBanner.tsx:31 — 280мс, y -12→0',
      timeline: [{ t: 0, label: 'timing 280мс' }, { t: 1800, label: 'выход 240мс' }],
      html: () => `<div class="toast top" id="t" style="top:52px"><div class="ic">📈</div>
        <div class="tt"><b>Ты поднялся на 3 место</b><span>Золотая лига</span></div></div>`,
      play: ({ $, A }) => {
        const t = $('#t');
        A.animate(t, 'y', { from: -12, to: 0, duration: 280, ease: 'std' });
        A.animate(t, 'opacity', { from: 0, to: 1, duration: 280, ease: 'linear' });
        setTimeout(() => A.animate(t, 'opacity', { from: 1, to: 0, duration: 240, ease: 'linear' }), 1800 / A.speed);
      },
      rn: `Animated.timing(anim,{ toValue:1, duration:280 })
transform: [{ translateY: anim.interpolate({ outputRange:[-12,0] }) }]

// ПРОБЛЕМЫ
// • смещение всего 12px — движение почти незаметно, событие теряется
// • подъём и падение в рейтинге анимированы одинаково`,
    },

    {
      id: 'T-08', cat: 'Тосты', title: 'Бейдж +XP', base: 'lesson', duration: 1600,
      sub: 'components/XpGainBadge.tsx:35 — 260мс полёт, 240мс проявление',
      timeline: [{ t: 0, label: 'flyY 260мс + fade 240мс' }],
      html: () => `<div class="fly" id="x" style="top:30%">+15 XP</div>`,
      play: ({ $, A }) => {
        const x = $('#x');
        A.animate(x, 'y', { from: 18, to: 0, duration: 260, ease: 'std' });
        A.animate(x, 'opacity', { from: 0, to: 1, duration: 240, ease: 'linear' });
        setTimeout(() => A.animate(x, 'opacity', { from: 1, to: 0, duration: 300, ease: 'linear' }), 900 / A.speed);
      },
      rn: `Animated.parallel([
  Animated.timing(flyY,{ toValue:0, duration:260 }),
  Animated.timing(fade,{ toValue:1, duration:240 }),
])

// ПРОБЛЕМЫ
// • XP не летит к счётчику опыта — просто появляется и исчезает.
//   Связь «я заработал → баланс вырос» визуально не замкнута`,
    },

    {
      id: 'T-09', cat: 'Тосты', title: 'Бонусный XP', base: 'plain', duration: 2600,
      sub: 'components/BonusXPCard.tsx:66 — spring t50 f7, scale .8→1',
      timeline: [{ t: 0, label: 'spring t50 f7' }, { t: 2000, label: 'выход 200мс, scale→.9' }],
      html: () => `<div class="ctr"><div class="card" id="c" style="max-width:230px;padding:22px">
        <div style="font-size:38px">🎁</div><div class="h2" style="font-size:17px">+120 XP</div>
        <div class="p" style="margin-top:5px;font-size:12px">Бонус за серию</div></div></div>`,
      play: ({ $, A }) => {
        const c = $('#c');
        A.animate(c, 'scale', { from: .8, to: 1, spring: sp(50, 7) });
        A.animate(c, 'opacity', { from: 0, to: 1, spring: sp(50, 7) });
        setTimeout(() => {
          A.animate(c, 'opacity', { from: 1, to: 0, duration: 200, ease: 'linear' });
          A.animate(c, 'scale', { from: 1, to: .9, duration: 200, ease: 'linear' });
        }, 2000 / A.speed);
      },
      rn: `Animated.spring(scaleAnim,{ toValue:1, friction:7, tension:50 })
// выход: timing 200мс, scale → 0.9

// ПРОБЛЕМЫ
// • ещё одна пружина (t50 f7), четвёртая по счёту среди «всплывашек»
// • центр экрана перекрывается без затемнения — читается как артефакт`,
    },

    /* ═══════════════════════ ПРАЗДНОВАНИЯ ═══════════════════════ */
    {
      id: 'C-01', cat: 'Празднования', title: '★ Завершение урока (эталон)', base: 'plain', duration: 3200,
      sub: 'app/lesson_complete.tsx:584 — spring f4, fade 500 @300, покачивание ±8',
      timeline: [{ t: 0, label: 'медаль: spring friction 4' }, { t: 300, label: 'текст: fade 500мс' }, { t: 400, label: 'покачивание −8px, 700+700мс, вечно' }],
      html: () => `<div class="cplt">
        <span class="medal" id="m">🥇</span>
        <div id="tx" style="opacity:0">
          <h1>Урок пройден!</h1>
          <div class="s">Урок 14 · Present Perfect</div>
          <div class="bonus">⭐ +500 XP за прохождение</div>
          <div class="rowbox" style="margin-top:20px;display:flex;gap:11px;align-items:center;text-align:left">
            <span style="font-size:20px">☕</span>
            <span style="font-size:12.5px;color:var(--mut);line-height:1.5">Отдохни немного — так материал усваивается лучше</span>
          </div>
          <div class="cbtn" style="width:100%;margin-top:16px">Следующий урок 15 →</div>
        </div></div>`,
      play: ({ $, A }) => {
        const m = $('#m'), tx = $('#tx');
        A.animate(m, 'scale', { from: 0, to: 1, spring: sp(40, 4) });
        setTimeout(() => A.animate(tx, 'opacity', { from: 0, to: 1, duration: 500, ease: 'linear' }), 300 / A.speed);
        setTimeout(() => A.animate(m, 'y', { from: 0, to: -8, duration: 700, ease: 'linear', repeat: 4, yoyo: true }), 400 / A.speed);
      },
      rn: `// app/lesson_complete.tsx:584 — ЭТАЛОН, менять не нужно
void playActivityCompletionModalSound();
Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
setTimeout(() => {
  Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
}, 300);
const bounce = Animated.loop(Animated.sequence([
  Animated.timing(bounceAnim, { toValue: -8, duration: 700, useNativeDriver: true }),
  Animated.timing(bounceAnim, { toValue:  0, duration: 700, useNativeDriver: true }),
]));
setTimeout(() => bounce.start(), 400);

// ПОЧЕМУ РАБОТАЕТ — ДНК, которую надо перенести на всё приложение:
// 1. Герой входит первым и в одиночку (spring friction 4 → заметный отскок)
// 2. Пауза 300мс перед текстом — зритель успевает считать главное
// 3. Текст приходит мягким длинным fade 500мс, без прыжка
// 4. Живое покачивание после посадки — сцена не «замерзает»
// 5. Звук стартует одновременно с движением, не после
// 6. Всё на useNativeDriver: true — ноль работы на JS-потоке`,
    },

    {
      id: 'C-02', cat: 'Празднования', title: 'Результат квиза · начисление XP', base: 'plain', duration: 3400,
      sub: 'app/quizzes.tsx:437 — полёт 420мс, затем полоса и счётчик по 1000мс',
      timeline: [{ t: 0, label: 'экран' }, { t: 600, label: 'XP улетает вверх 420мс' }, { t: 700, label: 'fade 320мс' }, { t: 1000, label: 'полоса 1000мс (useNativeDriver: false!)' }, { t: 1000, label: 'счётчик 1000мс' }],
      html: () => `<div class="qres">
        <div class="rank">🏆</div>
        <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--gold);font-weight:800;margin-top:10px">Мастер</div>
        <div style="font-size:22px;font-weight:750;margin-top:12px;color:var(--tx)">9 / 10</div>
        <div class="pct">90%</div>
        <div class="xpline" id="fly">+45 опыта</div>
        <div class="lvcard">
          <div class="b">12</div>
          <div class="g"><b>Уровень 12</b>
            <div class="track"><i id="bar"></i></div>
            <div class="cnt" id="cnt">0 / 1400 XP</div></div>
        </div></div>`,
      play: ({ $, A }) => {
        const fly = $('#fly'), bar = $('#bar'), cnt = $('#cnt');
        setTimeout(() => {
          A.animate(fly, 'y', { from: 0, to: 60, duration: 420, ease: 'linear' });
          A.animate(fly, 'opacity', { from: 1, to: 0, duration: 320, delay: 100, ease: 'linear' });
        }, 600 / A.speed);
        setTimeout(() => {
          A.animate(bar, 'width', { from: 41, to: 64, duration: 1000, ease: 'linear' });
          A.animate(cnt, 'opacity', { from: 1, to: 1, duration: 1000, ease: 'linear',
            set: (v, p) => { cnt.textContent = Math.round(574 + (896 - 574) * p) + ' / 1400 XP'; } });
        }, 1000 / A.speed);
      },
      rn: `// app/quizzes.tsx:437
Animated.parallel([
  Animated.timing(xpFlyY,      { toValue:60, duration: MOTION_DURATION.celebrate, useNativeDriver:true }),
  Animated.timing(xpFlyOpacity,{ toValue:0,  duration: MOTION_DURATION.slow, delay:100, useNativeDriver:true }),
]).start(() => setTimeout(() => {
  Animated.timing(xpBarAnim,  { toValue:newProgress,  duration:1000, useNativeDriver:false }).start();
  Animated.timing(xpCountAnim,{ toValue:newXpInLevel, duration:1000, useNativeDriver:false }).start();
}, ...));

// ПРОБЛЕМЫ
// • useNativeDriver: false — полоса анимируется через width в процентах,
//   каждый кадр идёт через JS-мост. Это одно из 19 таких мест в проекте
// • линейный easing на счётчике: число растёт механически, без замедления в конце
// • 1000мс — очень долго, при этом пользователь уже может нажать кнопку
// • цепочка на setTimeout внутри .start() — при быстром выходе с экрана
//   таймеры остаются и стреляют в размонтированный компонент`,
    },

    {
      id: 'C-03', cat: 'Празднования', title: 'Звёзды результата', base: 'plain', duration: 3000,
      sub: 'components/StarDisplayShared.tsx:26 — delay 400 + шаг, spring t80 f3 → t60 f6',
      timeline: [{ t: 400, label: 'звезда 1: →1.4 (t80 f3)' }, { t: 560, label: 'звезда 2' }, { t: 720, label: 'звезда 3' }, { t: 900, label: 'откат к 1.0 (t60 f6)' }],
      html: () => `<div class="qres" style="justify-content:center">
        <div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);font-weight:800">Дуэль выиграна</div>
        <div class="stars" style="position:static;margin-top:24px">
          ${[0, 1, 2].map(i => `<span class="star" id="s${i}">⭐</span>`).join('')}
        </div>
        <div style="font-size:15px;color:var(--mut);margin-top:26px">Anna_92 повержена</div>
        <div class="cbtn">Продолжить</div></div>`,
      play: ({ $, A }) => {
        [0, 1, 2].forEach(i => {
          const s = $('#s' + i), d = 400 + i * 160;
          A.set(s, { scale: 0, opacity: .25 });
          A.animate(s, 'scale', { from: 0, to: 1.4, spring: sp(80, 3), delay: d, onDone: () => {
            setTimeout(() => A.animate(s, 'scale', { from: 1.4, to: 1, spring: sp(60, 6) }), 100 / A.speed);
          } });
          A.animate(s, 'opacity', { from: .25, to: 1, duration: 400, delay: d, ease: 'linear' });
        });
      },
      rn: `// components/StarDisplayShared.tsx:26
Animated.sequence([
  Animated.delay(400 + delay),
  Animated.parallel([
    Animated.spring(scale,  { toValue:1.4, friction:3, tension:80, useNativeDriver:true }),
    Animated.timing(opacity,{ toValue:1,   duration:400, useNativeDriver:true }),
  ]),
  Animated.delay(100),
  Animated.spring(scale,    { toValue:1,   friction:6, tension:60, useNativeDriver:true }),
]).start();

// ЛУЧШАЯ анимация в приложении после эталона:
// перелёт через 1.4 с откатом к 1.0 — это правильный overshoot-возврат.
// ПРОБЛЕМЫ
// • живёт только в arena_results и SessionResultScreen — на завершении урока
//   звёзд нет вообще, хотя это главный экран победы
// • нет частиц, нет вспышки, нет звука на каждую звезду
// • старт через 400мс фиксирован, не связан с появлением самого экрана`,
    },

    {
      id: 'C-04', cat: 'Экраны', title: 'Вход на главный экран', base: 'plain', duration: 2200,
      sub: 'constants/motion.ts — HOME_ENTRANCE, стаггер 58мс',
      timeline: [{ t: 0, label: 'шапка' }, { t: 58, label: 'секция 2' }, { t: 116, label: 'секция 3' }, { t: 174, label: 'секция 4' }],
      html: () => BASES.home().replace('<div class="bs-hd"', '<div class="bs-hd en"')
        .replace(/<div class="bs-card bs-hero">/, '<div class="bs-card bs-hero en">')
        .replace(/<div class="bs-row">/g, '<div class="bs-row en">')
        .replace(/<div class="bs-card bs-sm">/g, '<div class="bs-card bs-sm en">'),
      play: ({ $$, A }) => {
        $$('.en').forEach((el, i) => {
          A.animate(el, 'opacity', { from: .9, to: 1, duration: 240, delay: i * 58, ease: 'std' });
          A.animate(el, 'y', { from: 20, to: 0, spring: sp(40, 7), delay: i * 58 });
          A.animate(el, 'scale', { from: .95, to: 1, spring: sp(40, 7), delay: i * 58 });
        });
      },
      rn: `// constants/motion.ts
export const HOME_ENTRANCE = {
  sectionStaggerMs: 58,  quickStaggerMs: 46,
  initialOpacity: 0.9,   initialTranslateY: 20,  initialScale: 0.95,
};

// ХОРОШО: единственное место в приложении с продуманным каскадом.
// ПЛОХО: этот каскад больше НИГДЕ не применяется — ни на одном
// из остальных ~110 экранов входной анимации нет вообще.
// initialOpacity 0.9 означает, что элементы стартуют почти видимыми —
// каскад едва читается, весь эффект держится на 20px сдвига.`,
    },

    {
      id: 'C-05', cat: 'Экраны', title: 'Переход между экранами', base: 'plain', duration: 2600,
      sub: 'app/_layout.tsx:1037 — animation: "none" глобально на все 55 экранов',
      timeline: [{ t: 0, label: 'главный' }, { t: 900, label: 'нажатие' }, { t: 900, label: 'подмена кадра, 0 мс' }],
      html: () => `<div id="a" style="position:absolute;inset:0">${BASES.home()}</div>
                   <div id="b" style="position:absolute;inset:0;opacity:0">${BASES.list()}</div>`,
      play: ({ $, A }) => {
        setTimeout(() => { A.set($('#a'), { opacity: 0 }); A.set($('#b'), { opacity: 1 }); }, 900 / A.speed);
        setTimeout(() => { A.set($('#b'), { opacity: 0 }); A.set($('#a'), { opacity: 1 }); }, 2100 / A.speed);
      },
      rn: `// app/_layout.tsx:1032
<Stack screenOptions={{
  headerShown: false,
  contentStyle: { backgroundColor: tTheme.bgPrimary },
  // Без fade: глобальный fade на native-stack даёт поздний белый кроссфейд.
  animation: 'none',
}}>

// САМАЯ КРУПНАЯ НАХОДКА АУДИТА
// animation:'none' стоит глобально на ВСЕХ 55 объявленных Stack.Screen
// и на всех файловых роутах. Переходов между экранами в приложении
// физически не существует — этоjump-cut, подмена кадра за 0 мс.
//
// Исключений всего три:
//   premium_modal → presentation:'modal'  (нативная снизу вверх)
//   pack_opening  → presentation:'modal', animation:'fade'
//   arena_game / arena_lobby → явное 'none' (дублирует глобальное)
//
// Причина в комментарии — борьба с белым кроссфейдом на native-stack.
// Решение существует: задать contentStyle без прозрачности и включить
// animation:'fade_from_bottom' / кастомный, либо перейти на
// react-native-screens с настроенным transitionSpec.`,
    },

    {
      id: 'C-06', cat: 'Экраны', title: 'Табы: свайп против тапа', base: 'plain', duration: 3000,
      sub: 'app/TabSlider.tsx — свайп 260мс, тап 0мс',
      timeline: [{ t: 300, label: 'СВАЙП: withTiming 260мс, Easing.out(cubic)' }, { t: 1600, label: 'ТАП: cancelAnimation + мгновенная подмена' }],
      html: () => `
        <div style="position:absolute;inset:0;overflow:hidden">
          <div id="strip" style="position:absolute;top:0;bottom:0;left:0;width:300%;display:flex">
            <div style="width:33.333%;position:relative">${BASES.home()}</div>
            <div style="width:33.333%;position:relative">${BASES.list()}</div>
            <div style="width:33.333%;position:relative">${BASES.home()}</div>
          </div>
          <div id="lbl" style="position:absolute;top:44%;left:0;right:0;text-align:center;z-index:400;
            font-size:15px;font-weight:800;color:#fff;text-shadow:0 2px 12px #000;letter-spacing:.04em"></div>
        </div>`,
      play: ({ $, A }) => {
        const strip = $('#strip'), lbl = $('#lbl');
        const W = 376;
        setTimeout(() => { lbl.textContent = 'СВАЙП ПАЛЬЦЕМ'; A.animate(strip, 'x', { from: 0, to: -W, duration: 260, ease: A.EASE.bezier(.215, .61, .355, 1) }); }, 300 / A.speed);
        setTimeout(() => { lbl.textContent = 'ТАП ПО ТАБ-БАРУ'; A.set(strip, { x: 0 }); }, 1600 / A.speed);
        setTimeout(() => { lbl.textContent = ''; }, 2300 / A.speed);
      },
      rn: `// app/TabSlider.tsx:107 — СВАЙП
translateX.value = withTiming(-toIdx * w, {
  duration: 260,
  easing: Easing.out(Easing.cubic),
});

// app/TabSlider.tsx:59 — ТАП
cancelAnimation(translateX);
translateX.value = -activeIndex * W;   // 0 мс, скачок

// ПРОБЛЕМА
// Один и тот же переход между табами ощущается по-разному в зависимости
// от того, как пользователь его вызвал. Свайп — плавный, тап — рывок.
// Незавершённый свайп возвращается третьим способом:
// withSpring({ damping:22, stiffness:220, mass:0.4 }).
// Три разные физики на одном взаимодействии.`,
    },

    {
      id: 'C-07', cat: 'Празднования', title: 'Активация Premium · 3.6 с', base: 'home', duration: 4400,
      sub: 'components/PremiumCelebrationModal.tsx — единственная модалка на Reanimated 4',
      timeline: [{ t: 0, label: 'GLOW 600мс' }, { t: 250, label: 'ЧАСТИЦЫ ×16' }, { t: 850, label: 'КОРОНА spring 0.7/7/110' }, { t: 1300, label: 'УДАРНАЯ ВОЛНА scale .4→3.6' }, { t: 1500, label: 'ЗАМКИ ×6, шаг 250мс' }, { t: 3100, label: 'СЧЁТЧИК' }, { t: 3400, label: 'CTA' }, { t: 4000, label: 'закрытие: мгновенно' }],
      html: () => `
        <div class="ov"><div class="bd" style="background:#0b0700"></div>
          <div class="ctr"><div style="text-align:center;width:100%;position:relative">
            <i id="glow" style="position:absolute;left:50%;top:8px;width:220px;height:220px;margin-left:-110px;border-radius:50%;
              background:radial-gradient(circle,rgba(255,200,0,.55),transparent 66%);opacity:0"></i>
            <i id="wave" style="position:absolute;left:50%;top:56px;width:70px;height:70px;margin-left:-35px;border-radius:50%;
              border:2px solid rgba(255,200,0,.7);opacity:0"></i>
            ${Array.from({ length: 16 }, (_, i) => `<i class="pt" style="position:absolute;left:50%;top:88px;width:5px;height:5px;
              border-radius:50%;background:var(--gold);opacity:0"></i>`).join('')}
            <div id="crown" style="font-size:64px;position:relative;margin-top:34px">👑</div>
            <div class="h2" style="font-size:23px;margin-top:8px">Premium активирован</div>
            <div style="margin-top:18px;display:flex;flex-direction:column;gap:7px">
              ${['Безлимитная энергия', 'Все паки карточек', 'Разбор ошибок', 'Без рекламы', 'Эксклюзивные темы', 'Приоритет в арене']
                .map(t => `<div class="lk" style="background:var(--surf);border:1px solid var(--bd);border-radius:12px;
                  padding:9px 13px;display:flex;gap:9px;align-items:center;font-size:12.5px;font-weight:650;color:var(--tx);opacity:0">
                  <span style="color:var(--gold)">🔓</span>${t}</div>`).join('')}
            </div>
            <div id="cnt" class="pill" style="opacity:0">30 дней Premium</div>
            <div id="cta" class="cbtn" style="opacity:0;width:100%">Отлично</div>
          </div></div></div>`,
      play: ({ $, $$, A }) => {
        A.animate($('.bd'), 'opacity', { from: 0, to: 1, duration: 320, ease: A.EASE.bezier(.33, 1, .68, 1) });
        A.animate($('#glow'), 'opacity', { from: 0, to: .7, duration: 600, ease: A.EASE.bezier(.33, 1, .68, 1) });
        A.animate($('#glow'), 'scale', { from: .6, to: 1, duration: 600, ease: A.EASE.bezier(.33, 1, .68, 1) });
        $$('.pt').forEach((p, i) => {
          const ang = (i / 16) * Math.PI * 2, dist = 96 + (i % 4) * 22;
          const d = 900 + (i % 4) * 150, dl = 250 + (i % 4) * 100;
          const ez = (x) => 1 - Math.pow(1 - x, 3);
          A.animate(p, 'opacity', { from: 1, to: 0, duration: d, delay: dl, ease: ez });
          A.animate(p, 'x', { from: 0, to: Math.cos(ang) * dist, duration: d, delay: dl, ease: ez });
          A.animate(p, 'y', { from: 0, to: Math.sin(ang) * dist, duration: d, delay: dl, ease: ez });
        });
        A.animate($('#crown'), 'scale', { from: .3, to: 1, spring: { mass: .7, damping: 7, stiffness: 110 }, delay: 850 });
        A.animate($('#crown'), 'opacity', { from: 0, to: 1, duration: 200, delay: 850, ease: 'linear' });
        A.animate($('#wave'), 'scale', { from: .4, to: 3.6, duration: 700, delay: 1300, ease: A.EASE.bezier(.33, 1, .68, 1) });
        A.animate($('#wave'), 'opacity', { from: .9, to: 0, duration: 700, delay: 1300, ease: 'linear' });
        $$('.lk').forEach((l, i) => {
          A.animate(l, 'opacity', { from: 0, to: 1, duration: 200, delay: 1500 + i * 250, ease: 'linear' });
          A.animate(l, 'x', { from: -32, to: 0, spring: { mass: .6, damping: 11, stiffness: 130 }, delay: 1500 + i * 250 });
        });
        A.animate($('#cnt'), 'opacity', { from: 0, to: 1, spring: { mass: .5, damping: 10, stiffness: 120 }, delay: 3100 });
        A.animate($('#cnt'), 'y', { from: 14, to: 0, spring: { mass: .5, damping: 10, stiffness: 120 }, delay: 3100 });
        A.animate($('#cta'), 'opacity', { from: 0, to: 1, spring: { mass: .6, damping: 11, stiffness: 130 }, delay: 3400 });
        A.animate($('#cta'), 'y', { from: 16, to: 0, spring: { mass: .6, damping: 11, stiffness: 130 }, delay: 3400 });
        setTimeout(() => { A.killAll(); A.set($('.ov'), { opacity: 0 }); }, 4000 / A.speed);
      },
      rn: `// components/PremiumCelebrationModal.tsx:34 — единственная оркестровка в проекте
const STAGE = {
  GLOW: 0, PARTICLES: 250, CROWN: 850, SHOCKWAVE: 1300,
  LOCKS_START: 1500, LOCKS_STAGGER: 250, COUNTER: 3100, CTA: 3400,
};
crown  : withSpring({ mass:0.7, damping:7,  stiffness:110 })
locks  : withDelay(1500 + i*250, withSpring({ mass:0.6, damping:11, stiffness:130 }))
counter: withDelay(3100, withSpring({ mass:0.5, damping:10, stiffness:120 }))
cta    : withDelay(3400, withSpring({ mass:0.6, damping:11, stiffness:130 }))
shockwave: withTiming(700, Easing.out(Easing.quad)), scale 0.4 → 3.6

// ЧТО ЗДЕСЬ ХОРОШО — это уже почти то, что нужно всему приложению:
// именованные стадии, стаггер, разные пружины под разные роли элементов.
//
// ЧТО СЛОМАНО
// • после 3.6 секунд торжества модалка ИСЧЕЗАЕТ МГНОВЕННО (:287) —
//   handleClose сразу зовёт onClose(), анимации выхода нет
// • звука нет вообще, при 3.6-секундной кульминации это слышно
// • scheduleHaptic (:167) — голый setTimeout ×6 без очистки:
//   закрыл на первой секунде — телефон вибрирует ещё полторы
// • частицы на старом RN Animated, всё остальное на Reanimated —
//   две анимационные системы в одном файле
// • позиции считаются как winH/2 - 200 — на планшетах разъезжается`,
    },
  ],
};
