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
  'components/tournament/tournament_theme.ts',
  'components/tournament/tournament_ui.tsx',
  'components/tournament/TournamentCountdown.tsx',
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
    const theme = read('components/tournament/tournament_theme.ts');
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
    const theme = read('components/tournament/tournament_theme.ts');
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
    expect(table).toContain('ZoomIn.delay(revealDelayMs + 160)');
  });

  it('межраундовая таблица показывает верх и свою строку без списка из 16 строк', () => {
    const table = read('app/tournament_table.tsx');
    expect(table).toContain('TABLE_TOP_ROWS = 5');
    expect(table).toContain('visibleRows');
    expect(table).toContain('row.isYou');
    expect(table).not.toContain('<ScrollView');
    expect(table).not.toContain('rows.map((row, index)');
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
    expect(results).toContain("const closeResults = useCallback(() => router.replace('/tournaments')");
    expect(results).toContain('accessibilityLabel="Закрыть"');
    expect(results).toContain('<Ionicons name="close"');
    expect(results).not.toContain('>На главную</V2Cta>');
  });

  it('хаптик только на управляющих кнопках, не на плитках', () => {
    // Правило владельца: клик-звук/вибрация на кнопках, не на карточках.
    const ui = read('components/tournament/tournament_ui.tsx');
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
    const model = read('lib/today/tab_page_model.ts');

    expect(layout).toContain("key: 'tournaments'");
    expect(layout).toContain('loadTournamentsScreen');
    expect(model).toContain("'tournaments'");
    expect(layout).toContain("'/tournaments': 2");
    expect(layout).toContain("'/(tabs)/tournaments'");
    expect(layout).toMatch(/tournaments:\s*2/);
    expect(layout).toMatch(/friends:\s*3/);
    expect(layout).toMatch(/settings:\s*4/);
    expect(home).toMatch(/'\/\(tabs\)\/tournaments':\s*2/);
    expect(home).toMatch(/'\/\(tabs\)\/friends':\s*3/);
    expect(home).toMatch(/'\/\(tabs\)\/settings':\s*4/);
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
    const model = read('lib/today/tab_page_model.ts');

    expect(model).toMatch(/LOGICAL_TAB_IDS\s*=\s*\['home', 'lessons', 'tournaments', 'friends', 'settings'\]/);
    expect(model).toContain('export type LogicalTabIndex = 0 | 1 | 2 | 3 | 4;');
    expect(model).toContain('export type PhysicalPageIndex = 0 | 1 | 2 | 3 | 4 | 5;');
    expect(layout).toContain('loadTournamentsScreen');
    expect(layout).toMatch(/TAB_PATH_SUFFIXES\s*=\s*\['\/home', '\/journal', '\/lessons', '\/tournaments', '\/friends', '\/settings'\]/);
    expect(layout).toMatch(/const TABS:[\s\S]*?=\s*\[[\s\S]*?\];/);
    expect(layout).toMatch(/const TABS:[\s\S]{0,900}tournaments/);
    expect(layout).toContain('key="tournaments"');
    expect(layout).toMatch(/key="tournaments"[\s\S]{0,160}loadScreen=\{loadTournamentsScreen\}/);
    expect(layout).toMatch(/shouldLoad\(3\)\} loadScreen=\{loadFriendsScreen\}/);
    expect(layout).toMatch(/shouldLoad\(4\)\} loadScreen=\{loadSettingsScreen\}/);
    expect(layout).toContain('case 2: return loadTournamentsScreen();');
    expect(layout).toContain('case 3: return loadFriendsScreen();');
    expect(layout).toContain('case 4: return loadSettingsScreen();');
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
    expect(home).toMatch(/if \(!\w*[Rr]oomId \|\| joining\) return/);
    expect(home).toMatch(/disabled=\{[^}]*joining[^}]*\}/);
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
    // Без расписания — «Скоро», а не 00:00 и не заглушка.
    // зачем 2026-07-27: тексты hero переехали в app/tournament_hero_copy.ts
    // (пять состояний окна вместо двух — в JSX не помещалась лестница
    // тернарников). Правило то же, изменился только адрес.
    const heroCopy = read('app/tournament_hero_copy.ts');
    expect(heroCopy).toContain('первый турнир готовится');
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
    const theme = read('components/tournament/tournament_theme.ts');
    expect(theme).toContain('tournamentV2FromTheme(theme)');
    expect(theme).toContain('useTheme()');
  });

  it('лобби и раунд работают от комнаты, а не от заглушек', () => {
    const lobby = read('app/tournament_lobby.tsx');
    const round = read('app/tournament_round.tsx');

    expect(lobby).toContain('useTournamentRoom');
    expect(round).toContain('useTournamentRoom');
    expect(lobby).not.toContain('const DEMO_SEATS');
    expect(round).not.toContain('const DEMO_QUESTIONS');
  });

  it('лобби явно выходит через сервер и показывает стабильную схему банка 60/25/15', () => {
    const lobby = read('app/tournament_lobby.tsx');
    const client = read('app/tournament_client.ts');
    expect(client).toContain('export function leaveTournament(roomId: string)');
    expect(client).toContain("'tournamentLeave'");
    expect(lobby).toContain('leaveTournament');
    expect(lobby).toContain('await leaveTournament(roomId)');
    expect(lobby).toContain("const [leaving, setLeaving] = useState(false)");
    expect(lobby).toContain('disabled={leaving}');
    expect(lobby).toContain('60%');
    expect(lobby).toContain('25%');
    expect(lobby).toContain('15%');
    expect(lobby).toContain('useReduceMotion');
    expect(lobby).toContain('withTiming');
    expect(lobby).toMatch(/bankAmountSlot:\s*\{[^}]*minWidth:[^}]*fontVariant:\s*\['tabular-nums'\]/s);
  });

  it('анимирует только новые серверские bot_arrival события банка без выдуманного прироста', () => {
    const lobby = read('app/tournament_lobby.tsx');
    const client = read('app/tournament_client.ts');

    expect(client).toContain("kind: 'bot_arrival';");
    expect(client).toContain('potDeltaGems: number;');
    expect(lobby).toContain("event.kind === 'bot_arrival'");
    expect(lobby).toContain('seenEventIdsRef');
    expect(lobby).toContain('setDisplayAmount(event.potGemsAfter);');
    expect(lobby).toContain('zero test-mode delta keeps digits');
  });

  it('результаты объясняют путь денег от общего банка до выплаты игрока', () => {
    const results = read('app/tournament_results.tsx');
    for (const label of ['Общий банк', 'В недельный банк', 'Призовой фонд дня', 'Ваша доля']) {
      expect(results).toContain(label);
    }
    expect(results).toContain('const totalPot');
    expect(results).toContain('const weeklyBankGems');
    expect(results).toContain('const myPrizeGems');
    expect(results).toContain('rewardGems');
    expect(results).toContain('60 / 25 / 15');
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

  it('правильный ответ не приходит на клиент — подглядеть нельзя', () => {
    // Сервер вырезает ключи ответов из публичного payload. Если экран начнёт
    // ждать correctIndex, он либо сломается, либо кто-то протащит ответы
    // в клиент — а это накрутка очков.
    const round = read('app/tournament_round.tsx');
    expect(round).not.toContain('payload.correctIndex');
    expect(round).toContain('result.correct');
    expect(round).toContain('result.correctIndex');
    // A selected answer may turn green only after the server returns its
    // boolean verdict; no answer key is ever sent to the active client.
    expect(round).toMatch(/authoritativeCorrect\s*\?\s*'ok'\s*:\s*'bad'/);
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
    expect(round).toContain('submitCurrentTaskAnswer(question, { selectedIndex })');
    expect(round).toContain('submitCurrentTaskAnswer(question, { selectedIndexes })');

    const server = read('functions/src/tournament_core.ts');
    expect(server).toContain('selectedIndex');
    expect(server).toContain('selectedIndexes');
  });

  it('клиент принимает только пять утверждённых режимов', () => {
    const round = read('app/tournament_round.tsx');
    expect(round).toContain('taskToQuestions');
    expect(round).toMatch(/flatMap\(taskToQuestions\)/);
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
    expect(round).toMatch(/из \{total\}/);
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
    expect(round).toContain('submitCurrentTaskAnswer(question, { tokens })');
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
    expect(results).toContain("const closeResults = useCallback(() => router.replace('/tournaments'), [router]);");
    expect(results).toContain('accessibilityLabel="Закрыть"');
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
});
