'use strict';
/**
 * metro_console_tee.cjs — зеркалит вывод Metro/Expo CLI в файл, не трогая консоль.
 *
 * зачем: 2026-08-17 владелец попросил «проверь логи» после ошибки входа через
 * Apple на телефоне, а вывод Metro (включая WARN/ERROR, которые телефон шлёт в
 * терминал) жил только в окне сторожа metro-phone.ps1 и погиб вместе с окном.
 * Пайп через Tee-Object не годится: Expo CLI теряет TTY → пропадают клавиши,
 * цвета и живой прогресс. Поэтому файл пишется ИЗНУТРИ процесса: этот модуль
 * подключается через NODE_OPTIONS=--require и перехватывает stdout/stderr.
 *
 * Куда: METRO_CONSOLE_LOG (задаёт metro-phone.ps1), по умолчанию
 * .expo/metro-console.log. Формат: [ЧЧ:ММ:СС] строка без ANSI-кодов.
 * Прогресс-бары Metro перерисовывают строку через \r — такие промежуточные
 * кадры отбрасываем, оставляем только законченные строки.
 *
 * NODE_OPTIONS наследуют дочерние node-процессы (jest-worker трансформеры) —
 * они тоже подключат модуль; пишут они редко, файл общий, режим append.
 */
const fs = require('fs');
const path = require('path');
const { stripVTControlCharacters } = require('util');

const target = process.env.METRO_CONSOLE_LOG;
if (target) {
  let fd = null;
  try {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fd = fs.openSync(target, 'a');
  } catch {
    fd = null;
  }

  if (fd !== null) {
    const MAX_LINE = 4000;
    let carry = '';

    const stamp = () => {
      const d = new Date();
      const p = (n) => String(n).padStart(2, '0');
      return `[${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}]`;
    };

    const flushChunk = (chunk) => {
      let text = typeof chunk === 'string' ? chunk : Buffer.isBuffer(chunk) ? chunk.toString('utf8') : '';
      if (!text) return;
      text = carry + text;
      const parts = text.split('\n');
      carry = parts.pop() ?? '';
      const out = [];
      for (const raw of parts) {
        // \r без \n — перерисовка прогресса; берём только последний кадр строки.
        const lastFrame = raw.includes('\r') ? raw.slice(raw.lastIndexOf('\r') + 1) : raw;
        const clean = stripVTControlCharacters(lastFrame).replace(/\s+$/, '');
        if (!clean.trim()) continue;
        out.push(`${stamp()} ${clean.slice(0, MAX_LINE)}`);
      }
      if (out.length) {
        try { fs.writeSync(fd, out.join('\n') + '\n'); } catch { /* лог не должен ронять Metro */ }
      }
    };

    const wrap = (stream) => {
      const original = stream.write.bind(stream);
      stream.write = function (chunk, encoding, cb) {
        try { flushChunk(chunk); } catch { /* ignore */ }
        return original(chunk, encoding, cb);
      };
    };
    wrap(process.stdout);
    wrap(process.stderr);

    process.on('exit', () => {
      try {
        if (carry.trim()) fs.writeSync(fd, `${stamp()} ${stripVTControlCharacters(carry)}\n`);
        fs.writeSync(fd, `${stamp()} --- процесс ${process.pid} завершён (${path.basename(process.argv[1] || 'node')}) ---\n`);
        fs.closeSync(fd);
      } catch { /* ignore */ }
    });
  }
}
