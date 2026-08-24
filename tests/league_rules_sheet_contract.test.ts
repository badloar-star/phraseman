/**
 * league_rules_sheet_contract.test.ts — сторож объяснялки лиги.
 *
 * зачем (владелец, 2026-08-24): «когда юзер заходит в лигу, надо модал-лист
 * снизу, который расскажет что такое лига, как тут повышаться и понижаться;
 * кнопка вопрос кругленькая в правом верхнем углу его вызывает».
 *
 * Почему сторож нужен именно здесь: club_screen.tsx и его шапку параллельно
 * правят другие сессии — в этой же сессии уже был случай, когда чужая правка
 * шапки главной СТЁРЛА тап по счётчику рун. Тест держит три вещи: кнопка «?»
 * есть в шапке, автопоказ один раз работает через feature_intro_registry
 * (диск, ноль Firestore), и объяснялка уступает дорогу итогам недели.
 *
 * Плюс охраняет полноту переводов: у владельца 8 языков интерфейса, и раздел,
 * добавленный без одного из них, молча покажет русский текст иностранцу.
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');
const read = (rel: string): string => readFileSync(join(root, rel), 'utf8');

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('объяснялка лиги (владелец, 2026-08-24)', () => {
  const sheet = read('components/LeagueRulesSheet.tsx');
  const club = read('app/club_screen.tsx');
  const clubCode = stripComments(club);

  it('кнопка «?» живёт в шапке экрана лиги и открывает объяснялку', () => {
    expect(clubCode).toContain('league-rules-help');
    expect(clubCode).toContain('setRulesSheetVisible(true)');
    // Круглая: половина стороны в borderRadius. Окно берём с запасом —
    // между testID и иконкой лежит ярлык доступности на 8 языках.
    const helpButton = clubCode.slice(clubCode.indexOf('league-rules-help'), clubCode.indexOf('league-rules-help') + 1600);
    expect(helpButton).toMatch(/borderRadius:\s*18/);
    expect(helpButton).toMatch(/name="help"/);
  });

  it('лист подключён к экрану лиги', () => {
    expect(clubCode).toContain('<LeagueRulesSheet');
    expect(clubCode).toContain("from '../components/LeagueRulesSheet'");
  });

  it('автопоказ идёт через реестр интро (диск), а не через Firestore', () => {
    expect(clubCode).toContain('shouldShowFeatureIntro');
    expect(clubCode).toContain('markFeatureIntroSeen');
    expect(clubCode).toContain('league_rules_first_visit');
    // Ни одного обращения к облаку на пути автопоказа — справка бесплатна.
    const introBlock = clubCode.slice(
      clubCode.indexOf('shouldShowFeatureIntro(LEAGUE_RULES_INTRO_ID)'),
    ).slice(0, 600);
    expect(introBlock).not.toMatch(/firestore|httpsCallable|collection\(/);
  });

  it('объяснялка уступает дорогу модалке итогов недели', () => {
    const render = clubCode.slice(clubCode.indexOf('<LeagueRulesSheet'), clubCode.indexOf('<LeagueRulesSheet') + 400);
    expect(render).toContain('!pendingLeagueResult');
  });

  it('автопоказ не сгорает, пока висит итог недели', () => {
    // Пометка «показано» обязана ждать реального показа: иначе первый заход с
    // модалкой итогов съел бы единственный автопоказ.
    const effect = clubCode.slice(clubCode.indexOf('rulesAutoShownRef.current'));
    expect(effect.slice(0, 400)).toContain('pendingLeagueResult');
  });

  it('уход с экрана закрывает справку по-настоящему', () => {
    // Аудит 2026-08-24: visible гасился runtimeActive, но состояние оставалось
    // true — возврат на экран сам выкатывал лист, которого никто не звал.
    expect(clubCode).toMatch(/if \(!runtimeActive\) setRulesSheetVisible\(false\)/);
  });

  it('каждый раздел объяснялки переведён на все 8 языков интерфейса', () => {
    const langs = ['ru:', 'uk:', 'es:', "'pt-BR':", 'vi:', 'id:', 'tr:', 'pl:'];
    // triLang-блоков в листе много (заголовки, тела, подписи) — у каждого
    // обязан быть полный набор языков.
    const blocks = sheet.match(/triLang\(lang,\s*\{[\s\S]*?\}\)/g) ?? [];
    expect(blocks.length).toBeGreaterThanOrEqual(13);
    for (const block of blocks) {
      for (const lang of langs) {
        expect(block).toContain(lang);
      }
    }
  });

  it('в объяснялке нет запрещённых владельцем слов', () => {
    // «рулетка/прокрут» запрещены в UI-текстах (механика зовётся иначе).
    // Проверяем КОД без комментариев: шапка файла документирует сам запрет и
    // законно называет слово — сторож не должен спотыкаться о документацию
    // (та же ловушка уже ловилась в runes_wallet_no_shop_contract).
    expect(stripComments(sheet).toLowerCase()).not.toMatch(/рулетк|прокрут/);
  });

  it('лист не рисует контейнеры с обводкой (запрет владельца)', () => {
    const code = stripComments(sheet);
    // Разделители одной стороны разрешены, рамка вокруг блока — нет.
    expect(code).not.toMatch(/borderWidth:\s*[1-9]/);
    expect(code).not.toMatch(/borderColor:/);
  });
});
