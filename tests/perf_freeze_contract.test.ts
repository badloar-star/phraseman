import fs from 'fs';
import path from 'path';

/**
 * Перф-контракт «Frozen Background» (см. AGENTS.md → Performance Bible и PERF_MASTER_PLAN.md).
 *
 * Корень нагрева/деградации: ушедшие экраны продолжали жить (freezeOnBlur:false + вечно
 * смонтированные табы) + вечные анимации без гардов. Этот тест — храповик: он фиксирует
 * вылеченное состояние и не даёт новым экранам/фичам молча вернуть проблему.
 * Ослаблять контракт можно только осознанно, вместе с обновлением Performance Bible.
 */

const ROOT = path.join(__dirname, '..');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe('perf freeze contract', () => {
  it('keeps global freezeOnBlur enabled on the root stack', () => {
    const source = read('app/_layout.tsx');
    expect(source).toContain('freezeOnBlur: true');
  });

  it('allows freezeOnBlur:false only for the realtime allowlist', () => {
    const source = read('app/_layout.tsx');
    // Экраны, которым разрешено НЕ замораживаться: экзамен и server-authoritative
    // live-экраны Arena V2 (arena_match, arena_today — оба несут серверный дедлайн,
    // см. комментарии рядом с их <Stack.Screen> в _layout.tsx). У Arena
    // listener/timer ownership дополнительно гейтится focus + AppState внутри экрана.
    // Добавление нового исключения = осознанное решение хозяина: расширь список и объясни зачем.
    const allowed = ['exam', 'arena_match', 'arena_today'];
    const offenders = source
      .split(/\r?\n/)
      .filter((line) => line.includes('freezeOnBlur: false'))
      .filter((line) => !allowed.some((name) => line.includes(`name="${name}"`)));
    expect(offenders).toEqual([]);
  });

  it('keeps hidden tabs frozen and background premount enabled in the custom tab slider', () => {
    const source = read('app/(tabs)/_layout.tsx');
    expect(source).toContain('const ENABLE_TAB_FREEZE = true');
    expect(source).toContain('const ENABLE_BACKGROUND_TAB_PREMOUNT = true');
    expect(source).toContain("from 'react-freeze'");
  });

  it('keeps heavy thematic quiz packs behind the lazy registry seam', () => {
    // Мегабайтные паки вопросов грузятся ТОЛЬКО через quiz_thematic_registry
    // (ленивый require) — это же шов для будущей серверной доставки контента.
    const dirs = ['app', 'components', 'hooks'];
    const files = dirs.flatMap((d) => walk(path.join(ROOT, d)));
    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      if (rel === 'app/quiz_thematic_registry.ts' || rel === 'app/quiz_thematic_dev_registry.ts') continue;
      if (/^app\/quiz_thematic_[a-z_]+\.ts$/.test(rel)) continue;
      const source = fs.readFileSync(file, 'utf8');
      if (/(from\s+'|require\(')\.{1,2}\/quiz_thematic_(home_and_rooms|kitchen_and_cooking)'/.test(source)) {
        offenders.push(rel);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('keeps infinite animations guarded (focus/AppState) outside the legacy allowlist', () => {
    // withRepeat(..., -1) без гарда = вечная работа в фоне (экраны не размонтируются).
    // Гард-маркеры: useIsScreenFocused и/или AppState (паттерн components/AvatarAura.tsx).
    // Allowlist — только модалки, размонтируемые при закрытии, dev-лабы и legacy-хвост
    // (хвост догардить и УДАЛЯТЬ отсюда; добавлять новые файлы сюда нельзя без причины).
    const legacyAllowlist = new Set([
      'components/PremiumCelebrationModal.tsx', // модалка, unmount on close
      'app/flashcards/CardPackShardPaywallModal.tsx', // модалка, unmount on close
      // зачем (аудит скорости 2026-08-22): оба используются ТОЛЬКО в app/arena_match.tsx —
      // единственном push-экране (кроме exam) в explicit freezeOnBlur:false allowlist
      // выше. Экран размонтируется целиком при выходе (не premount-таб), поэтому
      // withRepeat(-1) не может пережить фокус: гейт useIsScreenFocused/AppState
      // здесь избыточен, а не забыт. ArenaTimerRing — боевой таймер ответа, ему
      // ЗАПРЕЩЕНО останавливаться на паузе (та же логика, что и у tournament_round).
      'components/arena/ArenaTimerRing.tsx',
      'components/arena/ArenaComboMeter.tsx',
    ]);
    const dirs = ['app', 'components', 'hooks'];
    const files = dirs.flatMap((d) => walk(path.join(ROOT, d)));
    const offenders: string[] = [];
    for (const file of files) {
      const rel = path.relative(ROOT, file).split(path.sep).join('/');
      const source = fs.readFileSync(file, 'utf8');
      if (!/withRepeat\(([\s\S]{0,200}?),\s*-1/.test(source)) continue;
      if (legacyAllowlist.has(rel)) continue;
      // Detailed per-call ownership is enforced by runtime_lifecycle_ratchet;
      // this broad smoke gate recognizes the shared focus+foreground hook too.
      const guarded = source.includes('useRuntimeActive') || source.includes('useIsScreenFocused') || source.includes('AppState');
      if (!guarded) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  /**
   * зачем 2026-07-27 (владелец: «приложение стало греть телефон, всё подобное
   * запрещено строжайше»): предыдущие тесты стерегли ТОЛЬКО анимации, поэтому
   * турнирный движок спокойно проехал мимо них с живой подпиской Firestore и
   * тремя секундными таймерами на премаунченном невидимом табе. Слепое пятно
   * закрываем: подписки и интервалы теперь под тем же храповиком, что и
   * withRepeat.
   */
  // Только НАСТОЯЩИЕ табы: экраны, которые живут внутри общего роутного экрана
  // `(tabs)` и потому не различимы через useIsFocused(). Хаб турниров сюда НЕ
  // входит — с 27.07 он push-экран (релиз без турниров) и гейтится честным
  // фокусом; уроки ушли следом 2026-08-02 (push-маршрут /lessons_list, таб убран).
  // Список синхронизирован с LOGICAL_TAB_IDS.
  const TAB_SCREENS = [
    'app/(tabs)/home.tsx',
    'app/(tabs)/lessons.tsx',
    'app/(tabs)/arena.tsx',
    'app/(tabs)/friends.tsx',
    'app/(tabs)/settings.tsx',
  ];

  it('keeps the tab runtime-owner signal available (useIsFocused alone cannot see tabs)', () => {
    // Все табы живут ВНУТРИ одного роутного экрана `(tabs)`, поэтому
    // useIsFocused() истинен для каждого из них одновременно — включая
    // невидимые. Единственный честный сигнал «этот таб на экране» —
    // runtimeOwnerId. Если этот механизм исчезнет, гварды ниже станут
    // декоративными, а телефон снова начнёт греться.
    const model = read('app/tab_page_model.ts');
    expect(model).toContain('physicalPageToRuntimeOwner');
    const layout = read('app/(tabs)/_layout.tsx');
    expect(layout).toContain('physicalPageToRuntimeOwner');
    expect(layout).toContain('runtimeOwnerId={runtimeOwnerId}');
    // useRuntimeActive обязан принимать ownerVisible — иначе гвард по табу
    // нечем выразить.
    expect(read('hooks/use_runtime_active.ts')).toContain('ownerVisible');
  });

  it('binds Friends and Settings network ownership to named runtime owners, not retired tab positions', () => {
    const arena = read('app/(tabs)/arena.tsx');
    expect(arena).toMatch(/runtimeOwnerId === ['"]arena['"]/);

    const friends = read('app/(tabs)/friends.tsx');
    expect(friends).toMatch(/runtimeOwnerId === ['"]friends['"]/);
    expect(friends).not.toContain('const friendsTabVisible = activeIdx === 3;');

    const settings = read('app/(tabs)/settings.tsx');
    // зачем (2026-08-24): сторожим СУТЬ — привязку к именованному владельцу
    // рантайма, а не стиль кавычек. Раньше тест требовал ровно двойные кавычки
    // и упал после `fix(settings): вернул исходный стиль кавычек` (8397dd1c8),
    // где файл вернулся к одинарным ради сканера локализации. Кавычки — забота
    // форматтера, регрессия производительности — забота этого теста.
    expect(settings).toMatch(/runtimeOwnerId === ['"]settings['"]/);
    expect(settings).not.toContain('const SETTINGS_TAB_IDX = 4;');
  });

  it('gates per-second timers in tab screens by real tab visibility', () => {
    // setInterval на невидимом табе = до 60 пробуждений JS-потока в минуту
    // впустую. Гвард обязан учитывать runtimeOwnerId, а не только AppState.
    const offenders: string[] = [];
    for (const rel of TAB_SCREENS) {
      const full = path.join(ROOT, rel);
      if (!fs.existsSync(full)) continue;
      const source = fs.readFileSync(full, 'utf8');
      if (!/setInterval\(/.test(source)) continue;
      if (!source.includes('runtimeOwnerId')) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('pauses countdown and refresh timers after their push screen loses foreground ownership', () => {
    // freezeOnBlur stops rendering only; a JS interval survives unless the
    // screen itself passes foreground ownership to the timer.  These screens
    // stay on the native stack while users browse elsewhere.

    const shardsShop = read('app/shards_shop.tsx');
    expect(shardsShop).toContain("import { useRuntimeActive } from '../hooks/use_runtime_active'");
    expect(shardsShop).toContain('const shardsShopRuntimeActive = useRuntimeActive();');
    const trialRefreshEffectStart = shardsShop.indexOf('if (!shardsShopRuntimeActive || packTrialHours == null || packTrialHours <= 0) return;');
    const trialRefreshEffect = shardsShop.slice(
      trialRefreshEffectStart,
      shardsShop.indexOf("useEffect(() => {\n    const sub = onAppEvent('pack_trial_gift_set'", trialRefreshEffectStart),
    );
    expect(trialRefreshEffect).toContain('if (!shardsShopRuntimeActive || packTrialHours == null || packTrialHours <= 0) return;');
    expect(trialRefreshEffect).toContain('[packTrialHours, refreshPackTrial, shardsShopRuntimeActive]');
  });

  it('coalesces Home refresh events while another tab owns the runtime', () => {
    const home = read('app/(tabs)/home.tsx');
    expect(home).toContain('const homeRuntimeActiveRef = useRef(homeRuntimeActive);');
    // зачем: стартовое значение намеренно true, а не false. Home может
    // смонтироваться, пока рантаймом владеет другой удержанный таб — тогда
    // сводка дневных заданий застревала на плейсхолдере «0 выполнено».
    // Экономия при этом сохраняется: обновление всё равно НЕ произойдёт, пока
    // таб не получит рантайм (проверки requestHomeDataRefresh/homeRuntimeActive
    // ниже), отличается только первая передача владения после запуска.
    expect(home).toContain('const homeDataDirtyRef = useRef(true);');
    expect(home).toContain('const requestHomeDataRefresh = () => {');
    expect(home).toContain('if (!homeRuntimeActiveRef.current) {');
    expect(home).toContain('homeDataDirtyRef.current = true;');
    expect(home).toContain("DeviceEventEmitter.addListener('xp_changed', requestHomeDataRefresh)");
    // зачем (аудит скорости 2026-08-22): дешёвая ветка «обновить только сводку
    // заданий» была снята осознанно — в коде рядом есть комментарий про гонку
    // состояний (light refresh мог перезаписать более свежий результат полного
    // loadData). Коалесинг сейчас проще: гейт «таб не владеет рантаймом — не
    // грузим», при возврате владения — всегда полный loadData().
    expect(home).toContain('if (!homeRuntimeActive) return;');
    expect(home).toContain('if (homeDataDirtyRef.current) {');
  });

  it('gates firestore subscriptions in tab screens by real tab visibility', () => {
    // onSnapshot на премаунченном табе держит живой сокет и будит JS-поток на
    // КАЖДУЮ запись документа — даже у тех, кто экран не открывал. react-freeze
    // это не лечит: он гасит рендеры, но не подписки.
    const offenders: string[] = [];
    for (const rel of TAB_SCREENS) {
      const full = path.join(ROOT, rel);
      if (!fs.existsSync(full)) continue;
      const source = fs.readFileSync(full, 'utf8');
      const subscribes = /onSnapshot\(/.test(source) || /useTournamentRoom\(/.test(source);
      if (!subscribes) continue;
      if (!source.includes('runtimeOwnerId')) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('catches up instantly when a gated screen becomes visible again', () => {
    // Экономия не должна стоить свежести: гвард гасит таймеры, поэтому при
    // ВОЗВРАТЕ на экран данные обязаны пересчитаться сразу, а не через секунду
    // (иначе первый кадр показывает состояние, замороженное в момент ухода —
    // прямое нарушение Performance Bible про первый кадр).
    // зачем 2026-08-23: турнирный хаб заархивирован (турниры выключены фулл);
    // правило про пересчёт ДО setInterval сторожим на живом общем отсчёте.
    const countdown = read('components/ui/V2Countdown.tsx');
    expect(countdown).toMatch(/if \(compute\(\) <= 0\) return;[\s\S]{0,120}?setInterval/);
  });
});
