// ЗАМОК ВЛАДЕЛЬЦА 25.10: голос PhraseMan (docs/work/VOICE.md) — «Да, так и делать везде». Владелец про тексты вида
// «Новая стадия огня — до 30 дней», «Пусть серия переживёт и занятой день»: «КАКОГО ХУЯ ПО ПРИЛОЖЕНИЮ КУЧА ТАКИХ ТЕКСТОВ».
// Сторож ищет запрещённые обороты в СТРОКОВЫХ ЛИТЕРАЛАХ (комментарии не в счёт) на 9 языках интерфейса.
// PENDING — файлы чужих зон, где обороты ещё стоят: число может только уменьшаться (храповик); новый файл с оборотом — красный.
// Ослабить (добавить оборот в разрешённые) — только новым словом владельца.
// Запуск: node --test tests/owner_locks_voice_forbidden_phrases_2026_10_25.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIRS = ['app', 'components', 'constants', 'hooks', 'functions/src'];

// Каждый оборот — с объяснением, почему он чушь (VOICE.md, правило 2–4).
const FORBIDDEN = [
  [/стади[яиюей] огня|стаді[яїю] вогню|flame stage|etapa de la llama/i, 'выдуманный термин «стадия огня»'],
  [/серия переживёт|серию переживёт|серія переживе|streak survive/i, 'метафора «серия переживёт»'],
  [/огонь снова загорится|огонь не погаснет|вогонь знову спалахне|the flame is back|la llama vuelve|a chama volta|ngọn lửa trở lại|apinya menyala lagi|alev geri gelir|płomień wraca/i, 'метафора «огонь загорится/не погаснет»'],
  [/кольца замкнуты|кільця замкнено|All rings closed|anillos cerrados|anéis fechados|Đã đóng mọi vòng|cincin tertutup|halkalar kapandı|kółka zamknięte/i, 'метафора «кольца замкнуты»'],
  [/[Цц]епочк[аиу] \$\{|[Цц]епочка:|Стрік \$\{|Стрік:/, '«цепочка/стрік» вместо «серия»'],
  [/Поздравляем с Плюс|Твой Плюс|Вітаємо з Плюс|Твій Плюс/, '«Плюс» вместо «Plus»'],
  [/Доступ подтверждён|Доступ підтверджено|Условия сохранены|Access confirmed|Acceso confirmado|Acesso confirmado|Đã xác nhận quyền truy cập|Akses dikonfirmasi|Erişim onaylandı|Dostęp potwierdzony/, 'механика «доступ подтверждён / условия сохранены»'],
  [/Одна сессия сегодня/, '«сессия» — кухня'],
  [/[Rr]untunan/, 'id: серия = «rangkaian» (глоссарий)'],
];

// Чужие зоны, где обороты ещё стоят (храповик: только вниз). Владельцы — в docs/work/copy-sweep-2026-10-25.md.
const PENDING = {
  'components/paywall/m/paywall_m_copy.generated.ts': 4, // 2 · ДИЗАЙН — пейвол М: «серия переживёт» ru+en в двух ключах
  'functions/src/friends_push_copy.ts': 1, // 1 · ЯДРО — пуш друзей «огонь не погаснет»
  'functions/src/re_engage_push.ts': 1, // 1 · ЯДРО — пуш «Одна сессия сегодня»
};

function literalsOf(src) {
  // журналы (console.*) и строки с пометкой «guard-ok: log-only» человек не видит — не проверяем
  const code = src.split('\n').filter((l) => !/console\.(log|warn|error|info)\(|guard-ok: log-only/.test(l)).join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\s\/\/ .*$/gm, '');
  return [...code.matchAll(/(['"`])((?:\\.|(?!\1)[^\\\n])*)\1/g)].map((m) => m[2]);
}

function scan() {
  const hits = {};
  const walk = (rel) => {
    for (const e of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
      const r = `${rel}/${e.name}`;
      if (e.isDirectory()) { if (!/node_modules|__tests__/.test(r)) walk(r); continue; }
      if (!/\.(ts|tsx)$/.test(e.name) || /\.test\.|\.probe\./.test(e.name)) continue;
      for (const lit of literalsOf(fs.readFileSync(path.join(ROOT, r), 'utf8'))) {
        for (const [re, why] of FORBIDDEN) if (re.test(lit)) (hits[r] ||= []).push(`${why}: «${lit.slice(0, 60)}»`);
      }
    }
  };
  for (const d of DIRS) if (fs.existsSync(path.join(ROOT, d))) walk(d);
  return hits;
}

test('голос PhraseMan: запрещённых оборотов нет нигде, кроме известных чужих хвостов', () => {
  const hits = scan();
  const fresh = Object.entries(hits).filter(([f]) => !(f in PENDING));
  assert.deepEqual(fresh, [], 'новый запрещённый оборот — перепиши по docs/work/VOICE.md');
});

test('храповик: в известных хвостах оборотов не больше, чем было', () => {
  const hits = scan();
  for (const [f, max] of Object.entries(PENDING)) {
    const n = (hits[f] ?? []).length;
    assert.ok(n <= max, `${f}: ${n} > ${max} — оборотов стало больше`);
  }
});
