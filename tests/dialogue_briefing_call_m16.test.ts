// зачем (владелец 11.11: «экран "звонит" лишний — объедини его с экраном брифинга»): отдельного экрана «Входящий звонок» больше нет.
// Звонок — шапка брифинга («Входящий · диалог A1», кольца, «{Имя} звонит», название сцены), «Ответить» — та же кнопка старта диалога.
// У закрытой по рангу сцены звонка нет; звонок ничего не тратит — энергия по-прежнему только на старте диалога.
import fs from 'node:fs';
import path from 'node:path';

import { briefingCallText, buildBriefingCall } from '../components/dialogs/dialogue_briefing_call_copy';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('m16 · звонок в шапке брифинга: слова', () => {
  it('«Входящий · диалог A1», «Mia звонит», «Ответить»', () => {
    // зачем (переводчик 18.10): уровень привязан к слову неразрывным пробелом — «A1» не уезжает на другую строку
    expect(buildBriefingCall('ru', 'A1', 'Mia')).toEqual({ kicker: 'Входящий · диалог A1', title: 'Mia звонит', answer: 'Ответить' });
  });
  it('без имени (пусто, пробелы, нет собеседника) — «Собеседник звонит»', () => {
    expect(buildBriefingCall('ru', 'A2', null).title).toBe('Собеседник звонит');
    expect(buildBriefingCall('ru', 'A2', undefined).title).toBe('Собеседник звонит');
    expect(buildBriefingCall('ru', 'A2', '   ').title).toBe('Собеседник звонит');
    expect(buildBriefingCall('ru', 'A2', '  Mia ').title).toBe('Mia звонит');
  });
  it('кнопки «Потом» больше нет — её роль у обычной кнопки «назад»', () => {
    expect(Object.keys(briefingCallText('ru')).sort()).toEqual(['answer', 'calling', 'incoming', 'partner']);
  });
});

describe('m16 · объединение с брифингом', () => {
  const route = read('app/dialogue_v2_briefing.tsx');
  const briefing = read('components/dialogs/DialogueV2BriefingScreen.tsx');
  const callParts = read('components/dialogs/DialogueBriefingCall.tsx');

  it('отдельного экрана звонка нет: файл удалён, маршрут не держит слой поверх брифинга', () => {
    expect(fs.existsSync(path.join(root, 'components/dialogs/DialogueIncomingCall.tsx'))).toBe(false);
    expect(route).not.toContain('DialogueIncomingCall');
    expect(route).not.toMatch(/callOpen|setRevealRows|onAnswer|onLater/);
  });
  it('звонок только у открытой сцены и только слова — энергия не трогается', () => {
    expect(route).toContain('const call = model.unlocked ? buildBriefingCall(lang, model.cefr, model.participants[0]?.displayName) : null;');
    expect(route).toContain('call={call}');
    expect(read('components/dialogs/dialogue_briefing_call_copy.ts')).not.toMatch(/confirmSpendOne|EnergyContext/);
    expect(callParts).not.toMatch(/confirmSpendOne|EnergyContext/);
    // экран сам не рисует звонок у закрытой по рангу сцены, даже если слова переданы
    expect(briefing).toContain('const call = unlocked ? callProp : null;');
  });
  it('шапка: строка «Входящий», кольца вокруг плитки, «{Имя} звонит» заголовком, под ним название сцены', () => {
    const kicker = briefing.indexOf('{call.kicker}');
    const rings = briefing.indexOf('<BriefingCallRings glass={glass} />');
    const title = briefing.indexOf('{call.title}');
    expect(kicker).toBeGreaterThan(0);
    expect(rings).toBeGreaterThan(kicker);
    expect(title).toBeGreaterThan(rings);
    expect(briefing).toMatch(/testID="dialogue-v2-briefing-call-title" accessibilityRole="header"/);
  });
  it('«Ответить» — та же кнопка старта: трубка вместо стрелки, тот же onStart; задания всплывают по очереди сразу при открытии', () => {
    expect(briefing).toContain('const startLabel = call ? call.answer : unlocked ? labels.start : labels.locked(rankRequired);');
    expect(briefing).toContain("icon={call ? 'call' : unlocked ? undefined : 'lock-closed'}");
    expect(briefing).toContain('trailingArrow={unlocked && !call}');
    expect(briefing).toContain('onPress={onStart}');
    expect(briefing).toContain('<BriefingRevealRow key={objective.id} index={index} active={call != null}>');
  });
  it('кольца — бесконечный цикл только при фокусе и активном приложении; при «уменьшить движение» их нет', () => {
    expect(callParts).toContain('const loopsOn = runtimeActive && !reduced;');
    expect(callParts).toContain('if (reduced) return null;');
    expect(callParts).toContain('if (!run) { cancelAnimation(t); t.value = 0; return undefined; }');
  });
});
