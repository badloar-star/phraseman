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
 * Описательные файлы: перечисляют события, но НЕ воспроизводят их.
 *
 * зачем (аудит 2026-09-15, метод «археология истории»): сторож считал вызовом
 * любое упоминание идентификатора, поэтому событие, попавшее только в таблицу
 * анимаций или в развилку самого арбитра, числилось подключённым. Так звук
 * неверного ответа (`pm.learn.needs_work`) выглядел живым, хотя ЕДИНСТВЕННЫЙ
 * путь к нему — `requestLearningVerdict`, которого в приложении не зовёт никто.
 * Сторож охранял иллюзию: 19 событий с ассетами держались на упоминании в
 * описательных файлах.
 */
const DESCRIPTIVE_FILES: readonly string[] = [
  path.join('modules', 'audio', 'sound_motion.ts'),
];

/**
 * События без WAV: их незачем требовать от экранов — по плану они остаются
 * типизированными, но молчащими, пока владелец не принесёт звук.
 * Список держим здесь, а не в тесте каталога, чтобы «нет файла» и «нет вызова»
 * не смешивались в один непонятный отказ.
 */
const SILENT_WITHOUT_ASSET: readonly SoundEventId[] = [
  'pm.reward.vip_finale',
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

const sourceFiles = SCAN_DIRS.flatMap(collectSourceFiles).filter((file) => {
  const relative = path.relative(root, file);
  return relative !== CATALOG_FILE && !DESCRIPTIVE_FILES.includes(relative);
});

const sourceByFile = new Map(
  sourceFiles.map((file) => [path.relative(root, file), fs.readFileSync(file, 'utf8')] as const),
);

/**
 * Прогрев плееров на старте (`soundDirector.prewarm([...])` в app/_layout.tsx)
 * ПЕРЕЧИСЛЯЕТ события, но ничего не воспроизводит: он лишь создаёт нативные
 * плееры заранее, чтобы первый реальный звук не платил латентность.
 *
 * зачем (аудит 2026-09-15, метод «археология истории»): сторож считал вызовом
 * ЛЮБОЕ упоминание идентификатора, поэтому событие, попавшее только в список
 * прогрева, числилось подключённым. Так звук неверного ответа
 * (`pm.learn.needs_work`) годами выглядел живым, хотя не вызывается ниоткуда:
 * ЕДИНСТВЕННЫЙ путь к нему — `requestLearningVerdict`, который в приложении не
 * зовёт никто. Сторож охранял иллюзию.
 */
function stripPrewarmLists(source: string): string {
  return source.replace(/prewarm\(\[[\s\S]*?\]\)/g, 'prewarm([])');
}

/**
 * Часть семейств просится шаблоном: `playCelebrationSceneSound(`pm.celebration.${name}`)`
 * в components/PremiumCelebrationModal.tsx — это ЗАКОННЫЙ вызов всего семейства,
 * дословного идентификатора в коде нет и быть не может. Считаем такое вызовом,
 * иначе сторож требовал бы перечислять каждый звук поимённо.
 */
function familyTemplateSites(eventId: SoundEventId): string[] {
  const family = eventId.slice(0, eventId.lastIndexOf('.') + 1);
  const needle = '`' + family + '${';
  const out: string[] = [];
  for (const [relative, source] of sourceByFile) {
    if (source.includes(needle)) out.push(relative);
  }
  return out;
}

function callSitesFor(eventId: SoundEventId): string[] {
  const needle = `'${eventId}'`;
  const out: string[] = [];
  for (const [relative, rawSource] of sourceByFile) {
    const source = stripPrewarmLists(rawSource);
    if (source.includes(needle)) out.push(relative);
  }
  for (const relative of familyTemplateSites(eventId)) {
    if (!out.includes(relative)) out.push(relative);
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
      // pm.learn.hint_reveal удалён навсегда (владелец 2026-08-30, раунд 5).
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
      // useHintRevealCue удалён вместе со звуком подсказки (2026-08-30).
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
  test('звуки вердикта ответа удалены вместе со своим механизмом', () => {
    /**
     * зачем (решение владельца 2026-09-15): ответ озвучивается ТОЛЬКО
     * вибрацией. Раньше звук неверного ответа числился подключённым, потому
     * что сторож видел его идентификатор в самом арбитре (requestLearningVerdict,
     * которого не звал ни один экран) — охранял иллюзию.
     *
     * Теперь каталог не должен знать об этих событиях вовсе, а механизм выбора
     * вердикта удалён. Контракт tests/learning_verdict_sounds_removed_contract.mjs
     * охраняет ту же границу со стороны экранов.
     */
    expect(Object.keys(SOUND_EVENTS)).not.toContain('pm.learn.correct');
    expect(Object.keys(SOUND_EVENTS)).not.toContain('pm.learn.needs_work');

    const verdictMechanism = [...sourceByFile]
      .filter(([, source]) => source.includes('requestLearningVerdict'))
      .map(([relative]) => relative);
    expect(verdictMechanism).toEqual([]);
  });

  test('timer warning cooldown never swallows the once-per-second countdown', () => {
    const { cooldownMs } = SOUND_EVENTS['pm.learn.timer_warning'];
    expect(cooldownMs).toBeGreaterThan(0);
    expect(cooldownMs).toBeLessThan(1000);
  });
});
