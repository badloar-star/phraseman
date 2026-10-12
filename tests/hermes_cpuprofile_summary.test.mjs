// зачем (координатор 12.10, Главная: пауза JS-потока 2792 мс): разбор профиля Hermes должен находить длинные занятые участки и называть файлы/функции.
import assert from 'node:assert/strict';
import test from 'node:test';
import { findBusyRuns, formatSummary, sampleTimes, shortUrl, summarizeProfile } from '../scripts/lib/cpuprofile_summary.mjs';

const node = (id, functionName, url = '', lineNumber = 0) => ({ id, callFrame: { functionName, url, lineNumber } });

// 1 мс на сэмпл: 100 мс простоя, 3000 мс «модуль lessons», 50 мс простоя, 30 мс короткий всплеск (ниже порога), 500 мс простоя
function syntheticProfile() {
  const nodes = [
    node(1, '(root)'),
    node(2, '(idle)'),
    node(3, 'evalModule', 'http://localhost:8081/app/(tabs)/lessons.tsx?platform=android&dev=true', 41),
    node(4, 'materializeCatalog', 'http://localhost:8081/modules/learning-v2/catalog.ts?platform=android', 9),
    node(5, 'tinyWork', 'http://localhost:8081/app/tiny.ts', 2),
  ];
  const samples = [];
  const push = (id, count) => { for (let i = 0; i < count; i += 1) samples.push(id); };
  push(2, 100);
  push(3, 2000);
  push(4, 1000);
  push(2, 50);
  push(5, 30);
  push(2, 500);
  return { nodes, startTime: 0, endTime: samples.length * 1000, samples, timeDeltas: samples.map(() => 1000) };
}

test('shortUrl: без запроса Metro; node_modules — от имени пакета; иначе три последних сегмента', () => {
  assert.equal(shortUrl('http://localhost:8081/app/(tabs)/lessons.tsx?platform=android'), 'app/(tabs)/lessons.tsx');
  assert.equal(shortUrl('http://h/node_modules/react-native/Libraries/x.js?a=1'), 'node_modules/react-native/Libraries/x.js');
  assert.equal(shortUrl(''), '(native)');
});

test('sampleTimes: накопленные метки в мкс', () => {
  assert.deepEqual(sampleTimes({ samples: [1, 1, 1], timeDeltas: [5, 10, 20] }), [5, 15, 35]);
});

test('findBusyRuns: находит длинный участок 3000 мс с началом +100, короткий всплеск 30 мс отбрасывается порогом', () => {
  const runs = findBusyRuns(syntheticProfile(), { minMs: 400 });
  assert.equal(runs.length, 1);
  assert.equal(runs[0].startMs, 100);
  assert.ok(Math.abs(runs[0].durationMs - 3000) <= 2, `ожидали ≈3000, получили ${runs[0].durationMs}`);
  assert.match(runs[0].topFunctions[0].label, /^evalModule @ app\/\(tabs\)\/lessons\.tsx:42$/);
  assert.equal(runs[0].topFunctions[0].ms, 2000);
  assert.match(runs[0].topFiles[1].label, /catalog\.ts$/);
});

test('findBusyRuns: щель короче порога склеивает участки в один', () => {
  const profile = syntheticProfile();
  const runs = findBusyRuns(profile, { minMs: 10, gapMs: 60 });
  // 3000 мс + щель 50 мс + 30 мс всплеск склеиваются в один участок
  assert.equal(runs.length, 1);
  assert.ok(runs[0].durationMs >= 3070);
});

test('summarizeProfile / formatSummary: занят vs всего, топ файлов, строки [CPU-PROFILE]', () => {
  const summary = summarizeProfile(syntheticProfile(), { minMs: 400 });
  assert.equal(summary.totalMs, 3680);
  assert.equal(summary.busyMs, 3030);
  const text = formatSummary(summary);
  assert.match(text, /\[CPU-PROFILE\] всего 3680 мс, занят 3030 мс/);
  assert.match(text, /непрерывные занятые участки JS-потока/);
  assert.match(text, /evalModule @ app\/\(tabs\)\/lessons\.tsx:42/);
});

test('интервал «от эпохи» (≈3·10^10 мкс, в реальных профилях Сверки — второй по счёту) отбрасывается: длительность профиля не раздувается', () => {
  const profile = syntheticProfile();
  profile.timeDeltas[0] = 0;
  profile.timeDeltas[1] = 30_839_113_838; // как в профилях Hermes через CDP у Сверки: [0, 30839113838, 17954, …]
  const summary = summarizeProfile(profile, { minMs: 400 });
  assert.ok(summary.totalMs < 4000, `ожидали ≈3,7 с, получили ${summary.totalMs} мс`);
  const runs = findBusyRuns(profile, { minMs: 400 });
  assert.equal(runs.length, 1);
  assert.ok(runs[0].startMs >= 98 && runs[0].startMs <= 101, `начало участка ${runs[0].startMs}`);
  assert.ok(Math.abs(runs[0].durationMs - 3000) <= 2);
  assert.equal(sampleTimes(profile)[0], 0);
});

test('нет (idle)-сэмплов — в выводе предупреждение, что «занят» завышен', () => {
  const profile = { nodes: [{ id: 1, callFrame: { functionName: 'work', url: 'http://h/a.js', lineNumber: 0 } }], startTime: 0, endTime: 5000, samples: [1, 1, 1, 1, 1], timeDeltas: [1000, 1000, 1000, 1000, 1000] };
  assert.match(formatSummary(summarizeProfile(profile)), /нет \(idle\)-сэмплов/);
  assert.doesNotMatch(formatSummary(summarizeProfile(syntheticProfile())), /нет \(idle\)-сэмплов/);
});
