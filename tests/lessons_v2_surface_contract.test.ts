// зачем: 2026-07-26 владелец забраковал витрину «скриптовых режимов» и указал на
// правильный слой поставки Kimi — «УРОК — НОВОЕ (MVP)»: карта юнита → сессия →
// раннер с карточками, звёздами и лестницей подсказок. Контракт переписан под эту
// поверхность: дев-гейт остаётся, карта отдаёт 12 сессий тремя зонами, сессия
// содержит полный набор карточек с исходами и подсказками, стили не нарушают
// запреты владельца (обводки контейнеров, adjustsFontSizeToFit).
import fs from 'node:fs';
import path from 'node:path';

import {
  SESSION_POOL,
  mistakeLabFixture,
  practiceHomeFixture,
  session1Fixture,
  unit1Fixture,
  sessionByRef,
} from '../components/learning-v2-lab/session/fixtures';
import type { SessionCard } from '../components/learning-v2-lab/session/contracts';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

const lessonsSource = read('app/(tabs)/lessons.tsx');
const labSource = read('components/learning-v2-lab/LearningV2ModesLab.tsx');
const runnerSource = read('components/learning-v2-lab/session/SessionRunner.tsx');
const mapSource = read('components/learning-v2-lab/session/UnitMap.tsx');
const speechSource = read('components/learning-v2-lab/session/engines/SpeechEngine.tsx');
const practiceSource = read('components/learning-v2-lab/session/PracticeLab.tsx');

describe('lessons V2 — урок MVP (карта юнита + сессия)', () => {
  test('дев-гейт V2 ведёт на лабораторию урока', () => {
    expect(lessonsSource).toMatch(/ENABLE_DEV_TOOLS/);
    expect(lessonsSource).toMatch(/useState<\s*'lessons'\s*\|\s*'dialogs'\s*\|\s*'v2'/);
    expect(lessonsSource).toMatch(/label="V2"/);
    expect(lessonsSource).toMatch(/LearningV2ModesLab/);
  });

  test('вход показывает карту юнита и открывает по ней сессию', () => {
    expect(labSource).toMatch(/UnitMap/);
    expect(labSource).toMatch(/SessionRunner/);
    expect(labSource).toMatch(/onOpenSession/);
    // Забракованная витрина режимов не должна вернуться ни под каким видом.
    expect(labSource).not.toMatch(/ModeDemoPlayer|LAB_MODE_CATALOG|kimi\/registry/);
  });

  test('карта юнита: три зоны, двенадцать сессий, боковые узлы', () => {
    expect(unit1Fixture.zones).toHaveLength(3);
    const nodes = unit1Fixture.zones.flatMap((zone) => zone.sessions);
    expect(nodes).toHaveLength(12);
    // Ровно один текущий узел — иначе тропа теряет точку входа.
    expect(nodes.filter((node) => node.state === 'current')).toHaveLength(1);
    // У каждой зоны есть формулировка can-do, а не «этап N».
    for (const zone of unit1Fixture.zones) expect(zone.canDo.length).toBeGreaterThan(0);
    expect(unit1Fixture.sideNodes.map((node) => node.id)).toEqual(['practice-lab', 'challenge']);
  });

  test('каждый открываемый узел ведёт в перенесённую сессию', () => {
    const nodes = unit1Fixture.zones.flatMap((zone) => zone.sessions);
    for (const node of nodes) {
      if (node.state === 'locked') {
        expect(node.sessionRef).toBeNull();
        continue;
      }
      // Открытый узел без контента = тупик для владельца. Ссылка обязана вести
      // в реально перенесённую сессию, а не в пустоту.
      expect(node.sessionRef).toBeTruthy();
      expect(sessionByRef(node.sessionRef as string)).not.toBeNull();
    }
  });

  test('движки каждой сессии покрыты реализацией', () => {
    const implemented = new Set(['choice', 'arrange', 'input', 'speech', 'match', 'dialogue']);
    for (const session of SESSION_POOL) {
      for (const card of session.cards) {
        expect(implemented.has(card.engine)).toBe(true);
      }
    }
  });

  test('диалог: у каждого хода ученика есть верный вариант', () => {
    for (const session of SESSION_POOL) {
      for (const card of session.cards) {
        if (card.engine !== 'dialogue') continue;
        const youTurns = card.turns.filter((turn) => turn.speaker === 'you');
        expect(youTurns.length).toBeGreaterThan(0);
        for (const turn of youTurns) {
          if (turn.speaker !== 'you') continue;
          expect(turn.options.filter((o) => o.id === turn.correctOptionId)).toHaveLength(1);
        }
      }
    }
  });

  test('пары: у каждой пары есть обе стороны', () => {
    for (const session of SESSION_POOL) {
      for (const card of session.cards) {
        if (card.engine !== 'match') continue;
        expect(card.pairs.length).toBeGreaterThanOrEqual(3);
        for (const pair of card.pairs) {
          expect(pair.en.length).toBeGreaterThan(0);
          expect(pair.ru.length).toBeGreaterThan(0);
        }
      }
    }
  });

  test('сессия: карточки, исходы звёзд и полная лестница подсказок', () => {
    expect(session1Fixture.cards).toHaveLength(8);
    expect(session1Fixture.intro.cardsDisplay).toBe('8 карт');

    // Проверяем ВСЕ перенесённые сессии, а не только первую.
    const allCards = SESSION_POOL.flatMap((session) => session.cards) as readonly SessionCard[];
    expect(allCards.length).toBeGreaterThanOrEqual(23);

    for (const card of allCards) {
      // Звёзды убывают по мере помощи: чисто > с подсказкой > после показа.
      const { clean, hint, shown } = card.starsByOutcome;
      expect(clean).toBeGreaterThan(hint);
      expect(hint).toBeGreaterThan(shown);
      expect(shown).toBeGreaterThan(0);

      // Все три ступени лестницы заполнены — иначе ученик упрётся в пустоту.
      expect(card.hints.first.length).toBeGreaterThan(0);
      expect(card.hints.contrast.length).toBeGreaterThan(0);
      expect(card.hints.explain.length).toBeGreaterThan(0);

      expect(card.instruction.length).toBeGreaterThan(0);
      // Теги ошибок обязательны для проверяемых карточек, но НЕ для разминки
      // на пары: она намеренно не кормит работу над ошибками (так в поставке).
      if (card.engine !== 'match') {
        expect(card.mistakeTags.length).toBeGreaterThan(0);
      }
    }
  });

  test('у карточек выбора ровно один правильный вариант', () => {
    for (const session of SESSION_POOL) {
      for (const card of session.cards) {
        if (card.engine !== 'choice') continue;
        expect(card.options.length).toBeGreaterThanOrEqual(2);
        expect(card.options.filter((option) => option.id === card.correctOptionId)).toHaveLength(1);
      }
    }
  });

  test('сборка фразы: свободные слоты закрываются чипами банка', () => {
    for (const session of SESSION_POOL) {
      for (const card of session.cards) {
        if (card.engine !== 'arrange') continue;
        // Заранее поставленные слова в банке не нужны — их ставить не надо.
        const free = card.targetTokens.filter((token) => !card.preplaced.includes(token));
        for (const token of free) {
          expect(card.bankChips).toContain(token);
        }
        expect(card.bankChips.length).toBeGreaterThanOrEqual(free.length);
      }
    }
  });

  test('дистракторы не повторяют правильный ответ', () => {
    // Правило владельца: неверный вариант обязан быть однозначно неверным.
    // Дубль правильного текста = второй правильный ответ, за который ученик
    // получит «неверно» — это разрушает доверие к приложению.
    for (const session of [...SESSION_POOL, mistakeLabFixture]) {
      for (const card of session.cards) {
        if (card.engine === 'choice') {
          const labels = card.options.map((o) => o.label.trim().toLowerCase());
          expect(new Set(labels).size).toBe(labels.length);
        }
        if (card.engine === 'dialogue') {
          for (const turn of card.turns) {
            if (turn.speaker !== 'you') continue;
            const labels = turn.options.map((o) => o.label.trim().toLowerCase());
            expect(new Set(labels).size).toBe(labels.length);
          }
        }
      }
    }
  });

  test('каждый движок реально встречается в контенте', () => {
    // Смысл тестового контента — прощёлкать ВСЕ режимы. Если движок нигде не
    // используется, проверить его в приложении невозможно.
    const used = new Set(SESSION_POOL.flatMap((s) => s.cards.map((c) => c.engine)));
    for (const engine of ['choice', 'arrange', 'input', 'speech', 'match', 'dialogue']) {
      expect(used.has(engine as never)).toBe(true);
    }
  });

  test('«Моя практика»: три блока и рабочий разбор ошибок', () => {
    expect(practiceHomeFixture.blocks).toHaveLength(3);
    // Закрытый блок обязан объяснять, когда откроется, — иначе тупик без причины.
    for (const block of practiceHomeFixture.blocks) {
      expect(block.countDisplay.length).toBeGreaterThan(0);
      if (block.state === 'locked') expect(block.lockNote?.length ?? 0).toBeGreaterThan(0);
    }

    // Разбор ошибок: карточки помечены как возврат ошибки и несут заметку о промахе.
    expect(mistakeLabFixture.cards).toHaveLength(5);
    expect(mistakeLabFixture.errorChips?.length).toBeGreaterThan(0);
    for (const card of mistakeLabFixture.cards) {
      expect(card.returnsMistake).toBe(true);
      expect((card.mistakeNote ?? '').length).toBeGreaterThan(0);
      expect(card.mistakeTags.length).toBeGreaterThan(0);
    }
  });

  test('открытый боковой узел карты ведёт на реальный экран', () => {
    // Экраны, которые реально смонтированы в лаборатории.
    const wired = new Set(['practice-lab']);
    for (const node of unit1Fixture.sideNodes) {
      if (node.state === 'locked') {
        expect(node.surfaceRef).toBeNull();
        expect(node.lockNote?.length ?? 0).toBeGreaterThan(0);
        continue;
      }
      expect(node.surfaceRef).toBeTruthy();
      expect(wired.has(node.surfaceRef as string)).toBe(true);
    }
  });

  test('стиль урока уважает запреты владельца', () => {
    for (const source of [labSource, runnerSource, mapSource, speechSource, practiceSource]) {
      expect(source).not.toMatch(/adjustsFontSizeToFit/);
      // Обводки контейнеров запрещены; разделитель одной стороны разрешён.
      expect(source).not.toMatch(/(?<!Bottom)(?<!Top)(?<!Left)(?<!Right)borderWidth/);
      expect(source).not.toMatch(/(?<!borderBottom)(?<!borderTop)(?<!borderLeft)borderColor/);
    }
  });

  test('речевая карточка глушит анимации на фоне (perf-контракт)', () => {
    expect(speechSource).toMatch(/useRuntimeActive/);
  });
});
