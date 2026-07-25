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
  'app/tournaments.tsx',
  'app/tournament_lobby.tsx',
  'app/tournament_round.tsx',
  'app/tournament_table.tsx',
  'app/tournament_results.tsx',
  'app/tournament_season.tsx',
] as const;

const COMPONENTS = [
  'components/tournament/tournament_theme.ts',
  'components/tournament/tournament_ui.tsx',
  'components/tournament/TournamentCountdown.tsx',
] as const;

const ALL_FILES = [...SCREENS, ...COMPONENTS];

describe('экраны режима «Турниры»', () => {
  it('все экраны режима существуют', () => {
    for (const file of ALL_FILES) {
      expect(read(file).length).toBeGreaterThan(500);
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

  it('раунд: батч из 5 вопросов и пауза перед следующим', () => {
    const round = read('app/tournament_round.tsx');
    expect(round).toContain('const QUESTIONS_PER_ROUND = 5');
    expect(round).toContain('motion.answerFeedbackMs');

    const theme = read('components/tournament/tournament_theme.ts');
    // 1.4с — согласованный тайминг автоперехода после фидбека.
    expect(theme).toMatch(/answerFeedbackMs:\s*1400/);
  });

  it('раунд: место под фидбек зарезервировано, варианты не прыгают', () => {
    const round = read('app/tournament_round.tsx');
    expect(round).toMatch(/feedbackSlot:\s*\{\s*minHeight/);
  });

  it('таблица переставляет строки пружиной, а не мгновенно', () => {
    const table = read('app/tournament_table.tsx');
    expect(table).toContain('withSpring');
    expect(table).toContain('prevPlace');
    expect(table).toContain('обгон');
    // Абсолютное позиционирование строк — иначе перестановка двигает соседей.
    expect(table).toMatch(/position:\s*'absolute'/);
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
