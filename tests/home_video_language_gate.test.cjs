// зачем ([HOME-VIDEO-LANG] 18.10, координатор; находка Макетов: испанский интерфейс видит русские ролики): условие «лента только для интерфейсов, на языке которых есть ролики» подготовлено и ВЫКЛЮЧЕНО;
// пока флаг выключен Главная ведёт себя как раньше; включённое условие скрывает ленту с кириллическими названиями для интерфейсов не на кириллице.
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { test, beforeEach } = require('node:test');

const lines = [];
function load({ diag = true } = {}) {
  const module = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync('app/home_video_language_gate.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } }).outputText;
  vm.runInNewContext(js, {
    module, exports: module.exports,
    require: (id) => { if (id === './dev_diag_gate') return { DIAG_ENABLED: diag }; throw Error(`Unmocked ${id}`); },
    console: { log: (...a) => lines.push(a.join(' ')), warn: () => {} }, JSON, Math,
  });
  return module.exports;
}
const gate = load();
beforeEach(() => { lines.length = 0; gate.resetHomeVideoLangLogForTests(); });

const ru = [{ title: 'Английский: твоя или моя?' }, { title: 'Думай на английском' }];
const latin = [{ title: 'Present Simple in 5 minutes' }, { title: 'How to say hello' }];

test('флаг по умолчанию выключен — решение никогда не скрывает ленту', () => {
  assert.equal(gate.HOME_VIDEO_RAIL_LANG_FILTER_ENABLED, false);
  for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
    const d = gate.decideHomeVideoRailByInterfaceLang({ lang, videos: ru });
    assert.equal(d.hidden, false, lang);
    assert.equal(d.reason, 'filter_disabled');
  }
});

test('условие включено: кириллические ролики скрыты для интерфейсов не на кириллице', () => {
  for (const lang of ['es', 'en', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
    const d = gate.decideHomeVideoRailByInterfaceLang({ lang, videos: ru, enabled: true });
    assert.deepEqual([d.hidden, d.reason, d.total, d.cyrillicTitles, d.cyrillicShare], [true, 'cyrillic_titles_for_latin_interface', 2, 2, 1], lang);
  }
});

test('условие включено: ru/uk не скрываются; латинские названия не скрываются; пустая лента не скрывается; смесь по доле 50 %', () => {
  for (const lang of ['ru', 'uk']) assert.equal(gate.decideHomeVideoRailByInterfaceLang({ lang, videos: ru, enabled: true }).reason, 'cyrillic_interface');
  assert.equal(gate.decideHomeVideoRailByInterfaceLang({ lang: 'es', videos: latin, enabled: true }).reason, 'titles_not_cyrillic');
  assert.equal(gate.decideHomeVideoRailByInterfaceLang({ lang: 'es', videos: [], enabled: true }).reason, 'no_videos');
  const mixed = [...ru.slice(0, 1), ...latin.slice(0, 1)];
  assert.equal(gate.decideHomeVideoRailByInterfaceLang({ lang: 'es', videos: mixed, enabled: true }).hidden, true, '1 из 2 = 50 % — порог включительно');
  const mostlyLatin = [...ru.slice(0, 1), ...latin];
  assert.equal(gate.decideHomeVideoRailByInterfaceLang({ lang: 'es', videos: mostlyLatin, enabled: true }).hidden, false);
  assert.equal(gate.countCyrillicTitles([{ title: '123 ···' }, { title: 'Привет' }]).total, 1, 'названия без букв не считаются');
});

test('журнал [HOME-VIDEO-LANG]: одна строка на смену состояния, в сторе молчит', () => {
  const entry = { lang: 'es', studyTarget: 'en', shown: true, shownReason: 'shown', catalogRail: false, noChannel: false, videoStatus: 'ready', channelNote: 'lingman_rss_ru_channel', decision: gate.decideHomeVideoRailByInterfaceLang({ lang: 'es', videos: ru }) };
  gate.logHomeVideoLang(entry);
  gate.logHomeVideoLang(entry);
  assert.equal(lines.length, 1);
  assert.ok(lines[0].startsWith('[HOME-VIDEO-LANG] '));
  const parsed = JSON.parse(lines[0].slice('[HOME-VIDEO-LANG] '.length));
  assert.deepEqual([parsed.lang, parsed.studyTarget, parsed.shownReason, parsed.decision.cyrillicShare], ['es', 'en', 'shown', 1]);
  const off = load({ diag: false });
  lines.length = 0;
  off.logHomeVideoLang(entry);
  assert.deepEqual(lines, []);
});

test('Главная подключает условие, но при выключенном флаге оно ничего не прячет', () => {
  const home = fs.readFileSync('app/(tabs)/home.tsx', 'utf8').replace(/\r\n/g, '\n');
  assert.ok(home.includes('isVideoButtonEnabled() && homeVideosVisible && !homeV2VideoNoChannel && !homeVideoLang.hidden ? ('));
  assert.ok(home.includes('const homeVideoLang = useMemo(() => decideHomeVideoRailByInterfaceLang({ lang, videos: homeV2Videos }), [lang, homeV2Videos]);'));
  const src = fs.readFileSync('app/home_video_language_gate.ts', 'utf8');
  assert.ok(src.includes('export const HOME_VIDEO_RAIL_LANG_FILTER_ENABLED = false;'), 'флаг выключен до решения владельца');
});
