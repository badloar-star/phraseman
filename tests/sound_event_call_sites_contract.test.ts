import fs from 'node:fs';
import path from 'node:path';

import { SOUND_EVENTS, type SoundEventId } from '@/modules/audio/sound_events';

/**
 * зачем: у события может БЫТЬ готовый WAV и запись в каталоге, но НЕ быть ни
 * одного экрана, который его просит — звук куплен и не звучит. Такой разрыв
 * глазами не виден (всё компилируется, тесты каталога зелёные), поэтому ловим
 * его автоматически: обходим исходники и ищем реальные места вызова.
 *
 * Тест намеренно смотрит на ТЕКСТ исходников, а не на импорты: звук просят и
 * напрямую через soundDirector.request, и через хуки-обёртки, и через
 * soundEventId в полезной нагрузке тоста — единый способ увидеть все три.
 */

const root = path.resolve(__dirname, '..');
const SCAN_DIRS = ['app', 'components', 'hooks', 'modules'] as const;
/** Каталог описывает события, а не вызывает их — иначе каждое было бы «подключено». */
const CATALOG_FILE = path.join('modules', 'audio', 'sound_events.ts');

/**
 * События без WAV: их незачем требовать от экранов — по плану они остаются
 * типизированными, но молчащими, пока владелец не принесёт звук.
 * Список держим здесь, а не в тесте каталога, чтобы «нет файла» и «нет вызова»
 * не смешивались в один непонятный отказ.
 */
const SILENT_WITHOUT_ASSET: readonly SoundEventId[] = [
  'pm.reward.vip_finale',
  'pm.arena.match_found',
  'pm.arena.countdown_3',
  'pm.arena.countdown_2',
  'pm.arena.countdown_1',
  'pm.arena.round_start',
  'pm.arena.victory',
  'pm.arena.defeat',
  'pm.arena.draw',
];

/**
 * Осознанно отложенные события: файл есть, вызывающего пока нет.
 * ДОБАВЛЯТЬ СЮДА — значит признать, что звук куплен и лежит без дела.
 * Пустой список — это цель, а не случайность.
 */
const KNOWN_UNWIRED: readonly SoundEventId[] = [
  // Единственный вызывающий был GlobalCompassSocialHost.tsx — удалён вместе со
  // всей фичей «Компас» (владелец: удалить и заблокировать навсегда, 2026-08-03).
  'pm.social.friend_request',
];

function collectSourceFiles(dir: string): string[] {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  const out: string[] = [];
  const walk = (current: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const next = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(next);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(entry.name)) continue;
      if (entry.name.endsWith('.d.ts')) continue;
      out.push(next);
    }
  };
  walk(absolute);
  return out;
}

const sourceFiles = SCAN_DIRS.flatMap(collectSourceFiles).filter(
  (file) => path.relative(root, file) !== CATALOG_FILE,
);

const sourceByFile = new Map(
  sourceFiles.map((file) => [path.relative(root, file), fs.readFileSync(file, 'utf8')] as const),
);

function callSitesFor(eventId: SoundEventId): string[] {
  const needle = `'${eventId}'`;
  const out: string[] = [];
  for (const [relative, source] of sourceByFile) {
    if (source.includes(needle)) out.push(relative);
  }
  return out;
}

describe('semantic sound event call sites', () => {
  test('every event with a bundled asset is requested by at least one screen or hook', () => {
    const orphans = (Object.keys(SOUND_EVENTS) as SoundEventId[])
      .filter((id) => SOUND_EVENTS[id].source !== null)
      .filter((id) => !SILENT_WITHOUT_ASSET.includes(id))
      .filter((id) => !KNOWN_UNWIRED.includes(id))
      .filter((id) => callSitesFor(id).length === 0);

    expect(orphans).toEqual([]);
  });

  test('the six previously orphaned events are wired to real surfaces', () => {
    // зачем: закрепляем именно ТЕ события, ради которых заводился этот тест, и
    // место их вызова. Если экран переименуют или вызов потеряют при рефакторе,
    // упадёт этот тест, а не «где-то стало тихо» на устройстве владельца.
    const expected: Record<string, string> = {
      'pm.learn.hint_reveal': path.join('hooks', 'use-hint-reveal-cue.ts'),
      'pm.learn.timer_expired': path.join('hooks', 'use-timer-tick-cue.ts'),
      'pm.system.warning': path.join('components', 'ActionToast.tsx'),
      'pm.system.destructive_done': path.join('components', 'DeleteAccountConfirmModal.tsx'),
      'pm.voice.turn_ready': path.join('hooks', 'use-turn-ready-cue.ts'),
      'pm.voice.no_speech': path.join('hooks', 'use-no-speech-cue.ts'),
    };

    for (const [eventId, file] of Object.entries(expected)) {
      expect(callSitesFor(eventId as SoundEventId)).toContain(file);
    }
  });

  test('cue hooks are consumed by real screens, not left as dead helpers', () => {
    // зачем: хук, который просит звук, но никем не вызван, — тот же немой звук,
    // только на слой глубже. Ровно так pm.learn.timer_warning считался
    // подключённым, пока у use-timer-tick-cue не было ни одного потребителя.
    const cueHooks = [
      'useHintRevealCue',
      'useTimerTickCue',
      'useTurnReadyCue',
      'useNoSpeechCue',
      'useRecordStartCue',
      'useCorrectSound',
    ];

    for (const hook of cueHooks) {
      const consumers = [...sourceByFile]
        .filter(([relative]) => !relative.startsWith(path.join('hooks', '')))
        .filter(([, source]) => source.includes(hook))
        .map(([relative]) => relative);

      expect(consumers.length).toBeGreaterThan(0);
    }
  });

  // зачем 2026-08-03 (владелец: «тики звучат непонятно как — то в середине
  // раунда, то в конце»): кулдаун timer_warning был 1200 мс — ДЛИННЕЕ
  // секундного шага отсчёта — и глотал каждый второй тик: 5-3-1 вместо
  // 5-4-3-2-1 в турнире и диагностике, «3…1» без «2» в арене. Кулдаун обязан
  // оставаться ниже секунды: он гасит только дребезг повторных запросов
  // внутри секунды, а честная секундная каденция слышна целиком.
  test('timer warning cooldown never swallows the once-per-second countdown', () => {
    const { cooldownMs } = SOUND_EVENTS['pm.learn.timer_warning'];
    expect(cooldownMs).toBeGreaterThan(0);
    expect(cooldownMs).toBeLessThan(1000);
  });
});
