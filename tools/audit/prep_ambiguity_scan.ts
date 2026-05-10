/**
 * Сканирует все задания тренажёра предлогов и помечает случаи,
 * где другой вариант из списка часто даёт грамматически нормальное предложение
 * или ту же «рамку», что и верный ответ (нечестно без контекста).
 *
 * Запуск: npx tsx tools/audit/prep_ambiguity_scan.ts
 */
import { getLessonPrepositionPack } from '../../app/lesson_prepositions';

type DrillItem = {
  lessonId: number;
  id: string;
  sentenceTemplate: string;
  correct: string;
  options: string[];
};

type Hit = DrillItem & { distractor: string; reason: string };

function collectItems(): DrillItem[] {
  const all: DrillItem[] = [];
  for (let lessonId = 1; lessonId <= 32; lessonId++) {
    const p = getLessonPrepositionPack(lessonId);
    if (!p) continue;
    for (const it of p.items) {
      all.push({
        lessonId,
        id: it.id,
        sentenceTemplate: it.sentenceTemplate,
        correct: it.correct,
        options: it.options,
      });
    }
  }
  return all;
}

function scan(item: DrillItem): Hit[] {
  const out: Hit[] = [];
  const tpl = item.sentenceTemplate.trim();
  const wrong = item.options.filter(o => o.toLowerCase() !== item.correct.toLowerCase());

  const prepLike = new Set([
    'to',
    'for',
    'in',
    'on',
    'at',
    'by',
    'with',
    'from',
    'of',
    'into',
    'onto',
    'about',
    'under',
    'over',
    'between',
    'among',
    'inside',
    'outside',
    'near',
    'behind',
    'beside',
    'above',
    'below',
    'opposite',
    'during',
    'before',
    'after',
    'until',
    'since',
    'through',
    'across',
    'along',
    'toward',
    'against',
    'without',
    'within',
    'beyond',
    'off',
    'up',
    'down',
    'out',
    'around',
    'upon',
    'towards',
    'except',
    'like',
    'unlike',
    'including',
  ]);

  if (!prepLike.has(item.correct.toLowerCase())) {
    out.push({
      ...item,
      distractor: '—',
      reason: `Слот «${item.correct}» не типичный предлог (частица/наречие и т.д.); заголовок «тренажёр предлогов» может путать.`,
    });
  }

  for (const w of wrong) {
    const wl = w.toLowerCase();
    const filled = tpl.replace('__', w).replace(/\s+/g, ' ').trim();

    // go __ / go __?
    if (/\bgo\s+__\??$/i.test(tpl)) {
      if (['outside', 'inside', 'home', 'there', 'back', 'away', 'abroad', 'upstairs', 'downstairs'].includes(wl)) {
        out.push({
          ...item,
          distractor: w,
          reason: `После «go» типичный наречный/частичный хвост; параллель верному «${item.correct}»: «${filled}».`,
        });
      }
      if (wl === 'insane') {
        out.push({
          ...item,
          distractor: w,
          reason: `Устойчивое выражение «go insane» — грамматически ок в том же шаблоне.`,
        });
      }
      if (wl === 'on' || wl === 'off') {
        out.push({
          ...item,
          distractor: w,
          reason: `«Go on» / «go off» — обычные фразовые глаголы.`,
        });
      }
      continue;
    }

    // be + __ the + enclosed place / landmark
    if (/__(\s+)the (kitchen|bathroom|bedroom|office|garage|elevator|building|house|room|fridge|bag|box)\b/i.test(tpl)) {
      if (['near', 'by', 'outside', 'around', 'behind', 'beside'].includes(wl)) {
        out.push({
          ...item,
          distractor: w,
          reason: `Тот же шаблон с «${w}» даёт обычное описание положения: «${filled}».`,
        });
      }
    }

    // at / in airport
    if (/__(\s+)the airport\b/i.test(tpl) && wl === 'in') {
      out.push({
        ...item,
        distractor: w,
        reason: `«In the airport» часто приемлемо (терминал); конкурирует с «at the airport».`,
      });
    }

    // train / bus — on vs in
    if (/__(\s+)the (train|bus)\b/i.test(tpl) && wl === 'in') {
      out.push({
        ...item,
        distractor: w,
        reason: `«In the train/bus» встречается как вариант (особенно у BNSEL); спорно против «on».`,
      });
    }
    if (/__(\s+)the (train|bus)\b/i.test(tpl) && wl === 'at') {
      out.push({
        ...item,
        distractor: w,
        reason: `«At the train/bus» возможно в значении у транспорта / у платформы.`,
      });
    }

    // car / taxi — in vs on (roof, etc.)
    if (/__(\s+)((a|the) )?(car|taxi)\b/i.test(tpl) && wl === 'on') {
      out.push({
        ...item,
        distractor: w,
        reason: `«On the car/taxi» грамматически возможно (на крыше / сверху); урок учит «in».`,
      });
    }

    // line — in line vs on line (queue vs online ambiguity for learners)
    if (/\b__(\s+)line\b/i.test(tpl) && wl === 'on') {
      out.push({
        ...item,
        distractor: w,
        reason: `«On line» (амер.) может значить «в очереди онлайн» / редко очередь; путаница с «in line».`,
      });
    }

    // vacation — in vacation is wrong but "for vacation" planning?
    if (/__(\s+)vacation\b/i.test(tpl) && wl === 'for') {
      out.push({
        ...item,
        distractor: w,
        reason: `«For vacation» встречается в других конструкциях (планирование); может сбить.`,
      });
    }

    // look __ — many collocations if distractor is at/for/into
    if (/\blook\s+__/i.test(tpl) && ['at', 'for', 'into', 'after'].includes(wl)) {
      out.push({
        ...item,
        distractor: w,
        reason: `У «look» много устойчивых связок (look at/for/into/after); проверьте, что только один подходит по контексту фразы урока.`,
      });
    }

    // wait __
    if (/\bwait\s+__/i.test(tpl) && ['for', 'at', 'in', 'on'].includes(wl)) {
      out.push({
        ...item,
        distractor: w,
        reason: `«Wait for/at/in/on» — разные допустимые коллокации в зависимости от объекта.`,
      });
    }

    // arrive __ / get __
    if (/\b(arrive|get)\s+__/i.test(tpl) && ['at', 'in', 'on', 'to'].includes(wl)) {
      out.push({
        ...item,
        distractor: w,
        reason: `«Arrive at/in», «get to» и т.д. — часто несколько предлогов правдоподобны без имени места.`,
      });
    }

    // listen __ — homophones already filtered; at still wrong for advice but listen at rare

    // Живём / находимся: только явный паттерн «__ + London» (урок 3 и аналоги)
    if (/__(\s+)London\b/i.test(tpl)) {
      if (wl === 'at' || wl === 'near' || wl === 'by') {
        out.push({
          ...item,
          distractor: w,
          reason: `Рядом с названием города иногда конкурируют near/by/at против учебного «in».`,
        });
      }
    }

    // Площадь / открытая площадка: on vs at (оба правдоподобны)
    if (/__(\s+)that\s+city\s+square\b/i.test(tpl) || /__(\s+)the\s+square\b/i.test(tpl)) {
      if ((item.correct.toLowerCase() === 'on' && wl === 'at') || (item.correct.toLowerCase() === 'at' && wl === 'on')) {
        out.push({
          ...item,
          distractor: w,
          reason: `«On the square» vs «at the square» — оба встречаются в английском (разный акцент).`,
        });
      }
    }

    // Поездка по стране: across vs around
    if (/__(\s+)that\s+southern\s+country\b/i.test(tpl)) {
      if (
        (item.correct.toLowerCase() === 'across' && wl === 'around') ||
        (item.correct.toLowerCase() === 'around' && wl === 'across')
      ) {
        out.push({
          ...item,
          distractor: w,
          reason: `«Travel across the country» и «travel around the country» оба нормальны.`,
        });
      }
    }

    // «Странные» дистракторы (не предлоги) — отдельная задача контента; здесь не считаем «вторым верным ответом».
  }

  return dedupeHits(out);
}

function dedupeHits(hits: Hit[]): Hit[] {
  const key = (h: Hit) => `${h.id}|${h.distractor}|${h.reason}`;
  const seen = new Set<string>();
  return hits.filter(h => {
    const k = key(h);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function main() {
  const items = collectItems();
  const allHits: Hit[] = [];
  for (const it of items) {
    allHits.push(...scan(it));
  }

  console.log(`Всего заданий в тренажёре (после капа ${items.length} из возможных слотов): ${items.length}`);
  console.log(`Помечено потенциально спорных связок (эвристики): ${allHits.length}\n`);

  const byLesson = new Map<number, Hit[]>();
  for (const h of allHits) {
    const arr = byLesson.get(h.lessonId) ?? [];
    arr.push(h);
    byLesson.set(h.lessonId, arr);
  }

  for (const lessonId of [...byLesson.keys()].sort((a, b) => a - b)) {
    console.log(`\n--- Урок ${lessonId} ---`);
    for (const h of byLesson.get(lessonId)!) {
      console.log(`  [${h.id}] «${h.sentenceTemplate}»`);
      console.log(`      верно: ${h.correct}; спорный вариант: ${h.distractor}`);
      console.log(`      → ${h.reason}`);
    }
  }
}

main();
