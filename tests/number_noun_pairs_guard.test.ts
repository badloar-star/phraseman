// зачем (координатор 12.10, системный проход по склонению): на экранах R1 (Карточки, Диалоги, Шпиль, Пейволы, Главная, Настройки) число не должно склеиваться с русским/укр./польским
// (и en/es/pt) существительным в фиксированной форме: «Удалить 3 карточек?», «1 дней», «+1 карточек скрыто». Склонять надо через constants/plural.ts.
// Сторож запускает scripts/scan_number_noun_pairs.mjs; разрешённые исключения — config/number-noun-allowlist.json, а значения констант, от которых они зависят, проверяются здесь.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.join(__dirname, '..');
const SCANNER = path.join(ROOT, 'scripts', 'scan_number_noun_pairs.mjs');

function matcher(lines: string[]): boolean[] {
  const script = `import { matchesNounPair } from 'file:///${SCANNER.replace(/\\/g, '/')}'; console.log(JSON.stringify(${JSON.stringify(lines)}.map((l) => matchesNounPair(l))));`;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8', timeout: 30_000 });
  if (result.status !== 0) throw new Error(result.stderr);
  return JSON.parse(result.stdout.trim());
}

describe('число + существительное на экранах R1', () => {
  it('в экранах R1 нет склейки «число + слово» вне помощника склонения (сканер)', () => {
    const result = spawnSync(process.execPath, [SCANNER, '--json'], { encoding: 'utf8', timeout: 60_000 });
    const findings = JSON.parse(result.stdout || '[]') as Array<{ file: string; line: number; text: string }>;
    expect(findings.map((f) => `${f.file}:${f.line} ${f.text}`)).toEqual([]);
  });

  it('сканер действительно ловит дефекты: шаблон, JSX и конкатенацию; помощник и журналы пропускает', () => {
    expect(matcher([
      'ru: `Удалить ${n} карточек?`,',
      "<Text>{count} слов выучено</Text>",
      "const s = n + ' карточек';",
      'en: `${n} cards hidden`,',
      'pl: `Usunąć ${n} kart?`,',
      'ru: `${days} дней доступа`,',
      'ru: `+${n} монет`,',
      'ru: `Осталось ${n} реплик`,',
      'uk: `${n} ступенів`,',
    ])).toEqual([true, true, true, true, true, true, true, true, true]);
    expect(matcher([
      'const label = "Выбери карточки";',
      'ru: `Удалить ${pluralWithCount(\'ru\', n, forms)}?`,',
    ])).toEqual([false, false]);
  });

  // зачем (координатор 12.11): сканер перестал считать ключи служебного синтаксиса (`hour=`, `step=`, `cards={…}`) словом
  // при числе. Здесь доказательство, что это не ослабление: прежние настоящие ошибки — пять строк сцен Главной до
  // правки 93e7b9a25 — ловятся, как раньше, в том числе на строке, где рядом есть и служебный ключ.
  it('настоящие ошибки ловит по-прежнему, служебный синтаксис key=value и JSX-пропы — нет', () => {
    expect(matcher([
      "    en: `${n} ${en(n, 'mistake', 'mistakes')} piled up`, es: `Se juntaron ${n} errores`, 'pt-BR': `Juntaram-se ${n} erros`,",
      "  phrasesBang: (l: Lang, n: number) => triLang(l, { ru: `${n} ${ruPl(n, 'фраза', 'фразы', 'фраз')}!`, en: `${n} phrases!`, es: `¡${n} frases!`, 'pt-BR': `${n} frases!`",
      "  lessonsBang: (l: Lang, n: number) => triLang(l, { ru: `${n} ${ruPl(n, 'урок', 'урока', 'уроков')}!`, en: `${n} lessons!`, es: `¡${n} lecciones!`, 'pt-BR': `${n} lições!`",
      "    es: `Tu mejor racha: ${n} días`, 'pt-BR': `Sua melhor sequência: ${n} dias`, vi: `Chuỗi dài nhất của bạn: ${n} ngày`,",
      "    en: `${n} ${en(n, 'word is', 'words are')} about to slip away`, es: `${n} palabras están a punto de escaparse`, 'pt-BR': `${n} palavras estão quase fugindo da memória`,",
      // настоящая ошибка рядом со служебным ключом на той же строке
      'ru: `${n} дней подряд`, reason: `streak=${n} days=${d}`,',
      'ru: `Осталось ${n} дней`,',
      '<Text>{count} карточек</Text>',
    ])).toEqual([true, true, true, true, true, true, true, true]);
    expect(matcher([
      "    ? `цена=${String(intro.price)} период=${String(intro.periodNumberOfUnits ?? '')}${String(intro.periodUnit ?? '')}/${String(intro.period ?? '')} дней=${parsePhaseDays(intro) ?? '—'}`",
      "  return decide('continue', `default hasProgress=${String(input.hasProgress)} hour=${input.hour} energy=${String(input.energy)}`);",
      "  if (doneCount === 0) return make('morning', `doneCount=0/${total} hour=${input.hour} dayCounted=${String(input.dayCounted)}`);",
      "  usePeakPerfProbe('step', `floor=${ctx.floor} step=${ctx.stepInFloor + 1} task=${counter}`);",
      '  if (!pick.ghost) return `нет призрака: причина=${pick.reason} ступень=${stepNumber}`;',
      '  return `друг #${g.ordinal} steps=${g.steps} avgMs=${g.avgMs} ступень=${stepNumber}`;',
      "  if (contestReview) return <SafeAreaView style={{ flex: 1 }}><CommunityPackCheckScene lang={lang} cards={rows.map(row => row.id)} /></SafeAreaView>;",
    ])).toEqual([false, false, false, false, false, false, false]);
  });

  it('значения констант, от которых зависят разрешённые исключения, не менялись (форма слова в тексте рассчитана на них)', () => {
    const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
    expect(read('app/community_packs/schema.ts')).toMatch(/COMMUNITY_PACK_CARD_COUNT_MIN = 10;/);
    expect(read('app/community_packs/schema.ts')).toMatch(/COMMUNITY_PACK_CARD_COUNT_MAX = 50;/);
    expect(read('app/revenue_daily_limits.ts')).toMatch(/speaking_attempts: 3,/);
    expect(read('app/revenue_daily_limits.ts')).toMatch(/ai_dialog_replies: 30,/);
    expect(read('app/paywall_context_texts.ts')).toMatch(/courseLessonsAfterFree: 29,/);
  });

  it('каждое исключение в allowlist имеет причину и существующий файл', () => {
    const allow = JSON.parse(read('config/number-noun-allowlist.json')) as { entries: Array<{ file: string; contains: string; reason: string }> };
    for (const entry of allow.entries) {
      expect(entry.reason.length).toBeGreaterThan(10);
      expect(fs.existsSync(path.join(ROOT, entry.file))).toBe(true);
      expect(read(entry.file)).toContain(entry.contains);
    }
    function read(rel: string) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
  });
});
