/**
 * Контракт экранов режима «Турниры».
 *
 * зачем: экраны портированы из 47 утверждённых макетов. Тест держит то, что
 * ломается молча и заметно только на устройстве: жёсткие правила владельца
 * (без обводок, без микро-подписей, без adjustsFontSizeToFit), запрет слов
 * «битва/бой/дуэль» в UI, стабильность лэйаута и совпадение токенов
 * с прототипом.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (rel: string) => readFileSync(path.join(root, rel), 'utf8');

const SCREENS = [
  'app/(tabs)/tournaments.tsx',
  'app/tournament_lobby.tsx',
  'app/tournament_round.tsx',
  'app/tournament_table.tsx',
  'app/tournament_results.tsx',
  'app/tournament_season.tsx',
  'app/tournament_tickets.tsx',
] as const;

const COMPONENTS = [
  'components/ui/v2_theme.ts',
  'components/ui/v2_sheet.tsx',
  'components/ui/V2Countdown.tsx',
  'components/tournament/TournamentEdgeState.tsx',
] as const;

const ALL_FILES = [...SCREENS, ...COMPONENTS];

describe('экраны режима «Турниры»', () => {
  it('все экраны режима существуют', () => {
    for (const file of ALL_FILES) {
      expect(read(file).length).toBeGreaterThan(500);
    }
  });

  it('нет запрещённой эмодзи-валюты 💎 в живом UI-тексте', () => {
    // Регрессия аудита: coinIconForBalance завели на главной и в результатах,
    // но пропустили билеты и краевые состояния — игрок видел 💎 в одном
    // месте и настоящую монету в другом.
    //
    // Вырезаем блочные /* ... */ и JSX {/* ... */} комментарии целиком
    // (они могут занимать несколько строк), затем построчные //, и только
    // в оставшемся живом коде ищем 💎. Построчная фильтрация по началу
    // строки не годится: продолжение многострочного комментария не
    // начинается ни с //, ни с {/*.
    for (const file of ALL_FILES) {
      const withoutComments = read(file)
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/[^\n]*/g, '');
      const offendingLines = withoutComments
        .split('\n')
        .filter((line) => line.includes('💎'));
      expect(offendingLines).toEqual([]);
    }
  });

  it('НИ ОДНОГО контейнера с обводкой — правило владельца', () => {
    // Владелец ненавидит рамки: контейнеры разделяются тоном, тенью и
    // внутренним бликом. borderWidth/borderColor вокруг блоков запрещены.
    for (const file of ALL_FILES) {
      const source = read(file);
      expect(source).not.toMatch(/borderWidth\s*:/);
      expect(source).not.toMatch(/borderColor\s*:/);
    }
  });

  it('adjustsFontSizeToFit не используется — известный класс бага на iOS', () => {
    for (const file of ALL_FILES) {
      expect(read(file)).not.toContain('adjustsFontSizeToFit');
    }
  });

  it('слова «битва», «бой», «дуэль» не встречаются в интерфейсе', () => {
    // Решение владельца: режим про фразы, а не про сражения.
    const banned = /битв|дуэл|поединок|сражени/i;
    for (const file of ALL_FILES) {
      const source = read(file);
      // Ищем только в строковых литералах UI, не в комментариях кода.
      const uiStrings = source.match(/'[^']*[а-яА-ЯёЁ][^']*'/g) ?? [];
      for (const literal of uiStrings) {
        expect(literal).not.toMatch(banned);
      }
    }
  });

  it('фидбек ответа — «Почти!», а не «Неверно»', () => {
    const round = read('app/tournament_round.tsx');
    expect(round).toContain('Почти!');
    expect(round).toContain('Правильно!');
    expect(round).not.toMatch(/'Неверно'|"Неверно"/);
  });

  it('токены совпадают с утверждённым прототипом', () => {
    const theme = read('components/ui/v2_theme.ts');
    // Ключевые цвета из docs/design/tournaments/prototype/src/data/players.ts.
    expect(theme).toContain("bg: '#070C08'");
    expect(theme).toContain("card: '#101710'");
    expect(theme).toContain("elev: '#17241A'");
    expect(theme).toContain("accent: '#47C870'");
    expect(theme).toContain("gold: '#FFD43B'");
  });

  it('таймеры используют моноширинные цифры — иначе цифры прыгают', () => {
    for (const file of ALL_FILES) {
      const source = read(file);
      if (!/fontVariant/.test(source)) continue;
      expect(source).toContain("'tabular-nums'");
    }
  });

  it('единый формат времени вынесен в один хелпер', () => {
    const theme = read('components/ui/v2_theme.ts');
    expect(theme).toContain('export function formatTimeLeft');
    // <1ч → MM:SS, <24ч → H:MM:SS, ≥24ч → «Nд» + H:MM.
    expect(theme).toMatch(/days >= 1/);
    expect(theme).toMatch(/hours >= 1/);
  });

  it('инсеты берутся из стабильного источника (Performance Bible)', () => {
    for (const screen of SCREENS) {
      const source = read(screen);
      if (!source.includes('insets')) continue;
      expect(source).toContain('useStableSafeAreaInsets');
      // Сырой useSafeAreaInsets даёт нулевой первый кадр и прыжок контента.
      expect(source).not.toMatch(/from 'react-native-safe-area-context'/);
    }
  });

  it('лобби держит фиксированную сетку 16 мест', () => {
    const lobby = read('app/tournament_lobby.tsx');
    expect(lobby).toContain('const SEATS = 16');
    // Ширина места 25% = ровно 4 в ряд; места зарезервированы с первого кадра.
    expect(lobby).toMatch(/width:\s*'25%'/);
    expect(lobby).toMatch(/Array\.from\(\{ length: SEATS \}/);
  });

  it('раунд: батч из 4 вопросов и серверная пауза перед следующим', () => {
    // зачем 2026-07-27: было 5 — тест отстал от решения владельца. Правда
    // теперь одна на обе стороны: сервер раздаёт TASKS_PER_ROUND = 4
    // (functions/src/tournament_ai_blueprint.ts, зеркало DEFAULT_TASKS_PER_ROUND
    // в tournaments.ts), экран показывает столько же. Раунд из 4 вопросов
    // × 4 раунда = 16 заданий на турнир.
    const round = read('app/tournament_round.tsx');
    expect(round).toContain('const QUESTIONS_PER_ROUND = 4');
    expect(round).toContain('feedbackAdvanceAtMs - tournamentNow()');
    expect(round).not.toContain('motion.answerFeedbackMs');

    // Клиент и сервер обязаны сходиться: расхождение = раунд не наберётся.
    const blueprint = read('functions/src/tournament_ai_blueprint.ts');
    expect(blueprint).toContain('export const TASKS_PER_ROUND = 4');

    // Клиент не придумывает длительность feedback/reading: обе границы
    // следуют абсолютному taskSchedule из снимка комнаты.
    expect(round).toContain('questionTiming.readingEndsAtMs ?? questionTiming.startsAtMs');
  });

  // зачем 2026-07-27: плашка «Ответ принят / Время вышло» убрана по решению
  // владельца («время вышло писать не надо»), вместе с ней ушёл feedbackSlot —
  // тест сторожил распорку под элемент, которого больше нет. Геометрию теперь
  // держит зона вопроса: она забирает свободную высоту, поэтому варианты не
  // прыгают ни при смене задания, ни при сборке фразы.
  it('раунд: зона вопроса резервирует высоту, варианты не прыгают', () => {
    const round = read('app/tournament_round.tsx');
    expect(round).toMatch(/questionZone:\s*\{[^}]*minHeight/);
    // Собранная фраза тоже держит высоту — иначе первое слово сдвинет банк.
    expect(round).toMatch(/assembled:\s*\{\s*minHeight/);
  });

  it('таблица переставляет строки пружиной, а не мгновенно', () => {
    const table = read('app/tournament_table.tsx');
    expect(table).toContain('withSpring');
    expect(table).toContain('prevPlace');
    expect(table).toContain('обгон');
    // Абсолютное позиционирование строк — иначе перестановка двигает соседей.
    expect(table).toMatch(/position:\s*'absolute'/);
    // Результаты видны в первый кадр; анимируется только последующая смена мест.
    expect(table).toContain('const revealOpacity = useSharedValue(1)');
    expect(table).not.toContain('revealDelayMs');
    expect(table).not.toContain('ZoomIn.delay');
  });

  it('межраундовая таблица показывает все 16 строк в доступном скролле', () => {
    const table = read('app/tournament_table.tsx');
    expect(table).not.toContain('TABLE_TOP_ROWS');
    expect(table).not.toContain('visibleRows');
    expect(table).toContain('<ScrollView');
    expect(table).toContain('rows.map((row, index)');
    // зачем: accessibilityLabel локализован через triLang (i18n-аудит), русский
    // текст больше не зашит напрямую в JSX — проверяем сам факт локализованной
    // подписи (ключи ru/uk присутствуют), а не конкретную строку.
    expect(table).toMatch(/accessibilityLabel=\{triLang\(lang,\s*\{\s*ru:\s*'Все участники турнира',\s*uk:\s*'Всі учасники турніру'/);
  });

  it('турнирные экраны отображают серверные ауры вокруг аватаров', () => {
    const lobby = read('app/tournament_lobby.tsx');
    const table = read('app/tournament_table.tsx');
    const results = read('app/tournament_results.tsx');
    expect(lobby).toContain('auraId={seat.aura}');
    expect(table).toContain('auraId={row.aura}');
    expect(table).toContain('auraId={row.aura} size={36}');
    expect(read('components/AvatarAura.tsx')).toContain('size < 36');
    expect(results).toContain('auraId={winner.aura}');
  });

  it('таблица и результаты используют серверные места и не пересортировывают финал по счёту', () => {
    const table = read('app/tournament_table.tsx');
    const results = read('app/tournament_results.tsx');
    expect(table).toContain('tournamentSharedPlacement');
    expect(table).toContain('place={row.place}');
    expect(results).toContain('sharedPlace');
    expect(results).toContain('resultPlace');
    expect(results).toContain('orderTournamentPlayersForDisplay');
    expect(results).toContain('myPlace = myStanding?.place ?? 0');
  });

  it('результаты: подиум с короной и БЕЗ кнопки «сыграть ещё»', () => {
    const results = read('app/tournament_results.tsx');
    expect(results).toContain('👑');
    expect(results).toContain('Поделиться');

    // Решение владельца: турнир завершён, повтор — по расписанию.
    // Проверяем UI-строки, а не комментарии: в шапке файла слово «сыграть
    // ещё» стоит как раз в объяснении, ПОЧЕМУ такой кнопки нет.
    const uiLiterals = results.match(/'[^']*[а-яА-ЯёЁ][^']*'/g) ?? [];
    for (const literal of uiLiterals) {
      expect(literal).not.toMatch(/Сыграть ещё|Играть ещё|Реванш/i);
    }
  });

  it('результаты закрываются только крестиком в меню турниров', () => {
    const results = read('app/tournament_results.tsx');
    expect(results).toContain('const closeResults = useCallback(() => closeTournamentFlow(router)');
    // зачем: accessibilityLabel локализован через triLang (i18n-аудит), русский
    // текст больше не зашит напрямую в JSX — проверяем наличие ru/uk ключей.
    expect(results).toMatch(/accessibilityLabel=\{triLang\(lang,\s*\{\s*ru:\s*'Закрыть',\s*uk:\s*'Закрити'/);
    expect(results).toContain('<Ionicons name="close"');
    expect(results).not.toContain('>На главную</V2Cta>');
  });

  it('хаптик только на управляющих кнопках, не на плитках', () => {
    // Правило владельца: клик-звук/вибрация на кнопках, не на карточках.
    const ui = read('components/ui/v2_sheet.tsx');
    expect(ui).toContain('Haptics.impactAsync');

    const lobby = read('app/tournament_lobby.tsx');
    // В лобби вибрация на реакциях (это кнопки), но не на карточках игроков.
    const seatCard = lobby.slice(lobby.indexOf('const SeatCard'));
    expect(seatCard).not.toContain('Haptics');
  });

  it('таймеры чистятся при уходе с экрана — не жгут батарею', () => {
    for (const screen of SCREENS) {
      const source = read(screen);
      const timers = (source.match(/setInterval|setTimeout/g) ?? []).length;
      if (timers === 0) continue;
      const cleanups = (source.match(/clearInterval|clearTimeout/g) ?? []).length;
      expect(cleanups).toBeGreaterThan(0);
    }
  });

  it('клиент слушает ОДИН документ комнаты, а не коллекцию', () => {
    // §11 спеки и правило экономии: подписка на коллекцию тарифицируется
    // за каждый документ при каждом изменении — на 16 игроках это заметно.
    const client = read('app/tournament_client.ts');
    // Приложение на @react-native-firebase (цепочечный API), не на веб-SDK:
    // веб-синтаксис здесь просто не запустился бы.
    expect(client).toContain('@react-native-firebase/firestore');
    expect(client).not.toContain("from 'firebase/firestore'");
    expect(client).toMatch(/\.collection\('tournamentRooms'\)\s*\.doc\(roomId\)\s*\.onSnapshot/);
    // Подписки на коллекцию быть не должно — это чтение за каждый документ.
    expect(client).not.toMatch(/collection\('tournamentRooms'\)\s*\.onSnapshot/);
    expect(client).not.toMatch(/\.where\([^)]*\)\s*\.onSnapshot/);
  });

  it('расписание кэшируется, а не слушается — оно меняется раз в недели', () => {
    const client = read('app/tournament_client.ts');
    expect(client).toContain('SCHEDULE_TTL_MS');
    expect(client).toMatch(/\.doc\('config'\)\s*\.get\(\)/);
    // Кэш обязан жить часами, иначе смысла в нём нет.
    expect(client).toMatch(/SCHEDULE_TTL_MS\s*=\s*\d+\s*\*\s*60\s*\*\s*60\s*\*\s*1000/);
  });

  it('очки считает сервер — клиент только отправляет ответы', () => {
    const client = read('app/tournament_client.ts');
    expect(client).toContain('submitAnswers');
    // Клиент не должен слать готовый счёт: это дыра для накрутки.
    expect(client).not.toMatch(/submitAnswers\([^)]*score/);
  });

  it('раунд не выдумывает звёзды и серию до серверного результата', () => {
    const round = read('app/tournament_round.tsx');
    // Публичное задание намеренно не содержит ключ ответа: любой локальный
    // setStars/setStreak на тап объявлял бы неверный выбор правильным.
    expect(round).not.toMatch(/\bsetStars\s*\(/);
    expect(round).not.toMatch(/\bsetStreak\s*\(/);
    expect(round).toContain('authoritativePlayer');
    expect(round).toContain('peekStableId');
  });

  it('таймеры раундов идут от серверного дедлайна, а не локальных часов', () => {
    const client = read('app/tournament_client.ts');
    expect(client).toContain('stateDeadlineAtMs');
  });

  it('краевые состояния собраны в одном месте', () => {
    const edge = read('components/tournament/TournamentEdgeState.tsx');
    for (const kind of ['offline', 'preseason', 'cancelled', 'alreadyIn', 'emptyPool']) {
      expect(edge).toContain(kind);
    }
    // Скелетон повторяет геометрию, а не крутит спиннер на весь экран.
    expect(edge).toContain('TournamentSkeleton');
    expect(edge).not.toContain('ActivityIndicator');
  });

  it('режим «Турниры» исключён из таббара и свайпера до отдельного релизного решения', () => {
    // зачем 2026-07-27 (владелец: «делаем релиз без турниров — они не доделаны,
    // не должны быть ни доступны, ни даже видны»): раньше этот тест ТРЕБОВАЛ
    // вкладку с кубком по центру. Теперь он охраняет обратное — что вкладки нет
    // нигде: ни кнопкой в таббаре, ни страницей свайпера, ни в картах роутинга.
    // Возврат режима = осознанно переписать этот тест обратно.
    const layout = read('app/(tabs)/_layout.tsx');
    const home = read('app/(tabs)/home.tsx');
    const model = read('app/tab_page_model.ts');

    // После удаления физической страницы friends/settings сдвинуты на 2/3
    // во всех картах; отдельного «скрытого» индекса турниров не остаётся.
    expect(layout).not.toContain("key: 'tournaments'");
    expect(layout).not.toContain('loadTournamentsScreen');
    expect(model).not.toContain("'home', 'lessons', 'tournaments'");
    expect(layout).toContain("'/lessons': 1");
    expect(layout).toMatch(/lessons:\s*1/);
    expect(layout).toMatch(/friends:\s*2/);
    expect(layout).toMatch(/settings:\s*3/);
    expect(home).not.toMatch(/'\/\(tabs\)\/tournaments':/);
    expect(home).toMatch(/'\/\(tabs\)\/friends':\s*2/);
    expect(home).toMatch(/'\/\(tabs\)\/settings':\s*3/);
    expect(home).not.toContain('HomeDevTournamentsButton');
  });

  it('в хедере главной нет кнопки входа в турниры', () => {
    const home = read('app/(tabs)/home.tsx');

    expect(home).not.toContain('HomeDevTournamentsButton');
    expect(home).not.toContain('Тест турниров');
  });

  it('карты слайдера не сохраняют удалённую вкладку турниров', () => {
    // Регрессия владельца: кнопка открывала соседний экран, а последний
    // вылетал. Причина: список страниц слайдера и LOGICAL_TAB_IDS разошлись с
    // числом кнопок. Сборка при этом не падает — баг виден только на устройстве.
    const layout = read('app/(tabs)/_layout.tsx');
    const model = read('app/tab_page_model.ts');

    // Экран «Сегодня» убран — нулевой физической страницы слева от главной
    // больше нет, страниц ровно столько же, сколько табов (четыре).
    expect(model).toMatch(/LOGICAL_TAB_IDS\s*=\s*\['home', 'lessons', 'friends', 'settings'\]/);
    expect(model).toContain('export type LogicalTabIndex = 0 | 1 | 2 | 3;');
    expect(model).toContain('export type PhysicalPageIndex = 0 | 1 | 2 | 3;');
    expect(layout).not.toContain('loadTournamentsScreen');
    expect(layout).toMatch(/TAB_PATH_SUFFIXES\s*=\s*\['\/home', '\/journal', '\/lessons', '\/friends', '\/settings'\]/);
    expect(layout).toMatch(/const TABS:[\s\S]*?=\s*\[[\s\S]*?\];/);
    const tabsBlock = layout.slice(layout.indexOf('const TABS:'), layout.indexOf('type TabScaffoldProps'));
    expect(tabsBlock).not.toContain('tournaments');
    expect(layout).not.toContain('key="tournaments"');
    expect(layout).toContain('key="lessons"');
    expect(layout).toMatch(/shouldLoad\(2\)\} loadScreen=\{loadFriendsScreen\}/);
    expect(layout).toMatch(/shouldLoad\(3\)\} loadScreen=\{loadSettingsScreen\}/);
    expect(layout).toContain('case 1: return loadLessonsScreen();');
    expect(layout).toContain('case 2: return loadFriendsScreen();');
    expect(layout).toContain('case 3: return loadSettingsScreen();');
    expect(layout).not.toContain('case 4:');
  });

  it('главный экран берёт данные с сервера, а не из заглушки', () => {
    const home = read('app/(tabs)/tournaments.tsx');

    // Слоты, комната и вход идут через клиентский слой.
    expect(home).toContain('useTournamentRoom');
    expect(home).toContain('loadSchedule');
    expect(home).toContain('joinTournament');
    // Захардкоженного расписания быть не должно.
    expect(home).not.toContain('const DAY_SLOTS');
  });

  it('вход в турнир защищён от двойного списания билета', () => {
    // Билет списывает сервер; два быстрых тапа = два запроса = два билета.
    // 2026-07-27: хаб переписан в дизайне V2 — кнопка входа блокируется
    // составным условием (нет комнаты / уже заходим / не хватает жемчужин).
    // Проверяем СУТЬ защиты, а не конкретную формулировку пропса.
    const home = read('app/(tabs)/tournaments.tsx');
    const entryBlock = home.slice(
      home.indexOf('const enterLobby = useCallback'),
      home.indexOf('const contentPadding'),
    );
    expect(home).toContain('const activeEntryKeyRef = useRef<string | null>(null);');
    expect(home).toContain('beginTournamentEntryTransition');
    expect(entryBlock).toContain('activeEntryKeyRef.current !== entryKey');
    expect(entryBlock).toContain('activeEntryKeyRef.current === entryKey');
    expect(entryBlock).toContain("transitionState !== 'advanced'");
    expect(entryBlock).toContain('resolvedRoomId !== joinRoomId');
    expect(entryBlock).toContain('recoverCancelledTournamentEntry(result.roomId, entryGeneration)');
    expect(home).toContain('const entryGenerationRef = useRef(0);');
    expect(home).toContain('entryGenerationRef.current !== cancelledGeneration');
    expect(entryBlock).not.toContain('joiningRef.current = false');
    expect(entryBlock.indexOf('router.push(')).toBeGreaterThanOrEqual(0);
    expect(entryBlock.indexOf('router.push(')).toBeLessThan(entryBlock.indexOf('await startTournamentNow()'));
    expect(entryBlock.indexOf('router.push(')).toBeLessThan(entryBlock.indexOf('await joinTournament('));
    expect(home).not.toContain("joining ? 'Заходим…'");
    expect(home).not.toContain('disabled={joining}');
  });

  it('возврат взноса после выхода тихо обновляет баланс меню турниров', () => {
    const home = read('app/(tabs)/tournaments.tsx');
    const shards = read('app/shards_system.ts');

    expect(home).toContain("onAppEvent('shards_balance_updated'");
    expect(home).toContain('if (activeEntryKeyRef.current) {');
    expect(home).toContain('deferredBalanceRefreshRef.current = true;');
    expect(home).toContain('reconcileDeferredBalance()');
    expect(home).toContain('refreshShardsBalanceFromCloudAuthoritative()');
    expect(home).not.toContain('replaceShardsBalanceLocal(serverBalance');
    expect(home).not.toContain('replaceShardsBalanceLocal,');
    expect(home).toMatch(/setCoins\(serverBalance\);[\s\S]{0,240}deferredBalanceRefreshRef\.current = true;[\s\S]{0,120}reconcileDeferredBalance\(\)/);
    expect(home).toContain('setCoins(payload.balance);');
    expect(home).not.toContain('getShardsBalance().then(setCoins)');
    const authoritativeRefresh = shards.slice(
      shards.indexOf('export const refreshShardsBalanceFromCloudAuthoritative'),
      shards.indexOf('/** Локальный баланс', shards.indexOf('export const refreshShardsBalanceFromCloudAuthoritative')),
    );
    expect(authoritativeRefresh).toContain('withAccountTransitionLock(async () =>');
    expect(authoritativeRefresh).toContain('replaceShardsBalanceLocalWithOutcomeUnlocked');
    expect(authoritativeRefresh).toContain("return outcome === 'applied' ? balance : null");
    expect(authoritativeRefresh).toContain('shards_updated_at_ms');
    expect(authoritativeRefresh).toContain('const documentUpdatedAtMs = parseUpdatedAtMs(data.updatedAt)');
    expect(authoritativeRefresh).toContain('Math.max(shardUpdatedAtMs ?? 0, documentUpdatedAtMs ?? 0)');
    expect(authoritativeRefresh).toContain('if (serverUpdatedAtMs <= 0) return null');
    expect(authoritativeRefresh).not.toContain('updatedAtMs: Date.now()');
  });

  it('roomId вычисляется той же формулой, что на сервере', () => {
    // Расхождение = клиент слушает несуществующий документ и висит в загрузке.
    const client = read('app/tournament_client.ts');
    const server = read('functions/src/tournament_core.ts');

    const formula = /\$\{slotId\}_\$\{timezone\.replace\(\/\[\^\\w\]\/g, '_'\)\}_\$\{dateKey\}/;
    expect(client).toMatch(formula);
    expect(server).toMatch(formula);
    expect(client).toContain('slice(0, 140)');
    expect(server).toContain('slice(0, 140)');
  });

  it('главный экран ВСЕГДА рабочий — заглушки на весь экран запрещены', () => {
    // Требование владельца 2026-07-26: «экран турнира всегда должен быть
    // рабочим». Раньше «Нет соединения» показывался при ЛЮБОМ отказе (даже
    // когда интернет есть, а расписания просто нет) — человек упирался в тупик.
    const home = read('app/(tabs)/tournaments.tsx');
    expect(home).not.toContain('kind="offline"');
    expect(home).not.toContain('kind="preseason"');
    expect(home).not.toContain('TournamentSkeleton />');
    // Без расписания — честная пауза «Сейчас турниров нет», а не 00:00,
    // не заглушка и не мёртвый призыв играть.
    // зачем 2026-08-03 (владелец, релизное решение): турниры только по
    // расписанию; прежний текст «ИГРАЙТЕ СЕЙЧАС» для пустого расписания
    // отменён вместе с мгновенными комнатами вне окна.
    const heroCopy = read('app/tournament_hero_copy.ts');
    expect(heroCopy).toContain('Сейчас турниров нет');
    expect(home).toContain('resolveTournamentHeroCopy');
  });

  it('палитра турниров берётся из активной темы приложения', () => {
    // Жалоба владельца: «турнир не слушает цвета активной темы».
    // 2026-07-26: палитра берётся ХУКОМ useTournamentPalette (он же считает
    // производные V2-градиенты), а не прямым вызовом фабрики в каждом экране.
    const home = read('app/(tabs)/tournaments.tsx');
    expect(home).toContain('useTournamentPalette()');
    expect(home).toContain('makeStyles(P)');
    // Сам хук обязан собирать палитру из активной темы приложения.
    const theme = read('components/ui/v2_theme.ts');
    expect(theme).toContain('tournamentV2FromTheme(theme, themeMode)');
    expect(theme).toContain('useTheme()');
  });

  it('лобби и раунд работают от комнаты, а не от заглушек', () => {
    const lobby = read('app/tournament_lobby.tsx');
    const round = read('app/tournament_round.tsx');

    expect(lobby).toContain('useTournamentRoom');
    expect(round).toContain('useTournamentRoom');
    expect(lobby).toContain('markTournamentEntryTransitionAdvanced(entryKey)');
    expect(lobby).not.toContain('const DEMO_SEATS');
    expect(round).not.toContain('const DEMO_QUESTIONS');
  });

  it('лобби явно выходит через сервер и показывает стабильную схему банка 60/25/15', () => {
    const lobby = read('app/tournament_lobby.tsx');
    const client = read('app/tournament_client.ts');
    expect(client).toContain('export function leaveTournament(roomId: string)');
    expect(client).toContain("'tournamentLeave'");
    expect(lobby).toContain('leaveTournament');
    const leaveBlock = lobby.slice(
      lobby.indexOf('const leaveLobby = useCallback'),
      lobby.indexOf('/**', lobby.indexOf('const leaveLobby = useCallback')),
    );
    expect(lobby).toContain('cancelTournamentEntryTransition');
    expect(lobby).toContain('leavingRef.current');
    expect(leaveBlock).not.toContain('await leaveTournament(roomId)');
    expect(leaveBlock.indexOf('closeTournamentFlow(router)')).toBeGreaterThanOrEqual(0);
    expect(leaveBlock.indexOf('closeTournamentFlow(router)'))
      .toBeLessThan(leaveBlock.indexOf('leaveTournament(roomId)'));
    expect((leaveBlock.match(/Haptics\.impactAsync/g) ?? [])).toHaveLength(1);
    expect(leaveBlock.indexOf('Haptics.impactAsync'))
      .toBeLessThan(leaveBlock.indexOf('closeTournamentFlow(router)'));
    expect(lobby).not.toContain("leaving ? 'Выходим…'");
    expect(lobby).not.toContain('disabled={leaving}');
    expect(lobby).not.toMatch(/useEffect\(\(\) => \(\) => \{\s*if \(entryKey\)/);
    expect(lobby).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(lobby).toContain('leaveLobby();');
    expect(leaveBlock).not.toContain('getShardsBalance()');
    expect(leaveBlock).toContain('runTournamentMutationWithRetry');
    expect(leaveBlock).toContain('refreshShardsBalanceFromCloudAuthoritative()');
    expect(leaveBlock).toContain('myId ?? await getStableId().catch(() => null)');
    expect(leaveBlock).toContain('resolveTournamentExitStatus(roomId, exitPlayerId)');
    expect(leaveBlock).toContain("pathname: '/tournament_lobby'");
    // зачем 2026-08-03 (владелец: «места пусть вместо процентов сразу
    // показывают точные цифры жемчугов, тоже анимированно»): проценты в лобби
    // запрещены — игрок не считает доли от банка в уме, ему нужна награда.
    expect(lobby).not.toContain('1 место · 60%');
    expect(lobby).not.toContain('2 место · 25%');
    expect(lobby).not.toContain('3 место · 15%');
    expect(lobby).toContain('tournamentPrizeForecast');
    expect(lobby).toContain('AnimatedPrizePlace');
    // Награда считается от ТЕКУЩЕЙ показанной суммы банка, а не от итоговой:
    // иначе места прыгнули бы к финалу, пока каскад банка ещё едет.
    expect(lobby).toContain('onDisplayAmountChange={setDisplayedBankGems}');
    expect(lobby).toMatch(/tournamentPrizeForecast\(displayedBankGems\)/);
    expect(lobby).toContain('useReduceMotion');
    expect(lobby).toContain('withTiming');
    expect(lobby).toMatch(/bankAmountSlot:\s*\{[^}]*minWidth:[^}]*fontVariant:\s*\['tabular-nums'\]/s);
    // Цифра награды не должна дёргаться по ширине при 9 → 16 → 38.
    expect(lobby).toMatch(/bankShareGems:\s*\{[^}]*fontVariant:\s*\['tabular-nums'\]/s);
  });

  it('подтверждённый выход из активного раунда закрывает экран до сетевого ответа', () => {
    const round = read('app/tournament_round.tsx');
    const forfeitBlock = round.slice(
      round.indexOf('const confirmForfeit = useCallback'),
      round.indexOf('const submitCurrentTaskAnswer'),
    );

    expect(round).toContain('forfeitingRef.current');
    expect(forfeitBlock).not.toContain('await forfeitTournament(roomId)');
    expect(forfeitBlock.indexOf('closeTournamentFlow(router)')).toBeGreaterThanOrEqual(0);
    expect(forfeitBlock.indexOf('closeTournamentFlow(router)'))
      .toBeLessThan(forfeitBlock.indexOf('forfeitTournament(roomId)'));
    expect(forfeitBlock).toContain('runTournamentMutationWithRetry');
    expect(forfeitBlock).toContain('myId ?? await getStableId().catch(() => null)');
    expect(forfeitBlock).toContain('resolveTournamentExitStatus(roomId, exitPlayerId)');
    expect(round).not.toContain("forfeiting ? 'Выходим…'");
    expect(round).not.toContain('disabled={forfeiting}');
    expect(forfeitBlock).toContain("pathname: '/tournament_round'");
  });

  it('derives the live lobby bank from server bot-arrival timing without a second client cascade', () => {
    const lobby = read('app/tournament_lobby.tsx');
    const client = read('app/tournament_client.ts');

    expect(client).toContain("kind: 'bot_arrival';");
    expect(client).toContain('potDeltaGems: number;');
    expect(lobby).toContain('lobbyPotGemsAtTime(');
    expect(lobby).toContain('room?.lobbyEvents ?? []');
    expect(lobby).not.toContain('seenEventIdsRef');
  });

  it('результаты показывают только выплату игрока, без бухгалтерии банка', () => {
    // зачем 2026-08-04 (владелец: «убери вообще вот этот блок общий банк, ваша
    // доля и т.д. — это мусор»): раньше тест охранял ИМЕННО эту таблицу — банк,
    // отчисление в недельный фонд, призовой фонд дня, доли мест. Владелец её
    // удалил целиком, экран показывает одно число — награду игрока.
    const results = read('app/tournament_results.tsx');
    for (const removed of ['Общий банк', 'В недельный банк', 'Призовой фонд дня', 'Ваша доля', '60 / 25 / 15']) {
      expect(results).not.toContain(removed);
    }
    expect(results).toContain('const myPrizeGems');
    expect(results).toContain('rewardGems');
  });

  it('награда игрока — жемчужины без подписи-расшифровки, пустая награда без давления', () => {
    // зачем 2026-08-04 (владелец): «начислена сервером» была подписью-
    // расшифровкой под заголовком — запрещённый паттерн владельца. «Ваша
    // награда» раньше показывала ОЧКИ вместо приза — теперь ровно rewardGems.
    const results = read('app/tournament_results.tsx');
    // Проверяем UI-строку в кавычках, а не комментарии: файл объясняет ПОЧЕМУ
    // подписи больше нет, и это объяснение законно упоминает старый текст.
    expect(results).not.toContain("'начислена сервером'");
    expect(results).not.toContain('rewardSub:');
    expect(results).toContain('myPrizeGems > 0');
    expect(results).toContain('В этот раз без жемчужин — получится в следующий');
  });

  it('индикатор звёзд сезона виден в шапке результатов, звёзды под ником убраны', () => {
    // зачем 2026-08-04 (владелец): «вместо звёздочек должно на этом экране
    // показывать, сколько жемчужин каждый получил» + «в правом верхнем углу
    // просто как везде индикатор звёздочек». Источник звёзд — тот же
    // peekSeasonPassProgress, что на вкладке турниров, не отдельный счётчик.
    const results = read('app/tournament_results.tsx');
    expect(results).toContain('results-season-stars');
    expect(results).toContain('peekSeasonPassProgress');
    expect(results).toContain('seasonPass.totalStars');
    expect(results).not.toContain('podiumScoreRow');
  });

  it('жемчужины и звёзды докручиваются анимированным счётчиком, не появляются готовым числом', () => {
    // зачем 2026-08-04 (владелец: «начисление звёзд и начисление жемчугов
    // должно быть анимированно, они должны цифры увеличить с анимацией»).
    const results = read('app/tournament_results.tsx');
    expect(results).toContain('function useCountUp(');
    expect(results).toContain('useCountUp(gems, gemsStartDelay)');
    expect(results).toContain('useCountUp(seasonStars, 200)');
    expect(results).toContain('useCountUp(myPrizeGems, 500, hasFinalResults)');
  });

  it('переходы между этапами делает сервер, а не локальный таймер', () => {
    // Иначе игроки с неточными часами уходят в раунд раньше остальных
    // и видят вопросы, которых сервер ещё не выдал.
    const lobby = read('app/tournament_lobby.tsx');
    // 2026-07-27: сервер нумерует фазы (round1..round4), клиент сравнивал с
    // 'round' — совпадения не было НИКОГДА, лобби не уводило в раунд. Переход
    // идёт через общий хелпер isRoundState, он же закрывает table1..table3.
    expect(lobby).toMatch(/isRoundState\(room\.state\)/);
    const client = read('app/tournament_client.ts');
    expect(client).toMatch(/\^round\[1-4\]\$/);
    expect(client).toMatch(/\^table\[1-3\]\$/);
    // Голых сравнений со старыми именами не должно остаться нигде.
    for (const screen of ['app/tournament_lobby.tsx', 'app/tournament_round.tsx',
      'app/tournament_table.tsx', 'app/(tabs)/tournaments.tsx']) {
      expect(read(screen)).not.toMatch(/state === 'round'(?!\d)/);
      expect(read(screen)).not.toMatch(/state === 'table'(?!\d)/);
    }
    // Кнопка «Начать сейчас» не должна дублировать серверный старт.
    expect(lobby).not.toMatch(/onPress=\{\(\) => router\.replace\(.*tournament_round/);

    const round = read('app/tournament_round.tsx');
    expect(round).toMatch(/isTableState\(room\.state\)/);
    expect(round).toMatch(/room\.state === 'results'/);
  });

  it('ключ ответа не приходит на клиент, а локальный fingerprint красит выбор сразу', () => {
    // Сервер вырезает ключи ответов из публичного payload. Если экран начнёт
    // ждать correctIndex, он либо сломается, либо кто-то протащит ответы
    // в клиент — а это накрутка очков.
    const round = read('app/tournament_round.tsx');
    expect(round).not.toContain('payload.correctIndex');
    expect(round).toContain('result.correct');
    expect(round).toContain('result.correctIndex');
    expect(round).toContain('answerFingerprints');
    expect(round).toMatch(/displayedCorrect\s*\?\s*'ok'\s*:\s*'bad'/);
  });

  it('ответы уходят одной пачкой и ровно один раз за раунд', () => {
    const round = read('app/tournament_round.tsx');
    expect(round).toContain('submitTaskAnswer');
    expect(round).toContain('taskIdempotencyKeysRef');
    expect(round).toContain('getOrCreateTournamentTaskIdempotencyKey');
    expect(round).not.toContain('submittedRef');
  });

  it('ответ уходит в точном формате verifyTournamentAnswer, а не голым числом', () => {
    // КРИТИЧНО: аудит нашёл, что клиент слал answer как голое число
    // (optionIndex), а сервер (verifyTournamentAnswer в tournament_core.ts)
    // требует answer объектом — { selectedIndex } для choice,
    // { selectedIndexes } для speed_match. isRecord(answer) на числе даёт
    // false и функция сразу возвращает false — ЛЮБОЙ ответ choice
    // засчитывался бы неверным независимо от того, что выбрал игрок.
    const round = read('app/tournament_round.tsx');
    expect(round).toContain('selectedIndex');
    expect(round).toContain('selectedIndexes');
    // зачем 2026-08-02: было сокращение `{ selectedIndex }` от локальной
    // переменной, которая подставляла ответ из кэша вместо нажатого варианта —
    // правильный вариант засчитывался как неверный. Отправляем нажатый индекс
    // явно. Суть контракта прежняя: answer уходит ОБЪЕКТОМ, а не числом.
    expect(round).toContain('submitCurrentTaskAnswer(question, { selectedIndex: optionIndex }, localCorrect)');
    expect(round).toContain('submitCurrentTaskAnswer(question, { selectedIndexes })');

    const server = read('functions/src/tournament_core.ts');
    expect(server).toContain('selectedIndex');
    expect(server).toContain('selectedIndexes');
  });

  it('клиент принимает только пять утверждённых режимов', () => {
    const round = read('app/tournament_round.tsx');
    expect(round).toContain('taskToQuestions');
    // зачем: taskToQuestions теперь принимает lang (i18n-аудит) — вызывается
    // через обёртку, а не передаётся напрямую в flatMap.
    expect(round).toMatch(/flatMap\(\(task\) => taskToQuestions\(task, lang\)\)/);
    expect(round).toContain('OWNER_APPROVED_TOURNAMENT_MODES');
    expect(round).toContain("'speed_match'");
    expect(round).not.toContain('time_attack');
    expect(round).not.toContain('listen_choose');
    expect(round).not.toContain('sound_contrast');
    expect(round).not.toContain('listen_build');
  });

  it('прогресс-подпись раунда показывает реальное число вопросов', () => {
    // Подпись должна следовать фактически активированному сервером набору.
    const round = read('app/tournament_round.tsx');
    expect(round).toContain("ru: `из ${total}`");
  });

  it('translate («собери фразу») рисуется, а не пустует', () => {
    // КРИТИЧНО: генератор кладёт в пул 3276 заданий translate_build —
    // столько же, сколько choice. Сервер (selectRoundTasks) выбирает режим
    // раунда случайно, поэтому без этой раскладки треть турниров зависала
    // бы на экране «Готовим вопросы…» навсегда (найдено аудитом 2026-07-25).
    const round = read('app/tournament_round.tsx');
    expect(round).toContain("task.kind === 'translate'");
    expect(round).toContain('WordBank');
    expect(round).toContain('wordBank');
    // Старая заглушка-комментарий про «фаза 2» для translate не должна
    // остаться единственным поведением — voice там теперь один.
    expect(round).not.toMatch(/\/\/ translate\/voice рисуются другими раскладками — фаза 2\.\s*\n\s*return \[\];/);
  });

  it('ответ translate уходит как { tokens }, а не как индекс', () => {
    const round = read('app/tournament_round.tsx');
    expect(round).toContain('answerTranslate');
    expect(round).toContain('submitCurrentTaskAnswer(question, { tokens }, localCorrect)');
  });

  it('банк слов не даёт использовать одно слово дважды', () => {
    // Защита от гонки/двойного тапа: слово, уже перенесённое в собранную
    // фразу, недоступно повторно, пока не вернётся обратно.
    const round = read('app/tournament_round.tsx');
    expect(round).toContain('used ? <V2ChipGhost label={word} />');
  });

  it('экран турниров лежит внутри папки вкладок', () => {
    // Вне (tabs) таббар его не подхватит и вкладка будет пустой.
    expect(() => read('app/(tabs)/tournaments.tsx')).not.toThrow();
  });

  /**
   * зачем 2026-08-03: тест запрещал на главной вкладке любую кнопку со стрелкой.
   * Владелец затем ПОПРОСИЛ выход на главную прямо из хаба турниров, и кнопка
   * появилась намеренно (см. комментарий у неё в tournaments.tsx).
   *
   * Исходное правило было не про саму стрелку, а про то, чтобы вкладка не звала
   * router.back(): у таба стека может не быть, и «назад» кидало бы в случайный
   * экран. Это и сторожим — запрет на safeRouterBack/router.back() остаётся,
   * а переход обязан быть явной заменой маршрута на главную.
   */
  it('главная вкладка турниров уходит на главную заменой маршрута, а не router.back()', () => {
    const home = read('app/(tabs)/tournaments.tsx');
    expect(home).not.toContain('safeRouterBack');
    expect(home).not.toContain('accessibilityLabel="Назад"');
    // Уход с вкладки — это замена маршрута на главную. Проверяем именно её:
    // router.back() тут не годится (у таба может не быть стека), а запрет на
    // подстроку 'router.back()' ловил бы два комментария, которые как раз это
    // и объясняют.
    expect(home).toContain("router.replace('/(tabs)/home'");
    // Кнопка выхода есть, но она ведёт на главную осознанно.
    expect(home).toContain('testID="tournaments-back"');
    expect(home).toContain("accessibilityLabel={L({ ru: 'На главную'");
  });

  it('интерактивные элементы доступны для скринридера', () => {
    for (const screen of SCREENS) {
      const source = read(screen);
      const pressables = (source.match(/<Pressable/g) ?? []).length;
      if (pressables === 0) continue;
      expect(source).toContain('accessibilityRole');
      expect(source).toContain('accessibilityLabel');
    }
  });
});

describe('tournament results navigation', () => {
  it('closes directly to the tournament menu instead of navigating back to the table', () => {
    const results = read('app/tournament_results.tsx');
    expect(results).toContain('const closeResults = useCallback(() => closeTournamentFlow(router), [router]);');
    // зачем: accessibilityLabel локализован через triLang (i18n-аудит), русский
    // текст больше не зашит напрямую в JSX — проверяем наличие ru/uk ключей.
    expect(results).toMatch(/accessibilityLabel=\{triLang\(lang,\s*\{\s*ru:\s*'Закрыть',\s*uk:\s*'Закрити'/);
    expect(results).toContain('onPress={closeResults}');
    expect(results).toContain('<Ionicons name="close"');
    expect(results).not.toContain('safeRouterBack');
    expect(results).not.toContain('name="chevron-back"');
  });
});

describe('режим зрителя (2026-07-26)', () => {
  const table = readFileSync(path.resolve(__dirname, '..', 'app', 'tournament_table.tsx'), 'utf8');
  const home = readFileSync(path.resolve(__dirname, '..', 'app', '(tabs)', 'tournaments.tsx'), 'utf8');
  const rules = readFileSync(path.resolve(__dirname, '..', 'firestore.rules'), 'utf8');

  it('зритель смотрит ТУ ЖЕ таблицу, отдельного экрана не заводим', () => {
    expect(table).toContain("params.spectate === '1'");
    expect(home).toContain("spectate: '1'");
  });

  it('зрителя НЕ уводит в раунд — он остаётся на табло', () => {
    // Иначе зритель попал бы на экран вопросов, где ему нечего делать.
    expect(table).toContain('if (spectating) return;');
  });

  it('смотреть можно только после закрытия входа — зритель не отнимает игрока', () => {
    // Турниру нужно 8 живых, иначе отмена: пока лобби открыто — только играть.
    expect(rules).toContain("resource.data.state.matches('round[1-4]')");
    expect(home).toContain('Смотреть турнир');
  });

  it('правильные ответы зрителю недоступны', () => {
    // taskSecrets закрыты для всех, включая участников.
    expect(rules).toMatch(/taskSecrets\/\{taskId\}[\s\S]{0,120}allow read, write: if false/);
  });

  /**
   * зачем 2026-08-04 (аудит all-day режима): roomId зрителя строился клиентской
   * формулой tournamentRoomId(slotId, tz, dateKey) — верно для обычного
   * расписания (сервер создаёт ТУ ЖЕ комнату по тому же слоту), но неверно для
   * all-day: там сервер перевычисляет комнату каждые 30 секунд по хэшу от
   * текущего времени (tournamentAllDayRoomId в
   * functions/src/tournament_all_day.ts) — клиент физически не может её
   * угадать без node:crypto и без риска разойтись с серверными часами. Без
   * этой проверки экран тихо подписывался на чужую/устаревшую комнату: статус
   * «Вы в турнире» никогда не срабатывал для all-day, а слушатель Firestore
   * висел зря (Firebase-экономия). Правильный контракт — НЕ подписываться,
   * когда предсказать комнату нельзя, а не подписаться на неверную.
   */
  it('в all-day режиме зритель не подписывается на непредсказуемую комнату', () => {
    expect(home).toContain("if (!watchSlot || schedule?.allDayEnabled === true) return null;");
  });
});
