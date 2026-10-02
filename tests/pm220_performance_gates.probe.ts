import fs from 'node:fs';

// зачем: PM-220 «регрессионные performance gates». Владелец: «так чтобы все летало». Проба держит
// матрицу config/performance-gates.json честной:
//  A2 — покрыты ВСЕ пять сценариев (старт, возврат, навигация, скролл, тренировка), у каждого
//       есть реально существующие исходниковые сторожа и метрика замера (а не «средний FPS»);
//  A1 — числовой порог допустим ТОЛЬКО при наличии baseline устройств: пока файла
//       config/perf-device-baseline.json нет, любой threshold обязан быть null (неизвестное — не
//       число и не 0). Когда baseline появится, проба требует ≥2 устройства (слабый Android +
//       iPhone), release-сборку, ≥5 запусков и p50/p95 на каждую метрику, а порог — не строже
//       p95 baseline (иначе ворота падали бы на исправном телефоне).
// Сработала проба — НЕ вписывай число «от балды»: измерь на слабом телефоне и положи baseline.
const read = (p: string) => fs.readFileSync(p, 'utf8');
const problems: string[] = [];
const need = (ok: boolean, msg: string) => { if (!ok) problems.push(msg); };

type Metric = { id: string; unit: string; threshold: number | null };
type Scenario = { title: string; staticGuards: string[]; metrics: Metric[] };
const gates = JSON.parse(read('config/performance-gates.json')) as {
  baselineFile: string;
  deviceRequirements: { minDevices: number; mustInclude: string[]; minRunsPerMetric: number; statistics: string[]; forbiddenAsSoleEvidence: string[] };
  scenarios: Record<string, Scenario>;
};

const REQUIRED = ['start', 'resume', 'navigation', 'scroll', 'training'];
for (const name of REQUIRED) need(name in gates.scenarios, `нет сценария ${name}`);
need(JSON.stringify(Object.keys(gates.scenarios).sort()) === JSON.stringify([...REQUIRED].sort()), 'набор сценариев изменён: обновите пробу и RUNTIME.md осознанно');

let guards = 0;
let metrics = 0;
for (const [name, sc] of Object.entries(gates.scenarios)) {
  need(sc.staticGuards.length >= 2, `${name}: меньше двух исходниковых сторожей`);
  need(sc.metrics.length >= 2, `${name}: меньше двух метрик замера`);
  for (const g of sc.staticGuards) {
    guards += 1;
    need(fs.existsSync(g), `${name}: сторож ${g} не существует`);
  }
  for (const m of sc.metrics) {
    metrics += 1;
    need(/^[a-z0-9_]+$/.test(m.id), `${name}: плохой id метрики ${m.id}`);
    need(!/average_fps|avg_fps/.test(m.id), `${name}: «средний FPS» не метрика ворот (${m.id})`);
  }
}
need(gates.deviceRequirements.forbiddenAsSoleEvidence.includes('average_fps'), 'пропал запрет «средний FPS как единственное доказательство»');
need(gates.deviceRequirements.mustInclude.includes('low_end_android'), 'baseline обязан включать слабый Android');

const baselineExists = fs.existsSync(gates.baselineFile);
if (!baselineExists) {
  for (const [name, sc] of Object.entries(gates.scenarios)) {
    for (const m of sc.metrics) need(m.threshold === null, `${name}.${m.id}: порог ${m.threshold} без baseline устройств — должен быть null`);
  }
} else {
  type Run = { p50: number; p95: number; runs: number };
  const base = JSON.parse(read(gates.baselineFile)) as {
    build: string;
    devices: { id: string; kind: string; metrics: Record<string, Run> }[];
  };
  need(base.build === 'release', 'baseline снят не на release-сборке');
  need(base.devices.length >= gates.deviceRequirements.minDevices, 'в baseline меньше устройств, чем требуется');
  for (const kind of gates.deviceRequirements.mustInclude) need(base.devices.some((d) => d.kind === kind), `в baseline нет устройства ${kind}`);
  for (const sc of Object.values(gates.scenarios)) {
    for (const m of sc.metrics) {
      const rows = base.devices.map((d) => d.metrics[m.id]).filter(Boolean);
      need(rows.length >= 1, `в baseline нет метрики ${m.id}`);
      for (const r of rows) need(r.runs >= gates.deviceRequirements.minRunsPerMetric && r.p50 > 0 && r.p95 >= r.p50, `baseline ${m.id}: мало запусков или p50/p95 неверны`);
      if (m.threshold !== null) {
        const worstP95 = Math.max(...rows.map((r) => r.p95));
        need(m.threshold >= worstP95, `${m.id}: порог ${m.threshold} строже худшего p95 baseline (${worstP95})`);
      }
    }
  }
}

console.log(`[PM-220] scenarios=${Object.keys(gates.scenarios).length} staticGuards=${guards} metrics=${metrics} baseline=${baselineExists ? 'present' : 'absent(thresholds=null)'}`);
if (problems.length) {
  for (const p of problems) console.log(`  - ${p}`);
  throw new Error(`PM-220: ${problems.length} проблем`);
}
console.log('PM-220 PERFORMANCE GATES MATRIX: PASS');
