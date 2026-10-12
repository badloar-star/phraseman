// зачем (Сверка chain7, rescan_verdicts_2026-10-12; координатор 12.10): Диалоги — плашка «Свободный разговор» окрашена акцентом темы (образец dialogs.html `.fr`),
// ссылки dialogs-017/018/036 доводят до своих окон (testID открывающих элементов; «Выйти из диалога?» — только после первой реплики), выход пишет ветку в журнал.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('«Свободный разговор»: акцент темы на плашке и плитке', () => {
  const tools = read('components/dialogs/DialogueV2PlusTools.tsx');

  it('перелив 135° от 14% акцента к нулю на 70%: цвет — токен accentText с альфой, не hex; слой не ловит нажатия', () => {
    const start = tools.indexOf('testID="dialogue-v2-freeform-tint"');
    expect(start).toBeGreaterThan(-1);
    const block = tools.slice(tools.lastIndexOf('<LinearGradient', start), tools.indexOf('/>', start));
    expect(block).toContain('pointerEvents="none"');
    expect(block).toContain('colors={[glassTone(g.accentText, 0.14), glassTone(g.accentText, 0)]}');
    expect(block).toContain('locations={[0, 0.7]}');
    expect(block).toContain('end={{ x: 1, y: 1 }}');
    expect(block).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
  });

  it('градиент лежит над заливкой плиты и под содержимым ряда', () => {
    expect(tools.indexOf('<PlateFill g={g} radius={V2.radius.row} raised />')).toBeLessThan(tools.indexOf('dialogue-v2-freeform-tint'));
    expect(tools.indexOf('dialogue-v2-freeform-tint')).toBeLessThan(tools.indexOf('dialogue-v2-freeform-tile'));
  });

  it('плитка значка — 22% акцента темы (образец `.fr .fi`), значок, PLUS и замок остаются цветом темы', () => {
    expect(tools).toContain('testID="dialogue-v2-freeform-tile"');
    expect(tools).toContain('backgroundColor: glassTone(g.accentText, 0.22)');
    expect(tools).toContain('backgroundColor: g.accent, justifyContent');
    expect(tools).toContain('color={g.accentText}');
  });
});

describe('DEV_LINKS_R1: шаги dialogs-017/018/036 ведут к реальным элементам', () => {
  const doc = read('docs/phraseman-2.0/DEV_LINKS_R1.md');
  const session = read('components/dialogs/DialogueV2SessionScreen.tsx');
  const parts = read('components/dialogs/glass/DialogueGlassSessionParts.tsx');
  const rowOf = (id: string) => doc.split('\n').find((l) => l.startsWith(`| ${id} |`)) ?? '';

  it('«Подсказка» открывается кнопкой в карточке цели (`-goal-hint`), а не testID самого окна', () => {
    expect(rowOf('dialogs-017')).toContain('tap:#dialogue-v2-session-goal-hint');
    // подсказку приносит ответ собеседника — сперва первая реплика, затем клавиатура прячется, и только потом тап по кнопке подсказки
    expect(rowOf('dialogs-017')).toContain('type:Hello; tap:#dialogue-v2-session-send; wait:2500; hidekb; tap:#dialogue-v2-session-goal-hint');
    expect(rowOf('dialogs-017')).not.toContain('tap:#dialogue-v2-session-hint');
    expect(session).toContain('testID="dialogue-v2-session-goal"');
    expect(parts).toContain('testID={testID ? `${testID}-hint` : undefined}');
  });

  it('«Задания» открываются тапом по карточке цели (`-goal`), а не testID самой шторки', () => {
    expect(rowOf('dialogs-018')).toContain('tap:#dialogue-v2-session-goal; wait:500`');
    expect(rowOf('dialogs-018')).not.toContain('tap:#dialogue-v2-session-goals');
  });

  it('«Выйти из диалога?» — только после первой реплики: ссылка сперва отправляет сообщение, прячет клавиатуру и жмёт «назад»', () => {
    const row = rowOf('dialogs-036');
    expect(row).toContain('tap:#dialogue-v2-session-input; type:Hello; tap:#dialogue-v2-session-send; wait:2500; hidekb; back');
    expect(session).toContain("if (hasConversation && bottom !== 'summary') setExitOpen(true);");
  });

  it('выход из диалога пишет в журнал ветку и значения, которые её решили', () => {
    expect(session).toContain('[DLG-EXIT] back:request hasConversation=');
    expect(session).toContain('[DLG-EXIT] backhandler:disarmed hasConversation=');
    expect(session).toContain('[DLG-EXIT] backhandler:armed messages=');
    expect(session).toContain('[DLG-EXIT] backhandler:press → exit_sheet');
  });
});

describe('dialogs-005: «Свободный разговор» скрыт под языковым гейтом', () => {
  const container = read('components/dialogs/DialogueV2CatalogueContainer.tsx');

  it('обе ветки гейта (dev-удержание и язык без диалогов) идут через gateHub: остаток + карточка гейта, без плашки разговора; причина — в журнал', () => {
    expect(container).toContain("return gateHub('dev_hold');");
    expect(container).toContain("return gateHub(supportedTarget(studyTarget) ? 'zero_items' : 'unsupported_target');");
    const start = container.indexOf('const gateHub = ');
    const body = container.slice(start, container.indexOf('};', start));
    expect(body).toContain('{quotaRow}');
    expect(body).toContain('{languageGate}');
    expect(body).not.toContain('plusTools');
    expect(body).not.toContain('DialogueV2PlusTools');
    expect(body).toContain('[DIALOGUE-V2] hub:freeform_hidden reason=language_gate source=${reason}');
  });

  it('обычные ветки (скелет, нет проекции, каталог) по-прежнему показывают плашку', () => {
    expect(container.match(/\{plusTools\}/g)?.length).toBeGreaterThanOrEqual(3);
  });
});

describe('генератор DEV_LINKS_R1: исправления живут в данных, а не только в документе', () => {
  const gen = read('scripts/dev_links_r1_generate.py');
  const steps = read('scripts/dev_links_r1_steps_p83.py');

  it('модуль шагов подключён последним и заменяет прежние записи тех же id', () => {
    expect(gen).toContain('import dev_links_r1_steps_p83');
    expect(gen.indexOf('import dev_links_r1_steps_p83')).toBeGreaterThan(gen.indexOf('import dev_links_r1_steps_chain7'));
    expect(steps).toContain('ENTRIES.pop(rid, None)');
    for (const id of ['dialogs-005', 'dialogs-017', 'dialogs-018', 'dialogs-036', 'cards-027', 'cards-030', 'cards-080']) expect(steps).toContain(`'${id}'`);
  });

  it('cards-027 несёт cardslangs=on, cards-080 — videopacks=empty, cards-030 ждёт тихие повторы', () => {
    const doc = read('docs/phraseman-2.0/DEV_LINKS_R1.md');
    const rowOf = (id: string) => doc.split('\n').find((l) => l.startsWith(`| ${id} |`)) ?? '';
    expect(rowOf('cards-027')).toContain('cardslangs=on');
    expect(rowOf('cards-027')).toContain('tap:#fc-training-setup-language-chip');
    expect(rowOf('cards-080')).toContain('videopacks=empty');
    expect(rowOf('cards-030')).toContain('`wait:14000`');
  });
});

// зачем (R1 dialogs-005, Макеты 12.10): у маленькой кнопки со стрелкой («К урокам →» в карточке языкового гейта) ширина — по тексту, абсолютная стрелка (right: 22) наезжала на последнюю букву.
describe('кнопка DialogueGlassCta: стрелка маленькой не накладывается на текст', () => {
  const kit = read('components/dialogs/glass/DialogueGlassKit.tsx');
  it('у size="small" стрелка — обычный элемент строки (после текста, через gap), абсолютная только у полной 52/26', () => {
    expect(kit).toContain('style={small ? undefined : styles.ctaArrow}');
    expect(kit).toContain('name="arrow-forward" size={small ? 18 : 20}');
    expect(kit).toContain("ctaArrow: { position: 'absolute', right: 22, top: 0, bottom: 0, justifyContent: 'center' }");
  });
});
